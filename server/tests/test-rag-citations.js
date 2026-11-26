/**
 * MediAgent Task 6 — RAG Citation & Grounded-Explanation Tests
 *
 * Tests the grounded LLM explanation service (groundedLlmService.js) and
 * citation mechanics:
 *   10. Citation correctness — every citation refers to an actual retrieved source
 *   16. Separation of ML, SHAP, RAG, and LLM outputs
 *   17. (Logic) Evidence-grounded vs absent-evidence handling
 *   - No fabricated citations or source links
 *   - ML probability/outcome invariance
 *   - SHAP invariance
 *   - No unsupported treatment prescriptions
 *   - Evidence insufficient handling
 *   - Conflicting/outdated quality flags flow through to explanation
 *
 * These tests do not require the SQLite database or a running server.
 */

const assert = require('assert');
const {
  generateGroundedExplanation,
  buildCitations,
  summarizeEvidenceFacts,
} = require('../services/groundedLlmService');

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
  console.log('🧪 MediAgent Task 6 — RAG Citation & Grounded-Explanation Tests');
  console.log('==============================================================================\n');

  const mlPred = {
    predictedOutcome: 'Positive',
    estimatedProbability: 0.7026,
    displayProbabilityPct: 70.3,
  };
  const shap = {
    features: [
      { feature: 'plas', clinicalName: 'Plasma Glucose', value: 150, unit: 'mg/dL', shapValue: 0.45, direction: 'toward_positive' },
      { feature: 'mass', clinicalName: 'BMI', value: 28, unit: 'kg/m2', shapValue: 0.2, direction: 'toward_positive' },
    ],
    topPositiveFactors: ['Plasma Glucose', 'BMI'],
    topNegativeFactors: ['Age'],
  };

  const realSource = {
    sourceId: 'ada-2026-sec2',
    title: 'ADA 2026 Standards of Care in Diabetes — Section 2',
    organization: 'American Diabetes Association',
    publicationDate: '2025-12-01',
    url: 'https://diabetesjournals.org/care/issue/49/Supplement_1',
    documentType: 'Clinical Practice Guideline',
    topic: 'diabetes_screening',
    disease: 'diabetes',
    excerpt: 'Fasting plasma glucose >= 126 mg/dL meets criteria for diabetes diagnosis when confirmed by repeat testing.',
    relevanceScore: 0.6,
    outdated: false,
  };

  // TEST 10: Citation correctness — every citation refers to actual retrieved source
  const citations = buildCitations([realSource]);
  record(
    'Citations carry sourceId, title, org, URL, and date matching the source',
    citations.length === 1
    && citations[0].sourceId === 'ada-2026-sec2'
    && citations[0].title === realSource.title
    && citations[0].organization === 'American Diabetes Association'
    && citations[0].url === realSource.url
    && citations[0].publicationDate === '2025-12-01',
    `Citation sourceId: ${citations[0].sourceId}`
  );
  record(
    'No fabricated citation fields (URL present and valid format)',
    citations[0].url && citations[0].url.startsWith('http'),
    `URL: ${citations[0].url}`
  );

  // TEST 16a: ML probability & outcome invariance
  const ragWithSource = { status: 'SUCCESS', sources: [realSource], qualityFlags: [] };
  const out = generateGroundedExplanation(mlPred, shap, ragWithSource);
  record(
    'ML estimatedProbability invariant (0.7026 unchanged)',
    out.screeningResult.estimatedProbability === 0.7026,
    `Value: ${out.screeningResult.estimatedProbability}`
  );
  record(
    'ML predictedOutcome invariant (Positive unchanged)',
    out.screeningResult.predictedOutcome === 'Positive',
    `Value: ${out.screeningResult.predictedOutcome}`
  );

  // TEST 16b: SHAP invariance
  record(
    'SHAP features preserved unchanged in modelExplanation',
    out.modelExplanation.length === 2
    && out.modelExplanation[0].feature === 'plas'
    && out.modelExplanation[0].shapValue === 0.45,
    `Features: ${out.modelExplanation.map((f) => f.feature).join(', ')}`
  );
  record(
    'SHAP topPositiveFactors unchanged',
    JSON.stringify(out.topFactors.topPositive) === JSON.stringify(['Plasma Glucose', 'BMI']),
    `Top positive: ${out.topFactors.topPositive.join(', ')}`
  );

  // TEST 10b: medicalContext claims link to verified source IDs (no fabricated sources)
  const knownIds = ['ada-2026-sec2'];
  record(
    'Medical context claims link only to verified source IDs',
    out.medicalContext.every((c) => c.sourceId === null || knownIds.includes(c.sourceId)),
    `sourceIds: [${out.medicalContext.map((c) => c.sourceId).join(', ')}]`
  );
  record(
    'No citation uses a fabricated [invented-source] marker',
    !out.medicalContext.some((c) => String(c.claim).includes('[invented-source]')),
    'All claims reference retrieved sources'
  );

  // TEST: Evidence-grounded flag reflects retrieval status
  record(
    'evidenceGrounded true when sources retrieved',
    out.evidenceGrounded === true,
    `evidenceGrounded: ${out.evidenceGrounded}`
  );
  record(
    'citations array populated with retrieved source',
    out.citations.length === 1 && out.citations[0].sourceId === 'ada-2026-sec2',
    `Citations: ${out.citations.length}`
  );

  // TEST: Evidence insufficient handling
  const ragEmpty = { status: 'INSUFFICIENT_EVIDENCE', sources: [], qualityFlags: [] };
  const outEmpty = generateGroundedExplanation(mlPred, shap, ragEmpty);
  record(
    'evidenceGrounded false when no sources retrieved',
    outEmpty.evidenceGrounded === false,
    `evidenceGrounded: ${outEmpty.evidenceGrounded}`
  );
  record(
    'evidenceFacts states absence of evidence when none retrieved',
    outEmpty.evidenceFacts.length === 1
    && outEmpty.evidenceFacts[0].type === 'absence_of_evidence',
    `Fact: ${outEmpty.evidenceFacts[0].fact.slice(0, 60)}`
  );
  record(
    'Limitations note insufficient evidence',
    outEmpty.limitations.some((l) => l.includes('No verified medical evidence')),
    'Limitation present'
  );
  record(
    'interpretation labels AI reasoning and notes no evidence',
    outEmpty.interpretation && outEmpty.interpretation.includes('No verified medical evidence'),
    `Interpretation: ${outEmpty.interpretation.slice(0, 80)}`
  );

  // TEST: No unsupported treatment prescriptions generated
  record(
    'Summary contains no unsupported dosage/prescription language',
    !out.summary.toLowerCase().includes('take 500mg')
    && !out.summary.toLowerCase().includes('inject insulin')
    && !out.summary.toLowerCase().includes('dosage:'),
    `Summary: ${out.summary.slice(0, 80)}`
  );

  // TEST: Disclaimer present and not diagnostic
  record(
    'Disclaimer states not a confirmed diagnosis',
    out.disclaimer && out.disclaimer.includes('not a confirmed medical diagnosis'),
    'Disclaimer present'
  );
  record(
    'Disclaimer notes retrieved guidance is not proof of disease',
    out.disclaimer && out.disclaimer.includes('not proof that the patient has a disease'),
    'Non-diagnostic framing present'
  );

  // TEST: Conflicting/outdated quality flags flow into explanation
  const oldSource = { ...realSource, sourceId: 'old-src', publicationDate: '2020-01-01', outdated: true, outdatedReason: 'older_than_3_years' };
  const ragWithFlags = {
    status: 'SUCCESS',
    sources: [realSource, oldSource],
    qualityFlags: [
      { type: 'OUTDATED_SOURCES', count: 1 },
      { type: 'CONFLICTING_GUIDANCE', count: 1, conflicts: [] },
    ],
  };
  const outFlags = generateGroundedExplanation(mlPred, shap, ragWithFlags);
  record(
    'Outdated-quality flag reflected in interpretation',
    outFlags.interpretation.includes('older than 3 years'),
    `Interpretation: ${outFlags.interpretation.slice(0, 100)}`
  );
  record(
    'Conflict-quality flag reflected in interpretation',
    outFlags.interpretation.includes('conflicting guidance'),
    `Interpretation: ${outFlags.interpretation.slice(0, 100)}`
  );
  record(
    'qualityFlags passed through to response',
    Array.isArray(outFlags.qualityFlags) && outFlags.qualityFlags.length === 2,
    `Flags: ${outFlags.qualityFlags.length}`
  );

  console.log('\n==============================================================================');
  console.log(`📊 CITATION TEST RESULTS: ${passed} / ${total} PASSED`);
  console.log('==============================================================================\n');

  process.exit(passed === total ? 0 : 1);
})().catch((err) => {
  console.error('Test runner exception:', err);
  process.exit(1);
});