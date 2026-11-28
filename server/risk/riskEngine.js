/**
 * MediAgent Task 8 — Central Clinical Risk Assessment Engine
 *
 * Separate from disease prediction. Evaluates:
 *   1. Emergency warning detection (independent of ML)
 *   2. Disease-specific clinical risk rules
 *   3. Laboratory result interpretation (verified values only)
 *   4. Data completeness assessment
 *   5. Evidence availability
 *
 * Design rules:
 * - High ML probability does NOT automatically mean high clinical risk
 * - Low ML probability does NOT override an emergency warning
 * - Missing information never results in low risk
 * - Returns RISK_ASSESSMENT_UNAVAILABLE when required info is missing
 * - Every result traceable to actual inputs and executed rules
 * - No fabricated risk scores or probabilities
 */

const {
  detectEmergencyWarnings,
  checkDiseaseRuleAvailability,
  getActiveEmergencyRules,
  getRuleById
} = require('./emergencyWarnings');
const {
  interpretLabResults,
  listReferenceRanges,
  getReferenceRange
} = require('./labInterpretation');

// Risk category definitions (not arbitrary score thresholds)
const RISK_CATEGORIES = {
  EMERGENCY: {
    label: 'Emergency',
    meaning: 'Validated emergency warning rule triggered — immediate medical evaluation required.',
    basis: 'Emergency warning rules from WHO/ADA/CDC clinical sources.'
  },
  HIGH_RISK: {
    label: 'High Risk',
    meaning: 'Multiple abnormal verified findings or validated high-risk criteria met.',
    basis: 'Disease-specific clinical rules with documented sources.'
  },
  MODERATE_RISK: {
    label: 'Moderate Risk',
    meaning: 'Some abnormal verified findings or partial risk criteria met.',
    basis: 'Disease-specific clinical rules with documented sources.'
  },
  LOW_RISK: {
    label: 'Low Risk',
    meaning: 'No emergency warnings and no validated high-risk criteria met.',
    basis: 'Absence of triggered emergency rules and abnormal findings.'
  },
  UNAVAILABLE: {
    label: 'Unavailable',
    meaning: 'Cannot assign a risk category — required information missing or no validated rules exist.',
    basis: 'Insufficient data or no reviewed rules for the clinical context.'
  }
};

/**
 * Validate patient input for risk assessment.
 * @param {Object} input - Raw input object
 * @returns {Object} { valid: boolean, errors: string[], normalized: Object }
 */
function validateInput(input) {
  const errors = [];
  const normalized = {
    symptoms: null,
    labResults: null,
    disease: null,
    patientContext: {},
    prediction: null, // ML prediction — used for context only, NOT for risk scoring
    mlProbability: null
  };

  if (!input || typeof input !== 'object') {
    errors.push('Input must be an object');
    return { valid: false, errors, normalized };
  }

  // Symptoms — optional but needed for emergency detection
  if (input.symptoms !== undefined) {
    if (!Array.isArray(input.symptoms)) {
      errors.push('Field "symptoms" must be an array if provided');
    } else {
      normalized.symptoms = input.symptoms.filter(s => typeof s === 'string' && s.trim().length > 0);
    }
  }

  // Lab results — optional but needed for lab-based risk
  if (input.labResults !== undefined) {
    if (!Array.isArray(input.labResults)) {
      errors.push('Field "labResults" must be an array if provided');
    } else {
      normalized.labResults = input.labResults.filter(l => l && typeof l === 'object');
    }
  }

  // Disease — optional, needed for disease-specific rules
  if (input.disease !== undefined) {
    if (typeof input.disease !== 'string' || input.disease.trim().length === 0) {
      errors.push('Field "disease" must be a non-empty string if provided');
    } else {
      normalized.disease = input.disease.toLowerCase().trim();
    }
  }

  // Patient context — optional
  if (input.patientContext !== undefined) {
    if (typeof input.patientContext !== 'object') {
      errors.push('Field "patientContext" must be an object if provided');
    } else {
      normalized.patientContext = {
        age: input.patientContext.age,
        sex: input.patientContext.sex,
        pregnancyStatus: input.patientContext.pregnancyStatus,
        vitals: input.patientContext.vitals
      };
    }
  }

  // ML prediction — context only, never used for risk scoring
  if (input.prediction !== undefined && input.prediction !== null) {
    if (typeof input.prediction !== 'object') {
      errors.push('Field "prediction" must be an object if provided');
    } else {
      normalized.prediction = input.prediction;
      // Extract probability for context tracking only (NOT used for risk)
      if (typeof input.prediction.estimatedProbability === 'number') {
        normalized.mlProbability = input.prediction.estimatedProbability;
      } else if (typeof input.prediction.displayProbabilityPct === 'number') {
        normalized.mlProbability = input.prediction.displayProbabilityPct / 100;
      }
    }
  }

  // At least some input needed
  if (!normalized.symptoms && !normalized.labResults && !normalized.disease) {
    errors.push('At least one of: symptoms, labResults, or disease is required.');
  }

  return { valid: errors.length === 0, errors, normalized };
}

