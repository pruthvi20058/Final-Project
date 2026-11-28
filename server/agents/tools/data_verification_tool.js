/**
 * MediAgent Task 7 — Data Verification Tool
 *
 * Enforces the mandatory patient verification gate. No clinical
 * assessment proceeds without explicit patient confirmation of
 * symptoms and/or verification of lab values.
 *
 * Input schema:
 *   { userConfirmed: boolean, verifiedSymptoms?: string[], verificationSource?: 'symptoms' | 'lab_results' | 'both' }
 *
 * Output schema:
 *   {
 *     status: 'VERIFIED' | 'AWAITING_VERIFICATION' | 'FAILED',
 *     verified: boolean,
 *     activeSymptoms: string[],
 *     symptomSource: 'nlp_extraction' | 'user_verified' | null,
 *     userCorrections: object,
 *     error?: string
 *   }
 */

const INPUT_SCHEMA = {
  required: ['userConfirmed'],
  properties: {
    userConfirmed: { type: 'boolean' },
    verifiedSymptoms: { type: 'array', optional: true, items: { type: 'string' } },
    verificationSource: { type: 'string', optional: true, enum: ['symptoms', 'lab_results', 'both'] }
  }
};

function validateInput(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    errors.push('Input must be an object');
    return errors;
  }
  if (typeof input.userConfirmed !== 'boolean') {
    errors.push('Field "userConfirmed" is required and must be a boolean');
  }
  if (input.verifiedSymptoms !== undefined && !Array.isArray(input.verifiedSymptoms)) {
    errors.push('Field "verifiedSymptoms" must be an array if provided');
  }
  return errors;
}

function normalizeOutput(result) {
  return {
    status: result.verified ? 'VERIFIED' : 'AWAITING_VERIFICATION',
    verified: Boolean(result.verified),
    activeSymptoms: Array.isArray(result.activeSymptoms) ? result.activeSymptoms : [],
    symptomSource: result.symptomSource || null,
    userCorrections: result.userCorrections || {},
    error: result.error || null
  };
}

async function execute(input, { startedAt } = {}) {
  const startTime = startedAt || Date.now();
  const validationErrors = validateInput(input);
  if (validationErrors.length > 0) {
    return {
      status: 'FAILED',
      verified: false,
      error: validationErrors.join('; '),
      activeSymptoms: [],
      symptomSource: null,
      userCorrections: {},
      inputValid: false,
      durationMs: Date.now() - startTime
    };
  }

  // Mandatory gate: if user has not confirmed, assessment cannot proceed
  if (!input.userConfirmed) {
    return {
      status: 'AWAITING_VERIFICATION',
      verified: false,
      activeSymptoms: input.verifiedSymptoms || [],
      symptomSource: input.verifiedSymptoms ? 'user_verified' : 'nlp_extraction',
      userCorrections: {},
      inputValid: true,
      message: 'Patient confirmation required before clinical assessment can proceed.',
      durationMs: Date.now() - startTime
    };
  }

  return {
    status: 'VERIFIED',
    verified: true,
    activeSymptoms: input.verifiedSymptoms || [],
    symptomSource: input.verifiedSymptoms ? 'user_verified' : 'nlp_extraction',
    userCorrections: {},
    inputValid: true,
    message: 'Patient verification complete. Verified inputs may proceed to assessment.',
    durationMs: Date.now() - startTime
  };
}

module.exports = {
  name: 'data_verification_tool',
  inputSchema: INPUT_SCHEMA,
  outputSchema: {
    status: 'string',
    verified: 'boolean',
    activeSymptoms: 'string[]',
    symptomSource: 'string | null',
    userCorrections: 'object',
    inputValid: 'boolean',
    durationMs: 'number',
    error: 'string | null',
    message: 'string | null'
  },
  validateInput,
  execute
};
