/**
 * MediAgent Task 7 — Medical Evidence Tool
 *
 * Wraps retrieveMedicalEvidence (ragService) to fetch disease-aware,
 * source-cited medical evidence from the curated knowledge base.
 * Never fabricates citations; returns INSUFFICIENT_EVIDENCE when
 * nothing matches.
 *
 * Input schema:
 *   { query?: string, disease?: string, symptoms?: string[], featuresPresent?: string[], predictedOutcome?: string, queryKeywords?: string, topK?: number }
 *
 * Output schema:
 *   {
 *     status: 'SUCCESS' | 'INSUFFICIENT_EVIDENCE' | 'FAILED',
 *     query: string,
 *     sources: array,
 *     retrievedCount: number,
 *     qualityFlags: array,
 *     retrievalInfo: object,
 *     error?: string
 *   }
 */

const { retrieveMedicalEvidence, sanitizeQuery } = require('../../services/ragService');

const SUPPORTED_DISEASES = ['diabetes', 'dengue', 'malaria', 'chikungunya', 'typhoid'];

const INPUT_SCHEMA = {
  required: [],
  properties: {
    query: { type: 'string', optional: true },
    disease: { type: 'string', optional: true, enum: SUPPORTED_DISEASES },
    symptoms: { type: 'array', optional: true, items: { type: 'string' } },
    featuresPresent: { type: 'array', optional: true, items: { type: 'string' } },
    predictedOutcome: { type: 'string', optional: true },
    queryKeywords: { type: 'string', optional: true },
    topK: { type: 'number', optional: true, minimum: 1, maximum: 20 }
  }
};

function validateInput(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    errors.push('Input must be an object');
    return errors;
  }
  if (input.disease !== undefined && (!input.disease || typeof input.disease !== 'string')) {
    errors.push('Field "disease" must be a non-empty string if provided');
  }
  if (input.symptoms !== undefined && !Array.isArray(input.symptoms)) {
    errors.push('Field "symptoms" must be an array if provided');
  }
  if (input.featuresPresent !== undefined && !Array.isArray(input.featuresPresent)) {
    errors.push('Field "featuresPresent" must be an array if provided');
  }
  if (input.topK !== undefined && (!Number.isInteger(input.topK) || input.topK < 1 || input.topK > 20)) {
    errors.push('Field "topK" must be an integer between 1 and 20 if provided');
  }
  return errors;
}

function normalizeOutput(rawResult) {
  return {
    status: rawResult.status,
    query: rawResult.query || '',
    sources: Array.isArray(rawResult.sources) ? rawResult.sources.map(s => ({
      sourceId: s.sourceId || null,
      title: s.title || 'Untitled source',
      organization: s.organization || 'Unknown organization',
      publicationDate: s.publicationDate || null,
      url: s.url || null,
      documentType: s.documentType || 'Clinical Guideline',
      topic: s.topic || '',
      disease: s.disease || null,
      relevanceScore: s.relevanceScore !== undefined ? s.relevanceScore : null,
      outdated: Boolean(s.outdated),
      outdatedReason: s.outdatedReason || null
    })) : [],
    retrievedCount: typeof rawResult.retrievedCount === 'number' ? rawResult.retrievedCount : 0,
    qualityFlags: Array.isArray(rawResult.qualityFlags) ? rawResult.qualityFlags : [],
    retrievalInfo: rawResult.retrievalInfo || {},
    message: rawResult.message || null,
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
      query: '',
      sources: [],
      retrievedCount: 0,
      qualityFlags: [],
      retrievalInfo: {},
      inputValid: false,
      error: validationErrors.join('; '),
      durationMs: Date.now() - startTime
    };
  }

  // Build a sanitized query from available context
  const contextQuery = [
    input.disease || '',
    ...(input.symptoms || []),
    ...(input.featuresPresent || []),
    input.predictedOutcome || '',
    input.queryKeywords || ''
  ].join(' ').trim();

  const safeQuery = sanitizeQuery(contextQuery || input.query || '');
  if (!safeQuery) {
    return {
      status: 'INSUFFICIENT_EVIDENCE',
      query: '',
      sources: [],
      retrievedCount: 0,
      qualityFlags: [],
      retrievalInfo: { method: 'TF-IDF + keyword hybrid', disease: input.disease || null },
      inputValid: true,
      error: null,
      message: 'No usable query terms for evidence retrieval.',
      durationMs: Date.now() - startTime
    };
  }

  try {
    const raw = retrieveMedicalEvidence({
      query: safeQuery,
      disease: input.disease || undefined,
      symptoms: input.symptoms || [],
      featuresPresent: input.featuresPresent || [],
      predictedOutcome: input.predictedOutcome || '',
      queryKeywords: input.queryKeywords || '',
      topK: input.topK || 5
    });
    const output = normalizeOutput(raw);
    output.inputValid = true;
    output.durationMs = Date.now() - startTime;
    return output;
  } catch (err) {
    return {
      status: 'FAILED',
      query: safeQuery,
      sources: [],
      retrievedCount: 0,
      qualityFlags: [],
      retrievalInfo: { method: 'TF-IDF + keyword hybrid', disease: input.disease || null },
      inputValid: true,
      error: err.message || 'Evidence retrieval failed',
      durationMs: Date.now() - startTime
    };
  }
}

module.exports = {
  name: 'medical_evidence_tool',
  inputSchema: INPUT_SCHEMA,
  outputSchema: {
    status: 'string',
    query: 'string',
    sources: 'array',
    retrievedCount: 'number',
    qualityFlags: 'array',
    retrievalInfo: 'object',
    inputValid: 'boolean',
    durationMs: 'number',
    error: 'string | null',
    message: 'string | null'
  },
  validateInput,
  execute
};