/**
 * Assess disease-specific clinical risk using validated rules.
 * Does NOT use ML probability for risk scoring.
 * @param {Object} normalized - Normalized input
 * @returns {Object} risk assessment result
 */
function assessDiseaseSpecificRisk(normalized) {
  const { disease, labResults, symptoms, patientContext } = normalized;

  if (!disease) {
    return {
      status: 'RISK_ASSESSMENT_UNAVAILABLE',
      riskCategory: 'UNAVAILABLE',
      reason: 'No disease specified — disease-specific risk rules cannot be applied.',
      rulesApplied: [],
      abnormalFindings: [],
      missingInformation: ['Disease context required for disease-specific risk assessment.'],
      limitations: ['Cannot perform disease-specific risk assessment without disease specification.']
    };
  }

  // Check if disease has validated emergency/risk rules
  const ruleAvailability = checkDiseaseRuleAvailability(disease);

  // Run emergency warning detection (part of risk assessment) — always runs,
  // even when disease-specific rules are unavailable. General emergency rules
  // are disease-agnostic and apply regardless of disease context.
  const emergencyResult = detectEmergencyWarnings({
    symptoms,
    labResults,
    disease: ruleAvailability.hasDiseaseSpecificRules ? disease : null,
    patientContext
  });

  // If disease-specific rules are unavailable, still report general emergency
  // alerts. Emergency takes priority over disease-specific unavailability.
  if (!ruleAvailability.available) {
    const generalEmergencyTriggered = emergencyResult.triggered;
    const riskCategory = generalEmergencyTriggered ? 'EMERGENCY' : 'UNAVAILABLE';
    const status = generalEmergencyTriggered ? 'COMPLETED' : 'RISK_ASSESSMENT_UNAVAILABLE';
    return {
      status,
      riskCategory,
      riskLabel: generalEmergencyTriggered ? 'Emergency' : 'Unavailable',
      riskMeaning: generalEmergencyTriggered
        ? 'Validated emergency warning rule triggered — immediate medical evaluation required.'
        : 'Disease-specific risk rules not available for this condition.',
      reason: ruleAvailability.reason,
      disease,
      emergencyAlert: {
        triggered: generalEmergencyTriggered,
        severity: emergencyResult.severity || null,
        reasons: emergencyResult.alertReasons
      },
      evaluatedFactors: emergencyResult.evaluatedFactors,
      abnormalFindings: [],
      missingInformation: [ruleAvailability.reason],
      rulesApplied: emergencyResult.triggeredRules.map(tr => ({
        ruleId: tr.ruleId,
        disease: tr.disease,
        triggerCondition: tr.triggerCondition,
        severity: tr.severity,
        alertMessage: tr.alertMessage,
        sourceOrganization: tr.sourceOrganization,
        sourceDocument: tr.sourceDocument,
        sourceUrl: tr.sourceUrl,
        ruleVersion: tr.ruleVersion,
        reviewStatus: tr.reviewStatus
      })),
      evidenceReferences: emergencyResult.triggeredRules.map(tr => ({
        ruleId: tr.ruleId,
        organization: tr.sourceOrganization,
        document: tr.sourceDocument,
        url: tr.sourceUrl,
        section: tr.sourceSection,
        publicationDate: tr.publicationDate,
        ruleVersion: tr.ruleVersion
      })),
      limitations: [
        ruleAvailability.reason,
        'General emergency warning detection still active for recognized emergency signs.'
      ],
      mlProbabilityUsedForRisk: false,
      mlProbability: normalized.mlProbability || null,
      durationMs: 0
    };
  }

  // Interpret lab results
  const labInterpretation = interpretLabResults(labResults || [], patientContext);

  // Determine risk category based on rules and findings (NOT ML probability)
  let riskCategory = 'LOW_RISK';
  let riskBasis = [];

  if (emergencyResult.triggered) {
    riskCategory = 'EMERGENCY';
    riskBasis.push(`Emergency warning triggered: ${emergencyResult.alertReasons.map(r => r.message).join('; ')}`);
  } else if (labInterpretation.totalAbnormal > 0) {
    const abnormalCount = labInterpretation.totalAbnormal;
    if (abnormalCount >= 3) {
      riskCategory = 'HIGH_RISK';
      riskBasis.push(`${abnormalCount} abnormal verified laboratory findings — multiple parameter deviations.`);
    } else if (abnormalCount >= 1) {
      riskCategory = 'MODERATE_RISK';
      riskBasis.push(`${abnormalCount} abnormal verified laboratory finding(s) — clinical review recommended.`);
    }
  } else if (labResults && labResults.length === 0 && !symptoms) {
    riskCategory = 'UNAVAILABLE';
    riskBasis.push('No symptoms or laboratory results provided — cannot assess risk.');
  }

  // Collect rules applied
  const rulesApplied = [];
  emergencyResult.triggeredRules.forEach(tr => {
    rulesApplied.push({
      ruleId: tr.ruleId,
      disease: tr.disease,
      triggerCondition: tr.triggerCondition,
      severity: tr.severity,
      alertMessage: tr.alertMessage,
      sourceOrganization: tr.sourceOrganization,
      sourceDocument: tr.sourceDocument,
      sourceUrl: tr.sourceUrl,
      ruleVersion: tr.ruleVersion,
      reviewStatus: tr.reviewStatus
    });
  });
  labInterpretation.rulesApplied.forEach(ra => {
    rulesApplied.push({ description: ra, type: 'lab_reference_range' });
  });

  // Missing information
  const missingInformation = [
    ...emergencyResult.missingInformation,
    ...labInterpretation.missingInfo
  ];

  // Limitations
  const limitations = [
    ...labInterpretation.limitations,
    'ML disease prediction probability is NOT used for clinical risk scoring.',
    'Risk categories are based on validated clinical rules and verified findings only.'
  ];

  // Evidence references
  const evidenceReferences = [];
  emergencyResult.triggeredRules.forEach(tr => {
    evidenceReferences.push({
      ruleId: tr.ruleId,
      organization: tr.sourceOrganization,
      document: tr.sourceDocument,
      url: tr.sourceUrl,
      section: tr.sourceSection,
      publicationDate: tr.publicationDate,
      ruleVersion: tr.ruleVersion
    });
  });

  // Determine status
  const status = riskCategory === 'UNAVAILABLE' ? 'RISK_ASSESSMENT_UNAVAILABLE' : 'COMPLETED';

  return {
    status,
    riskCategory,
    riskLabel: RISK_CATEGORIES[riskCategory]?.label || 'Unknown',
    riskMeaning: RISK_CATEGORIES[riskCategory]?.meaning || '',
    emergencyAlert: {
      triggered: emergencyResult.triggered,
      severity: emergencyResult.severity || null,
      reasons: emergencyResult.alertReasons
    },
    evaluatedFactors: emergencyResult.evaluatedFactors,
    abnormalFindings: labInterpretation.abnormal.map(a => ({
      testName: a.testName,
      normalizedName: a.normalizedName,
      value: a.value,
      unit: a.unit,
      status: a.status,
      referenceRange: a.referenceRange,
      interpretation: a.interpretation,
      source: a.source,
      flags: a.flags
    })),
    missingInformation,
    rulesApplied,
    evidenceReferences,
    limitations,
    disease,
    mlProbabilityUsedForRisk: false, // Explicitly false — ML prob never used for risk
    mlProbability: normalized.mlProbability || null, // Tracked for context only
    durationMs: 0 // Set by caller
  };
}

