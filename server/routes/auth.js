const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');
const {
  getDoctorByEmail,
  createDoctor,
  hashPassword,
  verifyPassword,
  recordFailedLogin,
  countFailedLogins,
  clearFailedLogins,
} = require('../db/database');
const { generateToken, authenticateToken, revokeToken } = require('../middleware/auth');

/**
 * Validate password complexity.
 * Minimum 8 characters, at least one letter and one digit.
 */
function validatePasswordComplexity(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/[A-Za-z]/.test(password)) {
    return 'Password must contain at least one letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one digit';
  }
  return null;
}

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

    const pwError = validatePasswordComplexity(password);
    if (pwError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: pwError },
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

    // Prevent self-assignment of privileged roles
    const requestedRole = role && role.trim() ? role.trim() : 'doctor';
    const assignedRole = ['administrator'].includes(requestedRole) ? 'doctor' : requestedRole;

    const doctor = await createDoctor({
      id: `DOC-${Date.now().toString(36).slice(-6)}`,
      name: name.trim(),
      email: normalizedEmail,
      password,
      specialty: specialty || 'General Medicine',
      licenseNumber: licenseNumber || 'PENDING',
      role: assignedRole,
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

    // Account lockout: reject if too many recent failed attempts
    const failedAttempts = countFailedLogins(normalizedEmail, 15);
    const MAX_FAILED_ATTEMPTS = 5;
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: 'Too many failed login attempts. Please try again later.',
        },
      });
    }

    const doctor = getDoctorByEmail(normalizedEmail);

    if (!doctor) {
      // Record failed attempt even for unknown email (prevents user enumeration)
      recordFailedLogin(normalizedEmail, req.ip);
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
      recordFailedLogin(normalizedEmail, req.ip);
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    // Clear failed attempts on successful login
    clearFailedLogins(normalizedEmail);

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

// POST /api/auth/logout — Revoke JWT token server-side
router.post('/logout', authenticateToken, (req, res) => {
  try {
    const jti = req.user && req.user.jti ? req.user.jti : null;
    if (jti) {
      // Decode token to get expiry for blacklist entry
      const decoded = jwt_decode_unsafe(req.headers.authorization);
      if (decoded && decoded.exp) {
        revokeToken(jti, new Date(decoded.exp * 1000).toISOString(), 'user_logout');
      } else {
        revokeToken(jti, new Date(Date.now() + 86400000).toISOString(), 'user_logout');
      }
    }
  } catch (revokeErr) {
    // Non-fatal: logout still succeeds client-side
    console.warn('[Auth] Token revocation warning:', revokeErr.message);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * Decode JWT payload without verification (for logout revocation only).
 * The token signature was already verified by authenticateToken middleware.
 * @param {string} authHeader - Authorization header value
 * @returns {Object|null}
 */
function jwt_decode_unsafe(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

module.exports = router;
