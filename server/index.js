const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const multer = require('multer');
const { getDb } = require('./db/database');
const { v4: uuidv4 } = require('uuid');
const { runPipeline, registerStream, removeStream } = require('./agents/orchestrator');
const { vectorSearch } = require('./knowledge/medicalKB');
const { authenticateToken, optionalAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Security middleware
// ---------------------------------------------------------------------------

// Helmet: secure HTTP headers (X-Frame-Options, X-Content-Type-Options, CSP, etc.)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // needed for some assets
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      connectSrc: ["'self'", 'https:'],
      fontSrc: ["'self'", 'https:', 'data:'],
    },
  },
}));

// CORS: restrict to specific origins in production; allow all only in dev
const corsOptions = {
  origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? false : '*'),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Rate limiting: general API limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // max 300 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } },
});
app.use('/api/', apiLimiter);

// Stricter rate limiting for login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 auth attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'AUTH_RATE_LIMITED', message: 'Too many authentication attempts. Please try again later.' } },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const fs = require('fs');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

// ---------------------------------------------------------------------------
// Public routes (no authentication required)
// ---------------------------------------------------------------------------

app.use('/api/auth', require('./routes/auth'));

// Root and Health endpoints — always public
app.get('/', (req, res) => {
  res.json({
    name: 'MediAgent Clinical Decision Support API',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      stats: '/api/stats',
      patients: '/api/patients',
      reports: '/api/reports',
      chat: '/api/chat',
      knowledge: '/api/knowledge',
      consultations: '/api/consultations',
      assessments: '/api/assessments',
      auth: '/api/auth',
    },
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    environment: process.env.NODE_ENV || 'production',
  });
});

app.get('/api/chat', (req, res) => {
  res.json({
    message: 'MediAgent RAG Chat endpoint. Send a POST request with { message, sessionId } to chat.',
    status: 'active',
  });
});

// ---------------------------------------------------------------------------
// Protected routes (authentication required)
// ---------------------------------------------------------------------------

app.use('/api/patients', authenticateToken, require('./routes/patients'));
app.use('/api/reports', authenticateToken, require('./routes/reports'));
app.use('/api/consultations', authenticateToken, require('./routes/consultations'));
app.use('/api/knowledge', authenticateToken, require('./routes/knowledge'));
app.use('/api/ml', authenticateToken, require('./routes/ml'));
app.use('/api/health-companion', authenticateToken, require('./routes/healthCompanion'));
const nlpModule = require('./routes/nlp');
app.use('/api/nlp', authenticateToken, nlpModule.router);
app.post('/api/assessments', authenticateToken, nlpModule.handleAssessment);
app.get('/api/assessments', authenticateToken, (req, res) => {
  const { getAllMultilingualConsultations } = require('./db/database');
  res.json({ success: true, assessments: getAllMultilingualConsultations() });
});
app.get('/api/assessments/:id', authenticateToken, (req, res) => {
  const { getMultilingualConsultation } = require('./db/database');
  const record = getMultilingualConsultation(req.params.id);
  if (!record) return res.status(404).json({ success: false, error: 'Assessment not found' });
  res.json({ success: true, assessment: record });
});

// File upload endpoint (legacy multi-image upload endpoint) — protected
app.post('/api/upload', authenticateToken, upload.array('images', 5), (req, res) => {
  const files = req.files.map((f) => ({
    filename: f.filename,
    originalname: f.originalname,
    path: `/uploads/${f.filename}`,
    size: f.size,
    mimetype: f.mimetype,
  }));
  res.json({ files });
});

// Dashboard stats — protected (aggregated data)
app.get('/api/stats', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const totalPatients = db.prepare('SELECT COUNT(*) as c FROM patients').get()?.c || 0;
    const totalConsultations = db.prepare('SELECT COUNT(*) as c FROM consultations').get()?.c || 0;
    const completedConsultations = db.prepare("SELECT COUNT(*) as c FROM consultations WHERE status = 'complete'").get()?.c || 0;
    const recentConsultations = db.prepare(`
      SELECT c.id, c.chief_complaint, c.status, c.created_at, p.name as patient_name
      FROM consultations c LEFT JOIN patients p ON c.patient_id = p.id
      ORDER BY c.created_at DESC LIMIT 5
    `).all();

    let emergencyCount = 0;
    const allComplete = db.prepare("SELECT triage_result FROM consultations WHERE status = 'complete' AND triage_result IS NOT NULL").all();
    allComplete.forEach((c) => {
      try {
        const triage = JSON.parse(c.triage_result);
        if (triage.triageLevel === 'Emergency' || triage.triageLevel === 'Urgent') emergencyCount++;
      } catch {}
    });

    res.json({ totalPatients, totalConsultations, completedConsultations, emergencyCount, recentConsultations });
  } catch (err) {
    console.error('Error in /api/stats:', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load statistics' },
    });
  }
});

// ---------------------------------------------------------------------------
// Global error handler — never expose stack traces to clients
// ---------------------------------------------------------------------------

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Multer file upload errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: { code: 'FILE_TOO_LARGE', message: 'File size exceeds the 15 MB limit.' },
      });
    }
    return res.status(400).json({
      success: false,
      error: { code: 'UPLOAD_ERROR', message: err.message },
    });
  }

  res.status(500).json({
    success: false,
    error: { code: 'SERVER_ERROR', message: 'Internal server error' },
  });
});

// ---------------------------------------------------------------------------
// Init DB and start
// ---------------------------------------------------------------------------

getDb();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🏥 MediAgent Server running on port ${PORT}`);
  console.log('📡 API endpoints ready');
  console.log('🔐 Authentication middleware active');
  console.log('🤖 Agent pipeline initialized\n');
});
