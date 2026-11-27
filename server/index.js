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
const { correlationIdMiddleware } = require('./middleware/correlation');
const logger = require('./utils/logger');
const { validateEnv } = require('./utils/envValidator');

// Validate required environment variables before starting
validateEnv();

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
// Correlation ID + request tracing
// ---------------------------------------------------------------------------

app.use(correlationIdMiddleware);

// Request timeout middleware — prevent hung requests from holding connections
app.use((req, res, next) => {
  const timeoutMs = parseInt(process.env.ML_INFERENCE_TIMEOUT_MS || '30000', 10);
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      req.log?.warn('Request timeout', { endpoint: req.originalUrl, timeoutMs });
      res.status(504).json({
        success: false,
        error: { code: 'REQUEST_TIMEOUT', message: 'Request timed out. Please try again.' },
        correlationId: req.correlationId,
      });
    }
  }, timeoutMs);
  res.on('finish', () => clearTimeout(timer));
  next();
});

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
      orchestrator: '/api/orchestrator',
      auth: '/api/auth',
    },
  });
});

app.get('/api/health', (req, res) => {
  const checks = {};

  // Backend check
  checks.backend = {
    status: 'HEALTHY',
    detail: 'Express API accepting requests',
  };

  // Database check
  let dbHealthy = true;
  let dbDetail = 'SQLite database connection verified';
  try {
    const db = getDb();
    db.prepare('SELECT 1').run();
  } catch {
    dbHealthy = false;
    dbDetail = 'SQLite database connection failed';
  }
  checks.database = {
    status: dbHealthy ? 'HEALTHY' : 'UNAVAILABLE',
    detail: dbDetail,
  };

  // Overall health
  const allHealthy = Object.values(checks).every((c) => c.status === 'HEALTHY');
  const anyUnavailable = Object.values(checks).some((c) => c.status === 'UNAVAILABLE');

  res.json({
    status: allHealthy ? 'HEALTHY' : anyUnavailable ? 'DEGRADED' : 'HEALTHY',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    environment: process.env.NODE_ENV || 'production',
    checks,
    correlationId: req.correlationId,
  });
});

// GET /api/health/ready — Readiness probe for orchestrators (Kubernetes/Render)
// Returns 200 when the service is ready to receive traffic, 503 otherwise.
app.get('/api/health/ready', (req, res) => {
  const ready = [];
  let allReady = true;

  // Database readiness
  try {
    const db = getDb();
    db.prepare('SELECT 1').run();
    ready.push({ name: 'database', status: 'READY', detail: 'SQLite connection OK' });
  } catch {
    ready.push({ name: 'database', status: 'NOT_READY', detail: 'SQLite connection failed' });
    allReady = false;
  }

  // Python ML executable readiness
  const { spawn } = require('child_process');
  const pythonCmd = process.env.PYTHON_EXECUTABLE || process.env.PYTHON_PATH || 'python3';
  try {
    require('child_process').spawnSync(pythonCmd, ['--version'], { timeout: 3000 });
    ready.push({ name: 'python-ml', status: 'READY', detail: 'Python executable available' });
  } catch {
    ready.push({ name: 'python-ml', status: 'NOT_READY', detail: 'Python executable not available' });
    allReady = false;
  }

  // Model artifacts readiness
  const fs = require('fs');
  const modelPath = path.join(__dirname, 'ml', 'models', 'diabetes', 'model.joblib');
  if (fs.existsSync(modelPath)) {
    ready.push({ name: 'model-artifacts', status: 'READY', detail: 'Diabetes model artifact present' });
  } else {
    ready.push({ name: 'model-artifacts', status: 'NOT_READY', detail: 'Diabetes model artifact missing' });
    allReady = false;
  }

  if (allReady) {
    res.json({ status: 'READY', timestamp: new Date().toISOString(), checks: ready, correlationId: req.correlationId });
  } else {
    res.status(503).json({ status: 'NOT_READY', timestamp: new Date().toISOString(), checks: ready, correlationId: req.correlationId });
  }
});

