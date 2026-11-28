/**
 * MediAgent Task 7 — Agentic Orchestration API Routes
 *
 * Endpoints for starting, tracking, and retrieving agentic assessment
 * workflows. All routes require authentication and enforce patient/user
 * ownership.
 *
 * Endpoints:
 *   POST   /api/orchestrator/assessments        — Start a new assessment workflow
 *   GET    /api/orchestrator/assessments/:id    — Get assessment status + trace
 *   GET    /api/orchestrator/assessments        — List user's assessments
 *   POST   /api/orchestrator/assessments/:id/resume — Resume an awaiting-verification assessment
 *   GET    /api/orchestrator/tools              — List registered tools + schemas
 *   POST   /api/orchestrator/assessments/:id/verify — Submit patient verification to resume
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  saveAssessment,
  getAssessment,
  getAssessmentsByUser,
  updateAssessment,
  saveAssessmentToolExecution,
  getAssessmentToolExecutions,
  getAssessmentWithExecutions,
  isValidAssessmentState
} = require('../db/database');
const {
  runWorkflow,
  determineScenario,
  planWorkflow,
  listRegisteredTools,
  STATES,
  TOOL_EXECUTION_TIMEOUT_MS,
  MAX_RETRIES
} = require('../agents/orchestratorService');

// Supported input scenarios
const SCENARIOS = ['symptoms_only', 'lab_report_only', 'combined'];

// POST /api/orchestrator/assessments — Start a new assessment workflow
router.post('/assessments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      scenario,
      symptoms,
      text,
      language,
      patientId,
      patientData,
      labReport,
      labFilePath,
      mimeType,
      labResults,
      disease,
      userConfirmed,
      verifiedSymptoms
    } = req.body || {};

    // Validate scenario
    const resolvedScenario = scenario || determineScenario({
      symptoms,
      labReport,
      labFilePath,
      patientData
    });
    if (!SCENARIOS.includes(resolvedScenario)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_SCENARIO', message: `Scenario must be one of: ${SCENARIOS.join(', ')}` }
      });
    }

    // Validate disease if provided
    if (disease && !['diabetes', 'dengue', 'malaria', 'chikungunya', 'typhoid'].includes(disease.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DISEASE', message: `Unsupported disease: ${disease}` }
      });
    }

    // Require at least some input
    if (!symptoms && !text && !labReport && !labFilePath && !labResults) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_INPUT',
          message: 'At least one input type is required: symptoms/text, labReport, or labResults.'
        }
      });
    }

    const assessmentId = `ASS-${uuidv4().slice(0, 8)}`;
    const inputs = {
      symptoms: Array.isArray(symptoms) ? symptoms : (text ? [text] : []),
      text: text || '',
      language: language || 'en',
      patientId: patientId || null,
      patientData: patientData || {},
      labReport: labReport || null,
      labFilePath: labFilePath || null,
      mimeType: mimeType || null,
      labResults: Array.isArray(labResults) ? labResults : null,
      disease: disease || 'diabetes',
      userConfirmed: Boolean(userConfirmed),
      verifiedSymptoms: Array.isArray(verifiedSymptoms) ? verifiedSymptoms : null
    };

    // Create assessment record in CREATED state
    const created = saveAssessment({
      id: assessmentId,
      user_id: userId,
      patient_id: inputs.patientId,
      status: 'CREATED',
      input_types: [resolvedScenario],
      current_step: 'workflow_queued',
      completed_steps: [],
      failed_steps: []
    });

    // Run workflow asynchronously; return immediately with assessment ID
    // The client polls GET /assessments/:id for status and trace
    (async () => {
      try {
        await runWorkflow({ assessmentId, userId, scenario: resolvedScenario, inputs });
      } catch (err) {
        console.error(`[Orchestrator] Workflow ${assessmentId} failed:`, err.message);
        try {
          updateAssessment(assessmentId, userId, { status: 'FAILED', currentStep: 'workflow_error' });
        } catch (updateErr) {
          console.error(`[Orchestrator] Failed to mark assessment ${assessmentId} failed:`, updateErr.message);
        }
      }
    })();

    return res.status(202).json({
      success: true,
      assessmentId,
      status: 'CREATED',
      scenario: resolvedScenario,
      message: 'Assessment workflow started. Poll GET /api/orchestrator/assessments/:id for status and trace.'
    });
  } catch (err) {
    console.error('[OrchestratorRoute] Start assessment error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to start assessment' }
    });
  }
});

// GET /api/orchestrator/assessments — List user's assessments
router.get('/assessments', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const assessments = getAssessmentsByUser(userId);
    return res.json({ success: true, assessments, count: assessments.length });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to list assessments' }
    });
  }
});

// GET /api/orchestrator/assessments/:id — Get assessment status + trace
router.get('/assessments/:id', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const assessment = getAssessmentWithExecutions(req.params.id);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: { code: 'ASSESSMENT_NOT_FOUND', message: 'Assessment not found' }
      });
    }
    if (assessment.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this assessment' }
      });
    }
    return res.json({
      success: true,
      assessment,
      toolExecutions: assessment.toolExecutions || []
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to retrieve assessment' }
    });
  }
});

// POST /api/orchestrator/assessments/:id/verify — Submit patient verification to resume
router.post('/assessments/:id/verify', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { userConfirmed, verifiedSymptoms } = req.body || {};

    const existing = getAssessment(req.params.id);
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: { code: 'ASSESSMENT_NOT_FOUND', message: 'Assessment not found' }
      });
    }

    if (existing.status !== 'AWAITING_VERIFICATION') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: `Assessment is in '${existing.status}' state, not awaiting verification.` }
      });
    }

    if (typeof userConfirmed !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'userConfirmed must be a boolean.' }
      });
    }

    // Update assessment to reflect verification decision
    if (!userConfirmed) {
      updateAssessment(req.params.id, userId, {
        status: 'FAILED',
        currentStep: 'verification_declined',
        failed_steps: [...(existing.failed_steps || []), 'data_verification_tool']
      });
      return res.json({
        success: true,
        status: 'FAILED',
        message: 'Patient declined verification. Assessment cannot proceed.'
      });
    }

    // Resume the workflow with verification now provided
    // Re-run with verifiedSymptoms and userConfirmed=true
    // We need the original inputs — they're not stored, so we require them in the request
    const { scenario, symptoms, text, language, labReport, labFilePath, mimeType, labResults, disease } = req.body;

    const inputs = {
      symptoms: Array.isArray(symptoms) ? symptoms : (text ? [text] : []),
      text: text || '',
      language: language || 'en',
      patientId: existing.patientId || null,
      patientData: {},
      labReport: labReport || null,
      labFilePath: labFilePath || null,
      mimeType: mimeType || null,
      labResults: Array.isArray(labResults) ? labResults : null,
      disease: disease || 'diabetes',
      userConfirmed: true,
      verifiedSymptoms: Array.isArray(verifiedSymptoms) ? verifiedSymptoms : null
    };

    const resolvedScenario = scenario || existing.inputTypes?.[0] || 'symptoms_only';

    (async () => {
      try {
        await runWorkflow({ assessmentId: req.params.id, userId, scenario: resolvedScenario, inputs });
      } catch (err) {
        console.error(`[Orchestrator] Resume workflow ${req.params.id} failed:`, err.message);
        try {
          updateAssessment(req.params.id, userId, { status: 'FAILED', currentStep: 'workflow_resume_error' });
        } catch (updateErr) {
          console.error(`[Orchestrator] Failed to mark resume failed:`, updateErr.message);
        }
      }
    })();

    return res.json({
      success: true,
      assessmentId: req.params.id,
      status: 'PROCESSING',
      message: 'Verification accepted. Workflow resumed.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Verification failed' }
    });
  }
});

// GET /api/orchestrator/tools — List registered tools with schemas
router.get('/tools', authenticateToken, (req, res) => {
  try {
    const tools = listRegisteredTools();
    return res.json({
      success: true,
      tools,
      count: tools.length,
      timeoutMs: TOOL_EXECUTION_TIMEOUT_MS,
      maxRetries: MAX_RETRIES
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to list tools' }
    });
  }
});

module.exports = router;
