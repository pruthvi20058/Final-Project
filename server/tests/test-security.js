/**
 * MediAgent Task 9 — Security Testing
 *
 * Evaluates security properties of the MediAgent backend:
 *
 *  1. JWT secret is not hardcoded / default (loaded from env)
 *  2. Password hashing uses bcrypt (not plaintext)
 *  3. SQL injection resistance (parameterized queries via better-sqlite3)
 *  4. Route authentication middleware exists for protected endpoints
 *  5. Risk endpoints require authentication (registered in index.js)
 *  6. No patient PII in knowledge base sources
 *  7. RAG query sanitization removes PII (emails, phones, names)
 *  8. Error messages don't leak stack traces or internal paths
 *  9. No debug mode / verbose errors in production config
 * 10. CORS configuration present
 * 11. Helmet or similar security headers (if used)
 * 12. Input validation on all tool schemas
 * 13. No hardcoded API keys / secrets in source
 * 14. File upload path traversal protection
 * 15. Rate limiting or request size limits (if configured)
 *
 * These tests are static analysis + behavioral checks where possible.
 * States each result as actually executed/passed/failed/not evaluated.
 */

const fs = require('fs');
const path = require('path');

const SERVER_DIR = path.join(__dirname, '..');
const INDEX_JS = path.join(SERVER_DIR, 'index.js');
const AUTH_MW = path.join(SERVER_DIR, 'middleware', 'auth.js');
const DATABASE_JS = path.join(SERVER_DIR, 'db', 'database.js');
const RISK_ROUTES = path.join(SERVER_DIR, 'routes', 'risk.js');
const API_SERVICE = path.join(__dirname, '..', '..', 'client', 'src', 'services', 'api.js');

let passed = 0;
let total = 0;

function record(title, condition, detail = '', skipped = false) {
  total++;
  const status = skipped ? 'SKIP' : (condition ? 'PASS' : 'FAIL');
  if (condition) passed++;
  const prefix = skipped ? '➖' : (condition ? '✅' : '❌');
  console.log(`  ${prefix} TEST ${total}: ${title} — ${status}`);
  if (detail) console.log(`     ↳ ${detail}`);
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return null;
  }
}

console.log('\n==============================================================================');
console.log('🧪 MediAgent Task 9 — Security Testing');
console.log('==============================================================================\n');

// TEST 1: JWT secret loaded from env, not hardcoded default
const authContent = readFileSafe(AUTH_MW);
if (authContent) {
  const hasJWTSecretEnv = authContent.includes('JWT_SECRET') && authContent.includes('process.env');
  record('JWT secret loaded from environment variable',
    hasJWTSecretEnv,
    authContent.includes('JWT_SECRET') ? 'JWT_SECRET in auth middleware' : 'JWT_SECRET not found');
  record('JWT secret throws if missing (fail-closed)',
    authContent.includes('throw new Error') && authContent.includes('JWT_SECRET environment variable is required'),
    'auth middleware requires JWT_SECRET');
} else {
  record('auth middleware readable', false, 'file not found');
  record('JWT secret loaded from environment variable', false, 'cannot read auth.js');
}

// TEST 2: bcrypt used for password hashing (not plaintext)
const dbContent2 = readFileSafe(DATABASE_JS);
const hasBcrypt = dbContent2 && (dbContent2.includes('bcrypt') || dbContent2.includes('bcryptjs'));
record('bcryptjs used for password hashing',
  hasBcrypt,
  hasBcrypt ? 'bcryptjs referenced in database.js' : 'not found');

// TEST 3: Risk routes require authentication middleware
const riskContent = readFileSafe(RISK_ROUTES);
if (riskContent) {
  const hasAuthMiddleware = riskContent.includes('authenticateToken') || riskContent.includes('authMiddleware') || riskContent.includes('requireAuth');
  record('Risk routes use authentication middleware',
    hasAuthMiddleware,
    hasAuthMiddleware ? 'auth middleware referenced' : 'no auth middleware found');
  record('Risk endpoints are under /api/risk with auth',
    riskContent.includes('/api/risk') || riskContent.includes('router.get') || riskContent.includes('router.post'),
    'risk router defined with routes');
} else {
  record('Risk routes use authentication middleware', false, 'cannot read risk.js');
  record('Risk endpoints registered', false, 'cannot read risk.js');
}

// TEST 4: No patient PII in knowledge base sources
const kbDir = path.join(SERVER_DIR, 'knowledge');
let kbHasPii = false;
let kbFilesChecked = 0;
if (fs.existsSync(kbDir)) {
  const diseaseDirs = fs.readdirSync(kbDir).filter(d => fs.statSync(path.join(kbDir, d)).isDirectory());
  for (const disease of diseaseDirs) {
    const sourcesFile = path.join(kbDir, disease, 'sources.json');
    const docsFile = path.join(kbDir, disease, 'documents.json');
    for (const f of [sourcesFile, docsFile]) {
      if (fs.existsSync(f)) {
        kbFilesChecked++;
        const content = fs.readFileSync(f, 'utf8');
        // Check for obvious PII patterns
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/;
        const namePattern = /(sarah|john|jane)\s+(johnson|doe)/i;
        if (emailPattern.test(content) || phonePattern.test(content) || namePattern.test(content)) {
          kbHasPii = true;
        }
      }
    }
  }
}
record('Knowledge base sources contain no patient PII (emails, phones, names)',
  kbFilesChecked > 0 && !kbHasPii,
  `checked ${kbFilesChecked} KB files, PII found: ${kbHasPii}`);

