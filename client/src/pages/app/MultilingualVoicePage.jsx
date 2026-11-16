import React, { useState, useEffect, useRef } from 'react';
import DemoBanner from '../../components/DemoBanner';
import SafetyDisclaimer from '../../components/SafetyDisclaimer';
import { nlpService } from '../../services/api';

// Supported Language definitions matching backend
const LANGUAGES = [
  { code: 'auto', name: 'Auto-Detect', nativeName: 'Auto / Romanized', flag: '🌐' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'en', name: 'English', nativeName: 'English (IN/Global)', flag: '🇬🇧' }
];

// Presets for quick demonstration
const PRESETS = [
  {
    label: 'Kannada (Native)',
    lang: 'kn',
    text: 'ನನಗೆ ಮೂರು ದಿನಗಳಿಂದ ಜ್ವರ ಮತ್ತು ತಲೆನೋವು ಇದೆ, ವಾಂತಿ ಇಲ್ಲ.'
  },
  {
    label: 'Hindi (Native)',
    lang: 'hi',
    text: 'मुझे तीन दिन से तेज बुखार और सिरदर्द है, उल्टी नहीं हो रही है।'
  },
  {
    label: 'Kannada (Romanized)',
    lang: 'kn',
    text: 'nange 3 days inda fever ide mathe headache ide, vomiting illa.'
  },
  {
    label: 'Tamil (Native)',
    lang: 'ta',
    text: 'எனக்கு மூன்று நாட்களாக காய்ச்சல் மற்றும் கடுமையான தலைவலி உள்ளது.'
  },
  {
    label: 'English (Negation & History)',
    lang: 'en',
    text: 'I had fever last week but now I only have cough. I do not have headache.'
  }
];

