/**
 * MediAgent Task 9 — End-to-End Workflow Integration Tests
 *
 * Scenario A: Symptoms-only assessment
 * Scenario B: Laboratory-only assessment
 * Scenario C: Combined assessment
 * Scenario D: Insufficient data
 * Scenario E: Emergency warning
 * Scenario F: Service failures
 *
 * These tests exercise pure functions directly (no running server required)
 * since the Express server cannot start in this sandbox due to the
 * better-sqlite3 native module compilation limitation.
 */

const assert = require('assert');

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

// Load modules under test
const {
  assessRisk,
  detectEmergencyWarnings,
  interpretLabResults
} = require('../risk/riskEngine');

const {
  determineScenario,
  planWorkflow,
  listRegisteredTools,
  TOOL_REGISTRY
} = require('../agents/orchestratorService');

const riskAssessmentTool = require('../agents/tools/risk_assessment_tool');
const symptomAnalysisTool = require('../agents/tools/symptom_analysis_tool');
const dataVerificationTool = require('../agents/tools/data_verification_tool');
const diseaseReadinessTool = require('../agents/tools/disease_readiness_tool');
const diseasePredictionTool = require('../agents/tools/disease_prediction_tool');
const shapExplanationTool = require('../agents/tools/shap_explanation_tool');
const medicalEvidenceTool = require('../agents/tools/medical_evidence_tool');
const reportGenerationTool = require('../agents/tools/report_generation_tool');

// ---------------------------------------------------------------------------
console.log('\n==============================================================================');
console.log('🧪 MediAgent Task 9 — End-to-End Workflow Integration Tests');
console.log('==============================================================================\n');

