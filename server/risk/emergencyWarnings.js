/**
 * MediAgent Task 8 — Emergency Warning Detection Layer
 *
 * Dedicated emergency warning detection that operates independently of
 * ML predictions and RAG responses. Emergency warnings are triggered
 * by validated clinical rules based on patient symptoms and verified
 * laboratory results.
 *
 * Design principles:
 * - Emergency warnings do NOT depend on LLM approval
 * - LLMs do NOT override emergency alerts
 * - Emergency warnings fire independently of disease prediction
 * - Missing information never suppresses an emergency warning
 * - Every triggered rule is recorded with its source and version
 */

const {
  getActiveEmergencyRules,
  getRuleById,
  getRulesForDisease,
  hasActiveRulesForDisease,
  DISEASE_EMERGENCY_RULES,
  SYMPTOM_TRIGGER_MAP,
  LAB_TRIGGER_MAP
} = require('./clinicalRules');

/**
 * Match patient-reported symptoms to emergency rule trigger conditions.
 * @param {string[]} symptoms - Array of symptom strings from patient input
 * @returns {Object} { matchedTriggers: string[], matchedSymptoms: { symptom, triggerCondition }[] }
 */
function matchSymptomsToTriggers(symptoms) {
  const matchedTriggers = new Set();
  const matchedSymptoms = [];

  if (!Array.isArray(symptoms)) {
    return { matchedTriggers: [], matchedSymptoms: [] };
  }

  symptoms.forEach(symptom => {
    const symptomLower = symptom.toLowerCase().trim();
    let matched = false;

    // Direct map lookup
    if (SYMPTOM_TRIGGER_MAP[symptomLower]) {
      matchedTriggers.add(SYMPTOM_TRIGGER_MAP[symptomLower]);
      matchedSymptoms.push({ symptom, triggerCondition: SYMPTOM_TRIGGER_MAP[symptomLower], matchType: 'exact' });
      matched = true;
    }

    // Partial match for symptoms not in exact map
    if (!matched) {
      Object.entries(SYMPTOM_TRIGGER_MAP).forEach(([key, trigger]) => {
        if (symptomLower.includes(key) || key.includes(symptomLower)) {
          matchedTriggers.add(trigger);
          matchedSymptoms.push({ symptom, triggerCondition: trigger, matchType: 'partial' });
          matched = true;
        }
      });
    }

    if (!matched) {
      matchedSymptoms.push({ symptom, triggerCondition: null, matchType: 'none' });
    }
  });

  return {
    matchedTriggers: Array.from(matchedTriggers),
    matchedSymptoms
  };
}

/**
 * Match verified lab results to emergency rule trigger conditions.
 * @param {Array} labResults - Array of verified lab result items
 * @returns {Object} { matchedTriggers: string[], matchedLabs: { testName, triggerCondition }[] }
 */
