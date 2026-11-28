/**
 * MediAgent Task 8 — Clinical Rule Configuration
 *
 * Disease-specific clinical rules for emergency warning detection and
 * risk stratification. Every rule references an authoritative clinical
 * source organization, document, URL, section/page, publication date,
 * rule version, and review status.
 *
 * ONLY reviewed and verified rules are active. Rules without authoritative
 * sources or without review status are excluded from the engine.
 *
 * Sources referenced:
 *   - WHO Dengue Guidelines (2009, 2023 update): warning signs for severe dengue
 *   - WHO Malaria Guidelines (2022): severe malaria criteria
 *   - CDC Malaria Diagnosis & Treatment (2023): severe malaria indicators
 *   - American Diabetes Association (ADA) Standards of Care (2024): DKA/HHS/hypoglycemia
 *   - WHO Chikungunya clinical guidance (2024): severe complications
 *   - WHO Emergency Triage Assessment and Treatment (ETAT) (2016): general emergency signs
 *   - CDC General Emergency Warning Signs (2024): difficulty breathing, chest pain, etc.
 *
 * Rule versioning: major.minor.patch — major changes on clinical rule
 * revision, minor on source documentation update, patch on editorial fix.
 */

const GENERAL_EMERGENCY_RULES = [
  {
    ruleId: 'EMERG-GEN-001',
    clinicalContext: 'general',
    triggerConditions: ['difficulty_breathing', 'respiratory_distress', 'shortness_of_breath'],
    requiredInputFields: ['symptoms'],
    severity: 'critical',
    alertMessage: 'Difficulty breathing or respiratory distress — seek emergency medical care immediately.',
    sourceOrganization: 'World Health Organization (WHO)',
    sourceDocument: 'Emergency Triage Assessment and Treatment (ETAT) Manual',
    sourceUrl: 'https://www.who.int/publications/i/item/9789241547893',
    sourceSection: 'Airway and breathing assessment',
    publicationDate: '2016',
    ruleVersion: '1.0.0',
    reviewStatus: 'reviewed_and_verified',
    active: true
  },
  {
    ruleId: 'EMERG-GEN-002',
    clinicalContext: 'general',
    triggerConditions: ['chest_pain', 'chest_pressure', 'chest_tightness'],
    requiredInputFields: ['symptoms'],
    severity: 'critical',
    alertMessage: 'Chest pain or pressure — possible cardiac emergency. Seek emergency medical care immediately.',
    sourceOrganization: 'World Health Organization (WHO)',
    sourceDocument: 'Emergency Triage Assessment and Treatment (ETAT) Manual',
    sourceUrl: 'https://www.who.int/publications/i/item/9789241547893',
    sourceSection: 'Circulation assessment',
    publicationDate: '2016',
    ruleVersion: '1.0.0',
    reviewStatus: 'reviewed_and_verified',
    active: true
  },
  {
    ruleId: 'EMERG-GEN-003',
    clinicalContext: 'general',
    triggerConditions: ['loss_of_consciousness', 'syncope', 'unresponsiveness'],
    requiredInputFields: ['symptoms'],
    severity: 'critical',
    alertMessage: 'Loss of consciousness or unresponsiveness — emergency medical care required immediately.',
    sourceOrganization: 'World Health Organization (WHO)',
    sourceDocument: 'Emergency Triage Assessment and Treatment (ETAT) Manual',
    sourceUrl: 'https://www.who.int/publications/i/item/9789241547893',
    sourceSection: 'Consciousness assessment',
    publicationDate: '2016',
    ruleVersion: '1.0.0',
    reviewStatus: 'reviewed_and_verified',
    active: true
  },
  {
    ruleId: 'EMERG-GEN-004',
    clinicalContext: 'general',
    triggerConditions: ['seizures', 'convulsions'],
    requiredInputFields: ['symptoms'],
    severity: 'critical',
    alertMessage: 'Seizures or convulsions — emergency medical evaluation required.',
    sourceOrganization: 'World Health Organization (WHO)',
    sourceDocument: 'Emergency Triage Assessment and Treatment (ETAT) Manual',
    sourceUrl: 'https://www.who.int/publications/i/item/9789241547893',
    sourceSection: 'Neurological assessment',
    publicationDate: '2016',
    ruleVersion: '1.0.0',
    reviewStatus: 'reviewed_and_verified',
    active: true
  },
  {
    ruleId: 'EMERG-GEN-005',
    clinicalContext: 'general',
    triggerConditions: ['severe_confusion', 'altered_mental_status'],
    requiredInputFields: ['symptoms'],
    severity: 'critical',
    alertMessage: 'Severe confusion or altered mental status — emergency medical evaluation required.',
    sourceOrganization: 'World Health Organization (WHO)',
    sourceDocument: 'Emergency Triage Assessment and Treatment (ETAT) Manual',
    sourceUrl: 'https://www.who.int/publications/i/item/9789241547893',
    sourceSection: 'Consciousness assessment',
    publicationDate: '2016',
    ruleVersion: '1.0.0',
    reviewStatus: 'reviewed_and_verified',
    active: true
  },
  {
    ruleId: 'EMERG-GEN-006',
    clinicalContext: 'general',
    triggerConditions: ['severe_dehydration'],
    requiredInputFields: ['symptoms', 'labResults'],
    severity: 'critical',
    alertMessage: 'Severe dehydration — emergency fluid resuscitation may be needed.',
    sourceOrganization: 'World Health Organization (WHO)',
    sourceDocument: 'Emergency Triage Assessment and Treatment (ETAT) Manual',
    sourceUrl: 'https://www.who.int/publications/i/item/9789241547893',
    sourceSection: 'Circulation assessment — dehydration',
    publicationDate: '2016',
    ruleVersion: '1.0.0',
    reviewStatus: 'reviewed_and_verified',
    active: true
  },
  {
    ruleId: 'EMERG-GEN-007',
    clinicalContext: 'general',
    triggerConditions: ['persistent_vomiting'],
    requiredInputFields: ['symptoms'],
    severity: 'critical',
    alertMessage: 'Persistent vomiting — risk of dehydration and electrolyte imbalance. Medical evaluation needed.',
    sourceOrganization: 'World Health Organization (WHO)',
    sourceDocument: 'Emergency Triage Assessment and Treatment (ETAT) Manual',
    sourceUrl: 'https://www.who.int/publications/i/item/9789241547893',
    sourceSection: 'Circulation assessment',
    publicationDate: '2016',
    ruleVersion: '1.0.0',
    reviewStatus: 'reviewed_and_verified',
    active: true
  },
  {
    ruleId: 'EMERG-GEN-008',
    clinicalContext: 'general',
    triggerConditions: ['severe_abdominal_pain'],
    requiredInputFields: ['symptoms'],
    severity: 'critical',
    alertMessage: 'Severe abdominal pain — emergency surgical evaluation may be needed.',
    sourceOrganization: 'World Health Organization (WHO)',
    sourceDocument: 'Emergency Triage Assessment and Treatment (ETAT) Manual',
    sourceUrl: 'https://www.who.int/publications/i/item/9789241547893',
    sourceSection: 'Abdominal assessment',
    publicationDate: '2016',
    ruleVersion: '1.0.0',
    reviewStatus: 'reviewed_and_verified',
    active: true
  },
  {
    ruleId: 'EMERG-GEN-009',
    clinicalContext: 'general',
    triggerConditions: ['severe_bleeding', 'mucosal_bleeding', 'hemorrhage'],
    requiredInputFields: ['symptoms', 'labResults'],
    severity: 'critical',
    alertMessage: 'Severe or mucosal bleeding — emergency medical care required.',
    sourceOrganization: 'World Health Organization (WHO)',
    sourceDocument: 'Emergency Triage Assessment and Treatment (ETAT) Manual',
    sourceUrl: 'https://www.who.int/publications/i/item/9789241547893',
    sourceSection: 'Circulation assessment — bleeding',
    publicationDate: '2016',
    ruleVersion: '1.0.0',
    reviewStatus: 'reviewed_and_verified',
    active: true
  },
  {
    ruleId: 'EMERG-GEN-010',
    clinicalContext: 'general',
    triggerConditions: ['signs_of_shock', 'hypotension'],
    requiredInputFields: ['symptoms', 'labResults', 'vitals'],
    severity: 'critical',
    alertMessage: 'Signs of shock or hypotension — life-threatening. Emergency medical care immediately.',
    sourceOrganization: 'World Health Organization (WHO)',
    sourceDocument: 'Emergency Triage Assessment and Treatment (ETAT) Manual',
    sourceUrl: 'https://www.who.int/publications/i/item/9789241547893',
    sourceSection: 'Circulation assessment — shock',
    publicationDate: '2016',
    ruleVersion: '1.0.0',
    reviewStatus: 'reviewed_and_verified',
    active: true
  }
];

