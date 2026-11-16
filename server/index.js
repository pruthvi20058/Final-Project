const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { getDb } = require('./db/database');
const { v4: uuidv4 } = require('uuid');
const { runPipeline, registerStream, removeStream } = require('./agents/orchestrator');
const { vectorSearch } = require('./knowledge/medicalKB');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const fs = require('fs');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/consultations', require('./routes/consultations'));
app.use('/api/knowledge', require('./routes/knowledge'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/health-companion', require('./routes/healthCompanion'));
const nlpModule = require('./routes/nlp');
app.use('/api/nlp', nlpModule.router);
app.post('/api/assessments', nlpModule.handleAssessment);
app.get('/api/assessments', (req, res) => {
  const { getAllMultilingualConsultations } = require('./db/database');
  res.json({ success: true, assessments: getAllMultilingualConsultations() });
});
app.get('/api/assessments/:id', (req, res) => {
  const { getMultilingualConsultation } = require('./db/database');
  const record = getMultilingualConsultation(req.params.id);
  if (!record) return res.status(404).json({ success: false, error: 'Assessment not found' });
  res.json({ success: true, assessment: record });
});

// File upload endpoint (legacy multi-image upload endpoint)
app.post('/api/upload', upload.array('images', 5), (req, res) => {
  const files = req.files.map(f => ({
    filename: f.filename,
    originalname: f.originalname,
    path: `/uploads/${f.filename}`,
    size: f.size,
    mimetype: f.mimetype
  }));
  res.json({ files });
});

// Chat endpoint (RAG-powered)
app.post('/api/chat', (req, res) => {
  const { message, sessionId } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  const db = getDb();
  const msgId = uuidv4();
  const sid = sessionId || uuidv4();

  db.prepare('INSERT INTO chat_messages (id, session_id, role, content) VALUES (?, ?, ?, ?)').run(msgId, sid, 'user', message);

  // RAG search
  const results = vectorSearch.search(message, 3);
  let response = '';

  if (results.length > 0) {
    const top = results[0].condition;
    response = `Based on your query, here's what I found:\n\n**${top.name}** (${top.category})\n\n`;
    response += `**Common Symptoms:** ${top.symptoms.join(', ')}\n\n`;
    response += `**Risk Factors:** ${top.risk_factors.join(', ')}\n\n`;
    response += `**Clinical Guidelines:** ${top.guidelines}\n\n`;
    response += `**Recommended Treatments:** ${top.treatments.join(', ')}\n\n`;
    if (results.length > 1) {
      response += `**Related Conditions:** ${results.slice(1).map(r => r.condition.name).join(', ')}\n\n`;
    }
    response += `*Source: MediAgent KB — Evidence Level ${top.evidence_level} | ICD-10: ${top.icd10}*`;
  } else {
    response = "I couldn't find specific information matching your query in the medical knowledge base. Please try rephrasing with medical terminology or specific symptoms. For emergencies, please contact emergency services immediately.";
  }

  const replyId = uuidv4();
  db.prepare('INSERT INTO chat_messages (id, session_id, role, content) VALUES (?, ?, ?, ?)').run(replyId, sid, 'assistant', response);

  res.json({ sessionId: sid, reply: response, sources: results.map(r => ({ name: r.condition.name, relevance: Math.round(r.score * 100) })) });
});

// Dashboard stats
app.get('/api/stats', (req, res) => {
  const db = getDb();
  const totalPatients = db.prepare('SELECT COUNT(*) as c FROM patients').get().c;
  const totalConsultations = db.prepare('SELECT COUNT(*) as c FROM consultations').get().c;
  const completedConsultations = db.prepare("SELECT COUNT(*) as c FROM consultations WHERE status = 'complete'").get().c;
  const recentConsultations = db.prepare(`
    SELECT c.id, c.chief_complaint, c.status, c.created_at, p.name as patient_name
    FROM consultations c JOIN patients p ON c.patient_id = p.id
    ORDER BY c.created_at DESC LIMIT 5
  `).all();

  let emergencyCount = 0;
  const allComplete = db.prepare("SELECT triage_result FROM consultations WHERE status = 'complete' AND triage_result IS NOT NULL").all();
  allComplete.forEach(c => {
    try {
      const triage = JSON.parse(c.triage_result);
      if (triage.triageLevel === 'Emergency' || triage.triageLevel === 'Urgent') emergencyCount++;
    } catch {}
  });

  res.json({ totalPatients, totalConsultations, completedConsultations, emergencyCount, recentConsultations });
});

// Init DB and start
getDb();
app.listen(PORT, () => {
  console.log(`\n🏥 MediAgent Server running on http://localhost:${PORT}`);
  console.log('📡 API endpoints ready');
  console.log('🤖 Agent pipeline initialized\n');
});
