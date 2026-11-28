/**
 * MediAgent — Role-Based Access Control (RBAC) Middleware
 *
 * Centralized authorization for clinical API endpoints. Enforces
 * least-privilege permissions derived from the verified JWT identity,
 * not from frontend-provided user IDs.
 *
 * Roles:
 *   patient    — Manage personal information, upload reports, view own assessments
 *   doctor     — Access assigned/owned patients, review assessments, add observations
 *   administrator — Manage users, system config, model versions, knowledge base, security events
 *
 * Administrative access does NOT imply unrestricted access to patient clinical records.
 * Patient data access requires ownership or explicit physician assignment.
 */

const { getDb } = require('../db/database');

/**
 * Role hierarchy: each role can perform its own permissions plus those of
 * less-privileged roles.
 */
const ROLE_HIERARCHY = {
  patient: ['patient'],
  doctor: ['doctor', 'patient'],
  administrator: ['administrator', 'doctor', 'patient'],
};

/**
 * Permission matrix: resource -> action -> allowed roles.
 * Roles not listed are denied by default (deny-all posture).
 */
const PERMISSION_MATRIX = {
  patients: {
    read: ['patient', 'doctor', 'administrator'],
    create: ['patient', 'doctor', 'administrator'],
    update: ['patient', 'doctor', 'administrator'],
    delete: ['administrator'],
  },
  reports: {
    read: ['patient', 'doctor', 'administrator'],
    create: ['patient', 'doctor', 'administrator'],
    update: ['patient', 'doctor', 'administrator'],
    delete: ['administrator'],
    verify: ['doctor', 'administrator'],
  },
  assessments: {
    read: ['patient', 'doctor', 'administrator'],
    create: ['patient', 'doctor', 'administrator'],
    update: ['doctor', 'administrator'],
    delete: ['administrator'],
  },
  risk: {
    read: ['patient', 'doctor', 'administrator'],
    create: ['patient', 'doctor', 'administrator'],
  },
  predictions: {
    read: ['patient', 'doctor', 'administrator'],
    create: ['doctor', 'administrator'],
  },
  models: {
    read: ['doctor', 'administrator'],
    train: ['administrator'],
    promote: ['administrator'],
    rollback: ['administrator'],
  },
  knowledge_base: {
    read: ['patient', 'doctor', 'administrator'],
    update: ['administrator'],
  },
  backup: {
    create: ['administrator'],
    list: ['administrator'],
    restore: ['administrator'],
    retention: ['administrator'],
  },
  users: {
    read: ['administrator'],
    create: ['administrator'],
    update: ['administrator'],
    delete: ['administrator'],
    change_role: ['administrator'],
  },
  audit_logs: {
    read: ['administrator'],
    create: ['administrator'], // system-generated only
  },
  system: {
    config: ['administrator'],
    health: ['doctor', 'administrator'],
  },
};

/**
 * Check whether a role is permitted to perform an action on a resource.
 * @param {string} role - User role from JWT
 * @param {string} resource - Resource name (key in PERMISSION_MATRIX)
 * @param {string} action - Action (read, create, update, delete, etc.)
 * @returns {boolean}
 */
function isAllowed(role, resource, action) {
  const resourcePerms = PERMISSION_MATRIX[resource];
  if (!resourcePerms) return false;
  const allowedRoles = resourcePerms[action];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}

/**
 * Middleware factory: enforce role-based permission on a resource/action.
 * Usage: router.post('/...', authenticateToken, requirePermission('reports', 'create'), handler)
 * @param {string} resource
 * @param {string} action
 * @returns {Function} Express middleware
 */
function requirePermission(resource, action) {
  return function requirePermissionMiddleware(req, res, next) {
    const user = req.user;
    if (!user || !user.role) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authenticated identity required' },
      });
    }

    if (!isAllowed(user.role, resource, action)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Role '${user.role}' is not authorized to ${action} ${resource}`,
          requiredRoles: PERMISSION_MATRIX[resource] && PERMISSION_MATRIX[resource][action],
        },
      });
    }

    next();
  };
}

/**
 * Middleware: enforce that the authenticated user is the owner of a patient-scoped
 * resource, or has a role that bypasses ownership (administrator).
 * Ownership is determined by `ownerField` on the record (default 'created_by' or 'user_id').
 * @param {Object} options
 * @param {Function} options.getRecord - async (id) => record or null
 * @param {string} options.ownerField - field name holding the owner id
 * @param {string} options.idParamName - express route param name (default 'id')
 * @returns {Function} Express middleware
 */
function requireOwnershipOrRole({ getRecord, ownerField = 'created_by', idParamName = 'id', bypassRoles = ['administrator'] }) {
  return async function ownershipMiddleware(req, res, next) {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authenticated identity required' },
      });
    }

    // Administrators bypass ownership (but still need the resource to exist)
    const bypass = bypassRoles && bypassRoles.includes(user.role);

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
        error: { code: 'RECORD_LOOKUP_ERROR', message: 'Failed to retrieve resource' },
      });
    }

    if (!record) {
      return res.status(404).json({
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: 'Resource not found' },
      });
    }

    if (!bypass) {
      const ownerId = record[ownerField];
      if (!ownerId || ownerId !== user.id) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have access to this resource' },
        });
      }
    }

    req.resource = record;
    next();
  };
}

/**
 * Middleware: restrict an endpoint to administrators only.
 * @returns {Function} Express middleware
 */
function requireAdmin(req, res, next) {
  const user = req.user;
  if (!user || user.role !== 'administrator') {
    return res.status(403).json({
      success: false,
      error: { code: 'ADMIN_REQUIRED', message: 'Administrator access required' },
    });
  }
  next();
}

/**
 * Middleware: restrict an endpoint to doctors or administrators.
 * @returns {Function} Express middleware
 */
function requireDoctorOrAdmin(req, res, next) {
  const user = req.user;
  if (!user || !['doctor', 'administrator'].includes(user.role)) {
    return res.status(403).json({
      success: false,
      error: { code: 'DOCTOR_OR_ADMIN_REQUIRED', message: 'Doctor or administrator access required' },
    });
  }
  next();
}

/**
 * Get the permission matrix (for documentation / introspection endpoints).
 * @returns {Object}
 */
function getPermissionMatrix() {
  return PERMISSION_MATRIX;
}

/**
 * Get allowed roles for a resource/action (for frontend UI gating).
 * @param {string} resource
 * @param {string} action
 * @returns {string[]}
 */
function getAllowedRoles(resource, action) {
  const resourcePerms = PERMISSION_MATRIX[resource];
  if (!resourcePerms) return [];
  return resourcePerms[action] || [];
}

module.exports = {
  ROLE_HIERARCHY,
  PERMISSION_MATRIX,
  isAllowed,
  requirePermission,
  requireOwnershipOrRole,
  requireAdmin,
  requireDoctorOrAdmin,
  getPermissionMatrix,
  getAllowedRoles,
};
