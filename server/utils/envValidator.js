/**
 * MediAgent — Startup Environment Validation (Task 10: Production Environment Config)
 *
 * Validates all required environment variables at server startup before the
 * Express app begins listening. Fails fast with a clear error message if any
 * required variable is missing or insecure.
 *
 * Usage (in server/index.js before app.listen):
 *   const { validateEnv } = require('./utils/envValidator');
 *   validateEnv();
 */

function validateEnv() {
  var errors = [];
  var warnings = [];

  // Required: JWT secret (must not be the placeholder)
  var jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push('JWT_SECRET is required. Set a strong random secret in .env or your hosting platform.');
  } else if (
    jwtSecret.includes('your-super-secret') ||
    jwtSecret.includes('change-in-production') ||
    jwtSecret.length < 16
  ) {
    errors.push('JWT_SECRET is insecure: it is a placeholder or shorter than 16 characters. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"');
  }

  // Required: CORS origin
  if (!process.env.CORS_ORIGIN) {
    errors.push('CORS_ORIGIN is required. Set it to your frontend URL (e.g. https://your-app.vercel.app).');
  }

  // Required: port
  if (!process.env.PORT) {
    errors.push('PORT is required.');
  }

  // Required: database path
  if (!process.env.DATABASE_PATH) {
    errors.push('DATABASE_PATH is required.');
  }

  // Required: upload dir
  if (!process.env.UPLOAD_DIR) {
    errors.push('UPLOAD_DIR is required.');
  }

  // Required: python executable
  if (!process.env.PYTHON_EXECUTABLE && !process.env.PYTHON_PATH) {
    warnings.push('PYTHON_EXECUTABLE / PYTHON_PATH not set; defaulting to python3.');
  }

  // Optional: node env
  if (!process.env.NODE_ENV) {
    warnings.push('NODE_ENV not set; defaulting to development.');
  }

  // Report warnings
  warnings.forEach(function(w) { console.warn('[ENV WARNING] ' + w); });

  // Fail fast on errors
  if (errors.length > 0) {
    console.error('[ENV VALIDATION FAILED] The following required environment variables are missing or invalid:');
    errors.forEach(function(e) { console.error('  - ' + e); });
    process.exit(1);
  }

  console.log('[ENV VALIDATION PASSED] All required environment variables are present and valid.');
}

module.exports = { validateEnv: validateEnv };
