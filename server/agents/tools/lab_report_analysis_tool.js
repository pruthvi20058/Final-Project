/**
 * MediAgent Task 7 — Lab Report Analysis Tool
 *
 * Wraps the reportParser service to perform OCR/text extraction and
 * structured laboratory value extraction from uploaded reports.
 *
 * Input schema:
 *   { filePath: string, mimeType?: string }
 *
 * Output schema:
 *   {
 *     status: 'COMPLETED' | 'FAILED',
 *     labResults: array,
 *     patientDemographics: object,
 *     discardedCandidates: array,
 *     extractionMethod: string,
 *     totalResults: number,
 *     error?: string
 *   }
 */

const { extractTextFromFile, parseLabValuesFromText } = require('../../services/reportParser');
const fs = require('fs');

const INPUT_SCHEMA = {
  required: ['filePath'],
  properties: {
    filePath: { type: 'string', minLength: 1 },
    mimeType: { type: 'string', optional: true }
  }
};

function validateInput(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    errors.push('Input must be an object');
    return errors;
  }
  if (!input.filePath || typeof input.filePath !== 'string') {
    errors.push('Field "filePath" is required and must be a non-empty string');
  }
  return errors;
}

function normalizeOutput(rawResult, input) {
  const results = Array.isArray(rawResult.results) ? rawResult.results : [];
  return {
    status: rawResult.status === 'FAILED_UNREADABLE_PDF' || rawResult.status === 'FAILED' ? 'FAILED' : 'COMPLETED',
    labResults: results.map(r => ({
      id: r.id,
      testName: r.testName || r.rawName || 'Lab Test',
      rawName: r.rawName || r.testName,
      normalizedName: r.normalizedName || '',
      value: r.value,
      unit: r.units || r.unit || '',
      status: r.status || 'NORMAL',
      quality: r.quality || 'VALID',
      validationFlags: Array.isArray(r.validationFlags) ? r.validationFlags : [],
      confidence: r.confidence || null,
      extractionMethod: r.extractionMethod || rawResult.method || 'UNKNOWN'
    })),
    patientDemographics: rawResult.patientDemographics || { age: null, sex: null },
    discardedCandidates: Array.isArray(rawResult.discardedCandidates) ? rawResult.discardedCandidates : [],
    extractionMethod: rawResult.method || 'UNKNOWN',
    totalResults: results.length,
    hasSuspiciousOrInvalid: results.some(r => r.quality === 'SUSPICIOUS' || r.quality === 'INVALID'),
    error: null
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
      labResults: [],
      patientDemographics: { age: null, sex: null },
      discardedCandidates: [],
      extractionMethod: 'NONE',
      totalResults: 0,
      hasSuspiciousOrInvalid: false,
      durationMs: Date.now() - startTime
    };
  }

  if (!fs.existsSync(input.filePath)) {
    return {
      status: 'FAILED',
      inputValid: true,
      error: `File not found: ${input.filePath}`,
      labResults: [],
      patientDemographics: { age: null, sex: null },
      discardedCandidates: [],
      extractionMethod: 'NONE',
      totalResults: 0,
      hasSuspiciousOrInvalid: false,
      durationMs: Date.now() - startTime
    };
  }

  try {
    const extraction = await extractTextFromFile(input.filePath, input.mimeType);
    const parsed = parseLabValuesFromText(extraction.text || '', extraction.method, { tsv: extraction.tsv });
    const output = normalizeOutput({ ...parsed, status: extraction.method === 'FAILED_UNREADABLE_PDF' || extraction.method === 'FAILED' ? 'FAILED' : 'COMPLETED' }, input);
    output.inputValid = true;
    output.rawOcrTextLength = (extraction.text || '').length;
    output.ocrConfidence = extraction.confidence || null;
    output.durationMs = Date.now() - startTime;
    return output;
  } catch (err) {
    return {
      status: 'FAILED',
      inputValid: true,
      error: err.message || 'Lab report analysis failed',
      labResults: [],
      patientDemographics: { age: null, sex: null },
      discardedCandidates: [],
      extractionMethod: 'NONE',
      totalResults: 0,
      hasSuspiciousOrInvalid: false,
      durationMs: Date.now() - startTime
    };
  }
}

module.exports = {
  name: 'lab_report_analysis_tool',
  inputSchema: INPUT_SCHEMA,
  outputSchema: {
    status: 'string',
    labResults: 'array',
    patientDemographics: 'object',
    discardedCandidates: 'array',
    extractionMethod: 'string',
    totalResults: 'number',
    hasSuspiciousOrInvalid: 'boolean',
    inputValid: 'boolean',
    durationMs: 'number',
    error: 'string | null'
  },
  validateInput,
  execute
};
