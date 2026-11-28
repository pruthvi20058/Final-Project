/**
 * MediAgent — Startup Environment Validation (Production & Cloud Deployment)
 *
 * Validates and provisions required environment variables at server startup.
 * Automatically injects safe production and cloud defaults when optional or
 * hosting-specific variables are omitted, preventing container startup crashes.
 *
 * Usage (in server/index.js before app.listen):
 *   const { validateEnv } = require('./utils/envValidator');
 *   validateEnv();
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function validateEnv() {
  const warnings = [];

  // 1. Port
  if (!process.env.PORT) {
    process.env.PORT = '3001';
    warnings.push('PORT not set; defaulted to 3001.');
  }

  // 2. Node Environment
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
    warnings.push('NODE_ENV not set; defaulted to production.');
  }

  // 3. Database Path
  if (!process.env.DATABASE_PATH) {
    process.env.DATABASE_PATH = path.join(__dirname, '..', 'mediagent.db');
    warnings.push(`DATABASE_PATH not set; defaulted to ${process.env.DATABASE_PATH}`);
  }

  // 4. Upload Directory
  if (!process.env.UPLOAD_DIR) {
    process.env.UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
    warnings.push(`UPLOAD_DIR not set; defaulted to ${process.env.UPLOAD_DIR}`);
  }

  // Ensure upload directory exists
  try {
    if (!fs.existsSync(process.env.UPLOAD_DIR)) {
      fs.mkdirSync(process.env.UPLOAD_DIR, { recursive: true });
    }
  } catch (err) {
    warnings.push(`Could not create UPLOAD_DIR at ${process.env.UPLOAD_DIR}: ${err.message}. Reverting to local uploads directory.`);
    process.env.UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(process.env.UPLOAD_DIR)) {
      fs.mkdirSync(process.env.UPLOAD_DIR, { recursive: true });
    }
  }

  // 5. JWT Secret
  let jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.includes('your-super-secret') || jwtSecret.includes('change-in-production') || jwtSecret.length < 16) {
    // Generate secure ephemeral key if not provided or placeholder
    const generated = crypto.randomBytes(32).toString('hex');
    process.env.JWT_SECRET = generated;
    warnings.push('JWT_SECRET was missing or insecure; auto-generated a cryptographically secure 256-bit secret for this session.');
  }

  // 6. CORS Origin
  if (!process.env.CORS_ORIGIN) {
    process.env.CORS_ORIGIN = '*';
    warnings.push('CORS_ORIGIN not set; defaulted to allowing frontend requests (* and .vercel.app).');
  }

  // 7. Python Executable
  if (!process.env.PYTHON_EXECUTABLE && !process.env.PYTHON_PATH) {
    process.env.PYTHON_EXECUTABLE = process.platform === 'win32' ? 'python' : 'python3';
    warnings.push(`PYTHON_EXECUTABLE defaulted to ${process.env.PYTHON_EXECUTABLE}.`);
  }

  // Report all notices
  warnings.forEach(w => console.log(`[ENV CONFIG] ${w}`));
  console.log('[ENV VALIDATION PASSED] Environment validated successfully. Ready for service.');
}

module.exports = { validateEnv };
