'use strict';

/**
 * MediAgent — Clinical Measurement Unit Normalization
 *
 * Provides clinically appropriate unit conversions keyed by parameter,
 * because conversion factors are parameter-specific (e.g. glucose uses a
 * different factor than cholesterol).
 *
 * DESIGN PRINCIPLES (per Enhancement E3 Section 11):
 * - Use parameter-specific conversion factors, never a universal factor.
 * - Do not convert units when the conversion context is unknown.
 * - Store original value, original unit, normalized value, normalized unit,
 *   conversion method, conversion status, validation flags.
 * - Qualitative results (Reactive / Non-reactive / Detected / Not detected)
 *   are NOT converted to numeric values.
 * - Censored inequalities (< 0.5, > 90) preserve their meaning; they are not
 *   converted into exact measurements without preserving the operator.
 */

const ONTOLOGY = require('./labParameterOntology');

const CONFIDENCE_UNAVAILABLE = null;

/**
 * Normalize a measurement value and unit to canonical units for a parameter.
 *
 * @param {string} parameterId - ontology canonical id (e.g. 'glucose_fasting')
 * @param {number} value - original numeric value
 * @param {string} originalUnit - original unit string
 * @param {string} targetUnit - desired canonical unit (defaults to first expected unit)
 * @returns {Object} { originalValue, originalUnit, normalizedValue, normalizedUnit,
 *   conversionMethod, conversionStatus, confidence }
 */
function normalizeMeasurement(parameterId, value, originalUnit, targetUnit) {
  const result = {
    originalValue: value,
    originalUnit: originalUnit || null,
    normalizedValue: null,
    normalizedUnit: null,
    conversionMethod: 'none',
    conversionStatus: 'NO_CONVERSION_NEEDED',
    confidence: CONFIDENCE_UNAVAILABLE
  };

  if (value === null || value === undefined || value === '') {
    result.conversionStatus = 'MISSING_VALUE';
    return result;
  }

  const numVal = Number(value);
  if (!Number.isFinite(numVal)) {
    result.conversionStatus = 'INVALID_VALUE';
    return result;
  }

  const param = ONTOLOGY.getParameter(parameterId);
  if (!param) {
    result.conversionStatus = 'UNKNOWN_PARAMETER';
    result.normalizedValue = numVal;
    result.normalizedUnit = originalUnit || null;
    return result;
  }

  const expectedUnits = (param.expectedUnits || []).map(u => u.toLowerCase());
  const srcUnit = (originalUnit || '').toLowerCase();

  // Resolve target unit
  let tgtUnit = targetUnit ? targetUnit.toLowerCase() : null;
  if (!tgtUnit || !expectedUnits.includes(tgtUnit)) {
    tgtUnit = expectedUnits[0] || null;
  }
  result.normalizedUnit = tgtUnit;

  // Same unit (or case-insensitive match): no conversion
  if (srcUnit === tgtUnit) {
    result.normalizedValue = numVal;
    result.conversionMethod = 'identity';
    result.conversionStatus = 'NO_CONVERSION_NEEDED';
    result.confidence = null; // exact, no conversion uncertainty
    return result;
  }

  // Attempt parameter-specific conversion.
  // unitConversions keys are case-sensitive in the ontology (e.g. 'mg/dL');
  // build a lowercased lookup so 'mg/dl' matches 'mg/dL'.
  const conversionsRaw = (param.unitConversions || {});
  const conversions = {};
  for (const [fromUnit, toMap] of Object.entries(conversionsRaw)) {
    conversions[fromUnit.toLowerCase()] = {};
    for (const [toUnit, conv] of Object.entries(toMap)) {
      conversions[fromUnit.toLowerCase()][toUnit.toLowerCase()] = conv;
    }
  }
  const convMap = conversions[srcUnit];
  if (convMap && convMap[tgtUnit]) {
    const conv = convMap[tgtUnit];
    const converted = numVal * conv.factor + conv.offset;
    result.normalizedValue = Number(converted.toFixed(6));
    result.conversionMethod = `parameter-specific:${parameterId}:${srcUnit}->${tgtUnit}`;
    result.conversionStatus = 'CONVERTED';
    result.confidence = null; // deterministic conversion
    return result;
  }

  // No conversion path available
  result.normalizedValue = numVal;
  result.normalizedUnit = srcUnit;
  result.conversionMethod = 'none';
  result.conversionStatus = 'CONVERSION_UNAVAILABLE';
  result.confidence = null;
  return result;
}

/**
 * Normalize a qualitative (non-numeric) result. These are never converted.
 *
 * @param {string} value - e.g. 'Reactive', 'Non-reactive', 'Detected', 'Not detected'
 * @returns {Object}
 */
function normalizeQualitative(value) {
  const v = String(value).trim();
  const lower = v.toLowerCase();
  let normalized = v;
  let status = 'VERIFIED';

  if (/^(reactive|positive|detected|present|abnormal)$/i.test(lower)) {
    normalized = 'Reactive';
  } else if (/^(non.?reactive|negative|not detected|absent|normal)$/i.test(lower)) {
    normalized = 'Non-reactive';
  } else if (/^(equivocal|indeterminate|borderline|uncertain)$/i.test(lower)) {
    normalized = 'Equivocal';
    status = 'AMBIGUOUS';
  }

  return {
    originalValue: v,
    originalUnit: null,
    normalizedValue: normalized,
    normalizedUnit: null,
    conversionMethod: 'qualitative-normalization',
    conversionStatus: 'NO_CONVERSION_NEEDED',
    confidence: null,
    valueType: 'qualitative',
    status
  };
}

/**
 * Parse a censored/inequality measurement such as "< 0.5" or "> 90".
 *
 * @param {string} raw - e.g. "< 0.5 mg/dL", "> 90"
 * @returns {Object} { operator, value, unit, normalizedValue }
 */
function parseCensored(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const m = raw.trim().match(/^(<|>|<=|>=|≈|~)?\s*(-?\d+(?:[.,]\d+)?)\s*([^\d]*)?$/);
  if (!m) return null;
  return {
    operator: m[1] || null,
    value: parseFloat(m[2].replace(',', '.')),
    unit: (m[3] || '').trim() || null,
    normalizedValue: parseFloat(m[2].replace(',', '.'))
  };
}

/**
 * Determine whether a unit conversion is clinically safe for a parameter.
 * Returns false when conversion context is unknown or unsupported.
 */
function getConversionMap(parameterId) {
  const param = ONTOLOGY.getParameter(parameterId);
  if (!param) return null;
  const map = {};
  for (const [fromUnit, toMap] of Object.entries(param.unitConversions || {})) {
    map[fromUnit.toLowerCase()] = {};
    for (const [toUnit, conv] of Object.entries(toMap)) {
      map[fromUnit.toLowerCase()][toUnit.toLowerCase()] = conv;
    }
  }
  return map;
}

function isConversionSafe(parameterId, fromUnit, toUnit) {
  const map = getConversionMap(parameterId);
  if (!map) return false;
  const convMap = map[(fromUnit || '').toLowerCase()];
  return Boolean(convMap && convMap[(toUnit || '').toLowerCase()]);
}

module.exports = {
  normalizeMeasurement,
  normalizeQualitative,
  parseCensored,
  isConversionSafe,
  CONFIDENCE_UNAVAILABLE,
  ONTOLOGY_VERSION: ONTOLOGY.ONTOLOGY_VERSION
};
