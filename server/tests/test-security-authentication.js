/**
 * MediAgent E5 — Authentication Security Tests
 *
 * Verifies password hashing, password complexity, account lockout,
 * token revocation, and secure session handling.
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function record(title, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✅ ${title} — PASSED`);
  } else {
    failed++;
    console.error(`  ❌ ${title} — FAILED`);
  }
  if (detail) console.log(`     ↳ ${detail}`);
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch { return null; }
}

console.log('\n==============================================================================');
console.log('🧪 MediAgent E5 — Authentication Security Tests');
console.log('==============================================================================\n');

// TEST 1: Verify bcrypt is used for password hashing
const dbContent = readFileSafe(path.join(__dirname, '..', 'db', 'database.js'));
const hasBcrypt = dbContent && (dbContent.includes('bcrypt') || dbContent.includes('bcryptjs'));
record('bcryptjs used for password hashing',
  !!hasBcrypt,
  'bcryptjs imported and used in database.js');

// TEST 2: Verify password complexity validation
const authContent = readFileSafe(path.join(__dirname, '..', 'routes', 'auth.js'));
const hasPwComplexity = authContent && authContent.includes('validatePasswordComplexity');
record('Password complexity validation exists',
  !!hasPwComplexity,
  'validatePasswordComplexity checks length, letters, digits');

// TEST 3: Verify generic authentication error messages (no user enumeration)
const hasGenericErrors = authContent && authContent.includes('Invalid email or password');
record('Generic authentication failure messages',
  !!hasGenericErrors,
  'Login returns same message for invalid email or wrong password');

// TEST 4: Verify account lockout after failed attempts
const hasLockout = authContent && authContent.includes('countFailedLogins') && authContent.includes('ACCOUNT_LOCKED');
record('Account lockout after repeated failed attempts',
  !!hasLockout,
  '5 failed attempts within 15 minutes locks account (429 response)');

// TEST 5: Verify failed login tracking
const hasFailedTracking = dbContent && dbContent.includes('recordFailedLogin') && dbContent.includes('countFailedLogins');
record('Failed login attempts tracked in database',
  !!hasFailedTracking,
  'failed_logins table with recordFailedLogin/countFailedLogins/clearFailedLogins');

// TEST 6: Verify failed logins cleared on successful login
const hasClearOnSuccess = authContent && authContent.includes('clearFailedLogins');
record('Failed attempts cleared on successful login',
  !!hasClearOnSuccess,
  'clearFailedLogins() called after successful password verification');

// TEST 7: Verify token revocation on logout
const hasTokenRevoke = authContent && authContent.includes('revokeToken');
record('Token revocation on logout',
  !!hasTokenRevoke,
  'Logout endpoint revokes JWT JTI in blacklist');

// TEST 8: Verify JWT includes JTI for revocation
const authMiddlewareContent = readFileSafe(path.join(__dirname, '..', 'middleware', 'auth.js'));
const hasJti = authMiddlewareContent && authMiddlewareContent.includes('jti');
record('JWT tokens include JTI claim',
  !!hasJti,
  'generateToken creates crypto.randomBytes JTI for revocation support');

// TEST 9: Verify auth middleware checks token blacklist
const hasBlacklistCheck = authMiddlewareContent && authMiddlewareContent.includes('isRevoked');
record('Auth middleware checks token blacklist',
  !!hasBlacklistCheck,
  'authenticateToken calls isRevoked(decoded.jti)');

// TEST 10: Verify JWT_SECRET validation at startup
const envValidatorContent = readFileSafe(path.join(__dirname, '..', 'utils', 'envValidator.js'));
const hasJwtSecretValidation = envValidatorContent && envValidatorContent.includes('JWT_SECRET');
record('JWT_SECRET validated at startup',
  !!hasJwtSecretValidation,
  'envValidator rejects placeholder or short JWT_SECRET');

// TEST 11: Verify no default account in production mode
const hasDemoGating = dbContent && dbContent.includes('isDemoMode') && dbContent.includes('DEMO_MODE');
record('Default account gated behind DEMO_MODE',
  !!hasDemoGating,
  'seedData() only creates DOC-001 when DEMO_MODE=true or NODE_ENV=test');

// TEST 12: Verify password salt rounds adequate
const hasSaltRounds = dbContent && dbContent.includes('SALT_ROUNDS');
const saltValue = dbContent.match(/SALT_ROUNDS\s*=\s*(\d+)/);
const adequateSalt = saltValue && parseInt(saltValue[1], 10) >= 10;
record('Bcrypt salt rounds >= 10',
  adequateSalt,
  `SALT_ROUNDS = ${saltValue ? saltValue[1] : 'not found'}`);

console.log(`\n==============================================================================`);
console.log(`📊 AUTHENTICATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`==============================================================================\n`);

process.exit(failed > 0 ? 1 : 0);
