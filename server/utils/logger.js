/**
 * MediAgent — Structured JSON Logger (Task 10: Backend Reliability)
 *
 * Produces newline-delimited JSON log entries on stdout/stderr.
 * Suitable for ingestion by production log collectors (Datadog, Logtail, CloudWatch, etc.).
 *
 * Environment:
 *   LOG_LEVEL   — one of: error | warn | info | debug | silent (default: info)
 *   NODE_ENV    — used to include context (development vs production)
 *
 * Usage:
 *   const logger = require('./logger');
 *   logger.info('User logged in', { userId: '123', correlationId: 'abc-123' });
 *   logger.error('Database query failed', { err, correlationId: 'abc-123' });
 *
 * NEVER log patient names, emails, phone numbers, addresses, lab values, or any PII.
 * Log only opaque identifiers (patientId, reportId, correlationId, requestId).
 */

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3, silent: 5 };

function resolveLevel() {
  const level = (process.env.LOG_LEVEL || 'info').toLowerCase();
  return level in LOG_LEVELS ? LOG_LEVELS[level] : LOG_LEVELS.info;
}

const MIN_LEVEL = resolveLevel();
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function shouldLog(level) {
  return MIN_LEVEL !== LOG_LEVELS.silent && LOG_LEVELS[level] <= MIN_LEVEL;
}

function redact(value) {
  // Redact values that look like email addresses, tokens, or raw patient data
  if (typeof value === 'string') {
    if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(value)) {
      return '[REDACTED_EMAIL]';
    }
    if (/^(Bearer|Basic)\s+[\w\-._~+/]+=*$/i.test(value)) {
      return '[REDACTED_TOKEN]';
    }
    if (value.length > 0 && /^[A-Za-z0-9+/=]{20,}$/.test(value)) {
      return '[REDACTED_TOKEN]';
    }
  }
  return value;
}

function redactObject(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(redactObject);
  if (typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      const key = k.toLowerCase();
      if (
        key.includes('email') ||
        key.includes('password') ||
        key.includes('token') ||
        key.includes('secret') ||
        key.includes('api_key') ||
        key.includes('apikey') ||
        key.includes('key') ||
        key === 'authorization' ||
        key === 'cookie'
      ) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactObject(v);
      }
    }
    return out;
  }
  return redact(obj);
}

function formatTimestamp() {
  return new Date().toISOString();
}

function createLogger(level) {
  return function log(message, meta = {}) {
    if (!shouldLog(level)) return;

    const entry = {
      timestamp: formatTimestamp(),
      level,
      message: typeof message === 'string' ? message : String(message),
      service: 'mediagent-backend',
      environment: process.env.NODE_ENV || 'development',
    };

    // Include correlation/request ids when present
    for (const key of ['correlationId', 'requestId', 'traceId']) {
      if (meta[key] !== undefined) {
        entry[key] = meta[key];
      }
    }

    // Attach non-sensitive meta
    const safeMeta = redactObject(meta);
    const hasMeta = Object.keys(safeMeta).some(
      (k) => !['correlationId', 'requestId', 'traceId'].includes(k)
    );
    if (hasMeta) {
      entry.meta = safeMeta;
    }

    const line = JSON.stringify(entry);
    const stream = level === 'error' ? process.stderr : process.stdout;
    stream.write(line + '\n');
  };
}

const logger = {
  error: createLogger('error'),
  warn: createLogger('warn'),
  info: createLogger('info'),
  debug: createLogger('debug'),
};

module.exports = logger;
