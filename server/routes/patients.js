const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

// Helper: get patient record by ID
function getPatientById(db, id) {
  return db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
}

// Helper: check if the authenticated user owns the patient (or patient is unowned legacy data)
function patientBelongsToUser(patient, userId) {
  if (!patient.created_by) return true; // legacy unowned data — allow access
  return patient.created_by === userId;
}

// GET all patients — only return patients owned by the authenticated user (or unowned legacy data)
router.get('/', (req, res) => {
  const db = getDb();
  const allPatients = db.prepare('SELECT * FROM patients ORDER BY created_at DESC').all();
  const filtered = allPatients.filter((p) => patientBelongsToUser(p, req.user.id));
  filtered.forEach((p) => {
    try { p.allergies = JSON.parse(p.allergies || '[]'); } catch { p.allergies = []; }
    try { p.medical_history = JSON.parse(p.medical_history || '[]'); } catch { p.medical_history = []; }
    try { p.current_medications = JSON.parse(p.current_medications || '[]'); } catch { p.current_medications = []; }
  });
  res.json(filtered);
});

// GET single patient — ownership check
router.get('/:id', (req, res) => {
  const db = getDb();
  const patient = getPatientById(db, req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  if (!patientBelongsToUser(patient, req.user.id)) {
    return res.status(403).json({ error: 'You do not have access to this patient record' });
  }

  try { patient.allergies = JSON.parse(patient.allergies || '[]'); } catch { patient.allergies = []; }
  try { patient.medical_history = JSON.parse(patient.medical_history || '[]'); } catch { patient.medical_history = []; }
  try { patient.current_medications = JSON.parse(patient.current_medications || '[]'); } catch { patient.current_medications = []; }
  res.json(patient);
});

// POST new patient — record owner
router.post('/', (req, res) => {
  const db = getDb();
  const {
    name, age, gender, blood_type, weight, height,
    allergies, medical_history, current_medications, emergency_contact,
  } = req.body;

  if (!name || !age || !gender || !blood_type) {
    return res.status(400).json({ error: 'Name, age, gender, and blood type are required' });
  }

  const id = uuidv4();
  db.prepare(`INSERT INTO patients (id, name, age, gender, blood_type, weight, height, allergies, medical_history, current_medications, emergency_contact, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, name, age, gender, blood_type || null, weight || null, height || null,
    JSON.stringify(allergies || []), JSON.stringify(medical_history || []),
    JSON.stringify(current_medications || []), emergency_contact || null, req.user.id
  );
  res.status(201).json({ id, message: 'Patient created' });
});

// PUT update patient — ownership check
router.put('/:id', (req, res) => {
  const db = getDb();
  const patient = getPatientById(db, req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  if (!patientBelongsToUser(patient, req.user.id)) {
    return res.status(403).json({ error: 'You do not have access to this patient record' });
  }

  const {
    name, age, gender, blood_type, weight, height,
    allergies, medical_history, current_medications, emergency_contact,
  } = req.body;
  db.prepare(`UPDATE patients SET name=?, age=?, gender=?, blood_type=?, weight=?, height=?, allergies=?, medical_history=?, current_medications=?, emergency_contact=? WHERE id=?`).run(
    name, age, gender, blood_type, weight, height,
    JSON.stringify(allergies || []), JSON.stringify(medical_history || []),
    JSON.stringify(current_medications || []), emergency_contact || null, req.params.id
  );
  res.json({ message: 'Patient updated' });
});

module.exports = router;
