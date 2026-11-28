'use strict';

/**
 * MediAgent — Centralized, Versioned Clinical Laboratory Parameter Ontology
 *
 * This module provides a single source of truth for laboratory parameter
 * canonical identifiers, synonyms, units, conversions, validation constraints,
 * and disease-model associations.
 *
 * DESIGN PRINCIPLES (per Enhancement E3):
 * - Parameters are extraction targets, NOT automatically approved ML features.
 *   Mapping into a model requires the model's validated feature schema to permit it.
 * - Synonym matching must not conflate distinct clinical parameters
 *   (e.g. hemoglobin vs hematocrit, systolic vs diastolic, fasting vs random glucose).
 * - Ambiguous matches are flagged for user verification.
 * - Versioned so changes are auditable.
 */

const ONTOLOGY_VERSION = '1.0.0-e3';

/**
 * Canonical laboratory parameter definitions.
 *
 * Each entry:
 *   id: stable canonical identifier
 *   displayName: human-readable label
 *   synonyms: accepted names / abbreviations (exact match)
 *   ocrVariations: common OCR misspellings / spacing variants
 *   expectedUnits: array of acceptable unit strings (canonical form first)
 *   unitConversions: { fromUnit: { toUnit: factor, offset } }
 *   valueType: 'numeric' | 'qualitative' | 'censored'
 *   validation: { min, max, unit } physiological plausibility (null = none)
 *   diseaseModelAssociations: array of { disease, featureName } mappings
 *   ambiguousWith: array of canonical ids that must NOT be auto-equated
 */