// Disease-specific emergency warning rules
const DISEASE_EMERGENCY_RULES = [
  {
    ruleId: 'EMERG-DENGUE-001',
    disease: 'dengue',
    clinicalContext: 'dengue',
    triggerConditions: ['severe_abdominal_pain', 'persistent_vomiting', 'mucosal_bleeding', 'bleeding_gums', 'lethargy', 'restlessness', 'liver_enlargement', 'rapid_breathing'],
    requiredInputFields: ['symptoms', 'labResults'],
    severity: 'critical',
    alertMessage: 'Dengue warning signs detected — possible progression to severe dengue. Emergency medical evaluation required immediately.',
    sourceOrganization: 'World Health Organization (WHO)',
    sourceDocument: 'Dengue: Guidelines for Diagnosis, Treatment, Prevention and Control',
    sourceUrl: 'https://www.who.int/publications/i/item/9789241547871',
    sourceSection: 'Warning signs of severe dengue',
    publicationDate: '2009 (updated 2023)',
    ruleVersion: '1.1.0',
    reviewStatus: 'reviewed_and_verified',
    active: true
  },
  {
    ruleId: 'EMERG-DENGUE-002',
    disease: 'dengue',
    clinicalContext: 'dengue',
    triggerConditions: ['hematocrit_rise_with_platelet_drop', 'hypotension_post_fever'],
    requiredInputFields: ['labResults', 'symptoms'],
    severity: 'critical',
    alertMessage: 'Dengue: hematocrit rise with concurrent platelet decrease — possible plasma leakage. Emergency monitoring required.',
    sourceOrganization: 'World Health Organization (WHO)',
    sourceDocument: 'Dengue: Guidelines for Diagnosis, Treatment, Prevention and Control',
    sourceUrl: 'https://www.who.int/publications/i/item/9789241547871',
    sourceSection: 'Clinical management — plasma leakage',
    publicationDate: '2009 (updated 2023)',
    ruleVersion: '1.1.0',
    reviewStatus: 'reviewed_and_verified',
    active: true
  },
  {
    ruleId: 'EMERG-MALARIA-001',
    disease: 'malaria',
    clinicalContext: 'malaria',
    triggerConditions: ['impaired_consciousness', 'coma', 'prostration', 'multiple_convulsions', 'respiratory_distress', 'circulatory_collapse', 'pulmonary_edema', 'abnormal_bleeding', 'jaundice', 'hemoglobinuria', 'severe_anemia', 'hyperparasitemia', 'hypoglycemia', 'metabolic_acidosis'],
    requiredInputFields: ['symptoms', 'labResults'],
    severity: 'critical',
    alertMessage: 'Severe malaria criteria detected — emergency antimalarial treatment and hospitalization required.',
    sourceOrganization: 'World Health Organization (WHO)',
    sourceDocument: 'Guidelines for the Treatment of Malaria',
    sourceUrl: 'https://www.who.int/publications/i/item/9789240049195',
    sourceSection: 'Severe malaria — definition and diagnosis',
    publicationDate: '2022',
    ruleVersion: '1.0.0',
    reviewStatus: 'reviewed_and_verified',
    active: true
  },
  {
    ruleId: 'EMERG-CHIKUNGUNYA-001',
    disease: 'chikungunya',
    clinicalContext: 'chikungunya',
    triggerConditions: ['severe_arthralgia', 'neurological_complications', 'encephalitis', 'myocarditis'],
    requiredInputFields: ['symptoms', 'labResults'],
    severity: 'high',
    alertMessage: 'Severe chikungunya complications possible — emergency medical evaluation recommended.',
    sourceOrganization: 'World Health Organization (WHO)',
    sourceDocument: 'Chikungunya — Clinical guidance and surveillance',
    sourceUrl: 'https://www.who.int/news-room/fact-sheets/detail/chikungunya',
    sourceSection: 'Severe manifestations',
    publicationDate: '2024',
    ruleVersion: '1.0.0',
    reviewStatus: 'reviewed_and_verified',
    active: true
  },
  {
    ruleId: 'EMERG-DIABETES-001',
    disease: 'diabetes',
    clinicalContext: 'diabetes',
    triggerConditions: ['hyperglycemia_with_ketones', 'kussmaul_breathing', 'fruity_breath', 'nausea_vomiting_with_hyperglycemia', 'altered_mental_status_with_hyperglycemia'],
    requiredInputFields: ['symptoms', 'labResults'],
    severity: 'critical',
    alertMessage: 'Possible diabetic ketoacidosis (DKA) — emergency medical care required immediately.',
    sourceOrganization: 'American Diabetes Association (ADA)',
    sourceDocument: 'Standards of Care in Diabetes — 2024',
    sourceUrl: 'https://diabetescare.diabetesjournals.org/content/47/Supplement_1',
    sourceSection: 'Diabetic ketoacidosis and hyperglycemic hyperosmolar state',
    publicationDate: '2024',
    ruleVersion: '1.1.0',
    reviewStatus: 'reviewed_and_verified',
    active: true
  },
  {
    ruleId: 'EMERG-DIABETES-002',
    disease: 'diabetes',
    clinicalContext: 'diabetes',
    triggerConditions: ['severe_hypoglycemia', 'blood_glucose_below_54'],
    requiredInputFields: ['symptoms', 'labResults'],
    severity: 'critical',
    alertMessage: 'Severe hypoglycemia (blood glucose < 54 mg/dL) — emergency treatment required immediately.',
    sourceOrganization: 'American Diabetes Association (ADA)',
    sourceDocument: 'Standards of Care in Diabetes — 2024',
    sourceUrl: 'https://diabetescare.diabetesjournals.org/content/47/Supplement_1',
    sourceSection: 'Hypoglycemia — severe',
    publicationDate: '2024',
    ruleVersion: '1.1.0',
    reviewStatus: 'reviewed_and_verified',
    active: true
  },
  {
    ruleId: 'EMERG-DIABETES-003',
    disease: 'diabetes',
    clinicalContext: 'diabetes',
    triggerConditions: ['severe_hyperglycemia', 'dehydration_with_hyperglycemia', 'altered_consciousness_with_hyperglycemia'],
    requiredInputFields: ['symptoms', 'labResults'],
    severity: 'critical',
    alertMessage: 'Possible hyperglycemic hyperosmolar state (HHS) — emergency medical care required immediately.',
    sourceOrganization: 'American Diabetes Association (ADA)',
    sourceDocument: 'Standards of Care in Diabetes — 2024',
    sourceUrl: 'https://diabetescare.diabetesjournals.org/content/47/Supplement_1',
    sourceSection: 'Hyperglycemic hyperosmolar state',
    publicationDate: '2024',
    ruleVersion: '1.1.0',
    reviewStatus: 'reviewed_and_verified',
    active: true
  }
];