// GET /api/health/models — ML model availability and version tracking
app.get('/api/health/models', (req, res) => {
  try {
    const modelRegistryPath = path.join(__dirname, 'ml', 'models', 'model_registry.json');
    const fs = require('fs');
    let registry = {};
    if (fs.existsSync(modelRegistryPath)) {
      registry = JSON.parse(fs.readFileSync(modelRegistryPath, 'utf-8'));
    }

    const models = {};
    for (const [disease, info] of Object.entries(registry)) {
      const modelPath = path.join(__dirname, 'ml', info.model_path || '');
      const prepPath = path.join(__dirname, 'ml', info.preprocessor_path || '');
      const artifactPresent = fs.existsSync(modelPath) && fs.existsSync(prepPath);

      models[disease] = {
        disease: info.disease || disease,
        display_name: info.display_name || disease,
        status: info.status || 'UNKNOWN',
        readiness: info.readiness || 'UNKNOWN',
        readiness_reason: info.readiness_reason || 'No reason documented.',
        model_version: info.model_version || 'N/A',
        algorithm: info.algorithm || 'N/A',
        artifact_present: artifactPresent,
        feature_count: info.feature_count || 0,
        metrics: info.metrics || {},
        dataset_provenance: info.dataset_provenance || {},
      };
    }

    const availableCount = Object.values(models).filter((m) => m.status === 'TRAINED' && m.artifact_present).length;
    const totalCount = Object.keys(models).length;

    res.json({
      success: true,
      summary: {
        total_models: totalCount,
        available_models: availableCount,
        unavailable_models: totalCount - availableCount,
      },
      models,
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
    });
  } catch (err) {
    req.log?.error('Failed to load model health', { err: err.message });
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load model health information' },
      correlationId: req.correlationId,
    });
  }
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
app.use('/api/rag', authenticateToken, require('./routes/rag'));
app.use('/api/ml', authenticateToken, require('./routes/ml'));
app.use('/api/health-companion', authenticateToken, require('./routes/healthCompanion'));
app.use('/api/orchestrator', authenticateToken, require('./routes/orchestrator'));
app.use('/api/risk', authenticateToken, require('./routes/risk'));
app.use('/api/backup', authenticateToken, require('./routes/backup'));
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

// Evaluation metrics — protected. Returns NOT_EVALUATED when no real results exist.
app.get('/api/evaluation/metrics', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    let evalRows;
    try {
      evalRows = db.prepare('SELECT * FROM evaluation_results ORDER BY created_at DESC LIMIT 1').all();
    } catch {
      evalRows = [];
    }

    if (!evalRows || evalRows.length === 0) {
      return res.json({
        success: true,
        metrics: null,
        status: 'NOT_EVALUATED',
        message: 'No model evaluation has been performed. Metrics are unavailable until a reproducible evaluation is executed against a held-out test set.'
      });
    }

    const latest = evalRows[0];
    res.json({
      success: true,
      metrics: latest.metrics ? (typeof latest.metrics === 'string' ? JSON.parse(latest.metrics) : latest.metrics) : null,
      status: 'AVAILABLE',
      message: 'Evaluation metrics from most recent reproducible evaluation run.'
    });
  } catch (err) {
    console.error('Error in /api/evaluation/metrics:', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load evaluation metrics' }
    });
  }
});

// System status — protected. Returns real health checks, never static "Online" claims.
app.get('/api/system/status', authenticateToken, (req, res) => {
  try {
    const checks = [];

    checks.push({
      name: 'Express Backend API',
      status: 'ONLINE',
      detail: 'HTTP server accepting requests'
    });

    let dbStatus = 'UNAVAILABLE';
    let dbDetail = 'Database connection could not be established';
    try {
      const db = getDb();
      db.prepare('SELECT 1').run();
      dbStatus = 'ONLINE';
      dbDetail = 'SQLite database connection verified';
    } catch {
      dbStatus = 'UNAVAILABLE';
      dbDetail = 'SQLite database connection failed';
    }
    checks.push({
      name: 'SQLite Database',
      status: dbStatus,
      detail: dbDetail
    });

    let ocrStatus = 'UNAVAILABLE';
    let ocrDetail = 'OCR engine not available';
    try {
      require('tesseract.js');
      ocrStatus = 'ONLINE';
      ocrDetail = 'Tesseract OCR module loaded';
    } catch {
      ocrStatus = 'UNAVAILABLE';
      ocrDetail = 'Tesseract OCR module not available';
    }
    checks.push({
      name: 'OCR Engine (Tesseract)',
      status: ocrStatus,
      detail: ocrDetail
    });

    let pdfStatus = 'UNAVAILABLE';
    let pdfDetail = 'PDF parser not available';
    try {
      require('pdf-parse');
      pdfStatus = 'ONLINE';
      pdfDetail = 'pdf-parse module loaded';
    } catch {
      pdfStatus = 'UNAVAILABLE';
      pdfDetail = 'pdf-parse module not available';
    }
    checks.push({
      name: 'PDF Text Extraction',
      status: pdfStatus,
      detail: pdfDetail
    });

    let mlStatus = 'UNAVAILABLE';
    let mlDetail = 'No ML model artifacts found';
    try {
      const modelPath = require('path').join(__dirname, 'ml', 'models', 'diabetes', 'model.joblib');
      if (require('fs').existsSync(modelPath)) {
        mlStatus = 'ONLINE';
        mlDetail = 'Pima diabetes model artifact present';
      } else {
        mlStatus = 'UNAVAILABLE';
        mlDetail = 'Pima diabetes model artifact missing';
      }
    } catch {
      mlStatus = 'UNAVAILABLE';
      mlDetail = 'ML model check failed';
    }
    checks.push({
      name: 'ML Model (Pima Diabetes)',
      status: mlStatus,
      detail: mlDetail
    });

    let ragStatus = 'UNAVAILABLE';
    let ragDetail = 'RAG knowledge base not available';
    try {
      const { loadKnowledgeSources } = require('./services/ragService');
      const sources = loadKnowledgeSources();
      if (sources && sources.length > 0) {
        ragStatus = 'ONLINE';
        ragDetail = `RAG knowledge base loaded with ${sources.length} source(s)`;
      } else {
        ragStatus = 'UNAVAILABLE';
        ragDetail = 'RAG knowledge base has no sources';
      }
    } catch {
      ragStatus = 'UNAVAILABLE';
      ragDetail = 'RAG service check failed';
    }
    checks.push({
      name: 'RAG Knowledge Base',
      status: ragStatus,
      detail: ragDetail
    });

    const llmConfigured = Boolean(process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
    checks.push({
      name: 'LLM Reasoning Provider',
      status: llmConfigured ? 'CONFIGURED' : 'UNAVAILABLE',
      detail: llmConfigured ? 'LLM API key present in environment' : 'No LLM API key configured'
    });

    res.json({
      success: true,
      status: 'OK',
      checks,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error in /api/system/status:', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load system status' }
    });
  }
});

