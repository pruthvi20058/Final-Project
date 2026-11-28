/**
 * MediAgent Task 7 — SHAP Explanation Tool
 *
 * Extracts and normalizes SHAP feature attributions from a prediction
 * result. SHAP values are treated as invariant — never modified or
 * replaced by LLM output.
 *
 * Input schema:
 *   { prediction: object }
 *
 * Output schema:
 *   {
 *     status: 'COMPLETED' | 'UNAVAILABLE' | 'FAILED',
 *     features: array,
 *     topPositiveFactors: string[],
 *     topNegativeFactors: string[],
 *     baseValue: number,
 *     method: string,
 *     error?: string
 *   }
 */

const INPUT_SCHEMA = {
  required: ['prediction'],
  properties: {
    prediction: { type: 'object' }
  }
};

function validateInput(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    errors.push('Input must be an object');
    return errors;
  }
  if (!input.prediction || typeof input.prediction !== 'object') {
    errors.push('Field "prediction" is required and must be an object');
  }
  return errors;
}

function extractShap(prediction) {
  const shap = prediction.shapExplanation || prediction.explanation || {};
  const features = Array.isArray(shap.features) ? shap.features : [];
  const topPositive = Array.isArray(shap.topPositiveFactors) ? shap.topPositiveFactors : [];
  const topNegative = Array.isArray(shap.topNegativeFactors) ? shap.topNegativeFactors : [];
  const baseValue = typeof shap.baseValue === 'number' ? shap.baseValue : 0;
  const method = shap.method || 'unknown';
  return { features, topPositive, topNegative, baseValue, method };
}

function normalizeOutput(result) {
  return {
    status: result.status,
    features: result.features.map(f => ({
      feature: f.feature || f.clinicalName || 'unknown',
      clinicalName: f.clinicalName || f.feature || 'unknown',
      value: typeof f.value === 'number' ? f.value : null,
      unit: f.unit || null,
      shapValue: typeof f.shapValue === 'number' ? f.shapValue : 0,
      direction: f.direction || 'neutral'
    })),
    topPositiveFactors: Array.isArray(result.topPositive) ? result.topPositive : [],
    topNegativeFactors: Array.isArray(result.topNegative) ? result.topNegative : [],
    baseValue: typeof result.baseValue === 'number' ? result.baseValue : 0,
    method: result.method || 'unknown',
    inputValid: true,
    error: null
  };
}

async function execute(input, { startedAt } = {}) {
  const startTime = startedAt || Date.now();
  const validationErrors = validateInput(input);
  if (validationErrors.length > 0) {
    return {
      status: 'FAILED',
      features: [],
      topPositiveFactors: [],
      topNegativeFactors: [],
      baseValue: 0,
      method: 'unknown',
      inputValid: false,
      error: validationErrors.join('; '),
      durationMs: Date.now() - startTime
    };
  }

  const prediction = input.prediction;

  // SHAP unavailable if prediction failed or insufficient data
  if (prediction.status !== 'SUCCESS' || !prediction.shapExplanation && !prediction.explanation) {
    return {
      status: 'UNAVAILABLE',
      features: [],
      topPositiveFactors: [],
      topNegativeFactors: [],
      baseValue: 0,
      method: 'unknown',
      inputValid: true,
      error: 'SHAP explanation not available for this prediction (model may be gated, insufficient data, or prediction failed).',
      durationMs: Date.now() - startTime
    };
  }

  try {
    const extracted = extractShap(prediction);
    const output = normalizeOutput(extracted);
    output.status = 'COMPLETED';
    output.durationMs = Date.now() - startTime;
    return output;
  } catch (err) {
    return {
      status: 'FAILED',
      features: [],
      topPositiveFactors: [],
      topNegativeFactors: [],
      baseValue: 0,
      method: 'unknown',
      inputValid: true,
      error: err.message || 'SHAP extraction failed',
      durationMs: Date.now() - startTime
    };
  }
}

module.exports = {
  name: 'shap_explanation_tool',
  inputSchema: INPUT_SCHEMA,
  outputSchema: {
    status: 'string',
    features: 'array',
    topPositiveFactors: 'string[]',
    topNegativeFactors: 'string[]',
    baseValue: 'number',
    method: 'string',
    inputValid: 'boolean',
    durationMs: 'number',
    error: 'string | null'
  },
  validateInput,
  execute
};
