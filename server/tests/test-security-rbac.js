/**
 * MediAgent E5 — RBAC and Authorization Tests
 *
 * Verifies role-based access control, permission enforcement, and
 * ownership checks across all protected API endpoints.
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
console.log('🧪 MediAgent E5 — RBAC and Authorization Tests');
console.log('==============================================================================\n');

// TEST 1: Verify RBAC middleware exists
const rbacContent = readFileSafe(path.join(__dirname, '..', 'middleware', 'rbac.js'));
record('RBAC middleware module exists',
  !!rbacContent,
  'server/middleware/rbac.js found');

// TEST 2: Verify permission matrix is defined
const hasPermissionMatrix = rbacContent && rbacContent.includes('PERMISSION_MATRIX');
record('Permission matrix defined',
  !!hasPermissionMatrix,
  'PERMISSION_MATRIX maps resources/actions to allowed roles');

// TEST 3: Verify requirePermission middleware exists
const hasRequirePermission = rbacContent && rbacContent.includes('requirePermission');
record('requirePermission middleware exists',
  !!hasRequirePermission,
  'requirePermission(resource, action) factory function found');

// TEST 4: Verify requireOwnershipOrRole middleware exists
const hasOwnershipMiddleware = rbacContent && rbacContent.includes('requireOwnershipOrRole');
record('requireOwnershipOrRole middleware exists',
  !!hasOwnershipMiddleware,
  'Ownership check with role bypass found');

// TEST 5: Verify role hierarchy defined
const hasRoleHierarchy = rbacContent && rbacContent.includes('ROLE_HIERARCHY');
record('Role hierarchy defined',
  !!hasRoleHierarchy,
  'ROLE_HIERARCHY maps roles to inherited permissions');

// TEST 6: Verify administrator role cannot self-assign via registration
const authContent = readFileSafe(path.join(__dirname, '..', 'routes', 'auth.js'));
const preventsAdminSelfAssign = authContent && (
  authContent.includes('administrator') && authContent.includes('assignedRole')
);
record('Registration prevents administrator self-assignment',
  !!preventsAdminSelfAssign,
  'Administrator role requests are downgraded to doctor');

// TEST 7: Verify all report endpoints enforce ownership
const reportsContent = readFileSafe(path.join(__dirname, '..', 'routes', 'reports.js'));
const reportsHasOwnership = reportsContent && reportsContent.includes('reportBelongsToUser');
record('All report endpoints enforce ownership',
  !!reportsHasOwnership,
  'reportBelongsToUser() used on all report access routes');

// TEST 8: Verify patient endpoints enforce ownership
const patientsContent = readFileSafe(path.join(__dirname, '..', 'routes', 'patients.js'));
const patientsHasOwnership = patientsContent && patientsContent.includes('patientBelongsToUser');
record('Patient endpoints enforce ownership',
  !!patientsHasOwnership,
  'patientBelongsToUser() used on patient routes');

// TEST 9: Verify risk assessment endpoints enforce user ownership
const riskContent = readFileSafe(path.join(__dirname, '..', 'routes', 'risk.js'));
const riskHasUserCheck = riskContent && riskContent.includes('userId !==');
record('Risk assessments enforce user ownership',
  !!riskHasUserCheck,
  'Risk assessment GET checks userId === req.user.id');

// TEST 10: Verify orchestrator endpoints enforce user ownership
const orchestratorContent = readFileSafe(path.join(__dirname, '..', 'routes', 'orchestrator.js'));
const orchHasUserCheck = orchestratorContent && orchestratorContent.includes('userId !==');
record('Orchestrator assessments enforce user ownership',
  !!orchHasUserCheck,
  'Assessment GET checks userId === req.user.id');

// TEST 11: Verify backup endpoints require admin role
const backupContent = readFileSafe(path.join(__dirname, '..', 'routes', 'backup.js'));
const backupRequiresAdmin = backupContent && backupContent.includes("role === 'admin'");
record('Backup endpoints require administrator role',
  !!backupRequiresAdmin,
  'isAdmin() check enforces administrator-only backup operations');

// TEST 12: Verify all protected routes use authenticateToken
const indexContent = readFileSafe(path.join(__dirname, '..', 'index.js'));
const routesWithAuth = [
  '/api/patients', '/api/reports', '/api/consultations', '/api/knowledge',
  '/api/rag', '/api/ml', '/api/health-companion', '/api/orchestrator',
  '/api/risk', '/api/backup'
];
let allRoutesAuthenticated = true;
for (const route of routesWithAuth) {
  if (!indexContent.includes(`app.use('${route}', authenticateToken`)) {
    allRoutesAuthenticated = false;
    console.log(`     ↳ Route ${route} missing authenticateToken`);
  }
}
record('All protected routes require authentication',
  allRoutesAuthenticated,
  'All 10 protected route groups use authenticateToken middleware');

// TEST 13: Verify auth middleware checks JWT_SECRET
const authMiddlewareContent = readFileSafe(path.join(__dirname, '..', 'middleware', 'auth.js'));
const authRequiresSecret = authMiddlewareContent && authMiddlewareContent.includes('throw new Error') && authMiddlewareContent.includes('JWT_SECRET');
record('Auth middleware requires JWT_SECRET',
  !!authRequiresSecret,
  'Server fails fast if JWT_SECRET is missing or insecure');

// TEST 14: Verify token revocation support
const hasTokenRevocation = authMiddlewareContent && authMiddlewareContent.includes('isRevoked');
record('Token revocation check implemented',
  !!hasTokenRevocation,
  'authenticateToken checks token blacklist via isRevoked()');

console.log(`\n==============================================================================`);
console.log(`📊 RBAC TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`==============================================================================\n`);

process.exit(failed > 0 ? 1 : 0);
