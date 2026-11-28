/**
 * MediAgent Task 7 — Agentic Orchestration Tests
 *
 * Tests the agentic orchestration layer:
 *   1. Tool registry & input/output schemas
 *   2. Symptom analysis tool (extraction + validation)
 *   3. Data verification tool (mandatory gate)
 *   4. Disease readiness tool (model gating)
 *   5. Medical evidence tool (RAG, insufficient evidence)
 *   6. Risk assessment tool (unavailable when no data)
 *   7. Report generation tool (ML invariants, citations)
 *   8. Workflow planning (scenario determination, step ordering)
 *   9. Tool execution failure handling (timeouts, retries, partial)
 *   10. Safety rules (LLM cannot override ML invariants, verification gate)
 *
 * These tests do not require the SQLite database or a running server.
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

// ---------------------------------------------------------------------------
// Load modules under test
// ---------------------------------------------------------------------------
const symptomAnalysisTool = require('../agents/tools/symptom_analysis_tool');
const dataVerificationTool = require('../agents/tools/data_verification_tool');
const diseaseReadinessTool = require('../agents/tools/disease_readiness_tool');
const medicalEvidenceTool = require('../agents/tools/medical_evidence_tool');
const riskAssessmentTool = require('../agents/tools/risk_assessment_tool');
const reportGenerationTool = require('../agents/tools/report_generation_tool');
const shapExplanationTool = require('../agents/tools/shap_explanation_tool');
const {
  determineScenario,
  planWorkflow,
  listRegisteredTools,
  getTool,
  TOOL_REGISTRY,
  STATES,
  executeTool
} = require('../agents/orchestratorService');

// ---------------------------------------------------------------------------
// Main async test runner
// ---------------------------------------------------------------------------
(async () => {
  console.log('\n==============================================================================');
  console.log('🧪 MediAgent Task 7 — Agentic Orchestration Tests');
  console.log('==============================================================================\n');

  // --------------------------------------------------------------------------
  // TEST GROUP 1: Tool registry & schemas
  // --------------------------------------------------------------------------
  console.log('--- Tool Registry & Schemas ---');

  record('Tool registry contains all 9 required tools',
    Object.keys(TOOL_REGISTRY).length === 9 &&
    ['symptom_analysis_tool','lab_report_analysis_tool','data_verification_tool',
     'disease_readiness_tool','disease_prediction_tool','shap_explanation_tool',
     'medical_evidence_tool','risk_assessment_tool','report_generation_tool'].every(t => TOOL_REGISTRY[t])
  );

  record('Each registered tool has name, inputSchema, outputSchema, validateInput, execute',
    Object.values(TOOL_REGISTRY).every(t =>
      typeof t.name === 'string' &&
      t.inputSchema && Array.isArray(t.inputSchema.required) &&
      t.outputSchema &&
      typeof t.validateInput === 'function' &&
      typeof t.execute === 'function'
    )
  );

  record('listRegisteredTools returns tools with schemas',
    (() => {
      const tools = listRegisteredTools();
      return tools.length === 9 && tools.every(t => t.name && t.inputSchema && t.outputSchema);
    })()
  );

  record('getTool returns null for unknown tool',
    getTool('nonexistent_tool') === null
  );

  record('getTool returns the tool module for known tool',
    getTool('symptom_analysis_tool') === symptomAnalysisTool
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Symptom analysis tool
  // --------------------------------------------------------------------------
  console.log('\n--- Symptom Analysis Tool ---');

  const validRes = await symptomAnalysisTool.execute(
    { text: 'I have fever and headache for two days', language: 'en' },
    { startedAt: Date.now() }
  );
  record('Symptom analysis returns COMPLETED with active symptoms',
    validRes.status === 'COMPLETED' && Array.isArray(validRes.activeSymptoms) &&
    validRes.inputValid === true && validRes.durationMs >= 0,
    `status=${validRes.status} symptoms=[${validRes.activeSymptoms.join(', ')}]`
  );

  record('Symptom analysis returns negated symptoms array',
    Array.isArray(validRes.negatedSymptoms) && typeof validRes.detectedLanguage === 'string',
    `negated=[${validRes.negatedSymptoms.join(', ')}] lang=${validRes.detectedLanguage}`
  );

  const invalidRes = await symptomAnalysisTool.execute(
    { text: '', language: 'en' },
    { startedAt: Date.now() }
  );
  record('Symptom analysis rejects empty text',
    invalidRes.status === 'FAILED' && invalidRes.inputValid === false && typeof invalidRes.error === 'string',
    `status=${invalidRes.status} error=${invalidRes.error}`
  );

  const notObjRes = await symptomAnalysisTool.execute(null, { startedAt: Date.now() });
  record('Symptom analysis rejects non-object input',
    notObjRes.status === 'FAILED' && notObjRes.inputValid === false
  );

  record('validateInput rejects missing text',
    symptomAnalysisTool.validateInput({}).length > 0
  );
  record('validateInput accepts valid input',
    symptomAnalysisTool.validateInput({ text: 'fever', language: 'en' }).length === 0
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Data verification tool (mandatory gate)
  // --------------------------------------------------------------------------
  console.log('\n--- Data Verification Tool (Mandatory Gate) ---');

  const notConfirmed = await dataVerificationTool.execute(
    { userConfirmed: false, verifiedSymptoms: ['fever'] },
    { startedAt: Date.now() }
  );
  record('Verification tool returns AWAITING_VERIFICATION when not confirmed',
    notConfirmed.status === 'AWAITING_VERIFICATION' && notConfirmed.verified === false,
    `status=${notConfirmed.status}`
  );

  const confirmed = await dataVerificationTool.execute(
    { userConfirmed: true, verifiedSymptoms: ['fever', 'headache'] },
    { startedAt: Date.now() }
  );
  record('Verification tool returns VERIFIED when confirmed',
    confirmed.status === 'VERIFIED' && confirmed.verified === true &&
    Array.isArray(confirmed.activeSymptoms) && confirmed.activeSymptoms.length === 2,
    `status=${confirmed.status} symptoms=[${confirmed.activeSymptoms.join(', ')}]`
  );

  const noConfirm = await dataVerificationTool.execute(
    { verifiedSymptoms: ['fever'] },
    { startedAt: Date.now() }
  );
  record('Verification tool rejects missing userConfirmed',
    noConfirm.status === 'FAILED' && noConfirm.inputValid === false
  );

  record('validateInput requires userConfirmed boolean',
    dataVerificationTool.validateInput({}).length > 0 &&
    dataVerificationTool.validateInput({ userConfirmed: 'yes' }).length > 0 &&
    dataVerificationTool.validateInput({ userConfirmed: true }).length === 0
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 4: Disease readiness tool
  // --------------------------------------------------------------------------
  console.log('\n--- Disease Readiness Tool ---');

  const diabetesReport = {
    labResults: [
      { normalizedName: 'preg', value: 2, unit: 'count' },
      { normalizedName: 'glucose', value: 148, unit: 'mg/dL' },
      { normalizedName: 'diastolic_bp', value: 82, unit: 'mmHg' },
      { normalizedName: 'skin_fold', value: 25, unit: 'mm' },
      { normalizedName: 'insulin', value: 95, unit: 'uU/mL' },
      { normalizedName: 'bmi', value: 28.5, unit: 'kg/m2' },
      { normalizedName: 'pedigree', value: 0.5, unit: 'score' },
      { normalizedName: 'age', value: 45, unit: 'years' }
    ]
  };
  const readyRes = await diseaseReadinessTool.execute(
    { report: diabetesReport, disease: 'diabetes' },
    { startedAt: Date.now() }
  );
  record('Disease readiness returns READY for diabetes with all Pima features',
    readyRes.status === 'READY' && readyRes.disease === 'diabetes' &&
    readyRes.availableFeatures.length === 8 && readyRes.missingFeatures.length === 0,
    `status=${readyRes.status} available=${readyRes.availableFeatures.length}/8`
  );

  const partialReport = { labResults: [{ normalizedName: 'plas', value: 148 }] };
  const insufficientRes = await diseaseReadinessTool.execute(
    { report: partialReport, disease: 'diabetes' },
    { startedAt: Date.now() }
  );
  record('Disease readiness returns INSUFFICIENT_DATA for missing features',
    insufficientRes.status === 'INSUFFICIENT_DATA' &&
    insufficientRes.missingFeatures.length > 0 &&
    insufficientRes.availableFeatures.length < 8,
    `status=${insufficientRes.status} missing=${insufficientRes.missingFeatures.join(', ')}`
  );

  const unknownRes = await diseaseReadinessTool.execute(
    { report: {}, disease: 'unknown_disease' },
    { startedAt: Date.now() }
  );
  record('Disease readiness returns MODEL_UNAVAILABLE for unknown disease',
    unknownRes.status === 'MODEL_UNAVAILABLE' && unknownRes.inputValid === false
  );

  const noReport = await diseaseReadinessTool.execute(
    { disease: 'diabetes' },
    { startedAt: Date.now() }
  );
  record('Disease readiness rejects missing report',
    noReport.status === 'MODEL_UNAVAILABLE' && noReport.inputValid === false
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 5: Medical evidence tool (RAG)
  // --------------------------------------------------------------------------
  console.log('\n--- Medical Evidence Tool (RAG) ---');

  const evidenceRes = await medicalEvidenceTool.execute(
    { disease: 'diabetes', symptoms: ['fatigue', 'thirst'], featuresPresent: ['glucose', 'hba1c'], queryKeywords: 'screening guidelines', topK: 5 },
    { startedAt: Date.now() }
  );
  record('Medical evidence tool returns sources or INSUFFICIENT_EVIDENCE',
    (evidenceRes.status === 'SUCCESS' || evidenceRes.status === 'INSUFFICIENT_EVIDENCE') &&
    Array.isArray(evidenceRes.sources) && typeof evidenceRes.retrievedCount === 'number',
    `status=${evidenceRes.status} count=${evidenceRes.retrievedCount}`
  );

  record('Evidence sources have full citation metadata',
    evidenceRes.sources.every(s => s.sourceId && s.title && s.organization),
    `sample source: ${evidenceRes.sources[0]?.title || 'none'}`
  );

  const emptyRes = await medicalEvidenceTool.execute(
    { symptoms: [], featuresPresent: [], queryKeywords: '' },
    { startedAt: Date.now() }
  );
  record('Evidence tool returns INSUFFICIENT_EVIDENCE for empty query (no disease, no symptoms, no keywords)',
    emptyRes.status === 'INSUFFICIENT_EVIDENCE' && emptyRes.retrievedCount === 0
  );

  const badDisease = await medicalEvidenceTool.execute(
    { disease: 'not_a_real_disease' },
    { startedAt: Date.now() }
  );
  record('Evidence tool accepts any disease string (disease enum is declarative, not enforced)',
    badDisease.inputValid === true && (badDisease.status === 'SUCCESS' || badDisease.status === 'INSUFFICIENT_EVIDENCE'),
    `status=${badDisease.status}`
  );

  record('validateInput rejects empty disease string',
    medicalEvidenceTool.validateInput({ disease: '' }).length > 0
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 6: Risk assessment tool
  // --------------------------------------------------------------------------
  console.log('\n--- Risk Assessment Tool ---');

  const noData = await riskAssessmentTool.execute({}, { startedAt: Date.now() });
  record('Risk assessment rejects empty input (no symptoms, labs, or disease)',
    noData.status === 'FAILED' && noData.inputValid === false,
    `status=${noData.status}`
  );

  const withPredictionOnly = await riskAssessmentTool.execute(
    {
      prediction: { status: 'SUCCESS', disease: 'diabetes', displayProbabilityPct: 78 },
      disease: 'diabetes'
    },
    { startedAt: Date.now() }
  );
  record('Risk assessment does NOT use ML probability for risk scoring',
    withPredictionOnly.mlProbabilityUsedForRisk === false &&
    (withPredictionOnly.status === 'RISK_ASSESSMENT_UNAVAILABLE' || withPredictionOnly.status === 'COMPLETED'),
    `status=${withPredictionOnly.status} mlProbUsed=${withPredictionOnly.mlProbabilityUsedForRisk}`
  );

  const withLabs = await riskAssessmentTool.execute(
    {
      labResults: [
        { testName: 'Glucose (Fasting)', normalizedName: 'glucose', value: 150, unit: 'mg/dL', validatedByUser: true },
        { testName: 'HbA1c', normalizedName: 'hba1c', value: 7.5, unit: '%', validatedByUser: true }
      ],
      disease: 'diabetes'
    },
    { startedAt: Date.now() }
  );
  record('Risk assessment identifies abnormal verified lab findings',
    withLabs.status === 'COMPLETED' &&
    withLabs.abnormalFindings.length >= 1 &&
    withLabs.mlProbabilityUsedForRisk === false,
    `status=${withLabs.status} abnormal=${withLabs.abnormalFindings.length} mlProbUsed=${withLabs.mlProbabilityUsedForRisk}`
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 7: Report generation tool (ML invariants)
  // --------------------------------------------------------------------------
  console.log('\n--- Report Generation Tool ---');

  const mlPrediction = {
    predictedOutcome: 'Positive',
    estimatedProbability: 0.7026,
    displayProbabilityPct: 70.3
  };
  const shapExplanation = {
    topPositiveFactors: ['Glucose', 'BMI'],
    topNegativeFactors: ['Age'],
    features: [{ feature: 'plas', shapValue: 0.45, direction: 'toward_positive' }]
  };
  const ragResult = {
    status: 'SUCCESS',
    sources: [{ sourceId: 'src-001', title: 'ADA Guidelines', organization: 'American Diabetes Association', relevanceScore: 85 }],
    qualityFlags: []
  };

  const reportRes = await reportGenerationTool.execute(
    { mlPrediction, shapExplanation, ragResult },
    { startedAt: Date.now() }
  );
  record('Report generation returns COMPLETED with summary and interpretation',
    reportRes.status === 'COMPLETED' && typeof reportRes.summary === 'string' &&
    typeof reportRes.interpretation === 'string' && reportRes.evidenceGrounded === true,
    `evidenceGrounded=${reportRes.evidenceGrounded} citations=${reportRes.citations.length}`
  );

  record('Report preserves ML probability invariant (not modified)',
    reportRes.screeningResult.estimatedProbability === 0.7026 &&
    reportRes.screeningResult.displayProbabilityPct === 70.3 &&
    reportRes.screeningResult.predictedOutcome === 'Positive',
    `prob=${reportRes.screeningResult.estimatedProbability} pct=${reportRes.screeningResult.displayProbabilityPct}`
  );

  record('Report includes citations from retrieved evidence',
    Array.isArray(reportRes.citations) && reportRes.citations.length > 0 &&
    reportRes.citations[0].title === 'ADA Guidelines',
    `citation: ${reportRes.citations[0]?.title}`
  );

  const noEvidenceRes = await reportGenerationTool.execute(
    { mlPrediction: { predictedOutcome: 'Negative', estimatedProbability: 0.2, displayProbabilityPct: 20 }, shapExplanation: {}, ragResult: { status: 'INSUFFICIENT_EVIDENCE', sources: [], qualityFlags: [] } },
    { startedAt: Date.now() }
  );
  record('Report marks evidenceGrounded false when no evidence',
    noEvidenceRes.evidenceGrounded === false && noEvidenceRes.retrievalStatus === 'INSUFFICIENT_EVIDENCE'
  );

  const noPred = await reportGenerationTool.execute(
    { shapExplanation: {}, ragResult: {} },
    { startedAt: Date.now() }
  );
  record('Report generation rejects missing mlPrediction',
    noPred.status === 'FAILED' && noPred.inputValid === false
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 8: SHAP explanation tool
  // --------------------------------------------------------------------------
  console.log('\n--- SHAP Explanation Tool ---');

  const shapRes = await shapExplanationTool.execute(
    { prediction: { status: 'SUCCESS', shapExplanation: { topPositiveFactors: ['Glucose'], topNegativeFactors: ['Age'], features: [{ feature: 'plas', shapValue: 0.45, direction: 'toward_positive' }], baseValue: -0.87, method: 'SHAP LinearExplainer' } } },
    { startedAt: Date.now() }
  );
  record('SHAP tool extracts features and factors',
    shapRes.status === 'COMPLETED' && Array.isArray(shapRes.features) &&
    shapRes.topPositiveFactors.includes('Glucose'),
    `features=${shapRes.features.length} topPositive=[${shapRes.topPositiveFactors.join(', ')}]`
  );

  const noShap = await shapExplanationTool.execute(
    { prediction: { status: 'SUCCESS' } },
    { startedAt: Date.now() }
  );
  record('SHAP tool returns UNAVAILABLE when no SHAP data',
    noShap.status === 'UNAVAILABLE'
  );

  const failedPred = await shapExplanationTool.execute(
    { prediction: { status: 'INSUFFICIENT_DATA' } },
    { startedAt: Date.now() }
  );
  record('SHAP tool returns UNAVAILABLE for failed prediction',
    failedPred.status === 'UNAVAILABLE'
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 9: Workflow planning
  // --------------------------------------------------------------------------
  console.log('\n--- Workflow Planning ---');

  record('determineScenario returns combined for symptoms + lab',
    determineScenario({ symptoms: ['fever'], labReport: {} }) === 'combined'
  );
  record('determineScenario returns lab_report_only for lab only',
    determineScenario({ labReport: {} }) === 'lab_report_only'
  );
  record('determineScenario returns symptoms_only for symptoms only',
    determineScenario({ symptoms: ['fever'] }) === 'symptoms_only'
  );
  record('determineScenario defaults to symptoms_only',
    determineScenario({}) === 'symptoms_only'
  );

  const symptomsPlan = planWorkflow('symptoms_only');
  record('Symptoms-only plan has verification gate as step 2',
    symptomsPlan[1].tool === 'data_verification_tool' && symptomsPlan[1].gate === true
  );
  record('Symptoms-only plan orders readiness before prediction',
    symptomsPlan.findIndex(s => s.tool === 'disease_readiness_tool') <
    symptomsPlan.findIndex(s => s.tool === 'disease_prediction_tool')
  );

  const labPlan = planWorkflow('lab_report_only');
  record('Lab-only plan starts with lab_report_analysis_tool',
    labPlan[0].tool === 'lab_report_analysis_tool'
  );

  record('Workflow states include all required states',
    ['CREATED','INPUT_RECEIVED','PROCESSING','AWAITING_VERIFICATION','VERIFIED','ANALYZING','EVIDENCE_RETRIEVAL','COMPLETED','PARTIALLY_COMPLETED','FAILED'].every(s => STATES.includes(s))
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 10: Tool execution failure handling
  // --------------------------------------------------------------------------
  console.log('\n--- Tool Execution Failure Handling ---');

  const failingTool = {
    name: 'failing_tool',
    inputSchema: { required: [], properties: {} },
    outputSchema: {},
    validateInput: () => [],
    execute: async () => ({ status: 'FAILED', error: 'Simulated failure', inputValid: true })
  };
  const failResult = await executeTool(failingTool, { someInput: 'x' }, { timeoutMs: 5000, maxRetries: 1 });
  record('executeTool marks failed tool as FAILED with error',
    failResult.status === 'FAILED' && typeof failResult.errorMessage === 'string' && failResult.durationMs >= 0,
    `status=${failResult.status} error=${failResult.errorMessage}`
  );

  record('executeTool records retry count',
    typeof failResult.retryCount === 'number'
  );

  const throwingTool = {
    name: 'throwing_tool',
    inputSchema: { required: [], properties: {} },
    outputSchema: {},
    validateInput: () => [],
    execute: async () => { throw new Error('Simulated exception'); }
  };
  const throwResult = await executeTool(throwingTool, {}, { timeoutMs: 5000, maxRetries: 0 });
  record('executeTool handles tool that throws exception',
    throwResult.status === 'FAILED' && typeof throwResult.errorMessage === 'string'
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 11: Safety rules (LLM cannot override)
  // --------------------------------------------------------------------------
  console.log('\n--- Safety Rules ---');

  const origProb = 0.7026;
  const safetyRes = await reportGenerationTool.execute(
    { mlPrediction: { predictedOutcome: 'Positive', estimatedProbability: origProb, displayProbabilityPct: 70.3 }, shapExplanation: {}, ragResult: { status: 'SUCCESS', sources: [], qualityFlags: [] } },
    { startedAt: Date.now() }
  );
  record('Report generation preserves ML probability exactly (safety rule)',
    safetyRes.screeningResult.estimatedProbability === origProb,
    `orig=${origProb} result=${safetyRes.screeningResult.estimatedProbability}`
  );

  record('Report interpretation is AI-labelled (not presented as diagnosis)',
    typeof safetyRes.interpretation === 'string' && safetyRes.interpretation.includes('AI interpretation'),
    `starts: ${safetyRes.interpretation.slice(0, 50)}...`
  );

  const unverified = await dataVerificationTool.execute({ userConfirmed: false }, { startedAt: Date.now() });
  record('Verification gate blocks unverified assessment (safety rule)',
    unverified.status === 'AWAITING_VERIFICATION' && unverified.verified === false
  );

  const dengueReadiness = await diseaseReadinessTool.execute(
    { report: { labResults: [{ normalizedName: 'fever_duration', value: 5 }] }, disease: 'dengue' },
    { startedAt: Date.now() }
  );
  record('Dengue model is gated/not ready (never runs unvalidated model)',
    dengueReadiness.status === 'MODEL_GATED' || dengueReadiness.status === 'INSUFFICIENT_DATA' || dengueReadiness.gated === true,
    `status=${dengueReadiness.status} gated=${dengueReadiness.gated}`
  );

  // --------------------------------------------------------------------------
  // Final results
  // --------------------------------------------------------------------------
  console.log('\n==============================================================================');
  console.log(`📊 TASK 7 TEST RESULTS: ${passed} / ${total} PASSED`);
  console.log('==============================================================================\n');

  process.exit(passed === total ? 0 : 1);
})().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
