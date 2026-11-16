import React, { useState, useEffect, useRef } from 'react';

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

const CATEGORIZED_PROMPTS = [
  {
    category: 'Diseases',
    icon: '🦠',
    prompts: [
      'What is Chikungunya and how does it spread?',
      'Why is Jaundice a clinical sign and not a disease?',
      'How does Dengue differ from Viral Fever?'
    ]
  },
  {
    category: 'Medicines & Safety',
    icon: '💊',
    prompts: [
      'What are approved uses and maximum daily dose of Paracetamol?',
      'Why are NSAIDs like Ibuprofen dangerous in suspected Dengue?',
      'Can I take antibiotics for viral illnesses?'
    ]
  },
  {
    category: 'Care & Hydration',
    icon: '🥣',
    prompts: [
      'What foods and fluids should be given during Typhoid recovery?',
      'How much fluid should a Dengue patient drink daily?',
      'Evidence-based Do’s and Don’ts for Malaria'
    ]
  },
  {
    category: 'Emergency Signs',
    icon: '🚨',
    prompts: [
      'What are the critical warning signs during Dengue defervescence?',
      'Red flag symptoms in high fever requiring emergency hospital care',
      'When does Jaundice indicate acute liver failure?'
    ]
  }
];

export default function HealthCompanionPage({ onNavigate }) {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome-hub',
      role: 'assistant',
      text: `### 🩺 Welcome to MediAgent Health Companion\n\nI am your **multilingual agentic health information assistant**, designed to provide accessible, evidence-grounded medical guidance about medicines, disease precautions, hydration, and emergency warning signs.\n\n**You can ask questions by typing or speaking in any of our 10 supported Indian languages and English.**\n\n*Choose a suggested topic below or type your question in the box below.*`,
      sources: [
        { name: 'World Health Organization (WHO)', url: 'https://www.who.int' },
        { name: 'Ministry of Health and Family Welfare (MoHFW)', url: 'https://www.mohfw.gov.in' }
      ]
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const messagesEndRef = useRef(null);
  const audioPlayerRef = useRef(new Audio());

  useEffect(() => {
    let sid = localStorage.getItem('mediagent_companion_session');
    if (!sid) {
      sid = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem('mediagent_companion_session', sid);
    }
    setSessionId(sid);
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isProcessing]);

  const startRecording = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        if (audioBlob.size < 200) {
          setErrorMessage('Empty voice recording. Please speak clearly into the microphone.');
          return;
        }
        await handleAudioUpload(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerIntervalRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
    } catch (err) {
      console.warn('Mic error:', err);
      setErrorMessage('Microphone access was denied or not found. Please type your question.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  const handleAudioUpload = async (audioBlob) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'rec.webm');
      formData.append('language', selectedLanguage);

      const res = await fetch('/api/health-companion/voice/transcribe', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Speech transcription failed');
      }

      if (data.language && data.language !== selectedLanguage) {
        setSelectedLanguage(data.language);
      }

      await sendMessage(data.transcript, true);
    } catch (err) {
      setErrorMessage(err.message || 'Speech recognition error. Please type your query.');
    } finally {
      setIsProcessing(false);
    }
  };

  const sendMessage = async (textToSend, fromVoice = false) => {
    const query = textToSend || inputText;
    if (!query || !query.trim()) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text: query.trim(),
      fromVoice
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/health-companion/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: query.trim(),
          preferredLanguage: selectedLanguage,
          generateVoice: fromVoice
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Chat request failed');

      const asstMsg = {
        id: data.messageId || `asst_${Date.now()}`,
        role: 'assistant',
        text: data.reply,
        sources: data.sources || [],
        voice: data.voice || null,
        toolInvoked: data.toolInvoked
      };

      setMessages(prev => [...prev, asstMsg]);

      if (fromVoice && data.voice && data.voice.audio_url) {
        playAudio(data.voice.audio_url);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error obtaining health response.');
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudio = (url) => {
    try {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.src = url;
      audioPlayerRef.current.play();
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  };

  const readAloud = async (text) => {
    try {
      setIsProcessing(true);
      const res = await fetch('/api/health-companion/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: selectedLanguage })
      });
      const data = await res.json();
      if (data.success && data.audio_url) {
        playAudio(data.audio_url);
      }
    } catch (e) {
      console.warn('TTS error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearChat = async () => {
    if (window.confirm('Clear health companion conversation history?')) {
      try {
        await fetch(`/api/health-companion/chat/sessions/${sessionId}`, { method: 'DELETE' });
      } catch {}
      setMessages([
        {
          id: 'welcome-reset',
          role: 'assistant',
          text: 'Conversation history cleared. How may I assist you with health inquiries?',
          sources: []
        }
      ]);
    }
  };

  return (
    <div className="page-container" style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.8rem' }}>🩺</span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              MediAgent Health Companion
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Multilingual Agentic Health Information Assistant • Verified Clinical RAG Knowledge Base
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-elevated)', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Language:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              style={{
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.84rem'
              }}
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onNavigate && onNavigate('medicines')}
            className="btn btn-secondary"
            style={{ fontSize: '0.84rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            💊 Medicine Guide
          </button>

          <button
            onClick={() => onNavigate && onNavigate('diseases')}
            className="btn btn-secondary"
            style={{ fontSize: '0.84rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🦠 Disease Guide
          </button>

          <button
            onClick={clearChat}
            className="btn btn-outline"
            style={{ fontSize: '0.84rem', padding: '8px 12px' }}
            title="Clear Chat History"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* Suggested Topics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {CATEGORIZED_PROMPTS.map((cat, idx) => (
          <div
            key={idx}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.88rem' }}>
              <span>{cat.icon}</span>
              <span>{cat.category}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {cat.prompts.map((p, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => sendMessage(p)}
                  style={{
                    textAlign: 'left',
                    background: 'var(--bg-elevated)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    color: 'var(--text-secondary)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}
                >
                  "{p}"
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Chat Thread Area */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '650px'
        }}
      >
        <div
          style={{
            flex: 1,
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '82%',
                backgroundColor: msg.role === 'user' ? 'var(--accent-primary-dim)' : 'var(--bg-card)',
                border: msg.role === 'user' ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '16px 20px',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                fontSize: '0.92rem',
                lineHeight: '1.6',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {msg.fromVoice && (
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🎙️ Spoken in {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || 'Audio'}
                </div>
              )}

              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {msg.text}
              </div>

              {msg.sources && msg.sources.length > 0 && (
                <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '0.78rem' }}>
                  <div style={{ color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '4px' }}>📚 Verified Clinical Sources:</div>
                  {msg.sources.map((s, idx) => (
                    <div key={idx} style={{ color: 'var(--text-secondary)' }}>
                      • <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-info)', textDecoration: 'none' }}>{s.name}</a>
                    </div>
                  ))}
                </div>
              )}

              {msg.role === 'assistant' && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button
                    onClick={() => readAloud(msg.text)}
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.76rem',
                      cursor: 'pointer'
                    }}
                  >
                    🔊 Read Aloud
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(msg.text);
                      alert('Copied response to clipboard');
                    }}
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.76rem',
                      cursor: 'pointer'
                    }}
                  >
                    📋 Copy Text
                  </button>
                </div>
              )}
            </div>
          ))}

          {isProcessing && (
            <div style={{ alignSelf: 'flex-start', color: 'var(--text-secondary)', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', background: 'var(--bg-card)', borderRadius: '12px' }}>
              <div className="spinner" style={{ width: '16px', height: '16px' }} />
              MediAgent is reasoning and consulting verified medical evidence...
            </div>
          )}

          {errorMessage && (
            <div style={{ background: 'var(--accent-danger-dim)', border: '1px solid var(--accent-danger)', color: '#fca5a5', padding: '10px 14px', borderRadius: '8px', fontSize: '0.86rem' }}>
              ⚠️ {errorMessage}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Voice Active Recording Bar */}
        {isRecording && (
          <div style={{ background: '#450a0a', borderTop: '1px solid #dc2626', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fecaca' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1s infinite' }} />
              <span>Recording Voice Input ({recordingDuration}s) in {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}...</span>
            </div>
            <button
              onClick={stopRecording}
              style={{ background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '6px 14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Finish & Send
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div style={{ padding: '16px 20px', background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: isRecording ? '#dc2626' : 'var(--accent-primary)',
              color: '#ffffff',
              border: 'none',
              fontSize: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
            title={isRecording ? 'Stop Recording' : 'Speak health question'}
          >
            {isRecording ? '⏹' : '🎙️'}
          </button>

          <input
            type="text"
            placeholder={isRecording ? 'Listening to your speech...' : 'Ask about medicines, diseases, precautions, food guidance, or warning signs...'}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            disabled={isRecording || isProcessing}
            style={{
              flex: 1,
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '24px',
              padding: '12px 20px',
              fontSize: '0.92rem',
              outline: 'none'
            }}
          />

          <button
            onClick={() => sendMessage()}
            disabled={!inputText.trim() || isProcessing || isRecording}
            className="btn btn-primary"
            style={{
              height: '46px',
              padding: '0 20px',
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Ask</span>
            <span>➤</span>
          </button>
        </div>
      </div>
    </div>
  );
}
