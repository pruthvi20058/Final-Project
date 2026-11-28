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

// Symptom fields available for editing during verification
const SYMPTOM_FIELDS = [
  { key: 'name', label: 'Symptom', type: 'text' },
  { key: 'duration', label: 'Duration (days)', type: 'number' },
  { key: 'severity', label: 'Severity', type: 'select', options: ['mild', 'moderate', 'severe'] },
  { key: 'present', label: 'Present', type: 'boolean' }
];

// Browser 16kHz PCM WAV encoder (MediaRecorder fallback)
function encodeWAV(samples, sampleRate = 16000) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

export default function MultilingualVoicePage({ onNavigate }) {
  // ── Workflow state ──
  const [workflowStep, setWorkflowStep] = useState(1); // 1..7
  const [workflowError, setWorkflowError] = useState('');

  // ── Language & input ──
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [inputMode, setInputMode] = useState('voice'); // 'voice' | 'file' | 'text'
  const [inputText, setInputText] = useState('');
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [uploadedAudioFile, setUploadedAudioFile] = useState(null);

  // ── Browser Speech Recognition (Web Speech API) ──
  const [isBrowserListening, setIsBrowserListening] = useState(false);
  const [browserTranscript, setBrowserTranscript] = useState('');
  const [browserTranscriptFinal, setBrowserTranscriptFinal] = useState('');
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false);
  const [speechRecognitionError, setSpeechRecognitionError] = useState(null);
  const recognitionRef = useRef(null);
  const [silenceTimer, setSilenceTimer] = useState(null);

  // ── Processing States ──
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // ── NLP Results ──
  const [asrMetadata, setAsrMetadata] = useState(null);
  const [extractedEntities, setExtractedEntities] = useState(null);

  // ── Verification state (Step 4) ──
  // verifiedSymptoms: array of { name, duration, severity, present, negated, rawTerm, timing }
  const [verifiedSymptoms, setVerifiedSymptoms] = useState([]);
  const [negatedSymptomsConfirmed, setNegatedSymptomsConfirmed] = useState([]);
  const [editedDuration, setEditedDuration] = useState({}); // symptomName -> days
  const [editedSeverity, setEditedSeverity] = useState({}); // symptomName -> severity

  // ── Assessment Results ──
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [consultationsHistory, setConsultationsHistory] = useState([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // ── Audio References (MediaRecorder fallback) ──
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const scriptProcessorRef = useRef(null);
  const audioSamplesRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const audioElementRef = useRef(null);

  // ── Init: check Web Speech API support ──
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechRecognitionSupported(!!SpeechRecognition);
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = selectedLanguage === 'auto' ? 'en-IN' : `${selectedLanguage}-IN`;

      recognitionRef.current.onstart = () => {
        setSpeechRecognitionError(null);
        setIsBrowserListening(true);
      };

      recognitionRef.current.onend = () => {
        setIsBrowserListening(false);
      };

      recognitionRef.current.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }
        setBrowserTranscript(interim);
        if (final) {
          setBrowserTranscriptFinal((prev) => prev + ' ' + final);
          setInputText((prev) => (prev ? prev + ' ' + final : final));
          // Reset silence timer on final result
          resetSilenceTimer();
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setSpeechRecognitionError(event.error);
        setIsBrowserListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setErrorMessage('Microphone permission denied. Please allow microphone access or use text input.');
        } else if (event.error === 'no-speech') {
          setErrorMessage('No speech detected. Please try speaking again or use text input.');
        } else if (event.error === 'audio-capture') {
          setErrorMessage('No microphone available. Please connect a microphone or use text input.');
        } else if (event.error === 'not-supported') {
          setErrorMessage('Speech recognition not supported in this browser. Use text input instead.');
        } else {
          setErrorMessage(`Speech recognition error: ${event.error}`);
        }
      };

      recognitionRef.current.onsoundstart = () => {
        resetSilenceTimer();
      };

      recognitionRef.current.onsoundend = () => {
        // Start silence timer — if no speech for ~3s, auto-stop
        setSilenceTimer(setTimeout(() => {
          if (isBrowserListening) {
            stopBrowserRecognition();
          }
        }, 3000));
      };
    }
  }, [selectedLanguage]);

  const resetSilenceTimer = () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    setSilenceTimer(null);
  };

  // ── Load consultation history ──
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

  const setStep = (step) => {
    setWorkflowStep(step);
    setWorkflowError('');
  };

  const resetWorkflow = () => {
    setWorkflowStep(1);
    setInputText('');
    setRecordedAudioBlob(null);
    setUploadedAudioFile(null);
    setExtractedEntities(null);
    setVerifiedSymptoms([]);
    setNegatedSymptomsConfirmed([]);
    setEditedDuration({});
    setEditedSeverity({});
    setAssessmentResult(null);
    setBrowserTranscript('');
    setBrowserTranscriptFinal('');
    setAsrMetadata(null);
    setErrorMessage('');
  };

  // ── Recording Handlers (MediaRecorder / Web Audio fallback) ──
  const startRecording = async () => {
    setErrorMessage('');
    setRecordedAudioBlob(null);
    audioSamplesRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true }
      });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
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
      setErrorMessage('Microphone access denied or unavailable. Use File Upload / Direct Text mode.');
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    const chunks = audioSamplesRef.current;
    if (chunks.length === 0) {
      setErrorMessage('No voice audio detected in recording.');
      return;
    }

    let totalLength = 0;
    for (const chunk of chunks) totalLength += chunk.length;
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }

    const wavBlob = encodeWAV(merged, 16000);
    setRecordedAudioBlob(wavBlob);
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

  // ── Browser Speech Recognition start/stop ──
  const startBrowserRecognition = () => {
    if (!recognitionRef.current) {
      setErrorMessage('Browser Speech Recognition is not available in this browser.');
      return;
    }
    setErrorMessage('');
    setSpeechRecognitionError(null);
    setBrowserTranscript('');
    try {
      recognitionRef.current.start();
    } catch (err) {
      setErrorMessage('Failed to start speech recognition. Try text input instead.');
      console.error(err);
    }
  };

  const stopBrowserRecognition = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsBrowserListening(false);
    resetSilenceTimer();
  };

  const cancelBrowserRecognition = () => {
    stopBrowserRecognition();
    setBrowserTranscript('');
    setSpeechRecognitionError(null);
  };

  const applyBrowserTranscript = () => {
    setInputText(browserTranscriptFinal || browserTranscript);
    stopBrowserRecognition();
    setWorkflowStep(3); // move to extraction preview
  };

  // ── Entity extraction ──
  const extractEntities = async (textToExtract, lang) => {
    const queryText = textToExtract || inputText;
    if (!queryText || !queryText.trim()) return;

    setIsExtracting(true);
    setErrorMessage('');
    try {
      const res = await nlpService.processText(queryText, lang || selectedLanguage);
      if (res && res.success && res.data) {
        setExtractedEntities(res.data);
        initializeVerifiedSymptoms(res.data);
        setStep(4); // Auto-advance to mandatory verification
      }
    } catch (err) {
      setErrorMessage(`Clinical Entity Extraction: ${err.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  // Initialize verifiedSymptoms from NLP extraction
  const initializeVerifiedSymptoms = (nlpData) => {
    const symptoms = (nlpData.symptoms || []).map((s) => ({
      name: s.name,
      rawTerm: s.raw_term || s.name,
      duration: s.duration_days || null,
      severity: s.severity || 'moderate',
      present: s.present !== false,
      negated: s.negated === true,
      timing: s.timing || 'current',
      isHistorical: s.is_historical === true
    }));
    setVerifiedSymptoms(symptoms);
    setNegatedSymptomsConfirmed(symptoms.filter((s) => s.negated).map((s) => s.name));
    if (symptoms.length > 0) {
      setEditedDuration({});
      symptoms.forEach((s) => { if (s.duration) setEditedDuration((prev) => ({ ...prev, [s.name]: s.duration })); });
      setEditedSeverity({});
      symptoms.forEach((s) => { setEditedSeverity((prev) => ({ ...prev, [s.name]: s.severity })); });
    }
  };

  // ── Verification actions (Step 4) ──
  const toggleSymptomPresent = (name) => {
    setVerifiedSymptoms((prev) => prev.map((s) =>
      s.name === name ? { ...s, present: !s.present } : s
    ));
  };

  const removeSymptom = (name) => {
    setVerifiedSymptoms((prev) => prev.filter((s) => s.name !== name));
    setEditedDuration((prev) => { const { [name]: _, ...rest } = prev; return rest; });
    setEditedSeverity((prev) => { const { [name]: _, ...rest } = prev; return rest; });
  };

  const addSymptom = () => {
    const newName = prompt('Enter symptom name (e.g. fever, headache):');
    if (!newName || !newName.trim()) return;
    const trimmed = newName.trim();
    if (verifiedSymptoms.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage('This symptom already exists.');
      return;
    }
    setVerifiedSymptoms((prev) => [...prev, {
      name: trimmed,
      rawTerm: trimmed,
      duration: null,
      severity: 'moderate',
      present: true,
      negated: false,
      timing: 'current',
      isHistorical: false
    }]);
  };

  const updateDuration = (name, days) => {
    const d = days === '' || days === null ? null : parseInt(days, 10);
    if (d !== null && (isNaN(d) || d < 0)) {
      setErrorMessage('Duration must be a non-negative number of days.');
      return;
    }
    setEditedDuration((prev) => ({ ...prev, [name]: d }));
    setVerifiedSymptoms((prev) => prev.map((s) =>
      s.name === name ? { ...s, duration: d } : s
    ));
  };

  const updateSeverity = (name, severity) => {
    setEditedSeverity((prev) => ({ ...prev, [name]: severity }));
    setVerifiedSymptoms((prev) => prev.map((s) =>
      s.name === name ? { ...s, severity } : s
    ));
  };

  const toggleNegated = (name) => {
    setNegatedSymptomsConfirmed((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
    setVerifiedSymptoms((prev) => prev.map((s) =>
      s.name === name ? { ...s, negated: !s.negated, present: !s.negated } : s
    ));
  };

  const confirmVerification = async () => {
    const symptomNames = verifiedSymptoms.map((s) => s.name);
    setWorkflowError('');
    setIsAssessing(true);
    setErrorMessage('');
    try {
      const res = await nlpService.verifySymptoms({
        text: inputText,
        preferredLanguage: selectedLanguage,
        patientId: 'PAT-8001',
        patientName: 'Sarah Johnson',
        patientAge: 45,
        patientGender: 'Female',
        synthesizeAudio: true,
        verifiedSymptoms: symptomNames
      });
      if (res && res.success) {
        setAssessmentResult(res);
        if (res.clinicalEntities) setExtractedEntities(res.clinicalEntities);
        await loadConsultations();
        setStep(5);
      }
    } catch (err) {
      setErrorMessage(`Clinical Assessment: ${err.message}`);
      setWorkflowError(err.message || 'Assessment failed.');
    } finally {
      setIsAssessing(false);
    }
  };

  // ── Run assessment directly (legacy path, still gated) ──
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
        if (res.clinicalEntities) setExtractedEntities(res.clinicalEntities);
        await loadConsultations();
        setStep(5);
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
    setWorkflowStep(3);
    await extractEntities(preset.text, preset.lang);
  };

  const toggleAudioPlayback = (url) => {
    if (!audioElementRef.current) return;
    if (isPlayingAudio) {
      audioElementRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioElementRef.current.src = url;
      audioElementRef.current.play().then(() => setIsPlayingAudio(true)).catch((e) => console.warn('Audio play error:', e));
    }
  };

  // ── Render helpers ──
  const stepHeader = (n, title) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: workflowStep >= n ? 'var(--accent-primary)' : 'var(--border-color)',
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.85rem', fontWeight: 600
      }}>{n}</div>
      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{title}</span>
    </div>
  );

  const isStepActive = (n) => workflowStep === n;
  const isStepCompleted = (n) => workflowStep > n;

  return (
    <div className="fade-in" style={{ paddingBottom: 60 }}>
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.6rem' }}>🎙️</span> Multilingual Voice & Clinical NLP Agent
          </h2>
          <p className="subtitle">
            7-step multilingual clinical workflow with mandatory patient verification,
            browser speech recognition, and Task 4 model-readiness gating.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span className="badge" style={{ background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}>
            7-Step Verified Workflow
          </span>
          <span className="badge" style={{ background: 'var(--accent-secondary-dim)', color: 'var(--accent-secondary)', borderColor: 'var(--accent-secondary)' }}>
            Strict Tabular ML Isolation
          </span>
        </div>
      </div>

      <SafetyDisclaimer />

      {errorMessage && (
        <div style={{
          background: 'rgba(239,68,68,0.12)', border: '1px solid var(--accent-danger)',
          borderRadius: 'var(--radius-md)', padding: '12px 18px', color: '#f87171',
          marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10
        }}>
          <span>⚠️</span>
          <div style={{ flex: 1, fontSize: '0.88rem' }}>{errorMessage}</div>
          <button onClick={() => setErrorMessage('')} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
        </div>
      )}
      {workflowError && (
        <div style={{
          background: 'rgba(239,68,68,0.12)', border: '1px solid var(--accent-danger)',
          borderRadius: 'var(--radius-md)', padding: '12px 18px', color: '#f87171',
          marginBottom: 18
        }}>
          <span>⚠️</span> <span style={{ fontSize: '0.88rem' }}>{workflowError}</span>
        </div>
      )}

      {/* Workflow Progress Bar */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 8 }}>
          {[
            { n: 1, label: 'Language' },
            { n: 2, label: 'Input' },
            { n: 3, label: 'Extract' },
            { n: 4, label: 'Verify' },
            { n: 5, label: 'Assess' },
            { n: 6, label: 'Results' },
            { n: 7, label: 'History' }
          ].map((step) => (
            <div key={step.n} style={{
              display: 'flex', alignItems: 'center', gap: 6, minWidth: 90,
              opacity: workflowStep >= step.n ? 1 : 0.5,
              fontSize: '0.75rem', fontWeight: 600,
              color: workflowStep >= step.n ? 'var(--accent-primary)' : 'var(--text-tertiary)'
            }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%',
                background: workflowStep >= step.n ? 'var(--accent-primary)' : 'var(--border-color)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem'
              }}>{step.n}</span>
              <span>{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── STEP 1: Language Selection ── */}
      {isStepActive(1) && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🌐</span> Step 1 — Select Language
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
            Choose your preferred language for symptom input, or leave on Auto-Detect to let the system identify the language automatically.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => { setSelectedLanguage(l.code); setStep(2); }}
                style={{
                  background: selectedLanguage === l.code ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                  color: selectedLanguage === l.code ? 'white' : 'var(--text-primary)',
                  border: `1px solid ${selectedLanguage === l.code ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius-md)', padding: '14px 16px',
                  textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem'
                }}
              >
                <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{l.flag}</div>
                <div style={{ fontWeight: 600 }}>{l.name}</div>
                <div style={{ fontSize: '0.78rem', opacity: 0.8 }}>{l.nativeName}</div>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => onNavigate?.()}>Back to Dashboard</button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Symptom Input ── */}
      {isStepActive(2) && (
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🗣️</span> Step 2 — Describe Your Symptoms
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Speak, upload audio, or type your symptoms in your selected language. You can edit the transcript before submission.
          </p>

          {/* Mode Selector */}
          <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
            {[
              { id: 'voice', label: '🎙️ Live Microphone', disabled: false },
              { id: 'file', label: '📁 Audio File', disabled: false },
              { id: 'text', label: '⌨️ Text Input', disabled: false }
            ].map((m) => (
              <button
                key={m.id}
                className={`btn ${inputMode === m.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setInputMode(m.id)}
                style={{ flex: 1, padding: '8px 12px', fontSize: '0.84rem' }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Mode 1: Live Microphone (MediaRecorder + Browser Speech Recognition) */}
          {inputMode === 'voice' && (
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 20, border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Live Microphone</h4>
                {speechRecognitionSupported ? (
                  <span style={{ fontSize: '0.78rem', padding: '4px 8px', borderRadius: 4, background: '#e0e7ff', color: '#3730a3' }}>
                    Browser Speech Recognition: Available
                  </span>
                ) : (
                  <span style={{ fontSize: '0.78rem', padding: '4px 8px', borderRadius: 4, background: '#fef2f2', color: '#991b1b' }}>
                    Browser Speech Recognition: Not Supported
                  </span>
                )}
              </div>

              {speechRecognitionSupported && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <button
                    className="btn"
                    onClick={isBrowserListening ? stopBrowserRecognition : startBrowserRecognition}
                    style={{
                      background: isBrowserListening ? 'var(--accent-danger)' : 'var(--accent-primary)',
                      color: 'white', padding: '10px 24px', fontSize: '0.9rem', flex: 1
                    }}
                  >
                    {isBrowserListening ? '⏹️ Stop Listening' : '🎙️ Start Browser Speech Recognition'}
                  </button>
                  <button
                    onClick={cancelBrowserRecognition}
                    disabled={!isBrowserListening}
                    style={{ padding: '10px 20px', fontSize: '0.85rem', opacity: isBrowserListening ? 1 : 0.5 }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {!speechRecognitionSupported && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-danger)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem', color: '#ef4444' }}>
                  Browser Speech Recognition is not supported. Use MediaRecorder recording below or Text Input mode.
                </div>
              )}

              {isBrowserListening && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-danger)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
                    <span style={{ fontWeight: 600 }}>Listening… Speak now in your selected language.</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{browserTranscript}</div>
                  {speechRecognitionError && (
                    <div style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: 4 }}>{speechRecognitionError}</div>
                  )}
                </div>
              )}

              {browserTranscriptFinal && (
                <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 16, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>Final Transcript:</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{browserTranscriptFinal}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      className="btn btn-primary"
                      onClick={applyBrowserTranscript}
                      style={{ flex: 1, padding: '8px 14px', fontSize: '0.85rem' }}
                    >
                      ✅ Use This Transcript
                    </button>
                    <button
                      onClick={cancelBrowserRecognition}
                      style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                    >
                      ❌ Discard
                    </button>
                  </div>
                </div>
              )}

              {/* MediaRecorder fallback */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>MediaRecorder Recording (Fallback)</h4>
                {isRecording ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      width: 72, height: 72, borderRadius: '50%', background: 'var(--accent-danger)',
                      margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 0 24px rgba(239,68,68,0.5)', animation: 'pulse 1.2s infinite'
                    }}><span style={{ fontSize: '2rem' }}>🎙️</span></div>
                    <h4 style={{ color: 'var(--accent-danger)', marginBottom: 4 }}>Recording...</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                      Time: <strong style={{ color: 'var(--text-primary)' }}>{recordingSeconds}s</strong> (16kHz PCM)
                    </p>
                    <button className="btn" style={{ background: 'var(--accent-danger)', color: 'white', padding: '10px 24px' }} onClick={stopRecording}>
                      ⏹️ Stop & Transcribe
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-primary-dim)',
                      margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--accent-primary)'
                    }}><span style={{ fontSize: '1.8rem' }}>🎙️</span></div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                      Record audio using the browser MediaRecorder API.
                    </p>
                    <button className="btn btn-primary" style={{ padding: '10px 24px' }} onClick={startRecording}>
                      🎙️ Start Microphone Recording
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mode 2: File Upload */}
          {inputMode === 'file' && (
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 24, textAlign: 'center', border: '1px dashed var(--border-color)' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: 10 }}>📁</span>
              <h4 style={{ marginBottom: 6 }}>Upload Pre-recorded Audio File</h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                Accepts WAV, MP3, WebM, OGG, M4A clinical audio recordings.
              </p>
              <input type="file" accept="audio/*" onChange={handleFileUpload} style={{ display: 'none' }} id="voice-upload-input" />
              <label htmlFor="voice-upload-input" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                {uploadedAudioFile ? `Selected: ${uploadedAudioFile.name}` : 'Browse Audio File'}
              </label>
            </div>
          )}

          {/* Mode 3: Text Input */}
          {inputMode === 'text' && (
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 20, border: '1px solid var(--border-color)' }}>
              <textarea
                rows={5}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="e.g. ನನಗೆ ಮೂರು ದಿನಗಳಿಂದ ಜ್ವರ ಮತ್ತು ತಲೆನೋವು ಇದೆ atau 'I have had fever and headache for 3 days'..."
                style={{
                  width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '12px 14px',
                  fontSize: '0.94rem', lineHeight: 1.5, resize: 'vertical', boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {/* Transcript edit (when available from ASR/browser) */}
          {(asrMetadata || browserTranscriptFinal) && (
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Transcript (Editable Before Submission):
              </label>
              <textarea
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                style={{
                  width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '10px 12px',
                  fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box'
                }}
              />
              <p style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                * Edit the transcript above before extracting clinical entities.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              className="btn btn-secondary"
              disabled={isExtracting || !inputText.trim()}
              onClick={() => extractEntities(inputText, selectedLanguage)}
              style={{ flex: 1, padding: '10px 16px' }}
            >
              {isExtracting ? 'Extracting Entities...' : '🔍 Extract Clinical Entities'}
            </button>
            <button
              className="btn btn-primary"
              disabled={isExtracting || !inputText.trim()}
              onClick={() => extractEntities(inputText, selectedLanguage)}
              style={{ flex: 1.4, padding: '10px 16px' }}
            >
              ⚡ Extract & Proceed to Verification
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Entity Extraction Preview ── */}
      {isStepActive(3) && (
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🧬</span> Step 3 — Extracted Clinical Entities
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            The system has extracted the following structured clinical entities from your input. Review them before proceeding to verification.
          </p>

          {!extractedEntities && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              No entities extracted yet. Return to Step 2 to enter your symptoms.
            </div>
          )}

          {extractedEntities && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem'
              }}>
                <div>
                  <span style={{ color: 'var(--text-tertiary)' }}>Detected Language: </span>
                  <strong style={{ color: 'var(--text-primary)' }}>{extractedEntities.detected_language_name || extractedEntities.detected_language}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-tertiary)' }}>Normalized: </span>
                  <strong style={{ color: 'var(--text-primary)' }}>English (en)</strong>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-success)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Active Symptoms (to verify below)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {extractedEntities.symptoms && extractedEntities.symptoms.filter((s) => s.present && s.timing !== 'historical').length > 0 ? (
                    extractedEntities.symptoms
                      .filter((s) => s.present && s.timing !== 'historical')
                      .map((s, idx) => (
                        <div key={idx} style={{
                          background: 'var(--accent-success-dim)', border: '1px solid var(--accent-success)',
                          color: 'var(--accent-success)', borderRadius: 'var(--radius-sm)',
                          padding: '4px 10px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: 6
                        }}>
                          <span>✓</span> <strong>{s.name}</strong>
                          {s.duration_days && <span style={{ opacity: 0.8, fontSize: '0.76rem' }}>({s.duration_days} day{s.duration_days === 1 ? '' : 's'})</span>}
                          {s.severity && <span style={{ opacity: 0.8, fontSize: '0.76rem' }}>• {s.severity}</span>}
                        </div>
                      ))
                  ) : (
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>None detected</span>
                  )}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-danger)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Negated Symptoms (Explicitly Absent)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {extractedEntities.symptoms && extractedEntities.symptoms.filter((s) => !s.present).length > 0 ? (
                    extractedEntities.symptoms
                      .filter((s) => !s.present)
                      .map((s, idx) => (
                        <div key={idx} style={{
                          background: 'var(--accent-danger-dim)', border: '1px solid var(--accent-danger)',
                          color: 'var(--accent-danger)', borderRadius: 'var(--radius-sm)',
                          padding: '4px 10px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: 6
                        }}>
                          <span>✕</span> <strong>{s.name}</strong> <span style={{ fontSize: '0.74rem', opacity: 0.8 }}> (Absent)</span>
                        </div>
                      ))
                  ) : (
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>None explicitly negated</span>
                  )}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-warning)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Historical Symptoms (Past / Inactive)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {extractedEntities.symptoms && extractedEntities.symptoms.filter((s) => s.timing === 'historical').length > 0 ? (
                    extractedEntities.symptoms
                      .filter((s) => s.timing === 'historical')
                      .map((s, idx) => (
                        <div key={idx} style={{
                          background: 'var(--accent-warning-dim)', border: '1px solid var(--accent-warning)',
                          color: 'var(--accent-warning)', borderRadius: 'var(--radius-sm)',
                          padding: '4px 10px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: 6
                        }}>
                          <span>⏳</span> <strong>{s.name}</strong> <span style={{ fontSize: '0.74rem', opacity: 0.8 }}> (Past)</span>
                        </div>
                      ))
                  ) : (
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>No historical symptoms</span>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 'auto' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => setStep(4)}
                  style={{ padding: '10px 24px', fontSize: '0.9rem' }}
                >
                  ✅ Review & Verify Symptoms (Mandatory)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 4: Patient Verification & Correction (MANDATORY) ── */}
      {isStepActive(4) && (
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>✅</span> Step 4 — Patient Verification & Correction (Mandatory)
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Before any clinical assessment runs, you must review and confirm the extracted symptoms.
            You can edit, remove, or add symptoms, correct duration/severity, and confirm negated symptoms.
          </p>

          {/* Negated symptoms confirmation */}
          {verifiedSymptoms.some((s) => s.negated) && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-danger)',
              borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 12
            }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-danger)', marginBottom: 6 }}>
                ⚠️ Confirm Negated Symptoms
              </div>
              <p style={{ fontSize: '0.85rem', margin: '0 0 8px 0' }}>
                The following symptoms were explicitly stated as absent. Confirm you want to exclude them:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {verifiedSymptoms.filter((s) => s.negated).map((s) => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={negatedSymptomsConfirmed.includes(s.name)}
                      onChange={() => toggleNegated(s.name)}
                    />
                    <label style={{ fontSize: '0.85rem', cursor: 'pointer', margin: 0 }}>{s.name}</label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verified symptom list */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 400, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 12, background: 'var(--bg-elevated)' }}>
            {verifiedSymptoms.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 20 }}>No symptoms to verify.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {verifiedSymptoms.map((symptom) => (
                  <div key={symptom.name} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)', padding: '12px 14px', display: 'flex',
                    flexDirection: 'column', gap: 10
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={symptom.present}
                          onChange={() => toggleSymptomPresent(symptom.name)}
                          style={{ width: 18, height: 18 }}
                        />
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: symptom.present ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                          {symptom.name}
                        </span>
                        {!symptom.present && <span style={{ fontSize: '0.76rem', color: 'var(--accent-danger)' }}> (marked absent)</span>}
                      </div>
                      <button
                        onClick={() => removeSymptom(symptom.name)}
                        style={{ background: 'transparent', border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)', borderRadius: 4, padding: '4px 8px', fontSize: '0.78rem', cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Duration (days)</label>
                        <input
                          type="number"
                          value={editedDuration[symptom.name] !== undefined ? editedDuration[symptom.name] : (symptom.duration || '')}
                          onChange={(e) => updateDuration(symptom.name, e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', background: 'var(--bg-elevated)' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Severity</label>
                        <select
                          value={editedSeverity[symptom.name] || symptom.severity || 'moderate'}
                          onChange={(e) => updateSeverity(symptom.name, e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', background: 'var(--bg-elevated)' }}
                        >
                          <option value="mild">Mild</option>
                          <option value="moderate">Moderate</option>
                          <option value="severe">Severe</option>
                        </select>
                      </div>
                      {symptom.negated && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="checkbox"
                            checked={negatedSymptomsConfirmed.includes(symptom.name)}
                            onChange={() => toggleNegated(symptom.name)}
                          />
                          <label style={{ fontSize: '0.8rem', margin: 0, cursor: 'pointer' }}>Confirm this symptom is absent</label>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
            <button className="btn btn-secondary" onClick={() => addSymptom()} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>➕ Add Symptom</button>
            <button className="btn btn-secondary" onClick={() => setStep(3)} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>← Back to Extraction</button>
            <button
              className="btn btn-primary"
              disabled={isAssessing}
              onClick={confirmVerification}
              style={{ padding: '10px 24px', fontSize: '0.9rem', marginLeft: 'auto' }}
            >
              {isAssessing ? 'Running Assessment...' : '✅ Confirm & Run Clinical Assessment'}
            </button>
          </div>

          <div style={{
            background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--accent-warning)',
            borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '0.78rem', color: 'var(--accent-warning)', marginTop: 12
          }}>
            ⚠️ <strong>Verification is mandatory.</strong> Clinical assessment will not run until you explicitly confirm your symptoms.
            This system does not provide medical diagnoses — consult a licensed healthcare professional.
          </div>
        </div>
      )}

      {/* ── STEP 5: Clinical Assessment ── */}
      {isStepActive(5) && assessmentResult && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🩺</span> Step 5 — Clinical Assessment & Triage
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Assessment is running based on your verified symptoms. Results appear below once complete.
          </p>
          <div style={{ marginBottom: 16 }}>
            <button className="btn btn-primary" onClick={() => setStep(6)} style={{ padding: '8px 16px' }}>View Results →</button>
          </div>
        </div>
      )}
      {isStepActive(5) && !assessmentResult && (
        <div className="card" style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No assessment results available. Please complete verification first.</p>
        </div>
      )}

      {/* ── STEP 6: Results + Safety Disclaimers ── */}
      {isStepActive(6) && assessmentResult && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📋</span> Step 6 — Assessment Results
          </h3>

          {/* Triage badge */}
          <div style={{ marginBottom: 20 }}>
            <span style={{
              fontSize: '0.82rem', padding: '4px 12px', borderRadius: 20, fontWeight: 600,
              background: (assessmentResult.assessment?.triage?.triageLevel === 'Urgent' || assessmentResult.assessment?.triage?.level === 'Urgent') ? 'var(--accent-danger)' :
                          (assessmentResult.assessment?.triage?.triageLevel === 'Priority' || assessmentResult.assessment?.triage?.level === 'Priority') ? 'var(--accent-warning)' : 'var(--accent-success)',
              color: 'white'
            }}>
              Triage: {assessmentResult.assessment?.triage?.triageLevel || assessmentResult.assessment?.triage?.level || 'Routine'}
            </span>
          </div>

          {/* TTS audio */}
          {assessmentResult.audioUrl && (
            <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(0,212,170,0.12))', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="btn btn-primary" style={{ width: 44, height: 44, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => toggleAudioPlayback(assessmentResult.audioUrl)}>
                  <span style={{ fontSize: '1.2rem' }}>{isPlayingAudio ? '⏸️' : '▶️'}</span>
                </button>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>🔊 Neural Voice Response</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Synthesized via Edge-TTS Neural Speech Engine</div>
                </div>
              </div>
              <a href={assessmentResult.audioUrl} download="mediagent_consultation.mp3" className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>⬇️ Download MP3</a>
            </div>
          )}
          <audio ref={audioElementRef} onEnded={() => setIsPlayingAudio(false)} style={{ display: 'none' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 18 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase' }}>Localized Patient Advice</div>
              <p style={{ fontSize: '0.96rem', lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>{assessmentResult.localizedResponseText || assessmentResult.assessment?.response || 'Clinical assessment completed.'}</p>
            </div>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 18 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase' }}>English Clinical Translation</div>
              <p style={{ fontSize: '0.96rem', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>{assessmentResult.localizedResponseText || 'Clinical triage completed.'}</p>
            </div>
          </div>

          {/* Feature mappings (Task 4 readiness) */}
          {assessmentResult.featureMappings && (
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20, border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>Symptom → Disease Feature Mapping (Task 4 Readiness)</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {Object.entries(assessmentResult.featureMappings).map(([disease, mapping]) => (
                  <div key={disease} style={{ marginBottom: 8, padding: '6px 10px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: `1px solid ${mapping.status === 'OK' ? 'var(--accent-success)' : mapping.status === 'INSUFFICIENT_DATA' ? 'var(--accent-warning)' : 'var(--border-color)'}` }}>
                    <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>{disease.charAt(0).toUpperCase() + disease.slice(1)}</div>
                    <div style={{ fontSize: '0.78rem', color: mapping.status === 'OK' ? 'var(--accent-success)' : mapping.status === 'INSUFFICIENT_DATA' ? 'var(--accent-warning)' : 'var(--text-tertiary)' }}>
                      Status: {mapping.status}
                    </div>
                    {mapping.missingRequired && mapping.missingRequired.length > 0 && (
                      <div style={{ fontSize: '0.76rem', color: 'var(--accent-warning)', marginTop: 2 }}>Missing: {mapping.missingRequired.join(', ')}</div>
                    )}
                    {mapping.message && <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{mapping.message}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 'auto' }}>
            <button className="btn btn-primary" onClick={() => setStep(7)} style={{ padding: '10px 24px' }}>View Consultation History →</button>
          </div>
        </div>
      )}

      {/* ── STEP 7: Consultation History ── */}
      {isStepActive(7) && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📜</span> Step 7 — Consultation History
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
                    <th style={{ padding: '10px 12px' }}>Verified</th>
                    <th style={{ padding: '10px 12px' }}>Triage</th>
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
                        <td style={{ padding: '12px 12px' }}><span className="badge">{c.input_type === 'voice' ? '🎙️ Voice' : '⌨️ Text'}</span></td>
                        <td style={{ padding: '12px 12px' }}><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.detected_language?.toUpperCase() || 'EN'}</span></td>
                        <td style={{ padding: '12px 12px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.original_text || c.original_transcript}</td>
                        <td style={{ padding: '12px 12px', color: 'var(--accent-success)' }}>{activeSymptoms || '—'}</td>
                        <td style={{ padding: '12px 12px' }}><span style={{ fontSize: '0.78rem', color: c.user_confirmed ? 'var(--accent-success)' : 'var(--text-tertiary)' }}>{c.user_confirmed ? '✅ Yes' : '❌ No'}</span></td>
                        <td style={{ padding: '12px 12px' }}><span className="badge" style={{ background: parsedAssessment.triage?.level === 'Urgent' ? 'var(--accent-danger-dim)' : 'var(--accent-success-dim)', color: parsedAssessment.triage?.level === 'Urgent' ? 'var(--accent-danger)' : 'var(--accent-success)' }}>{parsedAssessment.triage?.level || 'Routine'}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ fontSize: '0.84rem', color: 'var(--text-tertiary)', margin: 0 }}>No previous consultations recorded yet.</p>
          )}
          <div style={{ marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ padding: '8px 16px' }}>Start New Consultation</button>
          </div>
        </div>
      )}

      {/* Quick presets (available on input step) */}
      {isStepActive(2) && (
        <div className="card" style={{ padding: '14px 20px', marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>⚡ Quick Benchmarks:</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRESETS.map((p, i) => (
                <button key={i} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem' }} onClick={() => applyPreset(p)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}