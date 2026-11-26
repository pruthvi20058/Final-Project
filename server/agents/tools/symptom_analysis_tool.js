/**
 * MediAgent Task 7 — Symptom Analysis Tool
 *
 * Wraps the multilingual NLP pipeline (multilingualAgent) to extract,
 * validate, and normalize patient-reported symptoms. Distinguishes
 * patient-reported (active) symptoms from negated and historical ones.
 *
 * Input schema:
 *   { text: string, language?: string }
 *
 * Output schema:
 *   {
 *     status: 'COMPLETED' | 'FAILED',
 *     activeSymptoms: string[],
 *     negatedSymptoms: string[],
 *     historicalSymptoms: string[],
 *     temporalContext: object,
 *     detectedLanguage: string,
 *     normalizedText: string,
 *     validationFlags: string[],
 *     error?: string
 *   }
 */

const { extract_symptoms, validate_clinical_entities } = require('../multilingualAgent');

const INPUT_SCHEMA = {
  required: ['text'],
  properties: {
    text: { type: 'string', minLength: 1 },
    language: { type: 'string', optional: true }
  }
};

function validateInput(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    errors.push('Input must be an object');
    return errors;
  }
  if (!INPUT_SCHEMA.required.includes('text') || !input.text || typeof input.text !== 'string' || !input.text.trim()) {
    errors.push('Field "text" is required and must be a non-empty string');
  }
  if (input.language !== undefined && typeof input.language !== 'string') {
    errors.push('Field "language" must be a string if provided');
  }
  return errors;
}

function normalizeOutput(rawResult, input) {
  return {
    status: rawResult.success === false ? 'FAILED' : 'COMPLETED',
    activeSymptoms: Array.isArray(rawResult.activeSymptoms) ? rawResult.activeSymptoms : [],
    negatedSymptoms: Array.isArray(rawResult.negatedSymptoms) ? rawResult.negatedSymptoms : [],
    historicalSymptoms: Array.isArray(rawResult.historicalSymptoms) ? rawResult.historicalSymptoms : [],
    temporalContext: rawResult.temporalContext || {},
    detectedLanguage: rawResult.detectedLanguage || 'en',
    normalizedText: rawResult.normalizedText || '',
    validationFlags: Array.isArray(rawResult.validationFlags) ? rawResult.validationFlags : [],
    symptomSource: rawResult.symptomSource || 'nlp_extraction',
    error: rawResult.error || null
  };
}

async function execute(input, { startedAt } = {}) {
  const startTime = startedAt || Date.now();
  const validationErrors = validateInput(input);
  if (validationErrors.length > 0) {
    return {
      status: 'FAILED',
      inputValid: false,
      error: validationErrors.join('; '),
      activeSymptoms: [],
      negatedSymptoms: [],
      historicalSymptoms: [],
      temporalContext: {},
      detectedLanguage: 'en',
      normalizedText: '',
      validationFlags: [],
      durationMs: Date.now() - startTime
    };
  }

  try {
    const raw = await extract_symptoms(input.text, input.language || null);
    const validation = validate_clinical_entities(raw);
    const output = normalizeOutput({
      ...raw,
      validationFlags: validation.validationFlags || [],
      validActiveSymptoms: validation.validActiveSymptoms || []
    }, input);
    output.inputValid = true;
    output.durationMs = Date.now() - startTime;
    return output;
  } catch (err) {
    return {
      status: 'FAILED',
      inputValid: true,
      error: err.message || 'Symptom analysis failed',
      activeSymptoms: [],
      negatedSymptoms: [],
      historicalSymptoms: [],
      temporalContext: {},
      detectedLanguage: 'en',
      normalizedText: '',
      validationFlags: [],
      durationMs: Date.now() - startTime
    };
  }
}

module.exports = {
  name: 'symptom_analysis_tool',
  inputSchema: INPUT_SCHEMA,
  outputSchema: {
    status: 'string',
    activeSymptoms: 'string[]',
    negatedSymptoms: 'string[]',
    historicalSymptoms: 'string[]',
    temporalContext: 'object',
    detectedLanguage: 'string',
    normalizedText: 'string',
    validationFlags: 'string[]',
    inputValid: 'boolean',
    durationMs: 'number',
    error: 'string | null'
  },
  validateInput,
  execute
};
