/**
 * MediAgent Task 7 — Disease Readiness Tool
 *
 * Wraps computeDiseaseModelReadiness (diseaseFeatureMapper) and
 * getModelReadiness (multilingualAgent model registry) to determine
 * whether a disease model is available and ready for inference given
 * the available clinical features.
 *
 * Input schema:
 *   { report: object, disease: string }
 *
 * Output schema:
 *   {
 *     status: 'READY' | 'INSUFFICIENT_DATA' | 'INVALID_DATA' | 'MODEL_UNAVAILABLE' | 'MODEL_GATED',
 *     disease: string,
 *     availableFeatures: string[],
 *     missingFeatures: string[],
 *     requiredFeatures: string[],
 *     featureValues: object,
 *     gated: boolean,
 *     readinessReason: string,
 *     error?: string
 *   }
 */

const { computeDiseaseModelReadiness } = require('../../services/diseaseFeatureMapper');
const { getModelReadiness, isModelGated } = require('../multilingualAgent');

const SUPPORTED_DISEASES = ['diabetes', 'dengue', 'malaria', 'chikungunya', 'typhoid'];

const INPUT_SCHEMA = {
  required: ['report', 'disease'],
  properties: {
    report: { type: 'object' },
    disease: { type: 'string', enum: SUPPORTED_DISEASES }
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

function normalizeOutput(rawResult, disease, gated, readinessReason) {
  return {
    status: rawResult.status === 'READY' ? 'READY'
      : rawResult.status === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT_DATA'
      : rawResult.status === 'INVALID_DATA' ? 'INVALID_DATA'
      : 'INSUFFICIENT_DATA',
    disease,
    availableFeatures: Array.isArray(rawResult.availableFeatureNames) ? rawResult.availableFeatureNames : [],
    missingFeatures: Array.isArray(rawResult.missingFeatures) ? rawResult.missingFeatures : [],
    requiredFeatures: Array.isArray(rawResult.requiredFeatureNames) ? rawResult.requiredFeatureNames : [],
    featureValues: rawResult.featureValues || {},
    gated: Boolean(gated),
    readinessReason: readinessReason || rawResult.status,
    model: rawResult.model || `v1.0.0-${disease}`,
    inputValid: true,
    error: null
  };
}

async function execute(input, { startedAt } = {}) {
  const startTime = startedAt || Date.now();
  const validationErrors = validateInput(input);
  if (validationErrors.length > 0) {
    return {
      status: 'MODEL_UNAVAILABLE',
      disease: input.disease || 'unknown',
      availableFeatures: [],
      missingFeatures: [],
      requiredFeatures: [],
      featureValues: {},
      gated: true,
      readinessReason: validationErrors.join('; '),
      model: null,
      inputValid: false,
      error: validationErrors.join('; '),
      durationMs: Date.now() - startTime
    };
  }

  const disease = input.disease.toLowerCase().trim();

  // Check model registry gating first
  let gated = false;
  let readinessReason = '';
  try {
    const registryReadiness = getModelReadiness(disease);
    if (registryReadiness) {
      gated = registryReadiness.gated === true;
      readinessReason = registryReadiness.readiness_reason || '';
      if (gated) {
        return {
          status: 'MODEL_GATED',
          disease,
          availableFeatures: [],
          missingFeatures: (registryReadiness.features || []),
          requiredFeatures: (registryReadiness.features || []),
          featureValues: {},
          gated: true,
          readinessReason: readinessReason || `Model for '${disease}' is gated (${registryReadiness.readiness}).`,
          model: registryReadiness.model_type || `v1.0.0-${disease}`,
          inputValid: true,
          error: null,
          durationMs: Date.now() - startTime
        };
      }
    }
  } catch (regErr) {
    // Registry may not have an entry for this disease; continue with schema-based check
    readinessReason = `Model registry check skipped: ${regErr.message}`;
  }

  try {
    const raw = computeDiseaseModelReadiness(input.report, disease);
    const output = normalizeOutput(raw, disease, gated, readinessReason || raw.status);
    output.durationMs = Date.now() - startTime;
    return output;
  } catch (err) {
    return {
      status: 'MODEL_UNAVAILABLE',
      disease,
      availableFeatures: [],
      missingFeatures: [],
      requiredFeatures: [],
      featureValues: {},
      gated: true,
      readinessReason: err.message || 'Readiness computation failed',
      model: null,
      inputValid: true,
      error: err.message || 'Readiness computation failed',
      durationMs: Date.now() - startTime
    };
  }
}

module.exports = {
  name: 'disease_readiness_tool',
  inputSchema: INPUT_SCHEMA,
  outputSchema: {
    status: 'string',
    disease: 'string',
    availableFeatures: 'string[]',
    missingFeatures: 'string[]',
    requiredFeatures: 'string[]',
    featureValues: 'object',
    gated: 'boolean',
    readinessReason: 'string',
    model: 'string | null',
    inputValid: 'boolean',
    durationMs: 'number',
    error: 'string | null'
  },
  validateInput,
  execute
};