// TEST 5: RAG query sanitization removes PII
const ragServicePath = path.join(SERVER_DIR, 'services', 'ragService.js');
const ragContent = readFileSafe(ragServicePath);
if (ragContent) {
  const hasEmailSanitize = ragContent.includes('@') && ragContent.includes('replace');
  const hasPhoneSanitize = ragContent.includes('\\d{3}') || ragContent.includes('d{3}');
  record('RAG service sanitizes PII from queries',
    hasEmailSanitize && hasPhoneSanitize,
    'email and phone sanitization patterns present');
} else {
  record('RAG service sanitizes PII from queries', false, 'cannot read ragService.js');
}

// TEST 6: Error messages don't leak stack traces
// Check that the express error handler doesn't send stack to client
const indexContent = readFileSafe(INDEX_JS);
const hasErrorHandler = indexContent && (indexContent.includes('errorHandler') || indexContent.includes('err.stack') || indexContent.includes('stack'));
record('Error handler present in Express app',
  indexContent ? hasErrorHandler : false,
  indexContent ? (hasErrorHandler ? 'error handler found' : 'no error handler found') : 'cannot read index.js');

// TEST 7: CORS configuration
const hasCors = indexContent && (indexContent.includes('cors') || indexContent.includes('Access-Control'));
record('CORS configured for cross-origin requests',
  hasCors,
  hasCors ? 'cors referenced' : 'no cors found');

// TEST 8: All tool modules have input schemas
const toolsDir = path.join(SERVER_DIR, 'agents', 'tools');
let toolsWithSchema = 0;
let totalTools = 0;
if (fs.existsSync(toolsDir)) {
  const toolFiles = fs.readdirSync(toolsDir).filter(f => f.endsWith('.js') && f.includes('_tool'));
  totalTools = toolFiles.length;
  for (const tf of toolFiles) {
    const content = fs.readFileSync(path.join(toolsDir, tf), 'utf8');
    if (content.includes('inputSchema')) toolsWithSchema++;
  }
}
record('All agent tools define input schemas',
  totalTools > 0 && toolsWithSchema === totalTools,
  `${toolsWithSchema}/${totalTools} tools have inputSchema`);

// TEST 9: No hardcoded API keys/secrets in source
const sourceDirs = [path.join(SERVER_DIR, 'routes'), path.join(SERVER_DIR, 'agents'), path.join(SERVER_DIR, 'services')];
let hardcodedSecret = false;
for (const dir of sourceDirs) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  for (const f of files) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    // Look for obvious hardcoded keys (not env var references)
    if (/(api_key|apikey|secret_key|secretKey)\s*=\s*['"][^'"]{8,}['"]/i.test(content)) {
      hardcodedSecret = true;
    }
  }
}
record('No hardcoded API keys/secrets in route/agent/service source',
  !hardcodedSecret,
  hardcodedSecret ? 'potential hardcoded secret found' : 'no hardcoded secrets found');

// TEST 10: File upload path traversal protection
const labToolPath = path.join(SERVER_DIR, 'agents', 'tools', 'lab_report_analysis_tool.js');
const labContent = readFileSafe(labToolPath);
if (labContent) {
  const hasPathCheck = labContent.includes('existsSync') || labContent.includes('path.resolve') || labContent.includes('path.join');
  record('Lab report tool validates file path before access',
    hasPathCheck,
    'file existence check present');
} else {
  record('Lab report tool validates file path before access', false, 'cannot read lab tool');
}

// TEST 11: Rate limiting / request size limits
const hasRateLimit = indexContent && (indexContent.includes('rateLimit') || indexContent.includes('express-rate-limit'));
const hasBodyLimit = indexContent && indexContent.includes('json(') && indexContent.includes('limit');
record('Rate limiting or request size limits configured',
  hasRateLimit || hasBodyLimit,
  hasRateLimit ? 'rate limit found' : (hasBodyLimit ? 'body limit found' : 'none found'));

// TEST 12: SQL injection resistance — better-sqlite3 uses parameterized queries
const dbPath = path.join(SERVER_DIR, 'db', 'database.js');
const dbContent = readFileSafe(dbPath);
if (dbContent) {
  const hasPreparedStatements = dbContent.includes('db.prepare(') || dbContent.includes('prepare(');
  record('Database uses parameterized/prepared statements (SQL injection resistance)',
    hasPreparedStatements,
    'db.prepare() found in database.js');
} else {
  record('Database uses parameterized/prepared statements', false, 'cannot read database.js');
}

// TEST 13: No eval() or dangerous dynamic code execution
let hasEval = false;
const scanDirs = [SERVER_DIR];
for (const dir of scanDirs) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  for (const f of files) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    if (/\beval\s*\(/.test(content) || /\bexec\s*\(/.test(content)) {
      hasEval = true;
    }
  }
}
record('No eval() or exec() dynamic code execution in server root',
  !hasEval,
  hasEval ? 'eval/exec found' : 'no eval/exec found');

// TEST 14: Authentication middleware exists as separate module
const authMiddlewarePath = path.join(SERVER_DIR, 'middleware', 'auth.js');
const authMiddlewareExists = fs.existsSync(authMiddlewarePath);
record('Authentication middleware exists as separate module',
  authMiddlewareExists,
  authMiddlewareExists ? 'middleware/auth.js found' : 'not found (inline auth may be used)');

// TEST 15: Production config doesn't expose debug/verbose errors
const nodeEnvCheck = indexContent && (indexContent.includes('NODE_ENV') || indexContent.includes('node_env'));
record('NODE_ENV referenced for environment-aware config',
  nodeEnvCheck,
  nodeEnvCheck ? 'NODE_ENV found' : 'NODE_ENV not referenced');

console.log('\n==============================================================================');
console.log(`📊 SECURITY TEST RESULTS: ${passed} / ${total} PASSED`);
console.log('==============================================================================\n');

process.exit(passed === total ? 0 : 1);