const PARAMETERS = {
  // ---------- Diabetes & metabolic ----------
  glucose_fasting: {
    id: 'glucose_fasting',
    displayName: 'Fasting Blood Glucose',
    synonyms: ['fasting blood sugar', 'fbs', 'fasting glucose', 'plasma glucose', 'glucose (fasting)'],
    ocrVariations: ['glucos', 'glucose', 'gluc0se', 'blood sugar', 'blood sugur'],
    expectedUnits: ['mg/dL', 'mmol/L'],
    unitConversions: {
      'mg/dL': { 'mmol/L': { factor: 0.0555, offset: 0 } },
      'mmol/L': { 'mg/dL': { factor: 18.0, offset: 0 } }
    },
    valueType: 'numeric',
    validation: { min: 20, max: 600, unit: 'mg/dL' },
    diseaseModelAssociations: [{ disease: 'diabetes', featureName: 'plas' }],
    ambiguousWith: ['glucose_random', 'glucose_pp', 'hba1c']
  },
  glucose_random: {
    id: 'glucose_random',
    displayName: 'Random Blood Glucose',
    synonyms: ['random blood sugar', 'random blood glucose', 'rbs', 'random glucose', 'random blood sugar level'],
    ocrVariations: ['random glucos', 'rbs sugar', 'random blood glucose', 'random blood suger'],
    expectedUnits: ['mg/dL', 'mmol/L'],
    unitConversions: {
      'mg/dL': { 'mmol/L': { factor: 0.0555, offset: 0 } },
      'mmol/L': { 'mg/dL': { factor: 18.0, offset: 0 } }
    },
    valueType: 'numeric',
    validation: { min: 20, max: 600, unit: 'mg/dL' },
    diseaseModelAssociations: [],
    ambiguousWith: ['glucose_fasting', 'glucose_pp', 'hba1c']
  },
  glucose_pp: {
    id: 'glucose_pp',
    displayName: 'Postprandial Blood Glucose',
    synonyms: ['ppbs', 'postprandial blood sugar', '2-hour postprandial glucose', 'glucose (2h pp)'],
    ocrVariations: ['ppbs sugar', 'post prandial'],
    expectedUnits: ['mg/dL', 'mmol/L'],
    unitConversions: {
      'mg/dL': { 'mmol/L': { factor: 0.0555, offset: 0 } },
      'mmol/L': { 'mg/dL': { factor: 18.0, offset: 0 } }
    },
    valueType: 'numeric',
    validation: { min: 20, max: 600, unit: 'mg/dL' },
    diseaseModelAssociations: [],
    ambiguousWith: ['glucose_fasting', 'glucose_random', 'hba1c']
  },
  hba1c: {
    id: 'hba1c',
    displayName: 'Glycated Hemoglobin (HbA1c)',
    synonyms: ['hba1c', 'a1c', 'glycated hemoglobin', 'glycosylated hemoglobin', 'hb a1c'],
    ocrVariations: ['hba1c', 'hb a1c', 'a1c', 'glycated haemoglobin'],
    expectedUnits: ['%', 'mmol/mol'],
    unitConversions: {
      '%': { 'mmol/mol': { factor: 10.93, offset: 23.9 } },
      'mmol/mol': { '%': { factor: 0.0915, offset: -2.19 } }
    },
    valueType: 'numeric',
    validation: { min: 3.0, max: 20.0, unit: '%' },
    diseaseModelAssociations: [],
    ambiguousWith: ['glucose_fasting', 'glucose_random', 'glucose_pp']
  },
  insulin: {
    id: 'insulin',
    displayName: '2-Hour Serum Insulin',
    synonyms: ['insulin', 'serum insulin', 'fasting insulin', '2-hour insulin', '2-hour serum insulin', 'serum insulin (2 hour)'],
    ocrVariations: ['insulin', 'insuln', 'serum insulin', '2-hour serum insulin'],
    expectedUnits: ['uU/mL', 'µU/mL', 'mIU/L'],
    unitConversions: {
      'uU/mL': { 'µU/mL': { factor: 1.0, offset: 0 }, 'mIU/L': { factor: 1.0, offset: 0 } },
      'µU/mL': { 'uU/mL': { factor: 1.0, offset: 0 }, 'mIU/L': { factor: 1.0, offset: 0 } },
      'mIU/L': { 'uU/mL': { factor: 1.0, offset: 0 }, 'µU/mL': { factor: 1.0, offset: 0 } }
    },
    valueType: 'numeric',
    validation: { min: 5, max: 900, unit: 'uU/mL' },
    diseaseModelAssociations: [{ disease: 'diabetes', featureName: 'insu' }],
    ambiguousWith: []
  },
  bmi: {
    id: 'bmi',
    displayName: 'Body Mass Index (BMI)',
    synonyms: ['bmi', 'body mass index'],
    ocrVariations: ['bmi', 'body mass index', 'bmi (kg/m2)'],
    expectedUnits: ['kg/m²', 'kg/m2'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 10, max: 70, unit: 'kg/m²' },
    diseaseModelAssociations: [{ disease: 'diabetes', featureName: 'mass' }],
    ambiguousWith: []
  },
  pregnancies: {
    id: 'pregnancies',
    displayName: 'Pregnancies (Count)',
    synonyms: ['pregnancies', 'pregnancy count', 'no. of pregnancies'],
    ocrVariations: ['pregnancies', 'pregnancy', 'preg'],
    expectedUnits: ['count'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 0, max: 20, unit: 'count' },
    diseaseModelAssociations: [{ disease: 'diabetes', featureName: 'preg' }],
    ambiguousWith: []
  },
  diastolic_bp: {
    id: 'diastolic_bp',
    displayName: 'Diastolic Blood Pressure',
    synonyms: ['diastolic blood pressure', 'diastolic bp', 'dbp', 'pres'],
    ocrVariations: ['diastolic', 'dbp', 'diastolic bp', 'pres'],
    expectedUnits: ['mmHg'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 40, max: 160, unit: 'mmHg' },
    diseaseModelAssociations: [{ disease: 'diabetes', featureName: 'pres' }],
    ambiguousWith: ['systolic_bp']
  },
  systolic_bp: {
    id: 'systolic_bp',
    displayName: 'Systolic Blood Pressure',
    synonyms: ['systolic blood pressure', 'systolic bp', 'sbp'],
    ocrVariations: ['systolic', 'sbp', 'systolic bp'],
    expectedUnits: ['mmHg'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 70, max: 260, unit: 'mmHg' },
    diseaseModelAssociations: [],
    ambiguousWith: ['diastolic_bp']
  },
  skin_fold: {
    id: 'skin_fold',
    displayName: 'Triceps Skin Fold Thickness',
    synonyms: ['triceps skin fold', 'triceps skinfold thickness', 'triceps skin fold thickness', 'skin thickness', 'skinfold'],
    ocrVariations: ['triceps skin fold', 'skinfold', 'skin thickness', 'triceps skin fold thickness'],
    expectedUnits: ['mm'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 5, max: 99, unit: 'mm' },
    diseaseModelAssociations: [{ disease: 'diabetes', featureName: 'skin' }],
    ambiguousWith: []
  },
  pedigree: {
    id: 'pedigree',
    displayName: 'Diabetes Pedigree Function',
    synonyms: ['diabetes pedigree', 'pedigree', 'diabetes pedigree function'],
    ocrVariations: ['pedigree', 'diabetes pedigree', 'pedi'],
    expectedUnits: ['score'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 0.05, max: 3.0, unit: 'score' },
    diseaseModelAssociations: [{ disease: 'diabetes', featureName: 'pedi' }],
    ambiguousWith: []
  },
  age: {
    id: 'age',
    displayName: 'Age',
    synonyms: ['age', 'patient age'],
    ocrVariations: ['age', 'patient age'],
    expectedUnits: ['years'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 1, max: 120, unit: 'years' },
    diseaseModelAssociations: [{ disease: 'diabetes', featureName: 'age' }],
    ambiguousWith: []
  },

  // ---------- Hematology ----------
  hemoglobin: {
    id: 'hemoglobin',
    displayName: 'Hemoglobin',
    synonyms: ['hemoglobin', 'hb', 'hgb'],
    ocrVariations: ['hemoglobin', 'hb', 'hgb', 'fmwoclosm'],
    expectedUnits: ['g/dL', 'g/L'],
    unitConversions: {
      'g/dL': { 'g/L': { factor: 10.0, offset: 0 } },
      'g/L': { 'g/dL': { factor: 0.1, offset: 0 } }
    },
    valueType: 'numeric',
    validation: { min: 3, max: 25, unit: 'g/dL' },
    diseaseModelAssociations: [],
    ambiguousWith: ['hematocrit']
  },
  hematocrit: {
    id: 'hematocrit',
    displayName: 'Hematocrit (Packed Cell Volume)',
    synonyms: ['hematocrit', 'hct', 'pcv', 'packed cell volume'],
    ocrVariations: ['hematocrit', 'hct', 'pcv'],
    expectedUnits: ['%'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 10, max: 60, unit: '%' },
    diseaseModelAssociations: [],
    ambiguousWith: ['hemoglobin']
  },
  wbc: {
    id: 'wbc',
    displayName: 'White Blood Cell Count',
    synonyms: ['wbc', 'wbc count', 'total leukocyte count', 'tlc', 'white blood cell', 'white blood cell count'],
    ocrVariations: ['wbc', 'tlc', 'total count', 'white blood cell count'],
    expectedUnits: ['cells/µL', 'cells/uL', 'thousand/µL', '×10³/µL'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 500, max: 100000, unit: 'cells/µL' },
    diseaseModelAssociations: [],
    ambiguousWith: ['rbc', 'platelets']
  },
  rbc: {
    id: 'rbc',
    displayName: 'Red Blood Cell Count',
    synonyms: ['rbc', 'red blood cell', 'red blood cells', 'red blood cell count'],
    ocrVariations: ['rbc', 'rbc count', 'red blood cell count'],
    expectedUnits: ['million/µL'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 1.0, max: 8.0, unit: 'million/µL' },
    diseaseModelAssociations: [],
    ambiguousWith: ['wbc', 'platelets']
  },
  platelets: {
    id: 'platelets',
    displayName: 'Platelet Count',
    synonyms: ['platelets', 'platelet count', 'plt', 'thrombocyte count'],
    ocrVariations: ['platelets', 'plt', 'platelet count', 'pratelet count'],
    expectedUnits: ['lakhs/µL', 'cells/µL', '×10⁹/L'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 10, max: 1000, unit: 'lakhs/µL' },
    diseaseModelAssociations: [],
    ambiguousWith: ['wbc', 'rbc']
  },
  mcv: {
    id: 'mcv',
    displayName: 'Mean Corpuscular Volume',
    synonyms: ['mcv', 'mean corpuscular volume'],
    ocrVariations: ['mcv'],
    expectedUnits: ['fL'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 50, max: 120, unit: 'fL' },
    diseaseModelAssociations: [],
    ambiguousWith: []
  },
  mch: {
    id: 'mch',
    displayName: 'Mean Corpuscular Hemoglobin',
    synonyms: ['mch', 'mean corpuscular hemoglobin'],
    ocrVariations: ['mch'],
    expectedUnits: ['pg'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 15, max: 40, unit: 'pg' },
    diseaseModelAssociations: [],
    ambiguousWith: []
  },
  mchc: {
    id: 'mchc',
    displayName: 'Mean Corpuscular Hemoglobin Concentration',
    synonyms: ['mchc', 'mean corpuscular hemoglobin concentration'],
    ocrVariations: ['mchc'],
    expectedUnits: ['g/dL'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 20, max: 40, unit: 'g/dL' },
    diseaseModelAssociations: [],
    ambiguousWith: []
  },
  rdw: {
    id: 'rdw',
    displayName: 'Red Cell Distribution Width',
    synonyms: ['rdw', 'rdw-cv', 'red cell distribution width'],
    ocrVariations: ['rdw'],
    expectedUnits: ['%'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 10, max: 60, unit: '%' },
    diseaseModelAssociations: [],
    ambiguousWith: []
  },

  // ---------- Liver function ----------
  alt: {
    id: 'alt',
    displayName: 'Alanine Aminotransferase',
    synonyms: ['alt', 'sgpt', 'gpt', 'alanine aminotransferase'],
    ocrVariations: ['alt', 'sgpt', 'alanine aminotransferase'],
    expectedUnits: ['U/L', 'IU/L'],
    unitConversions: {
      'U/L': { 'IU/L': { factor: 1.0, offset: 0 } },
      'IU/L': { 'U/L': { factor: 1.0, offset: 0 } }
    },
    valueType: 'numeric',
    validation: { min: 1, max: 2000, unit: 'U/L' },
    diseaseModelAssociations: [],
    ambiguousWith: ['ast']
  },
  ast: {
    id: 'ast',
    displayName: 'Aspartate Aminotransferase',
    synonyms: ['ast', 'sgot', 'got', 'aspartate aminotransferase'],
    ocrVariations: ['ast', 'sgot', 'aspartate aminotransferase'],
    expectedUnits: ['U/L', 'IU/L'],
    unitConversions: {
      'U/L': { 'IU/L': { factor: 1.0, offset: 0 } },
      'IU/L': { 'U/L': { factor: 1.0, offset: 0 } }
    },
    valueType: 'numeric',
    validation: { min: 1, max: 2000, unit: 'U/L' },
    diseaseModelAssociations: [],
    ambiguousWith: ['alt']
  },
  alp: {
    id: 'alp',
    displayName: 'Alkaline Phosphatase',
    synonyms: ['alp', 'alkaline phosphatase'],
    ocrVariations: ['alp', 'alkaline phosphatase'],
    expectedUnits: ['U/L', 'IU/L'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 20, max: 500, unit: 'U/L' },
    diseaseModelAssociations: [],
    ambiguousWith: []
  },
  total_bilirubin: {
    id: 'total_bilirubin',
    displayName: 'Total Bilirubin',
    synonyms: ['total bilirubin', 'bilirubin', 'tbili'],
    ocrVariations: ['bilirubin', 'total bilirubin', 'tbili'],
    expectedUnits: ['mg/dL', 'µmol/L'],
    unitConversions: {
      'mg/dL': { 'µmol/L': { factor: 17.1, offset: 0 } },
      'µmol/L': { 'mg/dL': { factor: 0.0585, offset: 0 } }
    },
    valueType: 'numeric',
    validation: { min: 0.1, max: 30, unit: 'mg/dL' },
    diseaseModelAssociations: [],
    ambiguousWith: ['direct_bilirubin', 'indirect_bilirubin']
  },
  direct_bilirubin: {
    id: 'direct_bilirubin',
    displayName: 'Direct Bilirubin',
    synonyms: ['direct bilirubin', 'conjugated bilirubin', 'dbili'],
    ocrVariations: ['direct bilirubin', 'dbili'],
    expectedUnits: ['mg/dL', 'µmol/L'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 0.0, max: 10, unit: 'mg/dL' },
    diseaseModelAssociations: [],
    ambiguousWith: ['total_bilirubin', 'indirect_bilirubin']
  },
  albumin: {
    id: 'albumin',
    displayName: 'Albumin',
    synonyms: ['albumin', 'alb'],
    ocrVariations: ['albumin', 'alb'],
    expectedUnits: ['g/dL', 'g/L'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 1.0, max: 6.0, unit: 'g/dL' },
    diseaseModelAssociations: [],
    ambiguousWith: []
  },
  total_protein: {
    id: 'total_protein',
    displayName: 'Total Protein',
    synonyms: ['total protein', 'tp'],
    ocrVariations: ['total protein', 'tp'],
    expectedUnits: ['g/dL', 'g/L'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 3.0, max: 10.0, unit: 'g/dL' },
    diseaseModelAssociations: [],
    ambiguousWith: []
  },

  // ---------- Kidney function ----------
  creatinine: {
    id: 'creatinine',
    displayName: 'Serum Creatinine',
    synonyms: ['creatinine', 'serum creatinine', 'creat'],
    ocrVariations: ['creatinine', 'serum creatinine', 'creat'],
    expectedUnits: ['mg/dL', 'µmol/L'],
    unitConversions: {
      'mg/dL': { 'µmol/L': { factor: 88.4, offset: 0 } },
      'µmol/L': { 'mg/dL': { factor: 0.0113, offset: 0 } }
    },
    valueType: 'numeric',
    validation: { min: 0.1, max: 20, unit: 'mg/dL' },
    diseaseModelAssociations: [],
    ambiguousWith: []
  },
  bun: {
    id: 'bun',
    displayName: 'Blood Urea Nitrogen',
    synonyms: ['bun', 'blood urea nitrogen', 'urea nitrogen'],
    ocrVariations: ['bun', 'urea nitrogen'],
    expectedUnits: ['mg/dL', 'mmol/L'],
    unitConversions: {
      'mg/dL': { 'mmol/L': { factor: 0.357, offset: 0 } },
      'mmol/L': { 'mg/dL': { factor: 2.8, offset: 0 } }
    },
    valueType: 'numeric',
    validation: { min: 1, max: 100, unit: 'mg/dL' },
    diseaseModelAssociations: [],
    ambiguousWith: []
  },
  egfr: {
    id: 'egfr',
    displayName: 'Estimated Glomerular Filtration Rate',
    synonyms: ['egfr', 'gfr', 'estimated glomerular filtration rate'],
    ocrVariations: ['egfr', 'gfr'],
    expectedUnits: ['mL/min', 'ml/min/1.73m²'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 5, max: 200, unit: 'mL/min' },
    diseaseModelAssociations: [],
    ambiguousWith: []
  },
  uric_acid: {
    id: 'uric_acid',
    displayName: 'Uric Acid',
    synonyms: ['uric acid', 'ua'],
    ocrVariations: ['uric acid', 'ua'],
    expectedUnits: ['mg/dL', 'µmol/L'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 1, max: 20, unit: 'mg/dL' },
    diseaseModelAssociations: [],
    ambiguousWith: []
  },

  // ---------- Lipid profile ----------
  total_cholesterol: {
    id: 'total_cholesterol',
    displayName: 'Total Cholesterol',
    synonyms: ['total cholesterol', 'cholesterol', 'tc'],
    ocrVariations: ['total cholesterol', 'cholesterol', 'tc'],
    expectedUnits: ['mg/dL', 'mmol/L'],
    unitConversions: {
      'mg/dL': { 'mmol/L': { factor: 0.0259, offset: 0 } },
      'mmol/L': { 'mg/dL': { factor: 38.6, offset: 0 } }
    },
    valueType: 'numeric',
    validation: { min: 50, max: 600, unit: 'mg/dL' },
    diseaseModelAssociations: [],
    ambiguousWith: ['hdl_cholesterol', 'ldl_cholesterol']
  },
  hdl_cholesterol: {
    id: 'hdl_cholesterol',
    displayName: 'HDL Cholesterol',
    synonyms: ['hdl', 'hdl cholesterol', 'high-density lipoprotein'],
    ocrVariations: ['hdl', 'hdl cholesterol'],
    expectedUnits: ['mg/dL', 'mmol/L'],
    unitConversions: {
      'mg/dL': { 'mmol/L': { factor: 0.0259, offset: 0 } },
      'mmol/L': { 'mg/dL': { factor: 38.6, offset: 0 } }
    },
    valueType: 'numeric',
    validation: { min: 10, max: 150, unit: 'mg/dL' },
    diseaseModelAssociations: [],
    ambiguousWith: ['total_cholesterol', 'ldl_cholesterol']
  },
  ldl_cholesterol: {
    id: 'ldl_cholesterol',
    displayName: 'LDL Cholesterol',
    synonyms: ['ldl', 'ldl cholesterol', 'low-density lipoprotein'],
    ocrVariations: ['ldl', 'ldl cholesterol'],
    expectedUnits: ['mg/dL', 'mmol/L'],
    unitConversions: {
      'mg/dL': { 'mmol/L': { factor: 0.0259, offset: 0 } },
      'mmol/L': { 'mg/dL': { factor: 38.6, offset: 0 } }
    },
    valueType: 'numeric',
    validation: { min: 20, max: 400, unit: 'mg/dL' },
    diseaseModelAssociations: [],
    ambiguousWith: ['total_cholesterol', 'hdl_cholesterol']
  },
  triglycerides: {
    id: 'triglycerides',
    displayName: 'Triglycerides',
    synonyms: ['triglycerides', 'tg', 'triacylglycerol'],
    ocrVariations: ['triglycerides', 'tg'],
    expectedUnits: ['mg/dL', 'mmol/L'],
    unitConversions: {
      'mg/dL': { 'mmol/L': { factor: 0.0113, offset: 0 } },
      'mmol/L': { 'mg/dL': { factor: 88.6, offset: 0 } }
    },
    valueType: 'numeric',
    validation: { min: 20, max: 1000, unit: 'mg/dL' },
    diseaseModelAssociations: [],
    ambiguousWith: []
  },

  // ---------- Electrolytes ----------
  sodium: {
    id: 'sodium',
    displayName: 'Serum Sodium',
    synonyms: ['sodium', 'na', 'serum sodium'],
    ocrVariations: ['sodium', 'na', 'serum sodium'],
    expectedUnits: ['mEq/L', 'mmol/L'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 100, max: 170, unit: 'mEq/L' },
    diseaseModelAssociations: [],
    ambiguousWith: []
  },
  potassium: {
    id: 'potassium',
    displayName: 'Serum Potassium',
    synonyms: ['potassium', 'k', 'serum potassium'],
    ocrVariations: ['potassium', 'k', 'sexum potassium'],
    expectedUnits: ['mEq/L', 'mmol/L'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 1.5, max: 7.0, unit: 'mEq/L' },
    diseaseModelAssociations: [],
    ambiguousWith: []
  },
  chloride: {
    id: 'chloride',
    displayName: 'Serum Chloride',
    synonyms: ['chloride', 'cl', 'serum chloride'],
    ocrVariations: ['chloride', 'cl', 'a chloride'],
    expectedUnits: ['mEq/L', 'mmol/L'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 70, max: 130, unit: 'mEq/L' },
    diseaseModelAssociations: [],
    ambiguousWith: []
  },
  calcium: {
    id: 'calcium',
    displayName: 'Serum Calcium',
    synonyms: ['calcium', 'ca', 'serum calcium'],
    ocrVariations: ['calcium', 'ca'],
    expectedUnits: ['mg/dL', 'mmol/L'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 6.0, max: 13.0, unit: 'mg/dL' },
    diseaseModelAssociations: [],
    ambiguousWith: []
  },

  // ---------- Thyroid ----------
  tsh: {
    id: 'tsh',
    displayName: 'Thyroid Stimulating Hormone',
    synonyms: ['tsh', 'thyroid stimulating hormone'],
    ocrVariations: ['tsh'],
    expectedUnits: ['µIU/mL', 'mIU/L'],
    unitConversions: {},
    valueType: 'numeric',
    validation: { min: 0.01, max: 100, unit: 'µIU/mL' },
    diseaseModelAssociations: [],
    ambiguousWith: []
  },

  // ---------- Infectious disease ----------
  dengue_ns1: {
    id: 'dengue_ns1',
    displayName: 'Dengue NS1 Antigen',
    synonyms: ['dengue ns1', 'ns1', 'ns1 antigen'],
    ocrVariations: ['dengue ns1', 'ns1'],
    expectedUnits: ['qualitative'],
    unitConversions: {},
    valueType: 'qualitative',
    validation: null,
    diseaseModelAssociations: [],
    ambiguousWith: ['dengue_igm', 'dengue_igg']
  },
  dengue_igm: {
    id: 'dengue_igm',
    displayName: 'Dengue IgM Antibody',
    synonyms: ['dengue igm', 'igm dengue', 'dengue igm antibody'],
    ocrVariations: ['dengue igm', 'igm'],
    expectedUnits: ['qualitative'],
    unitConversions: {},
    valueType: 'qualitative',
    validation: null,
    diseaseModelAssociations: [],
    ambiguousWith: ['dengue_ns1', 'dengue_igg']
  },
  malaria_antigen: {
    id: 'malaria_antigen',
    displayName: 'Malaria Antigen',
    synonyms: ['malaria antigen', 'malaria rapid test', 'malaria card test'],
    ocrVariations: ['malaria antigen', 'malaria rapid'],
    expectedUnits: ['qualitative'],
    unitConversions: {},
    valueType: 'qualitative',
    validation: null,
    diseaseModelAssociations: [],
    ambiguousWith: ['malaria_microscopy']
  },
  malaria_microscopy: {
    id: 'malaria_microscopy',
    displayName: 'Malaria Parasite Microscopy',
    synonyms: ['malaria parasite', 'malaria microscopy', 'blood smear malaria', 'mp'],
    ocrVariations: ['malaria parasite', 'mp', 'blood smear'],
    expectedUnits: ['qualitative', 'parasites/µL'],
    unitConversions: {},
    valueType: 'qualitative',
    validation: null,
    diseaseModelAssociations: [],
    ambiguousWith: ['malaria_antigen']
  },
  chikungunya_igm: {
    id: 'chikungunya_igm',
    displayName: 'Chikungunya IgM Antibody',
    synonyms: ['chikungunya igm', 'chikungunya igm antibody'],
    ocrVariations: ['chikungunya igm', 'igm chikungunya'],
    expectedUnits: ['qualitative'],
    unitConversions: {},
    valueType: 'qualitative',
    validation: null,
    diseaseModelAssociations: [],
    ambiguousWith: ['chikungunya_igg']
  },
  widal_test: {
    id: 'widal_test',
    displayName: 'Widal Test',
    synonyms: ['widal', 'widal test', 'typhidot'],
    ocrVariations: ['widal', 'widal test'],
    expectedUnits: ['qualitative', 'titer'],
    unitConversions: {},
    valueType: 'qualitative',
    validation: null,
    diseaseModelAssociations: [],
    ambiguousWith: []
  }
};

