const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const {
  processMultilingualText,
  transcribeAudio,
  synthesizeSpeech
} = require('../services/multilingualService');
const {
  SUPPORTED_LANGUAGES,
  runMultilingualConsultation
} = require('../agents/multilingualAgent');
const {
  saveMultilingualConsultation,
  getMultilingualConsultation,
  getAllMultilingualConsultations
} = require('../db/database');

// Configure Multer for Audio Uploads
const uploadDir = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.wav';
    cb(null, `voice_${uuidv4()}${ext}`);
  }
});

const uploadAudio = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max for audio
  fileFilter: (req, file, cb) => {
    // Accept audio/wav, audio/webm, audio/ogg, audio/mpeg, audio/mp4, and octet-stream
    if (file.mimetype.startsWith('audio/') || file.originalname.match(/\.(wav|webm|ogg|mp3|m4a|aac)$/i) || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio file type. Supported formats: WAV, WEBM, OGG, MP3, M4A'));
    }
  }
});

// 1. GET /api/nlp/languages — List supported languages
router.get('/languages', (req, res) => {
  return res.json({
    success: true,
    languages: SUPPORTED_LANGUAGES,
    count: SUPPORTED_LANGUAGES.length
  });
});

// 2. POST /api/nlp/detect-language — Detect input text language
router.post('/detect-language', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Text field is required' });
    }
    const result = await processMultilingualText(text);
    return res.json({
      success: true,
      detectedLanguage: result.detected_language,
      languageName: result.detected_language_name
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. POST /api/nlp/transcribe — Upload and transcribe voice audio
router.post('/transcribe', uploadAudio.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Audio file is required' });
    }

    const preferredLanguage = req.body.language || 'auto';
    const filePath = req.file.path;

    const asrResult = await transcribeAudio(filePath, preferredLanguage);

    if (!asrResult.success) {
      return res.status(422).json({
        success: false,
        errorCode: asrResult.error_code,
        message: asrResult.message
      });
    }

    return res.json({
      success: true,
      transcript: asrResult.transcript,
      detectedLanguage: asrResult.detected_language,
      language: asrResult.language,
      confidence: asrResult.confidence, // Authentic score or null, never fabricated
      provider: asrResult.provider,
      audioUrl: `/uploads/${path.basename(filePath)}`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. POST /api/nlp/process-text — Full multilingual NLP entity extraction
router.post('/process-text', async (req, res) => {
  try {
    const { text, preferredLanguage } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Text parameter is required' });
    }

    const nlpResult = await processMultilingualText(text, preferredLanguage);
    return res.json({
      success: true,
      data: nlpResult
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. POST /api/nlp/process-voice — Audio upload + transcribe + NLP entity extraction
router.post('/process-voice', uploadAudio.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Audio file is required' });
    }

    const preferredLanguage = req.body.language || 'auto';
    const filePath = req.file.path;

    // Transcribe
    const asrResult = await transcribeAudio(filePath, preferredLanguage);
    if (!asrResult.success) {
      return res.status(422).json({
        success: false,
        errorCode: asrResult.error_code,
        message: asrResult.message
      });
    }

    // Extract clinical entities from transcription
    const nlpResult = await processMultilingualText(asrResult.transcript, asrResult.language || preferredLanguage);

    return res.json({
      success: true,
      transcript: asrResult.transcript,
      audioUrl: `/uploads/${path.basename(filePath)}`,
      asrMetadata: {
        confidence: asrResult.confidence,
        detectedLanguage: asrResult.detected_language,
        provider: asrResult.provider
      },
      clinicalData: nlpResult
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. POST /api/nlp/synthesize-speech — Text-to-speech voice generation
router.post('/synthesize-speech', async (req, res) => {
  try {
    const { text, language } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Text field is required' });
    }

    const ttsResult = await synthesizeSpeech(text, language || 'en');
    if (!ttsResult.success) {
      return res.status(500).json({ success: false, error: ttsResult.error });
    }

    return res.json({
      success: true,
      audioUrl: ttsResult.audio_url,
      voiceUsed: ttsResult.voice_used,
      language: ttsResult.language
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. POST /api/nlp/consultation & POST /api/assessments — Complete agentic clinical assessment
const handleAssessment = async (req, res) => {
  try {
    const {
      inputType = 'text',
      text = '',
      preferredLanguage = null,
      patientId = 'PAT-8001',
      patientName = 'Patient',
      patientAge = 45,
      patientGender = 'Female',
      vitals = null,
      userConfirmed = false,
      synthesizeAudio = true
    } = req.body;

    let audioPath = null;
    let audioUrl = null;
    if (req.file) {
      audioPath = req.file.path;
      audioUrl = `/uploads/${path.basename(audioPath)}`;
    }

    const result = await runMultilingualConsultation({
      inputType: req.file ? 'voice' : inputType,
      audioPath,
      rawText: text,
      preferredLanguage,
      patientData: { id: patientId, name: patientName, age: patientAge, gender: patientGender },
      vitals,
      synthesizeAudio,
      userConfirmed: Boolean(userConfirmed)
    });

    if (!result.success) {
      return res.status(422).json(result);
    }

    // Persist to SQLite
    const saved = saveMultilingualConsultation({
      id: result.consultationId,
      patientId,
      inputType: req.file ? 'voice' : inputType,
      originalLanguage: result.detectedLanguage,
      detectedLanguage: result.detectedLanguage,
      originalText: result.originalText,
      originalTranscript: result.originalTranscript,
      normalizedText: result.normalizedText,
      clinicalEntities: result.clinicalEntities,
      userConfirmed: userConfirmed ? 1 : 0,
      assessmentResult: result.assessment,
      audioMetadata: result.asrMetadata,
      audioUrl: audioUrl,
      ttsAudioUrl: result.audioUrl
    });

    return res.json({
      ...result,
      persistedRecord: saved
    });
  } catch (err) {
    console.error('[NLP Route] Assessment failure:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

router.post('/consultation', uploadAudio.single('audio'), handleAssessment);

// 8. GET /api/nlp/consultations & GET /api/assessments — Retrieve consultations
router.get('/consultations', (req, res) => {
  try {
    const list = getAllMultilingualConsultations();
    return res.json({ success: true, consultations: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/consultations/:id', (req, res) => {
  try {
    const record = getMultilingualConsultation(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Consultation record not found' });
    }
    return res.json({ success: true, consultation: record });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = {
  router,
  handleAssessment
};
