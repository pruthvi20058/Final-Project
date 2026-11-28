import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../services/api';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'hi', name: 'Hindi (हिंदी)' },
  { code: 'te', name: 'Telugu (తెలుగు)' },
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'ml', name: 'Malayalam (മലയാളം)' },
  { code: 'mr', name: 'Marathi (मराठी)' },
  { code: 'bn', name: 'Bengali (বাংলা)' },
  { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
  { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)' }
];

const PROMPT_SUGGESTIONS = [
  'What is Chikungunya?',
  'What are warning signs in Dengue?',
  'What are approved uses of Paracetamol?',
  'Do’s and don’ts for Malaria',
  'Can I take antibiotics for viral fever?'
];

export default function FloatingVoiceAssistant({ onNavigateToSection }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hello! I am **MediAgent Health Companion**. You can speak or type your health questions in your preferred language about medicines, precautions, and disease care guidance.',
      sources: [{ name: 'World Health Organization (WHO) Guidelines', url: 'https://www.who.int' }]
    }
  ]);
  const [sessionId, setSessionId] = useState('');
  const [audioBlobUrl, setAudioBlobUrl] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const messagesEndRef = useRef(null);
  const audioPlayerRef = useRef(new Audio());

  useEffect(() => {
    // Generate or restore companion session ID
    let sid = localStorage.getItem('mediagent_companion_session');
    if (!sid) {
      sid = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem('mediagent_companion_session', sid);
    }
    setSessionId(sid);
  }, []);

  useEffect(() => {
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Handle Voice Recording
  const startRecording = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // Stop all audio tracks
        stream.getTracks().forEach(track => track.stop());

        if (audioBlob.size < 200) {
          setErrorMessage('Recording was too short or empty. Please speak clearly into the microphone.');
          return;
        }

        // Upload and transcribe
        await handleAudioUpload(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      setMicPermissionDenied(false);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('[VoiceAssistant] Mic permission error:', err);
      setMicPermissionDenied(true);
      setErrorMessage('Microphone access was denied or is unavailable. You can type your health question below.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
      setRecordingDuration(0);
    }
  };

  // Upload Recorded Audio to ASR endpoint
  const handleAudioUpload = async (audioBlob) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', selectedLanguage);

      const res = await fetch(`${API_BASE}/health-companion/voice/transcribe`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Speech transcription failed.');
      }

      if (data.detectedLanguage && data.detectedLanguage !== selectedLanguage) {
        const matched = SUPPORTED_LANGUAGES.find(l => l.code === data.language);
        if (matched) setSelectedLanguage(matched.code);
      }

      // Add user transcript message
      const transcript = data.transcript;
      if (!transcript || !transcript.trim()) {
        throw new Error('Could not identify recognizable speech. Please try speaking again.');
      }

      // Send to Companion Chatbot
      await sendChatMessage(transcript, true);
    } catch (err) {
      console.error('[VoiceAssistant] Audio processing error:', err);
      setErrorMessage(err.message || 'Unable to transcribe audio. Please try typing your question.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Send message to Health Companion Chatbot
  const sendChatMessage = async (queryText, fromVoice = false) => {
    const text = queryText || inputText;
    if (!text || !text.trim()) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text: text.trim(),
      fromVoice
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_BASE}/health-companion/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: text.trim(),
          preferredLanguage: selectedLanguage,
          generateVoice: fromVoice // Generate audio reply automatically if asked by voice
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error retrieving health response.');
      }

      const assistantMsg = {
        id: data.messageId || `asst_${Date.now()}`,
        role: 'assistant',
        text: data.reply,
        sources: data.sources || [],
        voice: data.voice || null,
        toolInvoked: data.toolInvoked,
        intent: data.intent
      };

      setMessages(prev => [...prev, assistantMsg]);

      // If voice audio returned and user asked via voice, play automatically
      if (fromVoice && data.voice && data.voice.audio_url) {
        playAudio(data.voice.audio_url);
      }
    } catch (err) {
      console.error('[VoiceAssistant] Chat error:', err);
      setErrorMessage(err.message || 'Error processing response. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Play TTS audio
  const playAudio = (url) => {
    if (!url) return;
    try {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.src = url;
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
      audioPlayerRef.current.onended = () => setIsPlayingAudio(false);
      audioPlayerRef.current.onerror = () => setIsPlayingAudio(false);
    } catch (e) {
      console.warn('Audio play error:', e);
      setIsPlayingAudio(false);
    }
  };

  // Synthesize and play on-demand TTS
  const handleReadAloud = async (textToRead) => {
    try {
      setIsProcessing(true);
      const res = await fetch(`${API_BASE}/health-companion/voice/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToRead, language: selectedLanguage })
      });
      const data = await res.json();
      if (data.success && data.audio_url) {
        playAudio(data.audio_url);
      }
    } catch (err) {
      console.warn('TTS request error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearChat = async () => {
    if (window.confirm('Clear your conversation history for privacy?')) {
      try {
        await fetch(`${API_BASE}/health-companion/chat/sessions/${sessionId}`, { method: 'DELETE' });
      } catch {}
      setMessages([
        {
          id: 'welcome-reset',
          role: 'assistant',
          text: 'Conversation history cleared. How can I assist with your health questions today?',
          sources: []
        }
      ]);
    }
  };

  return (
    <>
      {/* Floating Microphone Trigger Button */}
      <div
        className="floating-voice-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Open MediAgent Multilingual Health Assistant"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer'
        }}
      >
        <button
          style={{
            width: '58px',
            height: '58px',
            borderRadius: '50%',
            background: isRecording
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'linear-gradient(135deg, #0d9488, #059669)',
            border: '2px solid rgba(255, 255, 255, 0.25)',
            color: '#ffffff',
            boxShadow: isRecording
              ? '0 0 24px rgba(239, 68, 68, 0.7)'
              : '0 8px 28px rgba(13, 148, 136, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.6rem',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isOpen ? 'rotate(90deg) scale(0.95)' : 'scale(1)',
            animation: isRecording ? 'pulse 1.2s infinite' : 'none'
          }}
        >
          {isOpen ? '✕' : (isRecording ? '🔴' : '🎙️')}
        </button>
      </div>

      {/* Slide-out Health Companion Assistant Drawer / Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '92px',
            right: '24px',
            width: '420px',
            maxWidth: 'calc(100vw - 32px)',
            height: '620px',
            maxHeight: 'calc(100vh - 120px)',
            backgroundColor: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '18px',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.75)',
            zIndex: 9998,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slideUp 0.3s ease-out'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              background: 'linear-gradient(135deg, #042f2e, #0f172a)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0d9488, #10b981)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem'
                }}
              >
                🩺
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#f1f5f9' }}>
                  MediAgent Health Companion
                </h4>
                <div style={{ fontSize: '0.72rem', color: '#5eead4', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                  Multilingual AI • 10 Languages
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                style={{
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  padding: '4px 6px',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
                title="Select preferred interaction language"
              >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>

              <button
                onClick={clearChat}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  padding: '4px'
                }}
                title="Clear conversation history"
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              background: '#090d16'
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  backgroundColor: msg.role === 'user' ? '#0d9488' : '#1e293b',
                  color: '#f8fafc',
                  padding: '12px 14px',
                  borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  fontSize: '0.86rem',
                  lineHeight: '1.5',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.06)' : 'none'
                }}
              >
                {msg.fromVoice && (
                  <div style={{ fontSize: '0.72rem', opacity: 0.8, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🎙️ Spoken question
                  </div>
                )}

                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {msg.text}
                </div>

                {/* Sources list if available */}
                {msg.sources && msg.sources.length > 0 && (
                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.74rem' }}>
                    <div style={{ color: '#2dd4bf', fontWeight: 600, marginBottom: '3px' }}>📚 Verified Sources:</div>
                    {msg.sources.map((s, idx) => (
                      <div key={idx} style={{ color: '#94a3b8' }}>
                        • <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', textDecoration: 'none' }}>{s.name}</a>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions: Copy & Read Aloud */}
                {msg.role === 'assistant' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', fontSize: '0.75rem' }}>
                    <button
                      onClick={() => handleReadAloud(msg.text)}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#94a3b8',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Read aloud using neural TTS"
                    >
                      🔊 Read aloud
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(msg.text);
                        alert('Copied to clipboard');
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#94a3b8',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        cursor: 'pointer'
                      }}
                      title="Copy response"
                    >
                      📋 Copy
                    </button>
                  </div>
                )}
              </div>
            ))}

            {isProcessing && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: '#1e293b',
                  color: '#94a3b8',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#0d9488', animation: 'pulse 1s infinite' }} />
                Retrieving verified clinical information...
              </div>
            )}

            {errorMessage && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem'
                }}
              >
                ⚠️ {errorMessage}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompt Chips */}
          <div
            style={{
              padding: '6px 12px',
              backgroundColor: '#0b1120',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              whiteSpace: 'nowrap'
            }}
          >
            {PROMPT_SUGGESTIONS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => sendChatMessage(prompt)}
                style={{
                  background: '#1e293b',
                  color: '#94a3b8',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '3px 10px',
                  fontSize: '0.74rem',
                  cursor: 'pointer'
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Voice Recording Active Banner */}
          {isRecording && (
            <div
              style={{
                padding: '10px 16px',
                backgroundColor: '#450a0a',
                borderTop: '1px solid #dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#fecaca',
                fontSize: '0.82rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1s infinite' }} />
                <span>Recording in {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || 'Language'}... ({recordingDuration}s)</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={stopRecording}
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Done
                </button>
                <button
                  onClick={cancelRecording}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#94a3b8',
                    border: '1px solid #7f1d1d',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Input Footer Area */}
          <div
            style={{
              padding: '12px',
              backgroundColor: '#0f172a',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {/* Microphone Button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: isRecording ? '#dc2626' : '#0d9488',
                border: 'none',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                cursor: 'pointer',
                flexShrink: 0
              }}
              title={isRecording ? 'Stop recording' : 'Click to speak your health question'}
            >
              {isRecording ? '⏹' : '🎙️'}
            </button>

            {/* Text Input */}
            <input
              type="text"
              placeholder={isRecording ? 'Listening...' : 'Type health question or ask in your language...'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
              disabled={isRecording || isProcessing}
              style={{
                flex: 1,
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '8px 14px',
                fontSize: '0.84rem',
                outline: 'none'
              }}
            />

            {/* Send Button */}
            <button
              onClick={() => sendChatMessage()}
              disabled={!inputText.trim() || isProcessing || isRecording}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: inputText.trim() ? '#0d9488' : '#334155',
                border: 'none',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: inputText.trim() ? 'pointer' : 'default',
                flexShrink: 0
              }}
              title="Send message"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
