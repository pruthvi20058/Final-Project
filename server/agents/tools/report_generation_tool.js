/**
 * MediAgent Task 7 — Report Generation Tool
 *
 * Wraps generateGroundedExplanation (groundedLlmService) to produce
 * the final structured assessment report. Distinguishes retrieved
 * evidence from AI-generated interpretation. ML probability/outcome
 * and SHAP values are preserved as invariant.
 *
 * Input schema:
 *   {
 *     mlPrediction: object,
 *     shapExplanation: object,
 *     ragResult: object,
 *     patientContext: object
 *   }
 *
 * Output schema:
 *   {
 *     status: 'COMPLETED' | 'FAILED',
 *     summary: string,
 *     interpretation: string,
 *     evidenceFacts: array,
 *     citations: array,
 *     screeningResult: object,
 *     modelExplanation: array,
 *     topFactors: object,
 *     medicalContext: array,
 *     retrievedEvidenceCount: number,
 *     retrievalStatus: string,
 *     qualityFlags: array,
 *     limitations: array,
 *     disclaimer: string,
 *     error?: string
 *   }
 */

const { generateGroundedExplanation } = require('../../services/groundedLlmService');

const INPUT_SCHEMA = {
  required: ['mlPrediction'],
  properties: {
    mlPrediction: { type: 'object' },
    shapExplanation: { type: 'object', optional: true },
    ragResult: { type: 'object', optional: true },
    patientContext: { type: 'object', optional: true }
  }
};

function validateInput(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    errors.push('Input must be an object');
    return errors;
  }
  if (!input.mlPrediction || typeof input.mlPrediction !== 'object') {
    errors.push('Field "mlPrediction" is required and must be an object');
  }
  return errors;
}

function normalizeOutput(rawResult, input) {
  return {
    status: rawResult ? 'COMPLETED' : 'FAILED',
    summary: rawResult ? rawResult.summary : '',
    interpretation: rawResult ? rawResult.interpretation : 'AI interpretation unavailable.',
    evidenceFacts: Array.isArray(rawResult && rawResult.evidenceFacts) ? rawResult.evidenceFacts : [],
    citations: Array.isArray(rawResult && rawResult.citations) ? rawResult.citations : [],
    screeningResult: rawResult && rawResult.screeningResult ? {
      predictedOutcome: rawResult.screeningResult.predictedOutcome || 'Screening',
      estimatedProbability: rawResult.screeningResult.estimatedProbability !== undefined ? rawResult.screeningResult.estimatedProbability : 0,
      displayProbabilityPct: rawResult.screeningResult.displayProbabilityPct !== undefined ? rawResult.screeningResult.displayProbabilityPct : 0
    } : { predictedOutcome: 'Undetermined', estimatedProbability: 0, displayProbabilityPct: 0 },
    modelExplanation: Array.isArray(rawResult && rawResult.modelExplanation) ? rawResult.modelExplanation : [],
    topFactors: rawResult && rawResult.topFactors ? {
      topPositive: Array.isArray(rawResult.topFactors.topPositive) ? rawResult.topFactors.topPositive : [],
      topNegative: Array.isArray(rawResult.topFactors.topNegative) ? rawResult.topFactors.topNegative : []
    } : { topPositive: [], topNegative: [] },
    medicalContext: Array.isArray(rawResult && rawResult.medicalContext) ? rawResult.medicalContext : [],
    retrievedEvidenceCount: rawResult ? rawResult.retrievedEvidenceCount || 0 : 0,
    retrievalStatus: rawResult ? rawResult.retrievalStatus || 'INSUFFICIENT_EVIDENCE' : 'INSUFFICIENT_EVIDENCE',
    qualityFlags: Array.isArray(rawResult && rawResult.qualityFlags) ? rawResult.qualityFlags : [],
    limitations: Array.isArray(rawResult && rawResult.limitations) ? rawResult.limitations : [],
    disclaimer: rawResult ? rawResult.disclaimer : 'AI-assisted screening result. Not a confirmed medical diagnosis.',
    evidenceGrounded: Boolean(rawResult && rawResult.evidenceGrounded),
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
      summary: '',
      interpretation: 'Report generation failed due to invalid input.',
      evidenceFacts: [],
      citations: [],
      screeningResult: { predictedOutcome: 'Undetermined', estimatedProbability: 0, displayProbabilityPct: 0 },
      modelExplanation: [],
      topFactors: { topPositive: [], topNegative: [] },
      medicalContext: [],
      retrievedEvidenceCount: 0,
      retrievalStatus: 'INSUFFICIENT_EVIDENCE',
      qualityFlags: [],
      limitations: ['Invalid input to report generation tool.'],
      disclaimer: 'AI-assisted screening result. Not a confirmed medical diagnosis.',
      evidenceGrounded: false,
      inputValid: false,
      error: validationErrors.join('; '),
      durationMs: Date.now() - startTime
    };
  }

  try {
    const raw = generateGroundedExplanation(input.mlPrediction, input.shapExplanation || {}, input.ragResult || {});
    const output = normalizeOutput(raw, input);
    output.durationMs = Date.now() - startTime;
    return output;
  } catch (err) {
    return {
      status: 'FAILED',
      summary: '',
      interpretation: 'AI interpretation unavailable due to report generation error.',
      evidenceFacts: [],
      citations: [],
      screeningResult: {
        predictedOutcome: input.mlPrediction.predictedOutcome || 'Undetermined',
        estimatedProbability: input.mlPrediction.estimatedProbability !== undefined ? input.mlPrediction.estimatedProbability : 0,
        displayProbabilityPct: input.mlPrediction.displayProbabilityPct !== undefined ? input.mlPrediction.displayProbabilityPct : 0
      },
      modelExplanation: [],
      topFactors: { topPositive: [], topNegative: [] },
      medicalContext: [],
      retrievedEvidenceCount: 0,
      retrievalStatus: 'INSUFFICIENT_EVIDENCE',
      qualityFlags: [],
      limitations: ['Report generation encountered an error.'],
      disclaimer: 'AI-assisted screening result. Not a confirmed medical diagnosis.',
      evidenceGrounded: false,
      inputValid: true,
      error: err.message || 'Report generation failed',
      durationMs: Date.now() - startTime
    };
  }
}

module.exports = {
  name: 'report_generation_tool',
  inputSchema: INPUT_SCHEMA,
  outputSchema: {
    status: 'string',
    summary: 'string',
    interpretation: 'string',
    evidenceFacts: 'array',
    citations: 'array',
    screeningResult: 'object',
    modelExplanation: 'array',
    topFactors: 'object',
    medicalContext: 'array',
    retrievedEvidenceCount: 'number',
    retrievalStatus: 'string',
    qualityFlags: 'array',
    limitations: 'array',
    disclaimer: 'string',
    evidenceGrounded: 'boolean',
    inputValid: 'boolean',
    durationMs: 'number',
    error: 'string | null'
  },
  validateInput,
  execute
};