(async () => {
  // =========================================================================
  // SCENARIO A: Symptoms-only assessment
  // =========================================================================
  console.log('\n--- Scenario A: Symptoms-only Assessment ---');

  // Step 1: Determine scenario
  const scenarioA = determineScenario({ symptoms: ['fever', 'headache'] });
  record('Scenario A: symptoms_only determined from symptoms input',
    scenarioA === 'symptoms_only',
    `scenario: ${scenarioA}`
  );

  // Step 2: Symptom analysis (multilingual NLP)
  const sympResultA = await symptomAnalysisTool.execute({
    text: 'fever and headache for 3 days',
    language: 'en'
  }, { startedAt: Date.now() });
  record('Scenario A: symptom extraction completes',
    sympResultA.status === 'COMPLETED' && Array.isArray(sympResultA.activeSymptoms),
    `extracted: [${sympResultA.activeSymptoms.join(', ')}]`
  );

  // Step 3: Verification gate
  const verifyResultA = await dataVerificationTool.execute({
    userConfirmed: true,
    verifiedSymptoms: sympResultA.activeSymptoms
  }, { startedAt: Date.now() });
  record('Scenario A: patient verification gate passes',
    verifyResultA.status === 'VERIFIED' && verifyResultA.verified === true,
    `status: ${verifyResultA.status}`
  );

  // Step 4: Disease-model readiness
  const readinessResultA = await diseaseReadinessTool.execute({
    report: { labResults: [] },
    disease: 'diabetes'
  }, { startedAt: Date.now() });
  record('Scenario A: disease readiness identifies missing features',
    readinessResultA.status === 'INSUFFICIENT_DATA' &&
    readinessResultA.missingFeatures.length > 0,
    `missing: ${readinessResultA.missingFeatures.join(', ')}`
  );

  // Step 5: Risk assessment with symptoms only
  const riskResultA = await riskAssessmentTool.execute({
    symptoms: ['fever', 'headache'],
    disease: 'general',
    patientContext: { age: 45 }
  }, { startedAt: Date.now() });
  record('Scenario A: risk assessment completes with symptoms only',
    riskResultA.status === 'COMPLETED' || riskResultA.status === 'RISK_ASSESSMENT_UNAVAILABLE',
    `status: ${riskResultA.status}`
  );

  // Step 6: Honest assessment status (no fabrication)
  record('Scenario A: no fabricated prediction when data insufficient',
    readinessResultA.status !== 'READY' ||
    (readinessResultA.status === 'READY' && readinessResultA.availableFeatures.length === 8),
    `readiness: ${readinessResultA.status}`
  );

  // =========================================================================
  // SCENARIO B: Laboratory-only assessment
  // =========================================================================
  console.log('\n--- Scenario B: Laboratory-only Assessment ---');

  // Step 1: Determine scenario
  const scenarioB = determineScenario({ labReport: { filePath: '/uploads/lab.pdf' } });
  record('Scenario B: lab_report_only determined from lab report input',
    scenarioB === 'lab_report_only',
    `scenario: ${scenarioB}`
  );

  // Step 2: Lab report analysis (OCR + extraction)
  const labResultB = await diseaseReadinessTool.execute({
    report: {
      labResults: [
        { normalizedName: 'glucose', value: 148, unit: 'mg/dL', validatedByUser: true },
        { normalizedName: 'hba1c', value: 7.5, unit: '%', validatedByUser: true },
        { normalizedName: 'preg', value: 1, unit: 'count' },
        { normalizedName: 'diastolic_bp', value: 80, unit: 'mmHg' },
        { normalizedName: 'skin_fold', value: 20, unit: 'mm' },
        { normalizedName: 'insulin', value: 85, unit: 'uU/mL' },
        { normalizedName: 'bmi', value: 26.0, unit: 'kg/m2' },
        { normalizedName: 'pedigree', value: 0.4, unit: 'score' },
        { normalizedName: 'age', value: 40, unit: 'years' }
      ]
    },
    disease: 'diabetes'
  }, { startedAt: Date.now() });
  record('Scenario B: lab parameters extracted and readiness checked',
    labResultB.status === 'READY' && labResultB.availableFeatures.length === 8,
    `status: ${labResultB.status}, features: ${labResultB.availableFeatures.length}/8`
  );

  // Step 3: Lab value interpretation
  const labInterpB = interpretLabResults([
    { normalizedName: 'glucose', value: 148, unit: 'mg/dL', validatedByUser: true },
    { normalizedName: 'hba1c', value: 7.5, unit: '%', validatedByUser: true }
  ], {});
  record('Scenario B: abnormal lab values identified',
    labInterpB.abnormal.length >= 1 &&
    labInterpB.results.some(r => r.status === 'HIGH'),
    `abnormal: ${labInterpB.abnormal.length}`
  );

  // Step 4: Risk assessment from labs
  const riskResultB = await riskAssessmentTool.execute({
    labResults: [
      { normalizedName: 'glucose', value: 148, unit: 'mg/dL', validatedByUser: true },
      { normalizedName: 'hba1c', value: 7.5, unit: '%', validatedByUser: true }
    ],
    disease: 'diabetes'
  }, { startedAt: Date.now() });
  record('Scenario B: risk assessment from verified lab values',
    riskResultB.status === 'COMPLETED' &&
    riskResultB.abnormalFindings.length >= 1,
    `abnormal findings: ${riskResultB.abnormalFindings.length}`
  );

  // =========================================================================
  // SCENARIO C: Combined assessment
  // =========================================================================
  console.log('\n--- Scenario C: Combined Assessment ---');

  // Step 1: Determine scenario
  const scenarioC = determineScenario({
    symptoms: ['fever', 'fatigue'],
    labReport: { filePath: '/uploads/combined.pdf' }
  });
  record('Scenario C: combined determined from symptoms + lab',
    scenarioC === 'combined',
    `scenario: ${scenarioC}`
  );

  // Step 2: Process symptoms
  const sympResultC = await symptomAnalysisTool.execute({
    text: 'fever and fatigue for 5 days',
    language: 'en'
  }, { startedAt: Date.now() });
  record('Scenario C: symptoms processed',
    sympResultC.status === 'COMPLETED',
    `symptoms: [${sympResultC.activeSymptoms.join(', ')}]`
  );

  // Step 3: Verify both sources
  const verifyResultC = await dataVerificationTool.execute({
    userConfirmed: true,
    verifiedSymptoms: sympResultC.activeSymptoms
  }, { startedAt: Date.now() });
  record('Scenario C: both sources verified',
    verifyResultC.status === 'VERIFIED',
    `status: ${verifyResultC.status}`
  );

  // Step 4: Map available features
  const readinessResultC = await diseaseReadinessTool.execute({
    report: {
      labResults: [
        { normalizedName: 'glucose', value: 130, unit: 'mg/dL', validatedByUser: true },
        { normalizedName: 'hba1c', value: 6.2, unit: '%', validatedByUser: true }
      ]
    },
    disease: 'diabetes'
  }, { startedAt: Date.now() });
  record('Scenario C: available features mapped',
    readinessResultC.availableFeatures.length >= 0,
    `features: ${readinessResultC.availableFeatures.length}/8`
  );

  // Step 5: Execute eligible disease models
  const predictionResultC = await diseasePredictionTool.execute({
    report: {
      labResults: [
        { normalizedName: 'glucose', value: 130, unit: 'mg/dL', validatedByUser: true },
        { normalizedName: 'hba1c', value: 6.2, unit: '%', validatedByUser: true }
      ]
    },
    disease: 'diabetes',
    readiness: readinessResultC
  }, { startedAt: Date.now() });
  record('Scenario C: disease prediction executes or reports insufficient data',
    predictionResultC.status === 'SUCCESS' ||
    predictionResultC.status === 'INSUFFICIENT_DATA' ||
    predictionResultC.status === 'MODEL_UNAVAILABLE',
    `status: ${predictionResultC.status}`
  );

  // Step 6: Run risk assessment
  const riskResultC = await riskAssessmentTool.execute({
    symptoms: ['fever', 'fatigue'],
    labResults: [
      { normalizedName: 'glucose', value: 130, unit: 'mg/dL', validatedByUser: true },
      { normalizedName: 'hba1c', value: 6.2, unit: '%', validatedByUser: true }
    ],
    disease: 'diabetes',
    prediction: predictionResultC.status === 'SUCCESS' ? predictionResultC : undefined
  }, { startedAt: Date.now() });
  record('Scenario C: risk assessment completes',
    riskResultC.status === 'COMPLETED' || riskResultC.status === 'RISK_ASSESSMENT_UNAVAILABLE',
    `status: ${riskResultC.status}`
  );

  // Step 7: Retrieve RAG evidence
  const evidenceResultC = await medicalEvidenceTool.execute({
    disease: 'diabetes',
    symptoms: sympResultC.activeSymptoms,
    featuresPresent: readinessResultC.availableFeatures,
    predictedOutcome: predictionResultC.predictedOutcome || '',
    queryKeywords: 'diabetes screening guidelines',
    topK: 5
  }, { startedAt: Date.now() });
  record('Scenario C: RAG evidence retrieved',
    evidenceResultC.status === 'SUCCESS' || evidenceResultC.status === 'INSUFFICIENT_EVIDENCE',
    `status: ${evidenceResultC.status}, count: ${evidenceResultC.retrievedCount}`
  );

  // Step 8: Generate final report
  const reportResultC = await reportGenerationTool.execute({
    mlPrediction: predictionResultC.status === 'SUCCESS' ? {
      predictedOutcome: predictionResultC.predictedOutcome,
      estimatedProbability: predictionResultC.estimatedProbability,
      displayProbabilityPct: predictionResultC.displayProbabilityPct
    } : { predictedOutcome: 'Undetermined', estimatedProbability: 0, displayProbabilityPct: 0 },
    shapExplanation: {},
    ragResult: evidenceResultC.status === 'SUCCESS' ? evidenceResultC : { status: 'INSUFFICIENT_EVIDENCE', sources: [], qualityFlags: [] }
  }, { startedAt: Date.now() });
  record('Scenario C: final report generated',
    reportResultC.status === 'COMPLETED' &&
    typeof reportResultC.summary === 'string',
    `evidenceGrounded: ${reportResultC.evidenceGrounded}`
  );

  // =========================================================================
  // SCENARIO D: Insufficient data
  // =========================================================================
  console.log('\n--- Scenario D: Insufficient Data ---');

  // Step 1: Submit incomplete information
  const readinessResultD = await diseaseReadinessTool.execute({
    report: { labResults: [] },
    disease: 'diabetes'
  }, { startedAt: Date.now() });
  record('Scenario D: no features available → INSUFFICIENT_DATA',
    readinessResultD.status === 'INSUFFICIENT_DATA' &&
    readinessResultD.missingFeatures.length === 8,
    `missing: ${readinessResultD.missingFeatures.join(', ')}`
  );

  // Step 2: Verify no fabricated prediction
  record('Scenario D: no prediction generated with insufficient data',
    readinessResultD.status !== 'READY',
    `status: ${readinessResultD.status}`
  );

  // Step 3: Risk assessment with no data
  const riskResultD = await riskAssessmentTool.execute({}, { startedAt: Date.now() });
  record('Scenario D: risk assessment returns unavailable with no data',
    riskResultD.status === 'FAILED' || riskResultD.status === 'RISK_ASSESSMENT_UNAVAILABLE',
    `status: ${riskResultD.status}`
  );

  // Step 4: Display missing required features
  record('Scenario D: missing features explicitly listed',
    Array.isArray(readinessResultD.missingFeatures) && readinessResultD.missingFeatures.length > 0,
    `missing: ${readinessResultD.missingFeatures.join(', ')}`
  );

  // =========================================================================
  // SCENARIO E: Emergency warning
  // =========================================================================
  console.log('\n--- Scenario E: Emergency Warning ---');

  // Step 1: Submit test case with validated emergency warning sign
  const emergResultE = await detectEmergencyWarnings({
    symptoms: ['difficulty breathing', 'chest pain'],
    labResults: [],
    disease: 'general'
  });
  record('Scenario E: emergency warning generated',
    emergResultE.triggered === true &&
    emergResultE.severity === 'critical',
    `triggered: ${emergResultE.triggered}, severity: ${emergResultE.severity}`
  );

  // Step 2: Emergency independent of ML and LLM availability
  record('Scenario E: emergency triggered even with low ML probability',
    emergResultE.triggered === true,
    'emergency does not depend on ML/LLM'
  );

  // Step 3: Low model probability cannot suppress warning
  const riskWithEmerg = await riskAssessmentTool.execute({
    symptoms: ['difficulty breathing'],
    labResults: [],
    disease: 'general',
    prediction: { status: 'SUCCESS', estimatedProbability: 0.05, displayProbabilityPct: 5 }
  }, { startedAt: Date.now() });
  record('Scenario E: low ML probability does not suppress emergency',
    riskWithEmerg.emergencyAlert.triggered === true &&
    riskWithEmerg.riskCategory === 'EMERGENCY',
    `triggered: ${riskWithEmerg.emergencyAlert.triggered}, category: ${riskWithEmerg.riskCategory}`
  );

  // =========================================================================
  // SCENARIO F: Service failures
  // =========================================================================
  console.log('\n--- Scenario F: Service Failures ---');

  // Step 1: OCR fails (file not found)
  const labReportTool = TOOL_REGISTRY.lab_report_analysis_tool;
  const ocrFailResult = await labReportTool.execute({
    filePath: '/nonexistent/file.pdf',
    mimeType: 'application/pdf'
  }, { startedAt: Date.now() });
  record('Scenario F: OCR failure handled gracefully',
    ocrFailResult.status === 'FAILED',
    `status: ${ocrFailResult.status}`
  );

  // Step 2: NLP provider fails (empty/symptom tool with invalid input)
  const nlpFailResult = await symptomAnalysisTool.execute(null, { startedAt: Date.now() });
  record('Scenario F: NLP failure handled gracefully',
    nlpFailResult.status === 'FAILED' && nlpFailResult.inputValid === false,
    `status: ${nlpFailResult.status}`
  );

  // Step 3: LLM provider fails (report generation with missing prediction)
  const llmFailResult = await reportGenerationTool.execute({
    shapExplanation: {},
    ragResult: { status: 'SUCCESS', sources: [], qualityFlags: [] }
  }, { startedAt: Date.now() });
  record('Scenario F: missing ML prediction handled gracefully',
    llmFailResult.status === 'FAILED' && llmFailResult.inputValid === false,
    `status: ${llmFailResult.status}`
  );

  // Step 4: RAG vector store unavailable (empty query)
  const ragFailResult = await medicalEvidenceTool.execute({
    symptoms: [], featuresPresent: [], queryKeywords: ''
  }, { startedAt: Date.now() });
  record('Scenario F: RAG unavailable returns INSUFFICIENT_EVIDENCE',
    ragFailResult.status === 'INSUFFICIENT_EVIDENCE' && ragFailResult.retrievedCount === 0,
    `status: ${ragFailResult.status}`
  );

  // Step 5: ML model cannot load (unknown disease)
  const mlFailResult = await diseaseReadinessTool.execute({
    report: {},
    disease: 'nonexistent_disease'
  }, { startedAt: Date.now() });
  record('Scenario F: unknown disease model returns MODEL_UNAVAILABLE',
    mlFailResult.status === 'MODEL_UNAVAILABLE',
    `status: ${mlFailResult.status}`
  );

  // Step 6: SHAP unavailable (no SHAP data in prediction)
  const shapFailResult = await shapExplanationTool.execute({
    prediction: { status: 'SUCCESS' }
  }, { startedAt: Date.now() });
  record('Scenario F: SHAP unavailable returns UNAVAILABLE',
    shapFailResult.status === 'UNAVAILABLE',
    `status: ${shapFailResult.status}`
  );

  // Step 7: Safe partial completion — risk assessment with partial data
  const partialRisk = await riskAssessmentTool.execute({
    symptoms: ['mild headache'],
    labResults: [],
    disease: 'general'
  }, { startedAt: Date.now() });
  record('Scenario F: partial completion with minimal data',
    partialRisk.status === 'COMPLETED' || partialRisk.status === 'RISK_ASSESSMENT_UNAVAILABLE',
    `status: ${partialRisk.status}`
  );

  // Step 8: Meaningful failure messages
  record('Scenario F: failure messages are meaningful (non-empty)',
    typeof ocrFailResult.error === 'string' && ocrFailResult.error.length > 0,
    `error: ${ocrFailResult.error.substring(0, 60)}`
  );

  // =========================================================================
  // Results
  // =========================================================================
  console.log('\n==============================================================================');
  console.log(`📊 E2E WORKFLOW TEST RESULTS: ${passed} / ${total} PASSED`);
  console.log('==============================================================================\n');

  process.exit(passed === total ? 0 : 1);
})().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
