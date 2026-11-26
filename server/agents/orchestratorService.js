/**
 * MediAgent Task 7 — Agentic Orchestration Service
 *
 * Central orchestrator that coordinates MediAgent's existing components
 * through an allowlisted tool registry. Implements dynamic workflow
 * planning, state machine persistence, controlled tool execution with
 * timeouts/retries, and execution trace recording.
 *
 * Design principles:
 *   - Genuine tool orchestration (not LLM free-form execution)
 *   - Allowlisted tool registry only — no arbitrary code/SQL/FS access
 *   - Deterministic rules for safety-critical decisions (verification, readiness)
 *   - LLM assists with interpretation only; never overrides validation
 *   - Reuses Task 1-6 services; does not replace them
 *   - Workflow state persisted to SQLite
 */

const path = require('path');
const { v4: uuidv4 } = require('uuid');

// --- Tool registry (allowlisted) ---
const symptomAnalysisTool = require('./tools/symptom_analysis_tool');
const labReportAnalysisTool = require('./tools/lab_report_analysis_tool');
const dataVerificationTool = require('./tools/data_verification_tool');
const diseaseReadinessTool = require('./tools/disease_readiness_tool');
const diseasePredictionTool = require('./tools/disease_prediction_tool');
const shapExplanationTool = require('./tools/shap_explanation_tool');
const medicalEvidenceTool = require('./tools/medical_evidence_tool');
const riskAssessmentTool = require('./tools/risk_assessment_tool');
const reportGenerationTool = require('./tools/report_generation_tool');

const TOOL_REGISTRY = {
  symptom_analysis_tool: symptomAnalysisTool,
  lab_report_analysis_tool: labReportAnalysisTool,
  data_verification_tool: dataVerificationTool,
  disease_readiness_tool: diseaseReadinessTool,
  disease_prediction_tool: diseasePredictionTool,
  shap_explanation_tool: shapExplanationTool,
  medical_evidence_tool: medicalEvidenceTool,
  risk_assessment_tool: riskAssessmentTool,
  report_generation_tool: reportGenerationTool
};

const TOOL_EXECUTION_TIMEOUT_MS = 30000; // 30s per tool
const MAX_RETRIES = 2;

// --- Workflow store ---
const workflowStore = require('./workflowStore');

// --- Workflow states ---
const STATES = workflowStore.STATES;

// --- Scenario definitions ---
/**
 * Determines which workflow scenario applies based on available inputs.
 * @param {Object} inputs - { symptoms, labReport, labFilePath, patientData }
 * @returns {string} 'symptoms_only' | 'lab_report_only' | 'combined'
 */
function determineScenario(inputs) {
  const hasSymptoms = !!(inputs.symptoms && inputs.symptoms.length > 0);
  const hasLabReport = !!(inputs.labReport || inputs.labFilePath);
  if (hasSymptoms && hasLabReport) return 'combined';
  if (hasLabReport) return 'lab_report_only';
  if (hasSymptoms) return 'symptoms_only';
  return 'symptoms_only'; // default to symptoms path; will request input
}

/**
 * Plans the ordered list of tools to execute for a given scenario.
 * Returns an array of { tool, dependsOn, optional, gate } entries.
 * @param {string} scenario
 * @returns {Array}
 */
function planWorkflow(scenario) {
  const basePlan = [
    { tool: 'symptom_analysis_tool', dependsOn: [], optional: false, gate: false },
    { tool: 'data_verification_tool', dependsOn: ['symptom_analysis_tool'], optional: false, gate: true },
    { tool: 'disease_readiness_tool', dependsOn: ['data_verification_tool'], optional: false, gate: false },
    { tool: 'disease_prediction_tool', dependsOn: ['disease_readiness_tool'], optional: false, gate: false },
    { tool: 'shap_explanation_tool', dependsOn: ['disease_prediction_tool'], optional: true, gate: false },
    { tool: 'medical_evidence_tool', dependsOn: ['disease_prediction_tool'], optional: false, gate: false },
    { tool: 'risk_assessment_tool', dependsOn: ['disease_prediction_tool', 'medical_evidence_tool'], optional: false, gate: false },
    { tool: 'report_generation_tool', dependsOn: ['disease_prediction_tool', 'shap_explanation_tool', 'medical_evidence_tool', 'risk_assessment_tool'], optional: false, gate: false }
  ];

  if (scenario === 'lab_report_only' || scenario === 'combined') {
    // Lab report analysis runs before readiness/prediction for lab-based inputs
    return [
      { tool: 'lab_report_analysis_tool', dependsOn: [], optional: false, gate: false },
      { tool: 'data_verification_tool', dependsOn: ['lab_report_analysis_tool'], optional: false, gate: true },
      { tool: 'symptom_analysis_tool', dependsOn: [], optional: scenario === 'lab_report_only', gate: false },
      { tool: 'disease_readiness_tool', dependsOn: ['lab_report_analysis_tool', 'data_verification_tool'], optional: false, gate: false },
      { tool: 'disease_prediction_tool', dependsOn: ['disease_readiness_tool'], optional: false, gate: false },
      { tool: 'shap_explanation_tool', dependsOn: ['disease_prediction_tool'], optional: true, gate: false },
      { tool: 'medical_evidence_tool', dependsOn: ['disease_prediction_tool'], optional: false, gate: false },
      { tool: 'risk_assessment_tool', dependsOn: ['disease_prediction_tool', 'medical_evidence_tool'], optional: false, gate: false },
      { tool: 'report_generation_tool', dependsOn: ['disease_prediction_tool', 'shap_explanation_tool', 'medical_evidence_tool', 'risk_assessment_tool'], optional: false, gate: false }
    ];
  }

  return basePlan;
}