/**
 * Main risk assessment entry point.
 * @param {Object} input - Raw input { symptoms, labResults, disease, patientContext, prediction }
 * @param {Object} options - { startedAt } for timing
 * @returns {Object} Complete risk assessment result
 */
async function assessRisk(input = {}, options = {}) {
  const startTime = options.startedAt || Date.now();

  // Validate input
  const validation = validateInput(input);
  if (!validation.valid) {
    return {
      status: 'FAILED',
      riskCategory: 'UNAVAILABLE',
      inputValid: false,
      error: validation.errors.join('; '),
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

  const normalized = validation.normalized;

  // Perform disease-specific risk assessment
  const result = assessDiseaseSpecificRisk(normalized);

  // Add timing and input validity
  result.inputValid = true;
  result.durationMs = Date.now() - startTime;
  result.patientContext = normalized.patientContext;

  // Add top-level assessment status
  result.assessmentStatus = result.status;

  return result;
}

/**
 * Get available risk categories and their meanings (for API consumers).
 */
function getRiskCategories() {
  return RISK_CATEGORIES;
}

/**
 * Get clinical sources used by the risk engine.
 */
function getClinicalSources() {
  const { getClinicalSources: getRuleSources } = require('./clinicalRules');
  return getRuleSources();
}

module.exports = {
  assessRisk,
  validateInput,
  assessDiseaseSpecificRisk,
  detectEmergencyWarnings,
  interpretLabResults,
  listReferenceRanges,
  getReferenceRange,
  getRiskCategories,
  getClinicalSources,
  RISK_CATEGORIES,
  REFERENCE_RANGES: require('./labInterpretation').REFERENCE_RANGES
};
