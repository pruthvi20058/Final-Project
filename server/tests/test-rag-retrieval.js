/**
 * MediAgent Task 6 — RAG Retrieval Tests
 *
 * Tests the enhanced TF-IDF + keyword hybrid vector store (vectorStoreService.js)
 * and RAG service (ragService.js):
 *   6. Vector-store loads and indexes all knowledge-base chunks
 *   7. Disease-aware retrieval is scoped to the requested disease
 *   8. Retrieval returns ranked results with similarity scores
 *   9. Retrieval with no matching evidence returns INSUFFICIENT_EVIDENCE
 *   10. Similarity score handling (semantic + keyword components)
 *   11. Duplicate result removal / source diversity
 *   12. Source metadata (organization, title, URL, date) attached
 *   13. Retrieval logging does not expose patient data
 *
 * These tests do not require the SQLite database or a running server.
 */

const assert = require('assert');
const { store } = require('../services/vectorStoreService');
const {
  retrieveMedicalEvidence,
  sanitizeQuery,
  isOutdated,
  detectConflicts,
  SUPPORTED_DISEASES,
} = require('../services/ragService');

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

(async () => {
  console.log('==============================================================================');
  console.log('🧪 MediAgent Task 6 — RAG Retrieval Tests');
  console.log('==============================================================================\n');

  // Ensure index is built
  store.build();

  // TEST 6: Vector store loads and indexes all knowledge-base chunks
  record(
    'Vector store indexes all knowledge-base chunks across supported diseases',
    store.getDocCount() > 0,
    `Docs indexed: ${store.getDocCount()}`
  );
  record(
    'All five Task-4 diseases are represented in the index',
    SUPPORTED_DISEASES.every((d) => store.getDiseases().includes(d)),
    `Diseases: ${store.getDiseases().join(', ')}`
  );

  // TEST 7: Disease-aware retrieval is scoped to the requested disease
  const dengueRes = store.search('fever', { topK: 10, disease: 'dengue' });
  const dengueOnly = dengueRes.results.every((r) => r.disease === 'dengue');
  record(
    'Disease-aware retrieval returns only dengue documents for disease=dengue',
    dengueOnly,
    `Result diseases: [${dengueRes.results.map((r) => r.disease).join(', ')}]`
  );

  const malariaRes = store.search('fever', { topK: 10, disease: 'malaria' });
  const malariaOnly = malariaRes.results.every((r) => r.disease === 'malaria');
  record(
    'Disease-aware retrieval returns only malaria documents for disease=malaria',
    malariaOnly,
    `Result diseases: [${malariaRes.results.map((r) => r.disease).join(', ')}]`
  );

  // TEST 8: Retrieval returns ranked results with similarity scores
  const rankedRes = store.search('dengue fever mosquito', { topK: 5, disease: 'dengue' });
  record(
    'Retrieval returns ranked results with relevance, semantic, keyword scores',
    rankedRes.status === 'SUCCESS'
    && rankedRes.results.length > 0
    && rankedRes.results.every((r) => typeof r.relevanceScore === 'number'
      && typeof r.semanticScore === 'number'
      && typeof r.keywordScore === 'number'),
    `Top relevance: ${rankedRes.results[0] ? rankedRes.results[0].relevanceScore : 'n/a'}`
  );
  record(
    'Results are sorted in descending relevance order',
    rankedRes.results.every((r, i) => i === 0 || r.relevanceScore <= rankedRes.results[i - 1].relevanceScore),
    `Scores: [${rankedRes.results.map((r) => r.relevanceScore).join(', ')}]`
  );

  // TEST 9: Retrieval with no matching evidence returns INSUFFICIENT_EVIDENCE
  const emptyRes = retrieveMedicalEvidence({
    queryKeywords: 'zzz qwerty asdfgh nonsense xycvb',
    topK: 5,
  });
  record(
    'No matching evidence returns INSUFFICIENT_EVIDENCE with zero sources',
    emptyRes.status === 'INSUFFICIENT_EVIDENCE' && emptyRes.retrievedCount === 0 && emptyRes.sources.length === 0,
    `Status: ${emptyRes.status}`
  );
  record(
    'No matching evidence includes a descriptive message',
    typeof emptyRes.message === 'string' && emptyRes.message.length > 0,
    `Message: ${emptyRes.message}`
  );

  // TEST 10: Similarity score handling — semantic + keyword both present
  const scoreRes = store.search('fever treatment', { topK: 5, disease: 'malaria' });
  record(
    'Hybrid scoring produces both semantic and keyword components',
    scoreRes.status === 'SUCCESS'
    && scoreRes.results.some((r) => r.semanticScore !== undefined && r.keywordScore !== undefined),
    `Sample: sem=${scoreRes.results[0]?.semanticScore} kw=${scoreRes.results[0]?.keywordScore}`
  );

  // TEST 11: Source diversity — results don't over-represent a single source
  const diverseRes = store.search('fever', { topK: 8, disease: 'dengue' });
  const sourceCounts = {};
  diverseRes.results.forEach((r) => { sourceCounts[r.sourceId] = (sourceCounts[r.sourceId] || 0) + 1; });
  const maxPerSource = Math.max(...Object.values(sourceCounts));
  record(
    'Source diversity enforced — no single source dominates top results',
    maxPerSource <= 2,
    `Max chunks per source: ${maxPerSource} (sources: ${JSON.stringify(sourceCounts)})`
  );

  // TEST 12: Source metadata attached (organization, title, URL, date)
  const metaRes = store.search('fever headache', { topK: 3, disease: 'dengue' });
  record(
    'Each result carries full source metadata (org, title, url, date)',
    metaRes.status === 'SUCCESS'
    && metaRes.results.every((r) => r.organization && r.title && r.url && r.publicationDate),
    `Fields present on ${metaRes.results.length} results`
  );

  // TEST 13: PII is sanitized from retrieval queries (no patient data leaked)
  const dirty = 'PAT-9001 Sarah Johnson sarah@example.com 555-123-4567 glucose screening';
  const clean = sanitizeQuery(dirty);
  record(
    'Patient identifiers (PII) sanitized from retrieval query',
    !clean.includes('Sarah') && !clean.includes('PAT-9001') && !clean.includes('sarah@example.com') && !clean.includes('555-123-4567'),
    `Cleaned: "${clean}"`
  );

  // TEST 14: Outdated-source detection
  const oldCheck = isOutdated('2020-01-01');
  const recentCheck = isOutdated('2026-01-01');
  const missingCheck = isOutdated(null);
  record(
    'Outdated-source detection flags sources older than 3 years',
    oldCheck.outdated === true && oldCheck.reason === 'older_than_3_years',
    `Days old: ${oldCheck.daysOld}`
  );
  record(
    'Recent sources are not flagged outdated',
    recentCheck.outdated === false,
    `Days old: ${recentCheck.daysOld}`
  );
  record(
    'Missing publication date handled gracefully',
    missingCheck.outdated === false && missingCheck.reason === 'missing_publication_date',
    `Reason: ${missingCheck.reason}`
  );

  // TEST 15: Conflicting-source detection
  const conflicts = detectConflicts([
    { sourceId: 'a', title: 'A', organization: 'Org1', publicationDate: '2020-01-01', topic: 'x', excerpt: 'do this' },
    { sourceId: 'b', title: 'B', organization: 'Org2', publicationDate: '2024-01-01', topic: 'x', excerpt: 'do that' },
  ]);
  record(
    'Conflicting-source detection flags divergent guidance across dates/orgs',
    conflicts.length > 0,
    `Conflicts: ${conflicts.length}`
  );

  console.log('\n==============================================================================');
  console.log(`📊 RETRIEVAL TEST RESULTS: ${passed} / ${total} PASSED`);
  console.log('==============================================================================\n');

  process.exit(passed === total ? 0 : 1);
})().catch((err) => {
  console.error('Test runner exception:', err);
  process.exit(1);
});