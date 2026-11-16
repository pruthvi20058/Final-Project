const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = getDb();
  const doctor = db.prepare('SELECT * FROM doctors WHERE email = ?').get(email.toLowerCase().trim());

  if (!doctor || doctor.password !== password) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Create session token
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

  db.prepare('INSERT INTO sessions (id, doctor_id, expires_at) VALUES (?, ?, ?)').run(token, doctor.id, expiresAt);

  res.json({
    token,
    doctor: {
      id: doctor.id,
      name: doctor.name,
      email: doctor.email,
      specialty: doctor.specialty,
      license: doctor.license_number,
      avatar: doctor.name.split(' ').map(n => n[0]).join('')
    }
  });
});

// GET /api/auth/me — verify session
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const token = authHeader.split(' ')[1];
  const db = getDb();

  const session = db.prepare(`
    SELECT s.*, d.id as doctor_id, d.name, d.email, d.specialty, d.license_number
    FROM sessions s
    JOIN doctors d ON s.doctor_id = d.id
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `).get(token);

  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  res.json({
    doctor: {
      id: session.doctor_id,
      name: session.name,
      email: session.email,
      specialty: session.specialty,
      license: session.license_number,
      avatar: session.name.split(' ').map(n => n[0]).join('')
    }
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const db = getDb();
    db.prepare('DELETE FROM sessions WHERE id = ?').run(token);
  }
  res.json({ success: true });
});

module.exports = router;
