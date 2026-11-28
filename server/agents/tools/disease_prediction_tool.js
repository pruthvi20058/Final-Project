/**
 * MediAgent Task 7 — Disease Prediction Tool
 *
 * Wraps generatePredictionForReport (predictionService) to run ML
 * inference only when the model is ready and input features are
 * complete. Never runs gated or unvalidated models.
 *
 * Input schema:
 *   { report: object, readiness: object, disease: string }
 *
 * Output schema:
 *   {
 *     status: 'SUCCESS' | 'INSUFFICIENT_DATA' | 'INVALID_DATA' | 'MODEL_UNAVAILABLE' | 'FAILED',
 *     disease: string,
 *     predictedClass: string,
 *     probability: number,
 *     displayProbabilityPct: number,
 *     topPrediction: object,
 *     differentials: array,
 *     shapExplanation: object,
 *     modelName: string,
 *     modelVersion: string,
 *     error?: string
 *   }
 */

const { generatePredictionForReport } = require('../../services/predictionService');

const SUPPORTED_DISEASES = ['diabetes', 'dengue', 'malaria', 'chikungunya', 'typhoid'];

const INPUT_SCHEMA = {
  required: ['report', 'disease'],
  properties: {
    report: { type: 'object' },
    disease: { type: 'string', enum: SUPPORTED_DISEASES },
    readiness: { type: 'object', optional: true }
  }
};

function validateInput(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    errors.push('Input must be an object');
    return errors;
  }
  if (!input.report || typeof input.report !== 'object') {
    errors.push('Field "report" is required and must be an object');
  }
  if (!input.disease || typeof input.disease !== 'string') {
    errors.push('Field "disease" is required and must be a string');
  } else if (!SUPPORTED_DISEASES.includes(input.disease.toLowerCase())) {
    errors.push(`Field "disease" must be one of: ${SUPPORTED_DISEASES.join(', ')}`);
  }
  return errors;
}

function normalizeOutput(rawResult, disease) {
  if (!rawResult) {
    return {
      status: 'MODEL_UNAVAILABLE',
      disease,
      predictedClass: 'Undetermined',
      probability: 0,
      displayProbabilityPct: 0,
      topPrediction: null,
      differentials: [],
      shapExplanation: null,
      modelName: null,
      modelVersion: null,
      inputValid: true,
      error: 'Prediction engine returned no result',
      risk: { score: null, level: null, overallRisk: null, contributingParameters: [], recommendations: [] },
      uncertainty: { isAbstain: true }
    };
  }

  return {
    status: rawResult.status === 'SUCCESS' ? 'SUCCESS'
      : rawResult.status === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT_DATA'
      : rawResult.status === 'INVALID_DATA' ? 'INVALID_DATA'
      : 'FAILED',
    disease,
    predictedClass: rawResult.predictedClass || 'Undetermined',
    probability: typeof rawResult.probability === 'number' ? rawResult.probability : 0,
    displayProbabilityPct: typeof rawResult.displayProbabilityPct === 'number' ? rawResult.displayProbabilityPct : 0,
    topPrediction: rawResult.topPrediction || null,
    differentials: Array.isArray(rawResult.differentials) ? rawResult.differentials : [],
    shapExplanation: rawResult.shapExplanation || rawResult.explanation || null,
    modelName: rawResult.modelName || null,
    modelVersion: rawResult.modelVersion || null,
    inputValid: true,
    error: null,
    risk: rawResult.risk || { score: null, level: null, overallRisk: null, contributingParameters: [], recommendations: [] },
    uncertainty: rawResult.uncertainty || { isAbstain: true },
    createdAt: rawResult.createdAt || null
  };
}

async function execute(input, { startedAt } = {}) {
  const startTime = startedAt || Date.now();
  const validationErrors = validateInput(input);
  if (validationErrors.length > 0) {
    return {
      status: 'MODEL_UNAVAILABLE',
      disease: input.disease || 'unknown',
      predictedClass: 'Undetermined',
      probability: 0,
      displayProbabilityPct: 0,
      topPrediction: null,
      differentials: [],
      shapExplanation: null,
      modelName: null,
      modelVersion: null,
      inputValid: false,
      error: validationErrors.join('; '),
      durationMs: Date.now() - startTime
    };
  }

  const disease = input.disease.toLowerCase().trim();

  // Readiness gate: do not run prediction if not ready
  const readiness = input.readiness || {};
  if (readiness.status && readiness.status !== 'READY') {
    return {
      status: readiness.status === 'INVALID_DATA' ? 'INVALID_DATA' : 'INSUFFICIENT_DATA',
      disease,
      predictedClass: 'Undetermined',
      probability: 0,
      displayProbabilityPct: 0,
      topPrediction: null,
      differentials: [],
      shapExplanation: null,
      modelName: null,
      modelVersion: null,
      inputValid: true,
      error: readiness.readinessReason || `Model for '${disease}' is not ready (status: ${readiness.status || 'unknown'}).`,
      durationMs: Date.now() - startTime
    };
  }

  try {
    const raw = await generatePredictionForReport(input.report, readiness, disease);
    const output = normalizeOutput(raw, disease);
    output.inputValid = true;
    output.durationMs = Date.now() - startTime;
    return output;
  } catch (err) {
    return {
      status: 'FAILED',
      disease,
      predictedClass: 'Undetermined',
      probability: 0,
      displayProbabilityPct: 0,
      topPrediction: null,
      differentials: [],
      shapExplanation: null,
      modelName: null,
      modelVersion: null,
      inputValid: true,
      error: err.message || 'Prediction execution failed',
      durationMs: Date.now() - startTime
    };
  }
}

module.exports = {
  name: 'disease_prediction_tool',
  inputSchema: INPUT_SCHEMA,
  outputSchema: {
    status: 'string',
    disease: 'string',
    predictedClass: 'string',
    probability: 'number',
    displayProbabilityPct: 'number',
    topPrediction: 'object | null',
    differentials: 'array',
    shapExplanation: 'object | null',
    modelName: 'string | null',
    modelVersion: 'string | null',
    inputValid: 'boolean',
    durationMs: 'number',
    error: 'string | null',
    risk: 'object',
    uncertainty: 'object'
  },
  validateInput,
  execute
};
