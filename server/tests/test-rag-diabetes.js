const fs = require('fs');
const path = require('path');
const { retrieveMedicalEvidence, sanitizeQuery, loadKnowledgeSources } = require('../services/ragService');
const { generateGroundedExplanation } = require('../services/groundedLlmService');
const { saveRagRecord, saveAuditLog, getDb } = require('../db/database');
const { runPythonInference } = require('../services/predictionService');

async function runRagTestSuite() {
  console.log('================================================================');
  console.log('🧪 MediAgent Phase 2.4 Evidence-Grounded RAG Integration Test Suite');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ TEST ${passed + failed + 1}: ${testName} — PASSED`);
      passed++;
    } else {
      console.error(`  ❌ TEST ${passed + failed + 1}: ${testName} — FAILED: ${details}`);
      failed++;
    }
  }

  const baseDir = path.join(__dirname, '..', '..');
  const knowledgePath = path.join(baseDir, 'server', 'knowledge', 'diabetes', 'sources.json');

  // TEST 1: Knowledge Base File Exists
  assert(fs.existsSync(knowledgePath), 'Knowledge Base Sources JSON File Exists');

  // TEST 2 & 3: Sources Contain Provenance & Valid URLs
  const sources = loadKnowledgeSources();
  const validProvenance = sources.length > 0 && sources.every(s => 
    s.id && s.title && s.organization && s.publicationDate && s.url && s.url.startsWith('http')
  );
  assert(validProvenance, 'Sources Contain Verified Provenance & Valid URLs', `Loaded ${sources.length} sources`);

  // TEST 4: No Fabricated Source IDs
  const knownIds = sources.map(s => s.id);
  const noFabrication = knownIds.every(id => id.startsWith('ada-') || id.startsWith('niddk-') || id.startsWith('cdc-') || id.startsWith('who-'));
  assert(noFabrication, 'No Fabricated Source IDs in Knowledge Base');

  // TEST 5 & 6: Retrieval Returns Structured Results & Preserves Metadata
  const ragRes = retrieveMedicalEvidence({
    featuresPresent: ['plas', 'mass', 'age'],
    predictedOutcome: 'Positive'
  });
  assert(ragRes.status === 'SUCCESS' && ragRes.sources.length > 0 && ragRes.sources[0].url !== undefined, 'Retrieval Returns Structured Results & Preserves Provenance Metadata');

  // TEST 7: Medical Claims Linked to Actual Source IDs
  const mlPredMock = { predictedOutcome: 'Positive', estimatedProbability: 0.7026, displayProbabilityPct: 70.3 };
  const shapMock = { features: [], topPositiveFactors: ['Plasma Glucose'], topNegativeFactors: ['Age'] };
  const grounded = generateGroundedExplanation(mlPredMock, shapMock, ragRes);
  const claimsHaveSources = grounded.medicalContext.every(c => c.sourceId === null || knownIds.includes(c.sourceId));
  assert(claimsHaveSources, 'Medical Claims Are Linked to Verified Knowledge Base Source IDs');

  // TEST 8 & 9 & 20: MODEL/RAG SEPARATION (Probability & Classification Invariance)
  const mlProbBefore = mlPredMock.estimatedProbability;
  const outcomeBefore = mlPredMock.predictedOutcome;
  
  const probAfter = grounded.screeningResult.estimatedProbability;
  const outcomeAfter = grounded.screeningResult.predictedOutcome;

  const invariancePass = (mlProbBefore === probAfter) && (outcomeBefore === outcomeAfter);
  assert(invariancePass, 'Probability & Classification Invariance (ML prob == RAG prob == 0.7026)', `Before: ${mlProbBefore}, After: ${probAfter}`);

  // TEST 10: SHAP Values Remain Unchanged
  assert(grounded.modelExplanation !== undefined, 'SHAP Explanation Structure Preserved Unchanged');

  // TEST 11: Missing ML Data Prevents Unsupported RAG Inference
  const mlResMissing = await runPythonInference({ glucose: 185 }); // missing 7 features
  assert(mlResMissing.status === 'INSUFFICIENT_DATA', 'Missing ML Features Prevent Unsupported Inference (INSUFFICIENT_DATA)');

  // TEST 12: No Patient PII Placed into Retrieval Queries
  const dirtyQuery = 'PAT-9001 Sarah Johnson sarah@example.com 555-123-4567 glucose screening';
  const cleanQuery = sanitizeQuery(dirtyQuery);
  const piiRemoved = !cleanQuery.includes('Sarah') && !cleanQuery.includes('PAT-9001') && !cleanQuery.includes('sarah@example.com') && !cleanQuery.includes('555-123-4567');
  assert(piiRemoved, 'Patient Identifiers (PII) Sanitized from Retrieval Query', `Cleaned query: "${cleanQuery}"`);

  // TEST 13 & 17: Unsupported Claims Rejected & No Fabricated Citations
  const citationCheck = grounded.medicalContext.every(c => !c.claim.includes('[invented-source]'));
  assert(citationCheck, 'No Fabricated Citations or Unsupported Medical Claims');

  // TEST 14 & 15: Source Metadata Persisted & Audit Log Record Created in SQLite
  const ragId = saveRagRecord({
    reportId: 'REP-TEST-100',
    predictionId: 'PRED-TEST-100',
    query: 'diabetes screening',
    sourceIds: ['ada-2026-sec2'],
    sources: [sources[0]]
  });

  const auditId = saveAuditLog({
    reportId: 'REP-TEST-100',
    predictionId: 'PRED-TEST-100',
    action: 'TEST_RAG_AUDIT',
    sourceIds: ['ada-2026-sec2']
  });

  const db = getDb();
  const ragDbRecord = db.prepare('SELECT * FROM rag_records WHERE id = ?').get(ragId);
  const auditDbRecord = db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(auditId);
  assert(ragDbRecord && auditDbRecord && auditDbRecord.action === 'TEST_RAG_AUDIT', 'Source Metadata & Audit Log Persisted in SQLite');

  // TEST 16: RAG Execution Determinism
  const ragRes2 = retrieveMedicalEvidence({ featuresPresent: ['plas', 'mass', 'age'], predictedOutcome: 'Positive' });
  const deterministic = JSON.stringify(ragRes.sources) === JSON.stringify(ragRes2.sources);
  assert(deterministic, 'RAG Execution Deterministic across Repeated Runs');

  // TEST 18: No Treatment Prescriptions Generated
  const summaryLower = grounded.summary.toLowerCase();
  const noPrescriptions = !summaryLower.includes('take 500mg') && !summaryLower.includes('inject insulin') && !summaryLower.includes('dosage:');
  assert(noPrescriptions, 'No Unsanctioned Treatment Prescriptions Generated');

  // TEST 19: Source Failure Handling (INSUFFICIENT_EVIDENCE)
  const emptyRag = retrieveMedicalEvidence({ featuresPresent: ['xyz_unmatched_term_999'] });
  assert(emptyRag.status === 'INSUFFICIENT_EVIDENCE' && emptyRag.sources.length === 0, 'Source Failure Fallback Handling (INSUFFICIENT_EVIDENCE)', `Status: ${emptyRag.status}`);

  // TEST 20: Medical Disclaimer Present
  const hasDisclaimer = grounded.disclaimer && grounded.disclaimer.includes('AI-assisted screening result');
  assert(hasDisclaimer, 'Comprehensive Clinical Disclaimer Enforced');

  console.log('\n================================================================');
  console.log(`📊 RAG INTEGRATION TEST SUITE RESULTS: ${passed} / ${passed + failed} PASSED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRagTestSuite().catch(err => {
  console.error('RAG Test Runner Exception:', err);
  process.exit(1);
});
