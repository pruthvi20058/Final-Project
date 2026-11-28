/**
 * MediAgent — File Upload Security
 *
 * Provides secure file upload validation: allowed extensions, MIME type
 * verification via file signatures (magic bytes), file size limits,
 * safe filename generation, and path traversal prevention.
 *
 * Uploaded files are stored outside publicly accessible directories and
 * served only through authorized endpoints.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Allowed file extensions for clinical documents
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);

// Maximum file size: 15 MB
const MAX_FILE_SIZE = 15 * 1024 * 1024;

// File signature (magic byte) validation
const FILE_SIGNATURES = {
  '.pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  '.jpg': [0xFF, 0xD8, 0xFF],
  '.jpeg': [0xFF, 0xD8, 0xFF],
  '.png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  '.webp': [0x52, 0x49, 0x46, 0x46], // RIFF (WEBP starts with RIFF)
};

/**
 * Generate a cryptographically safe stored filename.
 * @param {string} originalName - Original filename (for extension only)
 * @returns {string} Safe filename with UUID prefix
 */
function generateSafeFilename(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const uuid = crypto.randomBytes(16).toString('hex');
  return `${uuid}${ext}`;
}

/**
 * Validate a file's extension against the allowlist.
 * @param {string} filename
 * @returns {boolean}
 */
function isAllowedExtension(filename) {
  if (!filename || typeof filename !== 'string') return false;
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

/**
 * Validate a file's MIME type against the allowlist.
 * @param {string} mimetype
 * @returns {boolean}
 */
function isAllowedMimeType(mimetype) {
  const allowed = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);
  return mimetype && allowed.has(mimetype.toLowerCase());
}

/**
 * Validate a file's magic bytes against its extension to prevent
 * polyglot/mislabeled file uploads.
 * @param {Buffer} buffer - File content buffer (first 16 bytes)
 * @param {string} extension - Lowercase extension including dot
 * @returns {boolean}
 */
function validateFileSignature(buffer, extension) {
  if (!buffer || buffer.length < 4) return false;
  const expected = FILE_SIGNATURES[extension];
  if (!expected) return false;
  for (let i = 0; i < expected.length; i++) {
    if (buffer[i] !== expected[i]) return false;
  }
  return true;
}

/**
 * Validate file size.
 * @param {number} size
 * @returns {boolean}
 */
function isValidFileSize(size) {
  return typeof size === 'number' && size > 0 && size <= MAX_FILE_SIZE;
}

/**
 * Sanitize a user-provided path component to prevent path traversal.
 * Only allows alphanumeric, dash, underscore, and dot.
 * @param {string} component
 * @returns {boolean}
 */
function isSafePathComponent(component) {
  if (!component || typeof component !== 'string') return false;
  return /^[A-Za-z0-9._-]+$/.test(component) && !component.includes('..');
}

/**
 * Check if a file path is within the upload directory (no traversal).
 * @param {string} uploadDir - Absolute upload directory
 * @param {string} requestedPath - Requested file path
 * @returns {boolean}
 */
function isPathWithinUploadDir(uploadDir, requestedPath) {
  const resolved = path.resolve(uploadDir, requestedPath);
  const uploadResolved = path.resolve(uploadDir);
  return resolved.startsWith(uploadResolved + path.sep) || resolved === uploadResolved;
}

module.exports = {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  generateSafeFilename,
  isAllowedExtension,
  isAllowedMimeType,
  validateFileSignature,
  isValidFileSize,
  isSafePathComponent,
  isPathWithinUploadDir,
};