/**
 * Canonical parameter lookup by ID.
 */
function getParameter(id) {
  return PARAMETERS[id] || null;
}

/**
 * Lookup a parameter by any accepted synonym or OCR variation.
 * Returns { parameter, matchType: 'synonym'|'ocrVariation'|'exactId' } or null.
 * Does NOT perform fuzzy matching — ambiguous results are left to the caller.
 */
function resolveParameter(rawName) {
  if (!rawName || typeof rawName !== 'string') return null;
  const clean = rawName.toLowerCase().trim().replace(/\s+/g, ' ');

  for (const param of Object.values(PARAMETERS)) {
    if (param.id === clean) return { parameter: param, matchType: 'exactId' };
    for (const s of param.synonyms) {
      if (s.toLowerCase() === clean) return { parameter: param, matchType: 'synonym' };
    }
    for (const v of param.ocrVariations) {
      if (v.toLowerCase() === clean) return { parameter: param, matchType: 'ocrVariation' };
    }
  }
  return null;
}

/**
 * Check whether two canonical parameters must NOT be auto-equated.
 */
function areAmbiguous(idA, idB) {
  const a = PARAMETERS[idA];
  const b = PARAMETERS[idB];
  if (!a || !b) return false;
  return (a.ambiguousWith || []).includes(idB) || (b.ambiguousWith || []).includes(idA);
}

/**
 * Get all parameters associated with a given disease model feature.
 */
function getParametersForDisease(disease) {
  return Object.values(PARAMETERS).filter(p =>
    (p.diseaseModelAssociations || []).some(a => a.disease === disease)
  );
}

/**
 * Get ontology metadata.
 */
function getOntologyMeta() {
  return {
    version: ONTOLOGY_VERSION,
    parameterCount: Object.keys(PARAMETERS).length,
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  ONTOLOGY_VERSION,
  PARAMETERS,
  getParameter,
  resolveParameter,
  areAmbiguous,
  getParametersForDisease,
  getOntologyMeta
};