function matchLabsToTriggers(labResults) {
  const matchedTriggers = new Set();
  const matchedLabs = [];

  if (!Array.isArray(labResults)) {
    return { matchedTriggers: [], matchedLabs: [] };
  }

  labResults.forEach(lab => {
    const normalizedName = (lab.normalizedName || lab.rawName || lab.testName || '').toLowerCase().trim();
    const value = parseFloat(lab.value);
    let matched = false;

    // Dengue-specific: platelet drop + hematocrit rise pattern
    if (normalizedName === 'platelets' || normalizedName === 'platelet_count') {
      if (!isNaN(value) && value < 100000) {
        matchedTriggers.add('platelet_drop');
        matchedLabs.push({ testName: lab.testName || lab.rawName || 'Platelet count', triggerCondition: 'platelet_drop', value: lab.value, unit: lab.units });
        matched = true;
      }
    }
    if (normalizedName === 'hematocrit' || normalizedName === 'pcv') {
      if (!isNaN(value) && value > 48) {
        matchedTriggers.add('hematocrit_rise');
        matchedLabs.push({ testName: lab.testName || lab.rawName || 'Hematocrit', triggerCondition: 'hematocrit_rise', value: lab.value, unit: lab.units });
        matched = true;
      }
    }

    // Diabetes: glucose thresholds
    if (normalizedName === 'glucose' || normalizedName === 'plas') {
      if (!isNaN(value)) {
        if (value < 54) {
          matchedTriggers.add('blood_glucose_below_54');
          matchedLabs.push({ testName: lab.testName || lab.rawName || 'Blood glucose', triggerCondition: 'blood_glucose_below_54', value: lab.value, unit: lab.units });
        } else if (value >= 250) {
          matchedTriggers.add('severe_hyperglycemia');
          matchedLabs.push({ testName: lab.testName || lab.rawName || 'Blood glucose', triggerCondition: 'severe_hyperglycemia', value: lab.value, unit: lab.units });
        }
        matched = true;
      }
    }

    // Malaria: severe anemia (hemoglobin < 5 g/dL or hematocrit < 15%)
    if (normalizedName === 'hemoglobin') {
      if (!isNaN(value) && value < 5.0) {
        matchedTriggers.add('severe_anemia');
        matchedLabs.push({ testName: lab.testName || lab.rawName || 'Hemoglobin', triggerCondition: 'severe_anemia', value: lab.value, unit: lab.units });
        matched = true;
      }
    }
    if (normalizedName === 'hematocrit' || normalizedName === 'pcv') {
      if (!isNaN(value) && value < 15.0) {
        matchedTriggers.add('severe_anemia');
        matchedLabs.push({ testName: lab.testName || lab.rawName || 'Hematocrit', triggerCondition: 'severe_anemia', value: lab.value, unit: lab.units });
        matched = true;
      }
    }

    if (!matched) {
      matchedLabs.push({ testName: lab.testName || lab.rawName || normalizedName, triggerCondition: null, value: lab.value, unit: lab.units });
    }
  });

  return {
    matchedTriggers: Array.from(matchedTriggers),
    matchedLabs
  };
}

/**
 * Detect emergency warnings from patient symptoms and verified lab results.
 * @param {Object} input - { symptoms?: string[], labResults?: array, disease?: string, patientContext?: object }
 * @returns {Object} emergency warning result
 */
