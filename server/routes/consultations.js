const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { v4: uuidv4 } = require('uuid');
const { runPipeline, registerStream, removeStream } = require('../agents/orchestrator');

// GET all consultations
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const consultations = db.prepare(`
      SELECT c.*, p.name as patient_name, p.age as patient_age, p.gender as patient_gender
      FROM consultations c LEFT JOIN patients p ON c.patient_id = p.id
      ORDER BY c.created_at DESC
    `).all();
    consultations.forEach(c => {
      try { c.symptoms = JSON.parse(c.symptoms || '[]'); } catch { c.symptoms = []; }
      try { c.vitals = c.vitals ? JSON.parse(c.vitals) : null; } catch { c.vitals = null; }
      try { c.uploaded_images = JSON.parse(c.uploaded_images || '[]'); } catch { c.uploaded_images = []; }
      try { c.agent_trace = JSON.parse(c.agent_trace || '[]'); } catch { c.agent_trace = []; }
      try { c.final_report = c.final_report ? JSON.parse(c.final_report) : null; } catch { c.final_report = null; }
    });
    res.json(consultations);
  } catch (err) {
    console.error('Error fetching consultations:', err);
    res.json([]);
  }
});

// GET single consultation
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const c = db.prepare(`
      SELECT c.*, p.name as patient_name, p.age as patient_age, p.gender as patient_gender,
      p.allergies as patient_allergies, p.medical_history as patient_medical_history, p.current_medications as patient_current_medications
      FROM consultations c LEFT JOIN patients p ON c.patient_id = p.id WHERE c.id = ?
    `).get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Consultation not found' });
    try { c.symptoms = JSON.parse(c.symptoms || '[]'); } catch { c.symptoms = []; }
    try { c.vitals = c.vitals ? JSON.parse(c.vitals) : null; } catch { c.vitals = null; }
    try { c.uploaded_images = JSON.parse(c.uploaded_images || '[]'); } catch { c.uploaded_images = []; }
    try { c.agent_trace = JSON.parse(c.agent_trace || '[]'); } catch { c.agent_trace = []; }
    try { c.final_report = c.final_report ? JSON.parse(c.final_report) : null; } catch { c.final_report = null; }
    res.json(c);
  } catch (err) {
    console.error('Error fetching consultation:', err);
    res.status(500).json({ error: 'Failed to retrieve consultation' });
  }
});

// SSE stream for agent pipeline
router.get('/:id/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  registerStream(req.params.id, res);
  req.on('close', () => removeStream(req.params.id));
});

// POST — create and run consultation
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { patient_id, symptoms, vitals, chief_complaint, uploaded_images } = req.body;

    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patient_id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const id = uuidv4();
    db.prepare(`INSERT INTO consultations (id, patient_id, symptoms, vitals, chief_complaint, uploaded_images, status)
      VALUES (?, ?, ?, ?, ?, ?, 'running')`).run(
      id, patient_id, JSON.stringify(symptoms), JSON.stringify(vitals || {}),
      chief_complaint || '', JSON.stringify(uploaded_images || [])
    );

    res.status(201).json({ id, message: 'Consultation started', status: 'running' });

    // Run pipeline async after slight delay for SSE handshake
    setTimeout(async () => {
      try {
        const patientData = {
          symptoms,
          vitals: vitals || {},
          patientAge: patient.age,
          patientGender: patient.gender,
          patientHistory: JSON.parse(patient.medical_history || '[]'),
          currentMedications: JSON.parse(patient.current_medications || '[]'),
          allergies: JSON.parse(patient.allergies || '[]'),
          uploadedImages: (uploaded_images || []).map(img => ({ originalname: img, filename: img })),
          chiefComplaint: chief_complaint
        };

        const { finalReport, trace } = await runPipeline(id, patientData);

        db.prepare(`UPDATE consultations SET
          triage_result = ?, diagnostic_result = ?, medication_result = ?,
          rag_result = ?, image_result = ?, guardrail_result = ?,
          final_report = ?, agent_trace = ?, status = 'complete'
          WHERE id = ?`).run(
          JSON.stringify(finalReport.triage), JSON.stringify(finalReport.diagnostic),
          JSON.stringify(finalReport.medication), JSON.stringify(finalReport.rag),
          JSON.stringify(finalReport.image), JSON.stringify(finalReport.guardrail),
          JSON.stringify(finalReport), JSON.stringify(trace), id
        );
      } catch (err) {
        console.error('Consultation pipeline error:', err);
      }
    }, 300);
  } catch (err) {
    console.error('Route error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
