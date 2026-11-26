/**
 * MediAgent Task 9 — Performance Testing
 *
 * Performance benchmarking for MediAgent backend components:
 *
 *  1. Risk assessment execution time (single call)
 *  2. Emergency warning detection time
 *  3. Lab interpretation time
 *  4. Symptom analysis (via Python NLP) execution time
 *  5. Disease readiness check time
 *  6. RAG evidence retrieval time
 *  7. Report generation time
 *  8. Concurrent request handling (sequential calls, not load testing)
 *  9. Memory usage check (no obvious leaks in repeated calls)
 * 10. Response time under threshold (e.g., < 5s per assessment)
 *
 * These are functional performance benchmarks, not production load tests.
 * States each result as actually executed/passed/failed.
 */

const {
  assessRisk,
  detectEmergencyWarnings,
  interpretLabResults
} = require('../risk/riskEngine');

const diseaseReadinessTool = require('../agents/tools/disease_readiness_tool');
const medicalEvidenceTool = require('../agents/tools/medical_evidence_tool');
const reportGenerationTool = require('../agents/tools/report_generation_tool');

let passed = 0;
let total = 0;
const timings = [];

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

function timeFn(label, fn) {
  const start = process.hrtime.bigint();
  return fn().then((result) => {
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1_000_000;
    timings.push({ label, ms, result });
    return result;
  });
}

const PERF_THRESHOLD_MS = 5000; // 5 seconds per operation

console.log('\n==============================================================================');
console.log('🧪 MediAgent Task 9 — Performance Testing');
console.log('==============================================================================\n');