// Browser 16kHz PCM WAV encoder
function encodeWAV(samples, sampleRate = 16000) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM) */
  view.setUint16(20, 1, true);
  /* channel count (mono) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  // Write PCM samples (convert float -1.0..1.0 to 16-bit integer)
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

export default function MultilingualVoicePage({ onNavigate }) {
  // State
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [inputMode, setInputMode] = useState('voice'); // 'voice' | 'file' | 'text'
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [uploadedAudioFile, setUploadedAudioFile] = useState(null);
  
  // Processing States
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Results
  const [asrMetadata, setAsrMetadata] = useState(null);
  const [extractedEntities, setExtractedEntities] = useState(null);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [consultationsHistory, setConsultationsHistory] = useState([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Audio References
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const scriptProcessorRef = useRef(null);
  const audioSamplesRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const audioElementRef = useRef(null);

  // Fetch consultation history on mount
  useEffect(() => {
    loadConsultations();
  }, []);

  const loadConsultations = async () => {
    try {
      const res = await nlpService.getConsultations();
      if (res && res.data) {
        setConsultationsHistory(res.data);
      }
    } catch (err) {
      console.warn('Failed to load consultation history:', err);
    }
  };

  // Recording Handlers
  const startRecording = async () => {
    try {
      setErrorMessage('');
      setRecordedAudioBlob(null);
      setRecordingSeconds(0);
      audioSamplesRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      // Buffer size 4096, 1 input channel, 1 output channel
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Clone samples
        const copy = new Float32Array(inputData.length);
        copy.set(inputData);
        audioSamplesRef.current.push(copy);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      setIsRecording(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access failed:', err);
      setErrorMessage('Microphone access denied or unavailable. Please check your browser permissions or use File Upload / Direct Text mode.');
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    // Stop streams
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Flatten collected samples
    const chunks = audioSamplesRef.current;
    if (chunks.length === 0) {
      setErrorMessage('No voice audio detected in recording.');
      return;
    }

    let totalLength = 0;
    for (const chunk of chunks) totalLength += chunk.length;
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const wavBlob = encodeWAV(merged, 16000);
    setRecordedAudioBlob(wavBlob);

    // Immediately trigger ASR transcription
    await handleTranscribeBlob(wavBlob);
  };

  const handleTranscribeBlob = async (blob) => {
    setIsTranscribing(true);
    setErrorMessage('');
    try {
      const audioFile = new File([blob], 'mic_recording.wav', { type: 'audio/wav' });
      const res = await nlpService.transcribeAudio(audioFile, selectedLanguage);
      if (res && res.success) {
        setInputText(res.transcript);
        setAsrMetadata({
          confidence: res.confidence,
          detectedLanguage: res.detectedLanguage || res.language,
          provider: res.provider,
          audioUrl: res.audioUrl
        });
        // Automatically extract entities for smooth preview
        await extractEntities(res.transcript, selectedLanguage);
      }
    } catch (err) {
      setErrorMessage(`ASR Transcription: ${err.message}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploadedAudioFile(file);
    setErrorMessage('');
    setIsTranscribing(true);
    try {
      const res = await nlpService.transcribeAudio(file, selectedLanguage);
      if (res && res.success) {
        setInputText(res.transcript);
        setAsrMetadata({
          confidence: res.confidence,
          detectedLanguage: res.detectedLanguage || res.language,
          provider: res.provider,
          audioUrl: res.audioUrl
        });
        await extractEntities(res.transcript, selectedLanguage);
      }
    } catch (err) {
      setErrorMessage(`Audio Upload ASR: ${err.message}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  const extractEntities = async (textToExtract, lang) => {
    const queryText = textToExtract || inputText;
    if (!queryText || !queryText.trim()) return;

    setIsExtracting(true);
    setErrorMessage('');
    try {
      const res = await nlpService.processText(queryText, lang || selectedLanguage);
      if (res && res.success && res.data) {
        setExtractedEntities(res.data);
      }
    } catch (err) {
      setErrorMessage(`Clinical Entity Extraction: ${err.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRunAssessment = async () => {
    if (!inputText || !inputText.trim()) {
      setErrorMessage('Please provide symptom text or record your voice first.');
      return;
    }

    setIsAssessing(true);
    setErrorMessage('');
    try {
      const payload = {
        text: inputText,
        preferredLanguage: selectedLanguage,
        inputType: recordedAudioBlob || uploadedAudioFile ? 'voice' : 'text',
        userConfirmed: true,
        patientId: 'PAT-8001',
        patientName: 'Sarah Johnson',
        patientAge: 45,
        patientGender: 'Female',
        synthesizeAudio: true
      };

      if (recordedAudioBlob) {
        payload.audioFile = new File([recordedAudioBlob], 'consultation.wav', { type: 'audio/wav' });
      } else if (uploadedAudioFile) {
        payload.audioFile = uploadedAudioFile;
      }

      const res = await nlpService.runConsultation(payload);
      if (res && res.success) {
        setAssessmentResult(res);
        if (res.clinicalEntities) {
          setExtractedEntities(res.clinicalEntities);
        }
        await loadConsultations();
      }
    } catch (err) {
      setErrorMessage(`Clinical Assessment: ${err.message}`);
    } finally {
      setIsAssessing(false);
    }
  };

  const applyPreset = async (preset) => {
    setSelectedLanguage(preset.lang);
    setInputText(preset.text);
    setRecordedAudioBlob(null);
    setUploadedAudioFile(null);
    setAsrMetadata(null);
    setAssessmentResult(null);
    await extractEntities(preset.text, preset.lang);
  };

  const toggleAudioPlayback = (url) => {
    if (!audioElementRef.current) return;
    if (isPlayingAudio) {
      audioElementRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioElementRef.current.src = url;
      audioElementRef.current.play().then(() => {
        setIsPlayingAudio(true);
      }).catch((e) => console.warn('Audio play error:', e));
    }
  };

  return (
    <div className="fade-in" style={{ paddingBottom: 60 }}>
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.6rem' }}>🎙️</span> Multilingual Voice & Clinical NLP Agent
          </h2>
          <p className="subtitle">
            Voice-first & native-script healthcare consultation powered by Edge-TTS Indian neural speech,
            clinical negation logic, multi-agent triage, and disease differential diagnoses.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span className="badge" style={{ background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}>
            10 Indian & English Languages
          </span>
          <span className="badge" style={{ background: 'var(--accent-secondary-dim)', color: 'var(--accent-secondary)', borderColor: 'var(--accent-secondary)' }}>
            Strict Tabular ML Isolation
          </span>
        </div>
      </div>

      <SafetyDisclaimer />

      {errorMessage && (
        <div style={{
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid var(--accent-danger)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          color: '#f87171',
          marginBottom: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <span>⚠️</span>
          <div style={{ flex: 1, fontSize: '0.88rem' }}>{errorMessage}</div>
          <button
            onClick={() => setErrorMessage('')}
            style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '1.1rem' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Preset Bar for Quick Evaluation */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            ⚡ QUICK CLINICAL BENCHMARKS (TEST PRESETS):
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PRESETS.map((p, i) => (
              <button
                key={i}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                onClick={() => applyPreset(p)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Input & Entity Extraction */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 20, marginBottom: 24 }}>
        
        {/* Left Column: Voice / Text Input */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid var(--border-color)', paddingBottom: 14 }}>
            <h3 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🗣️</span> Patient Voice / Text Intake
            </h3>

            {/* Language Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Target Language:</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 12px',
                  fontSize: '0.84rem'
                }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.name} ({l.nativeName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            <button
              className={`btn ${inputMode === 'voice' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.84rem' }}
              onClick={() => setInputMode('voice')}
            >
              🎙️ Live Microphone
            </button>
            <button
              className={`btn ${inputMode === 'file' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.84rem' }}
              onClick={() => setInputMode('file')}
            >
              📁 Audio File (.wav/.mp3)
            </button>
            <button
              className={`btn ${inputMode === 'text' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.84rem' }}
              onClick={() => setInputMode('text')}
            >
              ⌨️ Text / Script Input
            </button>
          </div>

          {/* MODE 1: Voice Recorder */}
          {inputMode === 'voice' && (
            <div style={{
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              padding: 24,
              textAlign: 'center',
              border: isRecording ? '2px solid var(--accent-danger)' : '1px dashed var(--border-color)',
              marginBottom: 20
            }}>
              {isRecording ? (
                <div>
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%', background: 'var(--accent-danger)',
                    margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 24px rgba(239,68,68,0.5)', animation: 'pulse 1.2s infinite'
                  }}>
                    <span style={{ fontSize: '2rem' }}>🎙️</span>
                  </div>
                  <h4 style={{ color: 'var(--accent-danger)', marginBottom: 4 }}>Listening & Recording Voice...</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Time Elapsed: <strong style={{ color: 'var(--text-primary)' }}>{recordingSeconds}s</strong> (16kHz PCM High-Fidelity)
                  </p>
                  <button
                    className="btn"
                    style={{ background: 'var(--accent-danger)', color: 'white', padding: '10px 24px' }}
                    onClick={stopRecording}
                  >
                    ⏹️ Stop & Transcribe
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-primary-dim)',
                    margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent-primary)'
                  }}>
                    <span style={{ fontSize: '1.8rem' }}>🎙️</span>
                  </div>
                  <h4 style={{ marginBottom: 6 }}>Voice-Based Consultation</h4>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 420, margin: '0 auto 18px' }}>
                    Speak naturally in your preferred language (e.g. Kannada, Hindi, Tamil, Telugu, English, or mixed code-switching).
                  </p>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '10px 24px', fontSize: '0.9rem' }}
                    onClick={startRecording}
                  >
                    🎙️ Start Microphone Recording
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: File Upload */}
          {inputMode === 'file' && (
            <div style={{
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              padding: 24,
              textAlign: 'center',
              border: '1px dashed var(--border-color)',
              marginBottom: 20
            }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: 10 }}>📁</span>
              <h4 style={{ marginBottom: 6 }}>Upload Pre-recorded Audio File</h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                Accepts WAV, MP3, WebM, OGG, M4A clinical audio recordings.
              </p>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="voice-upload-input"
              />
              <label htmlFor="voice-upload-input" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                {uploadedAudioFile ? `Selected: ${uploadedAudioFile.name}` : 'Browse Audio File'}
              </label>
            </div>
          )}

          {/* Transcript / Textarea with Edit Capability */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                TRANSCRIPTION / CLINICAL STATEMENT (EDITABLE):
              </label>
              {asrMetadata && (
                <div style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)', display: 'flex', gap: 10 }}>
                  <span>Language: <strong style={{ color: 'var(--text-secondary)' }}>{asrMetadata.detectedLanguage}</strong></span>
                  {asrMetadata.confidence !== null && (
                    <span>Confidence: <strong style={{ color: 'var(--accent-primary)' }}>{(asrMetadata.confidence * 100).toFixed(0)}%</strong></span>
                  )}
                </div>
              )}
            </div>

            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. ನನಗೆ ಮೂರು ದಿನಗಳಿಂದ ಜ್ವರ ಮತ್ತು ತಲೆನೋವು ಇದೆ ಅಥವಾ 'nange 3 days inda fever ide'..."
              style={{
                width: '100%',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                padding: '12px 14px',
                fontSize: '0.94rem',
                lineHeight: 1.5,
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
            <p style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
              * You can freely edit or confirm the transcript above before triggering full diagnostic assessment.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1, padding: '10px 16px' }}
              disabled={isExtracting || !inputText.trim()}
              onClick={() => extractEntities(inputText, selectedLanguage)}
            >
              {isExtracting ? 'Extracting Entities...' : '🔍 Extract Clinical Entities'}
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1.4, padding: '10px 16px' }}
              disabled={isAssessing || !inputText.trim()}
              onClick={handleRunAssessment}
            >
              {isAssessing ? 'Running Clinical Assessment...' : '⚡ Assess & Generate Voice Response'}
            </button>
          </div>
        </div>

        {/* Right Column: Extracted Entities Preview */}
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🧬</span> Standardized Clinical Representation
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Language-independent normalized representation separating active, negated, and historical entities.
          </p>

          {extractedEntities ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Language & Script Badges */}
              <div style={{
                background: 'var(--bg-elevated)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.82rem'
              }}>
                <div>
                  <span style={{ color: 'var(--text-tertiary)' }}>Detected Script: </span>
                  <strong style={{ color: 'var(--text-primary)' }}>{extractedEntities.detected_language_name || extractedEntities.detected_language}</strong>
                  {extractedEntities.is_romanized && (
                    <span style={{ marginLeft: 6, fontSize: '0.72rem', background: 'var(--accent-info-dim)', color: 'var(--accent-info)', padding: '2px 6px', borderRadius: 4 }}>
                      Romanized Code-Switching
                    </span>
                  )}
                </div>
                <div>
                  <span style={{ color: 'var(--text-tertiary)' }}>Normalized: </span>
                  <strong style={{ color: 'var(--text-primary)' }}>English (en)</strong>
                </div>
              </div>

              {/* Active Symptoms */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-success)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Active Symptoms (Confirmed Present)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {extractedEntities.symptoms && extractedEntities.symptoms.filter((s) => s.present && s.timing !== 'historical').length > 0 ? (
                    extractedEntities.symptoms
                      .filter((s) => s.present && s.timing !== 'historical')
                      .map((s, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: 'var(--accent-success-dim)',
                            border: '1px solid var(--accent-success)',
                            color: 'var(--accent-success)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '4px 10px',
                            fontSize: '0.84rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <span>✓</span>
                          <strong>{s.name}</strong>
                          {s.duration_days && (
                            <span style={{ opacity: 0.8, fontSize: '0.76rem' }}>
                              ({s.duration_days} {s.duration_days === 1 ? 'day' : 'days'})
                            </span>
                          )}
                          {s.severity && (
                            <span style={{ opacity: 0.8, fontSize: '0.76rem' }}>• {s.severity}</span>
                          )}
                        </div>
                      ))
                  ) : (
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>None detected</span>
                  )}
                </div>
              </div>

              {/* Negated Symptoms */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-danger)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Negated Symptoms (Explicitly Absent)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {extractedEntities.symptoms && extractedEntities.symptoms.filter((s) => !s.present).length > 0 ? (
                    extractedEntities.symptoms
                      .filter((s) => !s.present)
                      .map((s, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: 'var(--accent-danger-dim)',
                            border: '1px solid var(--accent-danger)',
                            color: 'var(--accent-danger)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '4px 10px',
                            fontSize: '0.84rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <span>✕</span>
                          <strong>{s.name}</strong>
                          <span style={{ fontSize: '0.74rem', opacity: 0.8 }}>(Absent)</span>
                        </div>
                      ))
                  ) : (
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>None explicitly negated</span>
                  )}
                </div>
              </div>

              {/* Historical Symptoms */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-warning)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Historical Symptoms (Past / Inactive)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {extractedEntities.symptoms && extractedEntities.symptoms.filter((s) => s.timing === 'historical').length > 0 ? (
                    extractedEntities.symptoms
                      .filter((s) => s.timing === 'historical')
                      .map((s, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: 'var(--accent-warning-dim)',
                            border: '1px solid var(--accent-warning)',
                            color: 'var(--accent-warning)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '4px 10px',
                            fontSize: '0.84rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <span>⏳</span>
                          <strong>{s.name}</strong>
                          <span style={{ fontSize: '0.74rem', opacity: 0.8 }}>(Past episode)</span>
                        </div>
                      ))
                  ) : (
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>No historical symptoms noted</span>
                  )}
                </div>
              </div>

              {/* Medications */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Explicit Medications Mentioned
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {extractedEntities.medications && extractedEntities.medications.length > 0 ? (
                    extractedEntities.medications.map((m, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--accent-secondary-dim)',
                          border: '1px solid var(--accent-secondary)',
                          color: 'var(--accent-secondary)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '4px 10px',
                          fontSize: '0.84rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <span>💊</span>
                        <strong>{m}</strong>
                      </div>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>No medications specified</span>
                  )}
                </div>
              </div>

              {/* Confirmation / Ambiguity Banner */}
              {extractedEntities.needs_user_confirmation && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid var(--accent-warning)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  fontSize: '0.82rem',
                  color: 'var(--accent-warning)',
                  marginTop: 'auto'
                }}>
                  ⚠️ <strong>Clarification Recommended:</strong> Symptom duration or severity was unspecified. Please confirm details before clinical decision support.
                </div>
              )}

            </div>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              padding: 24,
              textAlign: 'center',
              color: 'var(--text-tertiary)'
            }}>
              <span style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.5 }}>🧪</span>
              <p style={{ fontSize: '0.88rem', margin: 0 }}>
                Record voice audio or enter text to inspect structured clinical entities.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Assessment Results Section */}
      {assessmentResult && (
        <div className="card" style={{ padding: 24, marginBottom: 24, border: '1px solid var(--border-active)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>🩺</span> Agentic Clinical Assessment & Triage Output
            </h3>
            <span style={{
              fontSize: '0.82rem',
              padding: '4px 12px',
              borderRadius: 20,
              fontWeight: 600,
              background: (assessmentResult.assessment?.triage?.triageLevel === 'Urgent' || assessmentResult.assessment?.triage?.level === 'Urgent') ? 'var(--accent-danger)' :
                          (assessmentResult.assessment?.triage?.triageLevel === 'Priority' || assessmentResult.assessment?.triage?.level === 'Priority') ? 'var(--accent-warning)' :
                          'var(--accent-success)',
              color: 'white'
            }}>
              Triage Level: {assessmentResult.assessment?.triage?.triageLevel || assessmentResult.assessment?.triage?.level || 'Routine'}
            </span>
          </div>

          {/* Neural Voice Synthesized Audio Player */}
          {assessmentResult.audioUrl && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(0,212,170,0.12))',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  className="btn btn-primary"
                  style={{ width: 44, height: 44, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => toggleAudioPlayback(assessmentResult.audioUrl)}
                >
                  <span style={{ fontSize: '1.2rem' }}>{isPlayingAudio ? '⏸️' : '▶️'}</span>
                </button>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    🔊 Neural Voice Response ({assessmentResult.assessment?.languageName || assessmentResult.detectedLanguage})
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Synthesized via Edge-TTS Neural Speech Engine • 24kHz Studio Quality
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <a
                  href={assessmentResult.audioUrl}
                  download="mediagent_consultation.mp3"
                  className="btn btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                >
                  ⬇️ Download MP3
                </a>
              </div>
            </div>
          )}

          <audio
            ref={audioElementRef}
            onEnded={() => setIsPlayingAudio(false)}
            style={{ display: 'none' }}
          />

          {/* Grid: Multilingual Patient Response vs English Translation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 18 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase' }}>
                Localized Patient Advice ({assessmentResult.assessment?.languageName || 'Native Script'})
              </div>
              <p style={{ fontSize: '0.96rem', lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
                {assessmentResult.assessment?.response || assessmentResult.response}
              </p>
            </div>

            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 18 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase' }}>
                English Clinical Translation
              </div>
              <p style={{ fontSize: '0.96rem', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
                {assessmentResult.assessment?.englishResponse || 'Clinical triage completed.'}
              </p>
            </div>
          </div>

          {/* Differential Diagnosis & Clinical Guidelines */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            
            {/* Differential Diagnosis List */}
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 18 }}>
              <h4 style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase' }}>
                Symptom Differential Diagnoses
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {((assessmentResult.assessment?.differentials && assessmentResult.assessment.differentials.length > 0) ? assessmentResult.assessment.differentials : (assessmentResult.assessment?.diagnostic?.differentials || [])).length > 0 ? (
                  ((assessmentResult.assessment?.differentials && assessmentResult.assessment.differentials.length > 0) ? assessmentResult.assessment.differentials : assessmentResult.assessment.diagnostic.differentials).map((diff, idx) => (
                    <div key={idx} style={{
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {diff.condition}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)' }}>
                          Matching features: {(diff.matchedSymptoms || diff.matchedFeatures || []).join(', ') || 'Symptom cluster'}
                        </div>
                      </div>
                      <span className="badge" style={{
                        background: (diff.probability ?? diff.confidence ?? 50) >= 50 ? 'var(--accent-warning-dim)' : 'var(--accent-info-dim)',
                        color: (diff.probability ?? diff.confidence ?? 50) >= 50 ? 'var(--accent-warning)' : 'var(--accent-info)'
                      }}>
                        {diff.probability ?? diff.confidence ?? 50}% match
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>Non-specific symptoms</p>
                )}
              </div>
            </div>

            {/* RAG Evidence & Isolation Notice */}
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 18 }}>
              <h4 style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase' }}>
                Evidence-Based Guidelines (RAG)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {((assessmentResult.assessment?.guidelines && assessmentResult.assessment.guidelines.length > 0) ? assessmentResult.assessment.guidelines : (assessmentResult.assessment?.rag?.retrievedDocuments || [])).length > 0 ? (
                  ((assessmentResult.assessment?.guidelines && assessmentResult.assessment.guidelines.length > 0) ? assessmentResult.assessment.guidelines : assessmentResult.assessment.rag.retrievedDocuments).map((g, idx) => (
                    <div key={idx} style={{
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px'
                    }}>
                      <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--accent-primary)', marginBottom: 4 }}>
                        📚 {g.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {g.recommendation || g.guidelines}
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>Standard clinical reference guidelines</p>
                )}

                {/* Tabular ML Protection Callout */}
                <div style={{
                  marginTop: 6,
                  padding: '8px 12px',
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.74rem',
                  color: 'var(--text-secondary)'
                }}>
                  🛡️ <strong>Machine Learning Model Integrity:</strong> The trained Pima diabetes Random Forest/XGBoost model receives only validated 8-parameter numerical vectors (`preg, plas, pres, skin, insu, mass, pedi, age`). Natural language symptoms are routed exclusively through the clinical symptom differential agent.
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Consultation History Table */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: '1.05rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>📜</span> Recent Multilingual & Voice Consultations
        </h3>

        {consultationsHistory && consultationsHistory.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-tertiary)' }}>
                  <th style={{ padding: '10px 12px' }}>ID / Time</th>
                  <th style={{ padding: '10px 12px' }}>Mode</th>
                  <th style={{ padding: '10px 12px' }}>Language</th>
                  <th style={{ padding: '10px 12px' }}>Original Statement</th>
                  <th style={{ padding: '10px 12px' }}>Active Symptoms</th>
                  <th style={{ padding: '10px 12px' }}>Triage</th>
                  <th style={{ padding: '10px 12px' }}>Audio</th>
                </tr>
              </thead>
              <tbody>
                {consultationsHistory.slice(0, 5).map((c) => {
                  let parsedEntities = {};
                  let parsedAssessment = {};
                  try { parsedEntities = typeof c.clinical_entities === 'string' ? JSON.parse(c.clinical_entities) : c.clinical_entities || {}; } catch {}
                  try { parsedAssessment = typeof c.assessment_result === 'string' ? JSON.parse(c.assessment_result) : c.assessment_result || {}; } catch {}

                  const activeSymptoms = (parsedEntities.symptoms || [])
                    .filter((s) => s.present && s.timing !== 'historical')
                    .map((s) => s.name)
                    .join(', ');

                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.id.slice(0, 12)}...</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>{new Date(c.created_at).toLocaleDateString()}</div>
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <span className="badge">{c.input_type === 'voice' ? '🎙️ Voice' : '⌨️ Text'}</span>
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {c.detected_language?.toUpperCase() || 'EN'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 12px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.original_text || c.original_transcript}
                      </td>
                      <td style={{ padding: '12px 12px', color: 'var(--accent-success)' }}>
                        {activeSymptoms || '—'}
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <span className="badge" style={{
                          background: parsedAssessment.triage?.level === 'Urgent' ? 'var(--accent-danger-dim)' : 'var(--accent-success-dim)',
                          color: parsedAssessment.triage?.level === 'Urgent' ? 'var(--accent-danger)' : 'var(--accent-success)'
                        }}>
                          {parsedAssessment.triage?.level || 'Routine'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        {c.tts_audio_url ? (
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.76rem' }}
                            onClick={() => toggleAudioPlayback(c.tts_audio_url)}
                          >
                            ▶️ Play
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ fontSize: '0.84rem', color: 'var(--text-tertiary)', margin: 0 }}>
            No previous multilingual consultations recorded yet. Start a consultation above!
          </p>
        )}
      </div>

    </div>
  );
}
