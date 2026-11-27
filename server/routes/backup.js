/**
 * MediAgent — Backup & Restore API Routes (Task 10: Database Reliability)
 *
 * Endpoints for database backup and restore operations. All routes require
 * authentication and are restricted to administrative users.
 *
 * Endpoints:
 *   POST   /api/backup/create     — Create a database backup
 *   GET    /api/backup/list       — List available backups
 *   POST   /api/backup/restore    — Restore from a backup file
 *   POST   /api/backup/retention  — Enforce retention policy
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  createBackup,
  restoreFromBackup,
  listBackups,
  enforceRetention,
  runScheduledBackup,
} = require('../utils/backup');

// Helper: check if user has admin role
function isAdmin(req) {
  return req.user && req.user.role === 'admin';
}

// POST /api/backup/create — Create a database backup
router.post('/create', authenticateToken, (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Admin access required for backup operations' },
      correlationId: req.correlationId,
    });
  }

  const result = createBackup();
  if (result.success) {
    return res.json({ success: true, backup: result, correlationId: req.correlationId });
  }
  return res.status(500).json({
    success: false,
    error: { code: 'BACKUP_FAILED', message: result.error },
    correlationId: req.correlationId,
  });
});

// GET /api/backup/list — List available backups
router.get('/list', authenticateToken, (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Admin access required for backup operations' },
      correlationId: req.correlationId,
    });
  }

  const backups = listBackups();
  return res.json({
    success: true,
    backups: backups,
    count: backups.length,
    correlationId: req.correlationId,
  });
});

// POST /api/backup/restore — Restore from a backup file
router.post('/restore', authenticateToken, (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Admin access required for backup operations' },
      correlationId: req.correlationId,
    });
  }

  const { backupFile } = req.body || {};
  if (!backupFile) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_FILE', message: 'backupFile is required' },
      correlationId: req.correlationId,
    });
  }

  const result = restoreFromBackup(backupFile);
  if (result.success) {
    return res.json({ success: true, restore: result, correlationId: req.correlationId });
  }
  return res.status(500).json({
    success: false,
    error: { code: 'RESTORE_FAILED', message: result.error },
    correlationId: req.correlationId,
  });
});

// POST /api/backup/retention — Enforce retention policy
router.post('/retention', authenticateToken, (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Admin access required for backup operations' },
      correlationId: req.correlationId,
    });
  }

  const result = enforceRetention();
  return res.json({
    success: true,
    retention: result,
    correlationId: req.correlationId,
  });
});

// POST /api/backup/scheduled — Run scheduled backup + retention
router.post('/scheduled', authenticateToken, (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Admin access required for backup operations' },
      correlationId: req.correlationId,
    });
  }

  const result = runScheduledBackup();
  return res.json({
    success: result.backup.success,
    backup: result.backup,
    retention: result.retention,
    correlationId: req.correlationId,
  });
});

module.exports = router;