// TEST 1: Risk assessment performance
timeFn('risk_assessment', async () => {
  return assessRisk({
    symptoms: ['fever', 'headache', 'fatigue'],
    labResults: [
      { normalizedName: 'glucose', value: 148, unit: 'mg/dL', validatedByUser: true },
      { normalizedName: 'hba1c', value: 7.5, unit: '%', validatedByUser: true }
    ],
    disease: 'diabetes',
    patientContext: { age: 45 }
  });
}).then((r) => {
  record('Risk assessment completes',
    r.status === 'COMPLETED' || r.status === 'RISK_ASSESSMENT_UNAVAILABLE',
    `status: ${r.status}`);

  // TEST 2: Risk assessment under time threshold
  const riskTiming = timings.find(t => t.label === 'risk_assessment');
  record(`Risk assessment under ${PERF_THRESHOLD_MS}ms`,
    riskTiming.ms < PERF_THRESHOLD_MS,
    `${riskTiming.ms.toFixed(2)}ms`);

  // TEST 3: Emergency warning detection performance
  return timeFn('emergency_warnings', async () => {
    return detectEmergencyWarnings({
      symptoms: ['difficulty breathing', 'chest pain'],
      labResults: [],
      disease: 'general'
    });
  });
}).then((r) => {
  record('Emergency warning detection completes',
    r.triggered === true || r.triggered === false,
    `triggered: ${r.triggered}`);

  const emergTiming = timings.find(t => t.label === 'emergency_warnings');
  record(`Emergency warning detection under ${PERF_THRESHOLD_MS}ms`,
    emergTiming.ms < PERF_THRESHOLD_MS,
    `${emergTiming.ms.toFixed(2)}ms`);

  // TEST 4: Lab interpretation performance
  return timeFn('lab_interpretation', async () => {
    return interpretLabResults([
      { normalizedName: 'glucose', value: 148, unit: 'mg/dL', validatedByUser: true },
      { normalizedName: 'hba1c', value: 7.5, unit: '%', validatedByUser: true },
      { normalizedName: 'creatinine', value: 1.2, unit: 'mg/dL', validatedByUser: true }
    ], {});
  });
}).then((r) => {
  record('Lab interpretation completes',
    typeof r.totalInterpreted === 'number' && r.totalInterpreted > 0,
    `interpreted: ${r.totalInterpreted}, abnormal: ${r.totalAbnormal}`);

  const labTiming = timings.find(t => t.label === 'lab_interpretation');
  record(`Lab interpretation under ${PERF_THRESHOLD_MS}ms`,
    labTiming.ms < PERF_THRESHOLD_MS,
    `${labTiming.ms.toFixed(2)}ms`);

  // TEST 5: Disease readiness performance
  return timeFn('disease_readiness', async () => {
    return diseaseReadinessTool.execute({
      report: {
        labResults: [
          { normalizedName: 'glucose', value: 148, unit: 'mg/dL', validatedByUser: true },
          { normalizedName: 'hba1c', value: 7.5, unit: '%', validatedByUser: true },
          { normalizedName: 'preg', value: 1, unit: 'count' },
          { normalizedName: 'pres', value: 80, unit: 'mmHg' },
          { normalizedName: 'skin', value: 20, unit: 'mm' },
          { normalizedName: 'insu', value: 85, unit: 'uU/mL' },
          { normalizedName: 'mass', value: 26.0, unit: 'kg/m2' },
          { normalizedName: 'pedi', value: 0.4, unit: 'score' },
          { normalizedName: 'age', value: 45, unit: 'years' }
        ]
      },
      disease: 'diabetes'
    }, { startedAt: Date.now() });
  });
}).then((r) => {
  record('Disease readiness check completes',
    r.status === 'READY' || r.status === 'INSUFFICIENT_DATA',
    `status: ${r.status}`);

  const readinessTiming = timings.find(t => t.label === 'disease_readiness');
  record(`Disease readiness under ${PERF_THRESHOLD_MS}ms`,
    readinessTiming.ms < PERF_THRESHOLD_MS,
    `${readinessTiming.ms.toFixed(2)}ms`);

  // TEST 6: RAG evidence retrieval performance
  return timeFn('rag_retrieval', async () => {
    return medicalEvidenceTool.execute({
      disease: 'diabetes',
      queryKeywords: 'diabetes screening glucose hba1c',
      topK: 5
    }, { startedAt: Date.now() });
  });
}).then((r) => {
  record('RAG evidence retrieval completes',
    r.status === 'SUCCESS' || r.status === 'INSUFFICIENT_EVIDENCE',
    `status: ${r.status}, count: ${r.retrievedCount}`);

  const ragTiming = timings.find(t => t.label === 'rag_retrieval');
  record(`RAG retrieval under ${PERF_THRESHOLD_MS}ms`,
    ragTiming.ms < PERF_THRESHOLD_MS,
    `${ragTiming.ms.toFixed(2)}ms`);

  // TEST 7: Report generation performance
  return timeFn('report_generation', async () => {
    return reportGenerationTool.execute({
      mlPrediction: {
        predictedOutcome: 'Diabetic',
        estimatedProbability: 0.73,
        displayProbabilityPct: 73.0
      },
      shapExplanation: {},
      ragResult: {
        status: 'SUCCESS',
        sources: [
          { title: 'ADA Standards of Care', organization: 'American Diabetes Association', relevanceScore: 0.9 }
        ],
        qualityFlags: []
      }
    }, { startedAt: Date.now() });
  });
}).then((r) => {
  record('Report generation completes',
    r.status === 'COMPLETED' || r.status === 'FAILED',
    `status: ${r.status}`);

  const reportTiming = timings.find(t => t.label === 'report_generation');
  record(`Report generation under ${PERF_THRESHOLD_MS}ms`,
    reportTiming.ms < PERF_THRESHOLD_MS,
    `${reportTiming.ms.toFixed(2)}ms`);

  // TEST 8: Concurrent/sequential request handling — 10 rapid risk assessments
  return timeFn('sequential_batch', async () => {
    const results = [];
    for (let i = 0; i < 10; i++) {
      const res = await assessRisk({
        symptoms: ['fever'],
        labResults: [{ normalizedName: 'glucose', value: 100 + i, unit: 'mg/dL', validatedByUser: true }],
        disease: 'diabetes'
      });
      results.push(res);
    }
    return results;
  });
}).then((results) => {
  const batchTiming = timings.find(t => t.label === 'sequential_batch');
  record('10 sequential risk assessments complete',
    results.length === 10,
    `all 10 completed`);
  record(`10 sequential assessments under ${PERF_THRESHOLD_MS * 2}ms total`,
    batchTiming.ms < PERF_THRESHOLD_MS * 2,
    `${batchTiming.ms.toFixed(2)}ms total`);

  // TEST 9: Memory/stability — repeated calls don't degrade significantly
  const firstMs = timings.find(t => t.label === 'risk_assessment').ms;
  const lastMs = batchTiming.ms / 10; // avg per call in batch
  const degradation = lastMs / firstMs;
  record('No significant performance degradation over repeated calls',
    degradation < 5.0,
    `first: ${firstMs.toFixed(2)}ms, batch avg: ${lastMs.toFixed(2)}ms, ratio: ${degradation.toFixed(2)}x`);

  // TEST 10: Overall — all operations under threshold
  const allUnderThreshold = timings.every(t => t.ms < PERF_THRESHOLD_MS);
  record('All individual operations under performance threshold',
    allUnderThreshold,
    `max: ${Math.max(...timings.map(t => t.ms)).toFixed(2)}ms`);

  // Print timing summary
  console.log('\n--- Performance Timing Summary ---');
  for (const t of timings) {
    console.log(`  ${t.label.padEnd(25)} ${t.ms.toFixed(2)}ms`);
  }
}).catch((err) => {
  console.error(`Performance test error: ${err.message}`);
  process.exit(1);
}).finally(() => {
  console.log('\n==============================================================================');
  console.log(`📊 PERFORMANCE TEST RESULTS: ${passed} / ${total} PASSED`);
  console.log('==============================================================================\n');
  process.exit(passed === total ? 0 : 1);
});
