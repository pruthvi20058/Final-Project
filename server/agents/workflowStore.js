/**
 * MediAgent Task 7 — Workflow Store
 *
 * Persistence bridge between the orchestrator and SQLite for
 * agentic workflow state management and execution traces.
 *
 * Stores:
 *   - Assessments (workflow state, status, steps)
 *   - Assessment tool executions (per-tool trace metadata)
 *
 * All operations are associated with an authenticated user ID and
 * enforce patient ownership.
 */

const db = require('../db/database');

const STATES = [
  'CREATED', 'INPUT_RECEIVED', 'PROCESSING', 'AWAITING_VERIFICATION',
  'VERIFIED', 'ANALYZING', 'EVIDENCE_RETRIEVAL', 'COMPLETED',
  'PARTIALLY_COMPLETED', 'FAILED'
];

function isValidState(status) {
  return STATES.includes(status);
}

/**
 * Create a new assessment record.
 * @param {Object} data - { id, userId, patientId, status, inputTypes, currentStep }
 * @returns {Object} created assessment
 */
function createAssessment(data) {
  if (!data.id || !data.userId) {
    throw new Error('assessment id and userId are required');
}
  const status = isValidState(data.status) ? data.status : 'CREATED';
  return db.saveAssessment({
    id: data.id,
    user_id: data.userId,
    patient_id: data.patientId || null,
    status,
    input_types: data.inputTypes || [],
    current_step: data.currentStep || null,
    completed_steps: [],
    failed_steps: []
  });
}

/**
 * Get an assessment with its tool executions.
 * @param {string} id
 * @param {string} userId - owner user ID (enforced)
 * @returns {Object|null}
 */
function getAssessment(id, userId) {
  const assessment = db.getAssessmentWithExecutions(id);
  if (!assessment) return null;
  if (assessment.userId !== userId) return null;
  return assessment;
}

/**
 * List assessments for a user.
 * @param {string} userId
 * @returns {Array}
 */
function listAssessments(userId) {
  return db.getAssessmentsByUser(userId);
}

/**
 * Update assessment status and step tracking.
 * @param {string} id
 * @param {string} userId
 * @param {Object} updates
 * @returns {Object|null}
 */
function updateAssessment(id, userId, updates) {
  const existing = db.getAssessment(id);
  if (!existing || existing.userId !== userId) return null;

  const result = db.updateAssessment(id, {
    status: updates.status,
    current_step: updates.currentStep,
    completed_steps: updates.completedSteps,
    failed_steps: updates.failedSteps,
    completed_at: updates.completedAt
  });
  return result;
}

/**
 * Record a tool execution trace.
 * @param {Object} data
 * @returns {Object}
 */
function recordToolExecution(data) {
  return db.saveAssessmentToolExecution({
    id: data.id,
    assessment_id: data.assessmentId,
    tool_name: data.toolName,
    status: data.status || 'PENDING',
    input_valid: data.inputValid !== false,
    output_summary: data.outputSummary || {},
    error_message: data.errorMessage || null,
    started_at: data.startedAt || null,
    completed_at: data.completedAt || null,
    duration_ms: data.durationMs || null,
    retry_count: data.retryCount || 0
  });
}

/**
 * Get tool executions for an assessment.
 * @param {string} assessmentId
 * @param {string} userId
 * @returns {Array|null}
 */
function getToolExecutions(assessmentId, userId) {
  const assessment = db.getAssessment(assessmentId);
  if (!assessment || assessment.userId !== userId) return null;
  return db.getAssessmentToolExecutions(assessmentId);
}

module.exports = {
  createAssessment,
  getAssessment,
  listAssessments,
  updateAssessment,
  recordToolExecution,
  getToolExecutions,
  isValidState,
  STATES
};
