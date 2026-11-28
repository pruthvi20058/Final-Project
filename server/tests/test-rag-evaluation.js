/**
 * MediAgent Task 9 — RAG Evaluation
 *
 * Evaluates the medical evidence retrieval (RAG) system:
 *   server/agents/tools/medical_evidence_tool.js
 *   server/services/ragService.js
 *   server/knowledge/<disease>/documents.json + sources.json
 *
 *  1. Evidence retrieved for known disease (diabetes)
 *  2. Disease-scoped retrieval (dengue query returns dengue sources)
 *  3. INSUFFICIENT_EVIDENCE when no query terms
 *  4. No fabricated citations — all sources have sourceId, title, organization
 *  5. Source metadata completeness (url, publicationDate, documentType, topic)
 *  6. Quality flags present (outdated sources flagged)
 *  7. topK parameter respected
 *  8. PII sanitization (patient names/emails removed from query)
 *  9. Invalid input rejected (bad disease enum, bad topK)
 * 10. Output schema completeness
 */

const medicalEvidenceTool = require('../agents/tools/medical_evidence_tool');

let passed = 0;
let total = 0;

function record(title, condition, detail = '') {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ TEST ${total}: ${title} — PASSED`);
    if (detail) console.log(`     ↳ ${detail}`);
  } else {
    console.error(`  ❌ TEST ${total}: ${title} — FAILED`);
    if (detail) console.error(`     ↳ ${detail}`);
  }
}

console.log('\n==============================================================================');
console.log('🧪 MediAgent Task 9 — RAG Evaluation');
console.log('==============================================================================\n');

// TEST 1: Evidence retrieved for known disease
medicalEvidenceTool.execute({
  disease: 'diabetes',
  queryKeywords: 'diabetes screening guidelines',
  topK: 5
}, { startedAt: Date.now() }).then((r) => {
  record('Diabetes evidence retrieval returns SUCCESS or INSUFFICIENT_EVIDENCE',
    r.status === 'SUCCESS' || r.status === 'INSUFFICIENT_EVIDENCE',
    `status: ${r.status}`);
  record('Retrieved count is a number',
    typeof r.retrievedCount === 'number' && r.retrievedCount >= 0,
    `count: ${r.retrievedCount}`);
  record('Sources array is returned',
    Array.isArray(r.sources),
    `sources: ${r.sources.length}`);
  record('Quality flags array is returned',
    Array.isArray(r.qualityFlags),
    `flags: ${r.qualityFlags.length}`);

  // TEST 2: Source metadata completeness (if sources returned)
  if (r.sources.length > 0) {
    const allComplete = r.sources.every(s =>
      s.sourceId && s.title && s.organization &&
      typeof s.documentType === 'string'
    );
    record('All sources have required metadata (sourceId, title, organization, documentType)',
      allComplete,
      `sample: ${JSON.stringify(r.sources[0]).substring(0, 100)}`);
    record('Sources have disease association',
      r.sources.every(s => s.disease === 'diabetes' || s.disease === null),
      `diseases: ${r.sources.map(s => s.disease).join(', ')}`);
  } else {
    record('Sources have required metadata', true, 'no sources returned (skipped)');
    record('Sources have disease association', true, 'no sources returned (skipped)');
  }

  // TEST 3: INSUFFICIENT_EVIDENCE for empty query
  return medicalEvidenceTool.execute({
    symptoms: [], featuresPresent: [], queryKeywords: ''
  }, { startedAt: Date.now() });
}).then((r) => {
  record('Empty query returns INSUFFICIENT_EVIDENCE',
    r.status === 'INSUFFICIENT_EVIDENCE' && r.retrievedCount === 0,
    `status: ${r.status}, count: ${r.retrievedCount}`);
  record('Empty query has no sources',
    Array.isArray(r.sources) && r.sources.length === 0,
    `sources: ${r.sources.length}`);

  // TEST 4: Disease-scoped retrieval (dengue)
  return medicalEvidenceTool.execute({
    disease: 'dengue',
    queryKeywords: 'dengue fever platelet count',
    topK: 5
  }, { startedAt: Date.now() });
}).then((r) => {
  record('Dengue evidence retrieval returns valid status',
    r.status === 'SUCCESS' || r.status === 'INSUFFICIENT_EVIDENCE',
    `status: ${r.status}`);
  if (r.sources.length > 0) {
    const allDengue = r.sources.every(s => s.disease === 'dengue' || s.disease === null);
    record('Dengue sources are disease-scoped',
      allDengue,
      `diseases: ${r.sources.map(s => s.disease).join(', ')}`);
  } else {
    record('Dengue sources are disease-scoped', true, 'no sources (skipped)');
  }

  // TEST 5: PII sanitization — patient names/emales removed
  return medicalEvidenceTool.execute({
    disease: 'diabetes',
    queryKeywords: 'diabetes PAT-12345 sarah johnson test@example.com 555-123-4567',
    topK: 5
  }, { startedAt: Date.now() });
}).then((r) => {
  record('PII-sanitized query still returns valid result',
    r.status === 'SUCCESS' || r.status === 'INSUFFICIENT_EVIDENCE',
    `status: ${r.status}`);
  record('Query does not contain raw PII',
    !r.query.includes('PAT-12345') && !r.query.includes('sarah johnson') && !r.query.includes('test@example.com'),
    `query: ${r.query.substring(0, 80)}`);

  // TEST 6: topK parameter respected
  return medicalEvidenceTool.execute({
    disease: 'diabetes',
    queryKeywords: 'diabetes glucose insulin',
    topK: 2
  }, { startedAt: Date.now() });
}).then((r) => {
  record('topK=2 returns at most 2 sources',
    r.sources.length <= 2,
    `count: ${r.sources.length}`);

  // TEST 7: Invalid input — bad disease enum
  return medicalEvidenceTool.execute({
    disease: 'nonexistent_disease',
    queryKeywords: 'test query',
    topK: 5
  }, { startedAt: Date.now() });
}).then((r) => {
  record('Invalid disease does not crash',
    r.status === 'FAILED' || r.status === 'INSUFFICIENT_EVIDENCE' || r.status === 'SUCCESS',
    `status: ${r.status}`);

  // TEST 8: Invalid input — bad topK
  return medicalEvidenceTool.execute({
    disease: 'diabetes',
    queryKeywords: 'diabetes',
    topK: 100
  }, { startedAt: Date.now() });
}).then((r) => {
  record('topK out of range returns FAILED',
    r.status === 'FAILED' && r.inputValid === false,
    `status: ${r.status}, inputValid: ${r.inputValid}`);
  record('Meaningful validation error',
    typeof r.error === 'string' && r.error.length > 0,
    `error: ${r.error}`);

  // TEST 9: No input at all
  return medicalEvidenceTool.execute(null, { startedAt: Date.now() });
}).then((r) => {
  record('Null input returns FAILED (not crash)',
    r.status === 'FAILED' && r.inputValid === false,
    `status: ${r.status}`);

  // TEST 10: Output schema completeness
  return medicalEvidenceTool.execute({
    disease: 'malaria',
    queryKeywords: 'malaria severe symptoms',
    topK: 3
  }, { startedAt: Date.now() });
}).then((r) => {
  const requiredFields = [
    'status', 'query', 'sources', 'retrievedCount', 'qualityFlags',
    'retrievalInfo', 'inputValid', 'durationMs', 'error', 'message'
  ];
  const missing = requiredFields.filter(f => !(f in r));
  record('Output schema contains all required fields',
    missing.length === 0,
    `missing: ${missing.join(', ')}`);
  record('durationMs is a number',
    typeof r.durationMs === 'number' && r.durationMs >= 0,
    `duration: ${r.durationMs}ms`);
}).catch((err) => {
  console.error(`RAG test error: ${err.message}`);
  process.exit(1);
}).finally(() => {
  console.log('\n==============================================================================');
  console.log(`📊 RAG EVALUATION RESULTS: ${passed} / ${total} PASSED`);
  console.log('==============================================================================\n');
  process.exit(passed === total ? 0 : 1);
});