// ---------------------------------------------------------------------------
// Global error handler — never expose stack traces to clients
// ---------------------------------------------------------------------------

app.use((err, req, res, next) => {
  const correlationId = req.correlationId || 'unknown';
  req.log?.error('Unhandled error', { err: err.message, correlationId: correlationId });

  // Multer file upload errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: { code: 'FILE_TOO_LARGE', message: 'File size exceeds the 15 MB limit.' },
        correlationId: correlationId,
      });
    }
    return res.status(400).json({
      success: false,
      error: { code: 'UPLOAD_ERROR', message: err.message },
      correlationId: correlationId,
    });
  }

  res.status(500).json({
    success: false,
    error: { code: 'SERVER_ERROR', message: 'Internal server error' },
    correlationId: correlationId,
  });
});

// ---------------------------------------------------------------------------
// Init DB and start
// ---------------------------------------------------------------------------

getDb();

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info('MediAgent Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    correlationId: 'system-startup',
  });
  console.log('\n🏥 MediAgent Server running on port ' + PORT);
  console.log('📡 API endpoints ready');
  console.log('🔐 Authentication middleware active');
  console.log('🤖 Agent pipeline initialized\n');
});

// ---------------------------------------------------------------------------
// Graceful shutdown (Task 10: Backend Reliability)
// Handles SIGTERM (Render/Heroku) and SIGINT (Ctrl+C) by closing the DB,
// stopping the HTTP server, and exiting cleanly.
// ---------------------------------------------------------------------------

let shuttingDown = false;

function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info('Received shutdown signal', { signal: signal, correlationId: 'system-shutdown' });
  console.log('\n🛑 Received ' + signal + '. Shutting down gracefully...');

  // Stop accepting new connections
  server.close(function(closeErr) {
    if (closeErr) {
      logger.error('Error closing HTTP server', { err: closeErr.message, correlationId: 'system-shutdown' });
      console.error('Error closing server:', closeErr.message);
    } else {
      logger.info('HTTP server closed', { correlationId: 'system-shutdown' });
      console.log('✓ HTTP server closed');
    }

    // Close SQLite database
    try {
      var db = getDb();
      if (db && typeof db.close === 'function') {
        db.close(function(dbCloseErr) {
          if (dbCloseErr) {
            logger.error('Error closing database', { err: dbCloseErr.message, correlationId: 'system-shutdown' });
          } else {
            logger.info('Database connection closed', { correlationId: 'system-shutdown' });
            console.log('✓ Database connection closed');
          }
          process.exit(closeErr || dbCloseErr ? 1 : 0);
        });
      } else {
        process.exit(closeErr ? 1 : 0);
      }
    } catch (dbCloseErr) {
      logger.error('Error accessing database for shutdown', { err: dbCloseErr.message, correlationId: 'system-shutdown' });
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections without crashing silently
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { err: err.message, stack: err.stack, correlationId: 'system-uncaught' });
  console.error('Uncaught exception:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason), correlationId: 'system-rejection' });
  console.error('Unhandled rejection:', String(reason));
});