/**
 * Builds tool input for a specific tool based on accumulated results.
 * @param {string} toolName
 * @param {Object} scenario
 * @param {Object} inputs - original user inputs
 * @param {Object} results - accumulated tool results keyed by tool name
 * @returns {Object}
 */
function buildToolInput(toolName, scenario, inputs, results) {
  const common = {
    text: inputs.symptoms ? inputs.symptoms.join(' ') : '',
    language: inputs.language || 'en',
    userConfirmed: inputs.userConfirmed || false,
    verifiedSymptoms: inputs.verifiedSymptoms || null,
    report: inputs.labReport || null,
    disease: inputs.disease || 'diabetes',
    labResults: inputs.labResults || null,
    labFilePath: inputs.labFilePath || null,
    mimeType: inputs.mimeType || null
  };

  // Inject results from upstream tools
  const symptomResult = results.symptom_analysis_tool || {};
  const labResult = results.lab_report_analysis_tool || {};
  const verificationResult = results.data_verification_tool || {};
  const readinessResult = results.disease_readiness_tool || {};
  const predictionResult = results.disease_prediction_tool || {};
  const evidenceResult = results.medical_evidence_tool || {};

  switch (toolName) {
    case 'symptom_analysis_tool':
      return {
        text: inputs.symptoms ? inputs.symptoms.join(' ') : (inputs.text || ''),
        language: inputs.language || 'en'
      };
    case 'lab_report_analysis_tool':
      return {
        filePath: inputs.labFilePath || null,
        mimeType: inputs.mimeType || null
      };
    case 'data_verification_tool':
      return {
        userConfirmed: Boolean(inputs.userConfirmed),
        verifiedSymptoms: inputs.verifiedSymptoms || null,
        verificationSource: scenario === 'lab_report_only' ? 'lab_results' : 'symptoms'
      };
    case 'disease_readiness_tool':
      return {
        report: inputs.labReport || {},
        disease: inputs.disease || 'diabetes'
      };
    case 'disease_prediction_tool':
      return {
        report: inputs.labReport || {},
        disease: inputs.disease || 'diabetes',
        readiness: readinessResult.status === 'READY' ? readinessResult : { status: 'INSUFFICIENT_DATA' }
      };
    case 'shap_explanation_tool':
      return { prediction: predictionResult.status === 'SUCCESS' ? predictionResult : null };
    case 'medical_evidence_tool':
      return {
        disease: inputs.disease || 'diabetes',
        symptoms: symptomResult.activeSymptoms || [],
        featuresPresent: readinessResult.availableFeatures || [],
        predictedOutcome: predictionResult.predictedOutcome || '',
        queryKeywords: `${inputs.disease || 'diabetes'} ${(symptomResult.activeSymptoms || []).join(' ')}`.trim(),
        topK: 5
      };
    case 'risk_assessment_tool':
      return {
        prediction: predictionResult.status === 'SUCCESS' ? predictionResult : null,
        labResults: labResult.labResults || [],
        symptoms: symptomResult.activeSymptoms || [],
        disease: inputs.disease || 'diabetes',
        patientContext: inputs.patientData || {}
      };
    case 'report_generation_tool':
      return {
        mlPrediction: predictionResult.status === 'SUCCESS' ? predictionResult : {
          predictedOutcome: 'Undetermined',
          estimatedProbability: 0,
          displayProbabilityPct: 0
        },
        shapExplanation: results.shap_explanation_tool || {},
        ragResult: evidenceResult.status === 'SUCCESS' ? evidenceResult : { status: 'INSUFFICIENT_EVIDENCE', sources: [] },
        patientContext: inputs.patientData || {}
      };
    default:
      return common;
  }
}