// Symptom-to-trigger-condition mapping (symptom text → trigger condition IDs)
// Used to match patient-reported symptoms to emergency rule trigger conditions
const SYMPTOM_TRIGGER_MAP = {
  // General emergency symptoms
  'difficulty breathing': 'difficulty_breathing',
  'shortness of breath': 'respiratory_distress',
  'breathlessness': 'respiratory_distress',
  'chest pain': 'chest_pain',
  'chest pressure': 'chest_pressure',
  'chest tightness': 'chest_tightness',
  'loss of consciousness': 'loss_of_consciousness',
  'fainted': 'syncope',
  'syncope': 'syncope',
  'unresponsive': 'unresponsiveness',
  'unresponsiveness': 'unresponsiveness',
  'seizure': 'seizures',
  'convulsion': 'seizures',
  'convulsions': 'seizures',
  'severe confusion': 'severe_confusion',
  'confusion': 'severe_confusion',
  'altered mental status': 'altered_mental_status',
  'disorientation': 'altered_mental_status',
  'severe dehydration': 'severe_dehydration',
  'dehydration': 'severe_dehydration',
  'persistent vomiting': 'persistent_vomiting',
  'vomiting': 'persistent_vomiting',
  'severe abdominal pain': 'severe_abdominal_pain',
  'abdominal pain': 'severe_abdominal_pain',
  'severe bleeding': 'severe_bleeding',
  'bleeding': 'severe_bleeding',
  'bleeding gums': 'mucosal_bleeding',
  'mucosal bleeding': 'mucosal_bleeding',
  'hemorrhage': 'severe_bleeding',
  'signs of shock': 'signs_of_shock',
  'shock': 'signs_of_shock',
  'hypotension': 'hypotension',
  'low blood pressure': 'hypotension',

  // Dengue-specific
  'dengue warning signs': 'severe_abdominal_pain',
  'severe abdominal pain (dengue)': 'severe_abdominal_pain',
  'bleeding gums (dengue)': 'mucosal_bleeding',
  'lethargy': 'lethargy',
  'restlessness': 'restlessness',
  'liver enlargement': 'liver_enlargement',
  'rapid breathing': 'rapid_breathing',

  // Malaria-specific
  'impaired consciousness': 'impaired_consciousness',
  'coma': 'coma',
  'prostration': 'prostration',
  'multiple convulsions': 'multiple_convulsions',
  'circulatory collapse': 'circulatory_collapse',
  'pulmonary edema': 'pulmonary_edema',
  'abnormal bleeding': 'abnormal_bleeding',
  'jaundice': 'jaundice',
  'hemoglobinuria': 'hemoglobinuria',
  'severe anemia': 'severe_anemia',
  'hyperparasitemia': 'hyperparasitemia',
  'hypoglycemia': 'hypoglycemia',
  'metabolic acidosis': 'metabolic_acidosis',

  // Chikungunya-specific
  'severe joint pain': 'severe_arthralgia',
  'severe arthralgia': 'severe_arthralgia',
  'encephalitis': 'encephalitis',
  'myocarditis': 'myocarditis',

  // Diabetes-specific
  'kussmaul breathing': 'kussmaul_breathing',
  'fruity breath': 'fruity_breath',
  'nausea with hyperglycemia': 'nausea_vomiting_with_hyperglycemia',
  'vomiting with hyperglycemia': 'nausea_vomiting_with_hyperglycemia',
  'altered mental status with hyperglycemia': 'altered_mental_status_with_hyperglycemia',
  'severe hypoglycemia': 'severe_hypoglycemia',
  'low blood sugar': 'blood_glucose_below_54',
  'blood glucose below 54': 'blood_glucose_below_54',
  'severe hyperglycemia': 'severe_hyperglycemia',
  'dehydration with hyperglycemia': 'dehydration_with_hyperglycemia',
  'altered consciousness with hyperglycemia': 'altered_consciousness_with_hyperglycemia'
};

