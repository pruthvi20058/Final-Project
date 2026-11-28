const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const {
  getDoctorByEmail,
  createDoctor,
  hashPassword,
  verifyPassword,
} = require('../db/database');
const { generateToken, authenticateToken } = require('../middleware/auth');

// POST /api/auth/register — Create a new doctor account
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, specialty, licenseNumber, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name, email, and password are required' },
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing account
    const existing = getDoctorByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_EMAIL', message: 'An account with this email already exists' },
      });
    }

    const doctor = await createDoctor({
      id: `DOC-${Date.now().toString(36).slice(-6)}`,
      name: name.trim(),
      email: normalizedEmail,
      password,
      specialty: specialty || 'General Medicine',
      licenseNumber: licenseNumber || 'PENDING',
      role: role || 'doctor',
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      doctor: {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        specialty: doctor.specialty,
        licenseNumber: doctor.licenseNumber,
        role: doctor.role,
      },
    });
  } catch (err) {
    console.error('[Auth] Registration error:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Registration failed' },
    });
  }
});

// POST /api/auth/login — Authenticate and issue JWT
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = getDb();
    const doctor = getDoctorByEmail(normalizedEmail);

    if (!doctor) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    // Verify against bcrypt hash first, then fall back to plaintext during migration
    let isValid = false;
    if (doctor.password_hash) {
      isValid = await verifyPassword(password, doctor.password_hash);
    } else if (doctor.password) {
      // Migration path: plaintext password still present
      isValid = (doctor.password === password);
      if (isValid) {
        // Hash and store, clear plaintext
        try {
          const hash = await hashPassword(password);
          db.prepare('UPDATE doctors SET password_hash = ?, password = NULL WHERE id = ?').run(hash, doctor.id);
        } catch (hashErr) {
          console.warn('[Auth] Failed to hash migrated password:', hashErr.message);
        }
      }
    }

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    const token = generateToken({
      id: doctor.id,
      email: doctor.email,
      name: doctor.name,
      specialty: doctor.specialty,
      licenseNumber: doctor.license_number,
      role: doctor.role || 'doctor',
    });

    // Never return password or password_hash
    res.json({
      success: true,
      token,
      doctor: {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        specialty: doctor.specialty,
        licenseNumber: doctor.license_number,
        role: doctor.role || 'doctor',
        avatar: doctor.name.split(' ').map((n) => n[0]).join(''),
      },
    });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Login failed' },
    });
  }
});

// GET /api/auth/me — Verify session and return current user
router.get('/me', authenticateToken, (req, res) => {
  const db = getDb();
  const doctor = db.prepare('SELECT id, name, email, specialty, license_number, role FROM doctors WHERE id = ?').get(req.user.id);

  if (!doctor) {
    return res.status(401).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User account not found' },
    });
  }

  res.json({
    success: true,
    doctor: {
      id: doctor.id,
      name: doctor.name,
      email: doctor.email,
      specialty: doctor.specialty,
      licenseNumber: doctor.license_number,
      role: doctor.role || 'doctor',
      avatar: doctor.name.split(' ').map((n) => n[0]).join(''),
    },
  });
});

// POST /api/auth/logout — Invalidate session (client-side token removal)
router.post('/logout', authenticateToken, (req, res) => {
  // JWTs are stateless; logout is handled client-side by removing the token.
  // This endpoint confirms logout and can be extended with a token blacklist later.
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
