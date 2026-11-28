/**
 * MediAgent — Database Backup & Restore (Task 10: Database Reliability)
 *
 * Provides backup and restore functions for the SQLite database.
 * Backups are stored as timestamped .db files in the BACKUP_DIR.
 * Retention is controlled by BACKUP_RETENTION_DAYS.
 *
 * No PII is included in backup metadata or logs — only opaque identifiers
 * and operational metadata (timestamps, file sizes, record counts).
 */

const fs = require('fs');
const path = require('path');
const { getDb } = require('../db/database');

const DEFAULT_BACKUP_DIR = path.join(__dirname, '..', 'backups');
const DEFAULT_RETENTION_DAYS = 30;

function getBackupDir() {
  return process.env.BACKUP_DIR || DEFAULT_BACKUP_DIR;
}

function getRetentionDays() {
  return parseInt(process.env.BACKUP_RETENTION_DAYS || String(DEFAULT_RETENTION_DAYS), 10);
}

function ensureBackupDir() {
  const dir = getBackupDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Create a backup of the SQLite database.
 * Returns { success, backupPath, fileSize, recordCount, timestamp }.
 */
function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = ensureBackupDir();
  const backupPath = path.join(backupDir, `mediagent-backup-${timestamp}.db`);

  try {
    const db = getDb();

    // Get record counts for metadata (no PII)
    let recordCount = 0;
    try {
      const tables = ['patients', 'doctors', 'consultations', 'reports', 'predictions'];
      for (const table of tables) {
        try {
          const row = db.prepare('SELECT COUNT(*) as c FROM ' + table).get();
          recordCount += row ? row.c : 0;
        } catch {}
      }
    } catch {}

    // Use SQLite backup API via VACUUM INTO (better-sqlite3 supports this)
    try {
      db.exec("VACUUM INTO '" + backupPath.replace(/'/g, "''") + "'");
    } catch (vacErr) {
      // Fallback: simple file copy
      const dbPath = db.filename || path.join(__dirname, '..', 'mediagent.db');
      fs.copyFileSync(dbPath, backupPath);
    }

    const stat = fs.statSync(backupPath);
    const result = {
      success: true,
      backupPath: backupPath,
      fileSize: stat.size,
      recordCount: recordCount,
      timestamp: new Date().toISOString(),
    };

    console.log('[BACKUP] Created backup:', backupPath, '(' + stat.size + ' bytes)');
    return result;
  } catch (err) {
    console.error('[BACKUP] Failed to create backup:', err.message);
    return {
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Restore the database from a backup file.
 * Returns { success, restoredFrom, timestamp }.
 */
function restoreFromBackup(backupPath) {
  try {
    if (!fs.existsSync(backupPath)) {
      return {
        success: false,
        error: 'Backup file not found: ' + backupPath,
        timestamp: new Date().toISOString(),
      };
    }

    const db = getDb();
    const dbPath = db.filename || path.join(__dirname, '..', 'mediagent.db');

    // Close existing connection, copy file, reopen
    db.close();

    fs.copyFileSync(backupPath, dbPath);

    // Reopen
    const Database = require('better-sqlite3');
    const newDb = new Database(dbPath);
    newDb.pragma('journal_mode = WAL');

    console.log('[BACKUP] Restored from:', backupPath);
    return {
      success: true,
      restoredFrom: backupPath,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[BACKUP] Failed to restore from backup:', err.message);
    return {
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * List all available backups, sorted by newest first.
 * Returns array of { filename, path, fileSize, createdAt }.
 */
function listBackups() {
  const backupDir = getBackupDir();
  if (!fs.existsSync(backupDir)) return [];

  try {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('mediagent-backup-') && f.endsWith('.db'))
      .map(f => {
        const fullPath = path.join(backupDir, f);
        const stat = fs.statSync(fullPath);
        return {
          filename: f,
          path: fullPath,
          fileSize: stat.size,
          createdAt: stat.birthtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return files;
  } catch (err) {
    console.error('[BACKUP] Failed to list backups:', err.message);
    return [];
  }
}

/**
 * Delete backups older than the retention period.
 * Returns { deletedCount, deletedFiles }.
 */
function enforceRetention() {
  const retentionDays = getRetentionDays();
  const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const backups = listBackups();
  const deleted = [];

  for (const backup of backups) {
    if (new Date(backup.createdAt).getTime() < cutoffMs) {
      try {
        fs.unlinkSync(backup.path);
        deleted.push(backup.filename);
      } catch (err) {
        console.error('[BACKUP] Failed to delete expired backup:', backup.filename, err.message);
      }
    }
  }

  if (deleted.length > 0) {
    console.log('[BACKUP] Retention cleanup: deleted ' + deleted.length + ' expired backup(s)');
  }

  return { deletedCount: deleted.length, deletedFiles: deleted };
}

/**
 * Run backup + retention cleanup (for scheduled/cron use).
 * Returns { backup, retention }.
 */
function runScheduledBackup() {
  const backup = createBackup();
  const retention = enforceRetention();
  return { backup, retention };
}

module.exports = {
  createBackup: createBackup,
  restoreFromBackup: restoreFromBackup,
  listBackups: listBackups,
  enforceRetention: enforceRetention,
  runScheduledBackup: runScheduledBackup,
  getBackupDir: getBackupDir,
  getRetentionDays: getRetentionDays,
};