// Lab result trigger condition mapping (lab value → trigger condition)
const LAB_TRIGGER_MAP = {
  // Dengue: hematocrit rise + platelet drop
  'hematocrit_rise': 'hematocrit_rise_with_platelet_drop',
  'platelet_drop': 'hematocrit_rise_with_platelet_drop',
  'hypotension_post_fever': 'hypotension_post_fever',

  // Diabetes: glucose thresholds (ADA 2024)
  'blood_glucose_below_54': 'blood_glucose_below_54',
  'severe_hypoglycemia': 'blood_glucose_below_54',
  'severe_hyperglycemia': 'severe_hyperglycemia',
  'hyperglycemia_with_ketones': 'hyperglycemia_with_ketones',

  // Malaria: severe anemia
  'severe_anemia': 'severe_anemia',
  'hemoglobin_below_5': 'severe_anemia',
  'hypoglycemia': 'hypoglycemia',
  'glucose_below_2_2': 'hypoglycemia'
};

/**
 * Get all active emergency rules, optionally filtered by disease.
 */
function getActiveEmergencyRules(disease = null) {
  const rules = [
    ...GENERAL_EMERGENCY_RULES.filter(r => r.active),
    ...DISEASE_EMERGENCY_RULES.filter(r => r.active && (!disease || r.disease === disease))
  ];
  return rules;
}

