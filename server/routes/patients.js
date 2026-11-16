const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

// GET all patients
router.get('/', (req, res) => {
  const db = getDb();
  const patients = db.prepare('SELECT * FROM patients ORDER BY created_at DESC').all();
  patients.forEach(p => {
    p.allergies = JSON.parse(p.allergies || '[]');
    p.medical_history = JSON.parse(p.medical_history || '[]');
    p.current_medications = JSON.parse(p.current_medications || '[]');
  });
  res.json(patients);
});

// GET single patient
router.get('/:id', (req, res) => {
  const db = getDb();
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  patient.allergies = JSON.parse(patient.allergies || '[]');
  patient.medical_history = JSON.parse(patient.medical_history || '[]');
  patient.current_medications = JSON.parse(patient.current_medications || '[]');
  res.json(patient);
});

// POST new patient
router.post('/', (req, res) => {
  const db = getDb();
  const { name, age, gender, blood_type, weight, height, allergies, medical_history, current_medications, emergency_contact } = req.body;
  const id = uuidv4();
  db.prepare(`INSERT INTO patients (id, name, age, gender, blood_type, weight, height, allergies, medical_history, current_medications, emergency_contact)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, name, age, gender, blood_type || null, weight || null, height || null,
    JSON.stringify(allergies || []), JSON.stringify(medical_history || []),
    JSON.stringify(current_medications || []), emergency_contact || null
  );
  res.status(201).json({ id, message: 'Patient created' });
});

// PUT update patient
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, age, gender, blood_type, weight, height, allergies, medical_history, current_medications, emergency_contact } = req.body;
  db.prepare(`UPDATE patients SET name=?, age=?, gender=?, blood_type=?, weight=?, height=?, allergies=?, medical_history=?, current_medications=?, emergency_contact=? WHERE id=?`).run(
    name, age, gender, blood_type, weight, height,
    JSON.stringify(allergies || []), JSON.stringify(medical_history || []),
    JSON.stringify(current_medications || []), emergency_contact, req.params.id
  );
  res.json({ message: 'Patient updated' });
});

module.exports = router;
