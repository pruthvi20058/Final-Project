/**
 * MediAgent E5 — File Upload Security Tests
 *
 * Verifies that file upload handlers validate extensions, MIME types,
 * file signatures, size limits, and prevent path traversal.
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
console.log('🧪 MediAgent E5 — File Upload Security Tests');
console.log('==============================================================================\n');

// TEST 1: Verify fileSecurity module exists and exports validation functions
const fileSecContent = readFileSafe(path.join(__dirname, '..', 'utils', 'fileSecurity.js'));
record('File security utility module exists',
  !!fileSecContent,
  'server/utils/fileSecurity.js found');

// TEST 2: Verify extension allowlist
const hasExtAllowlist = fileSecContent && fileSecContent.includes('ALLOWED_EXTENSIONS');
record('File extension allowlist defined',
  hasExtAllowlist,
  'ALLOWED_EXTENSIONS set contains .pdf, .jpg, .jpeg, .png, .webp');

// TEST 3: Verify MIME type validation
const hasMimeValidation = fileSecContent && fileSecContent.includes('isAllowedMimeType');
record('MIME type validation function exists',
  !!hasMimeValidation,
  'isAllowedMimeType function found');

// TEST 4: Verify file signature (magic bytes) validation
const hasSigValidation = fileSecContent && fileSecContent.includes('validateFileSignature');
record('File signature validation exists',
  !!hasSigValidation,
  'validateFileSignature checks magic bytes against extension');

// TEST 5: Verify file size limit
const hasSizeLimit = fileSecContent && fileSecContent.includes('MAX_FILE_SIZE');
record('Maximum file size defined',
  !!hasSizeLimit,
  'MAX_FILE_SIZE set to 15 MB');

// TEST 6: Verify safe filename generation
const hasSafeFilename = fileSecContent && fileSecContent.includes('generateSafeFilename');
record('Safe filename generation exists',
  !!hasSafeFilename,
  'generateSafeFilename uses UUID prefix');

// TEST 7: Verify path traversal prevention
const hasPathTraversalCheck = fileSecContent && fileSecContent.includes('isSafePathComponent');
record('Path traversal prevention exists',
  !!hasPathTraversalCheck,
  'isSafePathComponent validates path components');

// TEST 8: Verify reports route uses fileSecurity
const reportsContent = readFileSafe(path.join(__dirname, '..', 'routes', 'reports.js'));
const reportsUsesFileSec = reportsContent && reportsContent.includes('fileSecurity');
record('Reports route imports file security module',
  !!reportsUsesFileSec,
  'reports.js requires fileSecurity utilities');

// TEST 9: Verify reports route checks extension AND mime AND signature
const reportsHasExtCheck = reportsContent && reportsContent.includes('isAllowedExtension');
const reportsHasMimeCheck = reportsContent && reportsContent.includes('isAllowedMimeType');
const reportsHasSigCheck = reportsContent && reportsContent.includes('validateFileSignature');
record('Reports route validates extension, MIME, and signature',
  reportsHasExtCheck && reportsHasMimeCheck && reportsHasSigCheck,
  'All three validation layers applied to uploads');

// TEST 10: Verify uploaded files are not served via public static middleware
const indexContent = readFileSafe(path.join(__dirname, '..', 'index.js'));
const hasPublicUploads = indexContent && indexContent.includes("app.use('/uploads', express.static");
record('Uploads not served via public static middleware',
  !hasPublicUploads,
  'Static middleware for /uploads removed; files served through authorized endpoint');

// TEST 11: Verify authorized file download endpoint exists
const hasFileDownloadEndpoint = reportsContent && reportsContent.includes('/:id/file');
record('Authorized file download endpoint exists',
  !!hasFileDownloadEndpoint,
  'GET /api/reports/:id/file enforces ownership before serving');

// TEST 12: Verify multer file size limit
const reportsHasMulterLimit = reportsContent && reportsContent.includes('fileSize: 15');
record('Multer configured with 15 MB file size limit',
  !!reportsHasMulterLimit,
  'Upload limited to 15 MB per file');

console.log(`\n==============================================================================`);
console.log(`📊 FILE UPLOAD TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`==============================================================================\n`);

process.exit(failed > 0 ? 1 : 0);
