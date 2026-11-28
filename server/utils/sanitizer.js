/**
 * MediAgent — Output Sanitization (XSS Prevention)
 *
 * Provides HTML escaping and content sanitization for rendering
 * user-provided or externally-sourced content (OCR text, patient
 * symptoms, physician comments, RAG excerpts, agent summaries).
 *
 * All untrusted content should be treated as potentially malicious
 * and escaped before insertion into HTML contexts.
 */

// HTML entity map for escaping
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} text - Untrusted text
 * @returns {string} HTML-escaped text
 */
function escapeHtml(text) {
  if (text == null) return '';
  return String(text).replace(/[&<>"'`/=]/g, (ch) => HTML_ENTITIES[ch] || ch);
}

/**
 * Sanitize a string for safe insertion into HTML text content.
 * Null/undefined values become empty strings.
 * @param {*} value - Any value
 * @returns {string} Safe HTML text
 */
function sanitizeText(value) {
  if (value == null) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return escapeHtml(String(value));
}

/**
 * Sanitize an object's string fields recursively for safe rendering.
 * Non-string values are passed through. Arrays are mapped.
 * @param {*} obj - Object to sanitize
 * @returns {*} Sanitized object
 */
function sanitizeObject(obj) {
  if (obj == null) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = typeof v === 'string' ? escapeHtml(v) : sanitizeObject(v);
    }
    return out;
  }
  return obj;
}

/**
 * Sanitize lab result values for display. Numeric values are passed
 * through; string labels are escaped.
 * @param {Object} labResult - { testName, value, units, status, ... }
 * @returns {Object} Sanitized lab result
 */
function sanitizeLabResult(labResult) {
  if (!labResult || typeof labResult !== 'object') return labResult;
  return {
    ...labResult,
    testName: escapeHtml(labResult.testName || ''),
    rawName: escapeHtml(labResult.rawName || ''),
    units: escapeHtml(labResult.units || ''),
    referenceRange: escapeHtml(labResult.referenceRange || ''),
    status: escapeHtml(labResult.status || ''),
    quality: escapeHtml(labResult.quality || ''),
  };
}

/**
 * Remove potentially dangerous URL schemes (javascript:, data:, vbscript:).
 * @param {string} url - URL to check
 * @returns {string|null} Sanitized URL or null if unsafe
 */
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const dangerousSchemes = /^(javascript|vbscript|data|file):/i;
  if (dangerousSchemes.test(url.trim())) return null;
  // Only allow http, https, or relative paths
  const allowed = /^(https?:|\/|[a-zA-Z0-9._-]*$)/i;
  if (!allowed.test(url.trim())) return null;
  return url;
}

module.exports = {
  escapeHtml,
  sanitizeText,
  sanitizeObject,
  sanitizeLabResult,
  sanitizeUrl,
};
