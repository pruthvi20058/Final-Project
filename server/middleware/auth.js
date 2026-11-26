/**
 * MediAgent Authentication Middleware
 * JWT-based authentication and authorization for clinical API endpoints.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required. Set it in .env or your hosting platform.');
}

/**
 * Generate a signed JWT access token for an authenticated user.
 * @param {Object} user - { id, email, name, specialty, licenseNumber, role }
 * @returns {string} signed JWT
 */
function generateToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    specialty: user.specialty,
    licenseNumber: user.licenseNumber || null,
    role: user.role || 'doctor',
    iat: Math.floor(Date.now() / 1000),
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Middleware: verify JWT Bearer token on protected routes.
 * Attaches decoded user payload to req.user.
 * Returns 401 for missing, invalid, or expired tokens.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'TOKEN_MISSING', message: 'Authentication token is required' },
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      specialty: decoded.specialty,
      licenseNumber: decoded.licenseNumber,
      role: decoded.role,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Session expired. Please log in again.' },
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_INVALID', message: 'Invalid authentication token.' },
      });
    }
    return res.status(401).json({
      success: false,
      error: { code: 'TOKEN_ERROR', message: 'Authentication failed.' },
    });
  }
}

/**
 * Middleware: optional authentication. Attaches req.user if a valid token is present,
 * but allows the request to proceed without one. Used for routes that have public
 * read access but offer additional data when authenticated.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      specialty: decoded.specialty,
      licenseNumber: decoded.licenseNumber,
      role: decoded.role,
    };
  } catch {
    req.user = null;
  }
  next();
}

/**
 * Middleware: enforce that the authenticated user owns the requested resource.
 * Looks up the resource by `idParamName` (default 'id') and checks `ownerField`
 * (default 'created_by' or 'doctor_id') against req.user.id.
 * Returns 403 if the user does not own the resource, 404 if not found.
 * @param {Object} options
 * @param {string} options.getRecord - function(id) => record or null
 * @param {string} options.ownerField - field name on the record holding the owner id
 * @param {string} options.idParamName - express route param name (default 'id')
 */
function requireOwnership({ getRecord, ownerField = 'created_by', idParamName = 'id' }) {
  return async function ownershipMiddleware(req, res, next) {
    const resourceId = req.params[idParamName];
    if (!resourceId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_ID', message: 'Resource ID is required' },
      });
    }

    let record;
    try {
      record = await getRecord(resourceId);
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: { code: 'RECORD_LOOKUP_ERROR', message: err.message },
      });
    }

    if (!record) {
      return res.status(404).json({
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: 'Resource not found' },
      });
    }

    const ownerId = record[ownerField];
    if (ownerId && ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this resource' },
      });
    }

    req.resource = record;
    next();
  };
}

module.exports = {
  generateToken,
  authenticateToken,
  optionalAuth,
  requireOwnership,
  JWT_SECRET,
};
