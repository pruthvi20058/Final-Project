/**
 * MediAgent — Correlation ID Middleware (Task 10: Backend Reliability)
 *
 * Generates or accepts a correlation ID for every incoming request, attaches
 * it to req.correlationId, echoes it back in the X-Correlation-ID response
 * header, and makes it available to the structured logger.
 *
 * This enables end-to-end request tracing across backend, Python ML service,
 * and logs without exposing any patient-identifiable information.
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

function generateCorrelationId() {
  return 'req-' + crypto.randomBytes(12).toString('hex');
}

function correlationIdMiddleware(req, res, next) {
  // Accept client-supplied correlation ID, otherwise generate one
  const incoming = req.headers['x-correlation-id'];
  const correlationId =
    incoming && typeof incoming === 'string' && incoming.length <= 128
      ? incoming
      : generateCorrelationId();

  req.correlationId = correlationId;

  // Echo back so clients can trace the request
  res.setHeader('X-Correlation-ID', correlationId);

  // Bind logger to this request for downstream use
  req.log = {
    error: function(msg, meta) { logger.error(msg, Object.assign({}, meta, { correlationId: correlationId })); },
    warn: function(msg, meta) { logger.warn(msg, Object.assign({}, meta, { correlationId: correlationId })); },
    info: function(msg, meta) { logger.info(msg, Object.assign({}, meta, { correlationId: correlationId })); },
    debug: function(msg, meta) { logger.debug(msg, Object.assign({}, meta, { correlationId: correlationId })); },
  };

  logger.info(req.method + ' ' + req.originalUrl, {
    correlationId: correlationId,
    ip: req.ip,
    userAgent: req.get('User-Agent') || undefined,
  });

  next();
}

module.exports = { correlationIdMiddleware: correlationIdMiddleware };
