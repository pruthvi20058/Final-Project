/**
 * MediAgent Health Companion API Routes
 * Endpoints for multilingual chat, voice transcription, TTS, medicines, disease guides, and OCR packaging identification.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const {
  getAllMedicines,
  getMedicineById,
  getAllDiseases,
  getDiseaseBySlug,
  getDiseaseGuidelines,
  getAllMedicalSources,
  getAllHealthChatSessions,
  getHealthChatHistory,
  deleteHealthChatSession
} = require('../db/database');

const {
  runHealthCompanionChat,
  toolDetectLanguage,
  toolTranscribeVoice,
  toolGenerateVoiceResponse,
  SUPPORTED_LANGUAGES
} = require('../agents/healthInformationAgent');

const { identifyMedicineFromImage } = require('../services/medicineOcrService');

// Multer Storage Configuration
const uploadDir = path.join(__dirname, '..', 'uploads');

// Audio Upload Multer
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.wav';
    cb(null, `voice_companion_${uuidv4()}${ext}`);
  }
});

const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.originalname.match(/\.(wav|webm|ogg|mp3|m4a|aac)$/i) || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio file format. Supported: WAV, WEBM, OGG, MP3, M4A'));
    }
  }
});

// Image Upload Multer for Medicine OCR
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `med_strip_${uuidv4()}${ext}`);
  }
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.originalname.match(/\.(jpg|jpeg|png|webp|bmp)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image format. Supported: JPG, PNG, WEBP, BMP'));
    }
  }
});

// ----------------------------------------------------------------------------
// 1. Chat & Conversational Agent
// ----------------------------------------------------------------------------

router.post('/chat', async (req, res) => {
  try {
    const { sessionId, message, preferredLanguage = 'en', generateVoice = false } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message field is required' });
    }

    const sid = sessionId || `session_${uuidv4()}`;
    const result = await runHealthCompanionChat({
      sessionId: sid,
      message,
      preferredLanguage,
      generateVoice: Boolean(generateVoice)
    });

    return res.json(result);
  } catch (err) {
    console.error('[HealthCompanion] Chat error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------------------------------
// 2. Voice Transcription (Speech-to-Text)
// ----------------------------------------------------------------------------

router.post('/voice/transcribe', uploadAudio.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Audio file is required' });
    }

    const preferredLanguage = req.body.language || 'auto';
    const filePath = req.file.path;

    const asrResult = await toolTranscribeVoice(filePath, preferredLanguage);

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
      confidence: asrResult.confidence,
      provider: asrResult.provider,
      audioUrl: `/uploads/${path.basename(filePath)}`
    });
  } catch (err) {
    console.error('[HealthCompanion] Voice transcription error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------------------------------
// 3. Speech Synthesis (Text-to-Speech)
// ----------------------------------------------------------------------------

router.post('/voice/synthesize', async (req, res) => {
  try {
    const { text, language = 'en' } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Text field is required' });
    }

    const ttsResult = await toolGenerateVoiceResponse(text, language);
    if (!ttsResult.success) {
      return res.status(500).json({ success: false, error: ttsResult.error });
    }

    return res.json(ttsResult);
  } catch (err) {
    console.error('[HealthCompanion] TTS error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------------------------------
// 4. Language Detection
// ----------------------------------------------------------------------------

router.post('/language/detect', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Text field is required' });
    }

    const result = await toolDetectLanguage(text);
    return res.json({
      success: true,
      detectedLanguage: result.languageCode,
      languageName: result.languageName,
      normalizedText: result.normalizedText
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Supported languages list
router.get('/languages', (req, res) => {
  res.json({
    success: true,
    languages: SUPPORTED_LANGUAGES,
    count: SUPPORTED_LANGUAGES.length
  });
});

// ----------------------------------------------------------------------------
// 5. Medicines Directory & OCR Packaging Identification
// ----------------------------------------------------------------------------

router.get('/medicines', (req, res) => {
  try {
    const { query = '', category = '', limit = 50 } = req.query;
    const medicines = getAllMedicines({ query, category, limit: parseInt(limit, 10) || 50 });
    return res.json({
      success: true,
      count: medicines.length,
      medicines
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/medicines/:id', (req, res) => {
  try {
    const medicine = getMedicineById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, error: 'Medicine not found in verified formulary' });
    }
    return res.json({ success: true, medicine });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/medicines/identify-image', uploadImage.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Medicine strip or box image is required' });
    }

    const imagePath = req.file.path;
    const result = await identifyMedicineFromImage(imagePath);

    return res.json({
      ...result,
      imageUrl: `/uploads/${path.basename(imagePath)}`
    });
  } catch (err) {
    console.error('[HealthCompanion] Medicine OCR image identification error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------------------------------
// 6. Disease Guides & Clinical Guidelines
// ----------------------------------------------------------------------------

router.get('/diseases', (req, res) => {
  try {
    const diseases = getAllDiseases();
    return res.json({
      success: true,
      count: diseases.length,
      diseases
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/diseases/:slug', (req, res) => {
  try {
    const disease = getDiseaseBySlug(req.params.slug);
    if (!disease) {
      return res.status(404).json({ success: false, error: 'Disease guide not found' });
    }
    return res.json({ success: true, disease });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/diseases/:slug/guidelines', (req, res) => {
  try {
    const { type } = req.query;
    const guidelines = getDiseaseGuidelines(req.params.slug, type);
    return res.json({
      success: true,
      diseaseSlug: req.params.slug,
      guidelines
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------------------------------
// 7. Medical Sources
// ----------------------------------------------------------------------------

router.get('/sources', (req, res) => {
  try {
    const sources = getAllMedicalSources();
    return res.json({
      success: true,
      count: sources.length,
      sources
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------------------------------
// 8. Health Chat Sessions & History Management
// ----------------------------------------------------------------------------

router.get('/chat/sessions', (req, res) => {
  try {
    const sessions = getAllHealthChatSessions();
    return res.json({ success: true, sessions });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/chat/sessions/:sessionId', (req, res) => {
  try {
    const history = getHealthChatHistory(req.params.sessionId);
    return res.json({
      success: true,
      sessionId: req.params.sessionId,
      messages: history
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/chat/sessions/:sessionId', (req, res) => {
  try {
    const result = deleteHealthChatSession(req.params.sessionId);
    return res.json({ success: true, message: 'Chat history cleared successfully', ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
