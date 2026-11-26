/**
 * MediAgent Task 8 — Risk Assessment Tool (Revised)
 *
 * Wraps the central clinical risk assessment engine (server/risk/riskEngine.js).
 * Clinical risk is SEPARATE from disease prediction — ML probability is never
 * used as a clinical risk score. Returns RISK_ASSESSMENT_UNAVAILABLE when
 * required information is missing or no validated rules exist.
 *
 * Input schema:
 *   { symptoms?: string[], labResults?: array, disease?: string,
 *     patientContext?: object, prediction?: object }
 *
 * Output schema:
 *   {
 *     status: 'COMPLETED' | 'RISK_ASSESSMENT_UNAVAILABLE' | 'FAILED',
 *     riskCategory: string,
 *     riskLabel: string,
 *     riskMeaning: string,
 *     emergencyAlert: { triggered: boolean, severity: string|null, reasons: array },
 *     evaluatedFactors: array,
 *     abnormalFindings: array,
 *     missingInformation: array,
 *     rulesApplied: array,
 *     evidenceReferences: array,
 *     limitations: array,
 *     inputValid: boolean,
 *     durationMs: number,
 *     error?: string
 *   }
 */

const { assessRisk } = require('../../risk/riskEngine');

const SUPPORTED_DISEASES = ['diabetes', 'dengue', 'malaria', 'chikungunya', 'typhoid'];

const INPUT_SCHEMA = {
  required: [],
  properties: {
    symptoms: { type: 'array', optional: true, items: { type: 'string' } },
    labResults: { type: 'array', optional: true, items: { type: 'object' } },
    disease: { type: 'string', optional: true, enum: SUPPORTED_DISEASES },
    patientContext: { type: 'object', optional: true },
    prediction: { type: 'object', optional: true }
  }
};

function validateInput(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    errors.push('Input must be an object');
    return errors;
  }
  if (input.symptoms !== undefined && !Array.isArray(input.symptoms)) {
    errors.push('Field "symptoms" must be an array if provided');
  }
  if (input.labResults !== undefined && !Array.isArray(input.labResults)) {
    errors.push('Field "labResults" must be an array if provided');
  }
  if (input.disease !== undefined && (!input.disease || typeof input.disease !== 'string')) {
    errors.push('Field "disease" must be a non-empty string if provided');
  }
  if (input.patientContext !== undefined && typeof input.patientContext !== 'object') {
    errors.push('Field "patientContext" must be an object if provided');
  }
  if (input.prediction !== undefined && typeof input.prediction !== 'object') {
    errors.push('Field "prediction" must be an object if provided');
  }
  return errors;
}

async function execute(input, { startedAt } = {}) {
  const startTime = startedAt || Date.now();
  const validationErrors = validateInput(input);
  if (validationErrors.length > 0) {
    return {
      status: 'FAILED',
      riskCategory: 'UNAVAILABLE',
      inputValid: false,
      error: validationErrors.join('; '),
      emergencyAlert: { triggered: false, reasons: [] },
      evaluatedFactors: [],
      abnormalFindings: [],
      missingInformation: [],
      rulesApplied: [],
      evidenceReferences: [],
      limitations: ['Input validation failed — risk assessment cannot proceed.'],
      durationMs: Date.now() - startTime
    };
  }

  // Delegate to the central risk engine.
  // ML prediction is accepted as context only — never used for risk scoring.
  const result = await assessRisk(
    {
      symptoms: input.symptoms,
      labResults: input.labResults,
      disease: input.disease,
      patientContext: input.patientContext,
      prediction: input.prediction
    },
    { startedAt }
  );

  return {
    status: result.status,
    riskCategory: result.riskCategory,
    riskLabel: result.riskLabel,
    riskMeaning: result.riskMeaning,
    emergencyAlert: result.emergencyAlert,
    evaluatedFactors: result.evaluatedFactors,
    abnormalFindings: result.abnormalFindings,
    missingInformation: result.missingInformation,
    rulesApplied: result.rulesApplied,
    evidenceReferences: result.evidenceReferences,
    limitations: result.limitations,
    inputValid: result.inputValid !== false,
    disease: result.disease || null,
    mlProbabilityUsedForRisk: false, // Explicitly false — ML probability never used for risk
    mlProbability: result.mlProbability || null, // Tracked for context only
    durationMs: result.durationMs || (Date.now() - startTime)
  };
}

module.exports = {
  name: 'risk_assessment_tool',
  inputSchema: INPUT_SCHEMA,
  outputSchema: {
    status: 'string',
    riskCategory: 'string',
    riskLabel: 'string',
    riskMeaning: 'string',
    emergencyAlert: 'object',
    evaluatedFactors: 'array',
    abnormalFindings: 'array',
    missingInformation: 'array',
    rulesApplied: 'array',
    evidenceReferences: 'array',
    limitations: 'array',
    inputValid: 'boolean',
    disease: 'string | null',
    mlProbabilityUsedForRisk: 'boolean',
    mlProbability: 'number | null',
    durationMs: 'number',
    error: 'string | null'
  },
  validateInput,
  execute
};