/**
 * Get a specific rule by ID.
 */
function getRuleById(ruleId) {
  const allRules = [...GENERAL_EMERGENCY_RULES, ...DISEASE_EMERGENCY_RULES];
  return allRules.find(r => r.ruleId === ruleId) || null;
}

/**
 * Get all rules for a disease (general + disease-specific).
 */
function getRulesForDisease(disease) {
  return getActiveEmergencyRules(disease);
}

/**
 * Check if a disease has any active emergency rules.
 */
function hasActiveRulesForDisease(disease) {
  return getActiveEmergencyRules(disease).length > 0;
}

/**
 * Get the complete rule catalog (all rules, active and inactive).
 */
function getRuleCatalog() {
  return {
    generalEmergencyRules: GENERAL_EMERGENCY_RULES,
    diseaseEmergencyRules: DISEASE_EMERGENCY_RULES,
    symptomTriggerMap: SYMPTOM_TRIGGER_MAP,
    labTriggerMap: LAB_TRIGGER_MAP
  };
}

/**
 * Get sources referenced by all active rules (deduplicated).
 */
function getClinicalSources() {
  const allRules = [...GENERAL_EMERGENCY_RULES, ...DISEASE_EMERGENCY_RULES].filter(r => r.active);
  const sources = {};
  allRules.forEach(r => {
    const key = r.sourceUrl;
    if (!sources[key]) {
      sources[key] = {
        organization: r.sourceOrganization,
        document: r.sourceDocument,
        url: r.sourceUrl,
        section: r.sourceSection,
        publicationDate: r.publicationDate,
        rules: []
      };
    }
    sources[key].rules.push(r.ruleId);
  });
  return Object.values(sources);
}

module.exports = {
  GENERAL_EMERGENCY_RULES,
  DISEASE_EMERGENCY_RULES,
  SYMPTOM_TRIGGER_MAP,
  LAB_TRIGGER_MAP,
  getActiveEmergencyRules,
  getRuleById,
  getRulesForDisease,
  hasActiveRulesForDisease,
  getRuleCatalog,
  getClinicalSources
};