/**
 * Executes a single tool with timeout, retry, and error handling.
 * @param {Object} tool - registered tool module
 * @param {Object} input
 * @param {Object} options - { timeoutMs, maxRetries }
 * @returns {Object} execution record
 */
async function executeTool(tool, input, options = {}) {
  const toolName = tool.name;
  const timeoutMs = options.timeoutMs || TOOL_EXECUTION_TIMEOUT_MS;
  const maxRetries = options.maxRetries !== undefined ? options.maxRetries : MAX_RETRIES;

  const executionRecord = {
    id: `exec-${uuidv4().slice(0, 8)}`,
    toolName,
    status: 'RUNNING',
    inputValid: false,
    outputSummary: {},
    errorMessage: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
    durationMs: null,
    retryCount: 0
  };

  let lastError = null;
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;
    executionRecord.retryCount = attempt - 1;

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Tool execution timed out after ${timeoutMs}ms`)), timeoutMs)
      );

      const result = await Promise.race([
        tool.execute(input, { startedAt: Date.now() }),
        timeoutPromise
      ]);

      executionRecord.status = result.status === 'FAILED' ? 'FAILED' : 'COMPLETED';
      executionRecord.inputValid = Boolean(result.inputValid);
      executionRecord.outputSummary = {
        status: result.status,
        activeSymptoms: result.activeSymptoms,
        availableFeatures: result.availableFeatures,
        missingFeatures: result.missingFeatures,
        predictedOutcome: result.predictedOutcome,
        probability: result.probability,
        retrievedCount: result.retrievedCount,
        riskScore: result.riskScore,
        overallRisk: result.overallRisk,
        retrievedEvidenceCount: result.retrievedEvidenceCount,
        evidenceGrounded: result.evidenceGrounded
      };
      executionRecord.errorMessage = result.error || null;
      executionRecord.completedAt = new Date().toISOString();
      executionRecord.durationMs = Date.now() - new Date(executionRecord.startedAt).getTime();

      // Non-fatal failures (INSUFFICIENT_DATA, INSUFFICIENT_EVIDENCE, UNAVAILABLE) are not retried
      if (result.status === 'INSUFFICIENT_DATA' || result.status === 'INSUFFICIENT_EVIDENCE' || result.status === 'UNAVAILABLE' || result.status === 'INVALID_DATA' || result.status === 'MODEL_GATED') {
        executionRecord.status = 'COMPLETED'; // tool ran successfully, just returned no-data result
        break;
      }

      if (result.status === 'COMPLETED' || result.status === 'SUCCESS' || result.status === 'VERIFIED') {
        break;
      }

      // FAILED — retry if transient
      lastError = result.error || 'Unknown tool failure';
      if (attempt <= maxRetries) {
        continue;
      }
      break;
    } catch (err) {
      lastError = err.message || 'Tool threw an exception';
      executionRecord.errorMessage = lastError;
      if (attempt <= maxRetries) {
        continue;
      }
      break;
    }
  }

  if (executionRecord.status === 'RUNNING') {
    executionRecord.status = 'FAILED';
    executionRecord.errorMessage = lastError || 'Tool execution failed after retries';
  }
  if (!executionRecord.completedAt) {
    executionRecord.completedAt = new Date().toISOString();
  }
  if (executionRecord.durationMs === null) {
    executionRecord.durationMs = Date.now() - new Date(executionRecord.startedAt).getTime();
  }

  return executionRecord;
}

/**
 * Runs the full workflow for an assessment.
 * @param {Object} params - { assessmentId, userId, scenario, inputs }
 * @returns {Object} final result with status, results, trace
 */
async function runWorkflow(params) {
  const { assessmentId, userId, scenario, inputs } = params;
  const results = {};
  const trace = [];
  let overallStatus = 'COMPLETED';
  let failedTools = [];

  // Mark assessment as processing
  workflowStore.updateAssessment(assessmentId, userId, {
    status: 'PROCESSING',
    currentStep: 'workflow_started'
  });

  const plan = planWorkflow(scenario);
  const completedTools = new Set();
  const failedToolNames = new Set();

  for (const step of plan) {
    const toolName = step.tool;
    const tool = TOOL_REGISTRY[toolName];

    if (!tool) {
      trace.push({
        tool: toolName,
        status: 'FAILED',
        error: `Tool '${toolName}' not found in registry`,
        skipped: true
      });
      failedToolNames.add(toolName);
      overallStatus = 'PARTIALLY_COMPLETED';
      continue;
    }

    // Check dependencies: skip if a required dependency failed
    const unmetDeps = step.dependsOn.filter(d => failedToolNames.has(d));
    if (unmetDeps.length > 0 && !step.optional) {
      trace.push({
        tool: toolName,
        status: 'SKIPPED',
        error: `Skipped: required dependency(ies) failed: ${unmetDeps.join(', ')}`,
        skipped: true
      });
      failedToolNames.add(toolName);
      overallStatus = 'PARTIALLY_COMPLETED';
      continue;
    }
    if (unmetDeps.length > 0 && step.optional) {
      trace.push({
        tool: toolName,
        status: 'SKIPPED',
        error: `Skipped (optional): required dependency(ies) failed: ${unmetDeps.join(', ')}`,
        skipped: true
      });
      continue;
    }

    // Gate check: data_verification_tool is a gate — if it returns AWAITING_VERIFICATION, stop
    if (toolName === 'data_verification_tool') {
      workflowStore.updateAssessment(assessmentId, userId, { status: 'AWAITING_VERIFICATION', currentStep: toolName });
    }

    const execution = await executeTool(tool, buildToolInput(toolName, scenario, inputs, results));
    results[toolName] = execution.outputSummary || {};

    // Record execution in store
    try {
      workflowStore.recordToolExecution({
        id: execution.id,
        assessmentId,
        toolName,
        status: execution.status,
        inputValid: execution.inputValid !== false,
        outputSummary: execution.outputSummary,
        errorMessage: execution.errorMessage,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
        durationMs: execution.durationMs,
        retryCount: execution.retryCount
      });
    } catch (storeErr) {
      console.warn('[Orchestrator] Failed to record tool execution:', storeErr.message);
    }

    trace.push({
      tool: toolName,
      status: execution.status,
      durationMs: execution.durationMs,
      inputValid: execution.inputValid,
      error: execution.errorMessage,
      skipped: false
    });

    completedTools.add(toolName);

    if (execution.status === 'FAILED') {
      failedToolNames.add(toolName);
      if (!step.optional) {
        overallStatus = 'PARTIALLY_COMPLETED';
      }
    }

    // Gate: verification failed → stop workflow, await verification
    if (toolName === 'data_verification_tool' && execution.outputSummary.verified !== true) {
      workflowStore.updateAssessment(assessmentId, userId, {
        status: 'AWAITING_VERIFICATION',
        currentStep: toolName,
        failedSteps: [...(workflowStore.getAssessment(assessmentId, userId)?.failedSteps || []), toolName]
      });
      overallStatus = 'AWAITING_VERIFICATION';
      break;
    }

    workflowStore.updateAssessment(assessmentId, userId, {
      currentStep: toolName,
      completed_steps: Array.from(completedTools)
    });
  }

  // Determine final state
  if (overallStatus === 'AWAITING_VERIFICATION') {
    // already set
  } else if (failedToolNames.size > 0 && completedTools.size === 0) {
    overallStatus = 'FAILED';
  } else if (failedToolNames.size > 0) {
    overallStatus = 'PARTIALLY_COMPLETED';
  } else {
    overallStatus = 'COMPLETED';
  }

  const finalAssessment = workflowStore.updateAssessment(assessmentId, userId, {
    status: overallStatus,
    currentStep: 'workflow_complete',
    completed_steps: Array.from(completedTools),
    failed_steps: Array.from(failedToolNames)
  });

  return {
    assessmentId,
    status: overallStatus,
    scenario,
    results,
    trace,
    assessment: finalAssessment,
    message: overallStatus === 'COMPLETED'
      ? 'Assessment completed successfully.'
      : overallStatus === 'PARTIALLY_COMPLETED'
        ? 'Assessment completed with some tools unavailable or failed.'
        : overallStatus === 'FAILED'
          ? 'Assessment failed. No tools completed successfully.'
          : 'Assessment awaits patient verification.'
  };
}

/**
 * Get the list of registered tools with their schemas.
 * @returns {Array}
 */
function listRegisteredTools() {
  return Object.values(TOOL_REGISTRY).map(tool => ({
    name: tool.name,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema
  }));
}

/**
 * Get a registered tool by name.
 * @param {string} name
 * @returns {Object|null}
 */
function getTool(name) {
  return TOOL_REGISTRY[name] || null;
}

module.exports = {
  TOOL_REGISTRY,
  listRegisteredTools,
  getTool,
  determineScenario,
  planWorkflow,
  buildToolInput,
  executeTool,
  runWorkflow,
  STATES,
  TOOL_EXECUTION_TIMEOUT_MS,
  MAX_RETRIES
};