function detectEmergencyWarnings(input = {}) {
  const inputSymptoms = input.symptoms || [];
  const inputLabResults = input.labResults || [];
  const disease = input.disease || null;
  const patientContext = input.patientContext || {};

  const emergencyRules = disease ? getRulesForDisease(disease) : getActiveEmergencyRules();
  const triggeredRules = [];
  const alertReasons = [];
  const evaluatedFactors = [];
  const missingInformation = [];

  // Match symptoms to trigger conditions
  const symptomMatch = matchSymptomsToTriggers(inputSymptoms);
  evaluatedFactors.push({
    factor: 'symptom_screening',
    description: `Screened ${inputSymptoms.length} reported symptoms against ${emergencyRules.length} active emergency rules`,
    matchedCount: symptomMatch.matchedTriggers.length
  });

  // Match labs to trigger conditions
  const labMatch = matchLabsToTriggers(inputLabResults);
  evaluatedFactors.push({
    factor: 'laboratory_screening',
    description: `Screened ${inputLabResults.length} verified laboratory results against emergency rule triggers`,
    matchedCount: labMatch.matchedTriggers.length
  });

  // Collect all matched trigger conditions
  const allMatchedTriggers = new Set([...symptomMatch.matchedTriggers, ...labMatch.matchedTriggers]);

  // Evaluate each matched trigger against active rules
  allMatchedTriggers.forEach(triggerCondition => {
    const matchingRules = emergencyRules.filter(rule =>
      rule.triggerConditions.includes(triggerCondition)
    );

    matchingRules.forEach(rule => {
      // Check required input fields availability
      const missingFields = rule.requiredInputFields.filter(field => {
        if (field === 'symptoms' && (!inputSymptoms || inputSymptoms.length === 0)) return true;
        if (field === 'labResults' && (!inputLabResults || inputLabResults.length === 0)) return true;
        if (field === 'vitals' && !patientContext.vitals) return true;
        return false;
      });

      if (missingFields.length > 0) {
        missingInformation.push({
          ruleId: rule.ruleId,
          missingFields,
          message: `Rule ${rule.ruleId} requires ${missingFields.join(', ')} which are not available.`
        });
        return; // Cannot evaluate rule without required inputs
      }

      triggeredRules.push({
        ruleId: rule.ruleId,
        disease: rule.disease || 'general',
        clinicalContext: rule.clinicalContext,
        severity: rule.severity,
        triggerCondition,
        alertMessage: rule.alertMessage,
        sourceOrganization: rule.sourceOrganization,
        sourceDocument: rule.sourceDocument,
        sourceUrl: rule.sourceUrl,
        sourceSection: rule.sourceSection,
        publicationDate: rule.publicationDate,
        ruleVersion: rule.ruleVersion,
        reviewStatus: rule.reviewStatus,
        matchedSymptoms: symptomMatch.matchedSymptoms
          .filter(m => m.triggerCondition === triggerCondition)
          .map(m => m.symptom),
        matchedLabs: labMatch.matchedLabs
          .filter(m => m.triggerCondition === triggerCondition)
          .map(m => ({ testName: m.testName, value: m.value, unit: m.unit }))
      });

      alertReasons.push({
        ruleId: rule.ruleId,
        severity: rule.severity,
        message: rule.alertMessage,
        source: `${rule.sourceOrganization} — ${rule.sourceDocument}`
      });
    });
  });

  const hasEmergency = triggeredRules.length > 0;
  const maxSeverity = hasEmergency
    ? triggeredRules.reduce((max, rule) => {
        const severityOrder = { critical: 4, high: 3, moderate: 2, low: 1 };
        return severityOrder[rule.severity] > severityOrder[max] ? rule.severity : max;
      }, 'low')
    : null;

  return {
    triggered: hasEmergency,
    severity: maxSeverity,
    alertReasons,
    triggeredRules,
    evaluatedFactors,
    missingInformation,
    matchedSymptoms: symptomMatch.matchedSymptoms,
    matchedLabs: labMatch.matchedLabs,
    ruleCount: emergencyRules.length,
    disease: disease || null,
    symptomsScreened: inputSymptoms.length,
    labResultsScreened: inputLabResults.length
  };
}

/**
 * Check if emergency rules exist for a given disease.
 * Returns unavailable status if no validated disease-specific rules exist.
 * General emergency rules (disease-agnostic) are always available.
 */
function checkDiseaseRuleAvailability(disease) {
  if (!disease) {
    return {
      available: false,
      reason: 'No disease specified — disease-specific rules require a disease context.',
      status: 'RISK_ASSESSMENT_UNAVAILABLE',
      hasDiseaseSpecificRules: false
    };
  }

  const diseaseRules = DISEASE_EMERGENCY_RULES.filter(r => r.active && r.disease === disease);
  const hasDiseaseSpecificRules = diseaseRules.length > 0;

  if (!hasDiseaseSpecificRules) {
    return {
      available: false,
      reason: `No reviewed and verified disease-specific emergency rules available for disease: ${disease}. General emergency rules still apply.`,
      status: 'RISK_ASSESSMENT_UNAVAILABLE',
      disease,
      hasDiseaseSpecificRules: false,
      generalRulesOnly: true
    };
  }

  return {
    available: true,
    reason: `Disease-specific emergency rules available for ${disease}`,
    status: 'AVAILABLE',
    disease,
    hasDiseaseSpecificRules: true,
    ruleCount: getRulesForDisease(disease).length
  };
}

module.exports = {
  detectEmergencyWarnings,
  matchSymptomsToTriggers,
  matchLabsToTriggers,
  checkDiseaseRuleAvailability,
  getActiveEmergencyRules,
  getRuleById,
  SYMPTOM_TRIGGER_MAP,
  LAB_TRIGGER_MAP
};
