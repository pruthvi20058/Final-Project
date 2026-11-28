/**
 * MediAgent — JWT Token Blacklist (Revocation)
 *
 * Provides server-side revocation of JWT access tokens. Tokens are
 * stateless by design, so revocation is implemented by recording the
 * token's JTI (JWT ID) and expiry in an in-memory store backed by
 * SQLite persistence. Revoked tokens are rejected by the authentication
 * middleware.
 *
 * In a multi-server deployment, this store should be backed by Redis
 * or a shared datastore. For single-instance SQLite deployment, the
 * blacklist table persists revocations across restarts.
 */

const path = require('path');
const Database = require('better-sqlite3');

let blacklistDb = null;

function getBlacklistDb() {
  if (!blacklistDb) {
    const dbPath = path.join(__dirname, '..', 'blacklist.db');
    blacklistDb = new Database(dbPath);
    blacklistDb.pragma('journal_mode = WAL');
    blacklistDb.exec(`
      CREATE TABLE IF NOT EXISTS revoked_tokens (
        jti TEXT PRIMARY KEY,
        expires_at TEXT NOT NULL,
        revoked_at TEXT DEFAULT (datetime('now')),
        reason TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON revoked_tokens(expires_at);
    `);
  }
  return blacklistDb;
}

/**
 * Revoke a JWT by recording its JTI and expiry.
 * @param {string} jti - JWT ID claim
 * @param {string} expiresAt - ISO timestamp when the token expires
 * @param {string} [reason] - Reason for revocation
 */
function revokeToken(jti, expiresAt, reason = 'user_logout') {
  if (!jti || !expiresAt) return false;
  try {
    const db = getBlacklistDb();
    db.prepare(
      'INSERT OR REPLACE INTO revoked_tokens (jti, expires_at, reason) VALUES (?, ?, ?)'
    ).run(jti, expiresAt, reason);
    return true;
  } catch (err) {
    console.error('[TokenBlacklist] Revocation failed:', err.message);
    return false;
  }
}

/**
 * Check whether a JWT JTI has been revoked.
 * @param {string} jti - JWT ID claim
 * @returns {boolean} true if revoked
 */
function isRevoked(jti) {
  if (!jti) return false;
  try {
    const db = getBlacklistDb();
    const row = db.prepare('SELECT jti FROM revoked_tokens WHERE jti = ?').get(jti);
    return Boolean(row);
  } catch (err) {
    console.error('[TokenBlacklist] Revocation check failed:', err.message);
    return false; // fail-open to avoid lockout; log for investigation
  }
}

/**
 * Clean up expired revoked tokens (call periodically).
 * @returns {number} count of deleted rows
 */
function cleanupExpired() {
  try {
    const db = getBlacklistDb();
    const now = new Date().toISOString();
    const info = db.prepare('DELETE FROM revoked_tokens WHERE expires_at < ?').run(now);
    return info.changes;
  } catch (err) {
    console.error('[TokenBlacklist] Cleanup failed:', err.message);
    return 0;
  }
}

module.exports = {
  revokeToken,
  isRevoked,
  cleanupExpired,
  getBlacklistDb,
};
