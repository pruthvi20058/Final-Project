/**
 * MediAgent — Multi-Disease Feature Mapping & Readiness Service
 * Maps extracted laboratory parameters, clinical signs, and verified symptoms to
 * disease-specific canonical feature schemas for Diabetes, Malaria, Dengue, Typhoid, and Chikungunya.
 * NEVER forces Pima Indian Diabetes features onto non-diabetes diseases.
 */

const path = require('path');
const fs = require('fs');
const { computeModelReadiness: computePimaDiabetesReadiness, getFeatureSchema: getPimaSchema } = require('./pimaFeatureMapper');

const ML_DIR = path.join(__dirname, '..', 'ml');

// Cache for disease schemas
const cachedSchemas = {};

function getDiseaseSchema(diseaseKey) {
  const dKey = (diseaseKey || 'diabetes').toLowerCase().trim();
  if (dKey === 'diabetes') {
    return getPimaSchema();
  }

  if (cachedSchemas[dKey]) {
    return cachedSchemas[dKey];
  }

  // Try diseases/<disease>/feature_schema.json first, then models/<disease>/feature_schema.json
  const paths = [
    path.join(ML_DIR, 'diseases', dKey, 'feature_schema.json'),
    path.join(ML_DIR, 'models', dKey, 'feature_schema.json')
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
        cachedSchemas[dKey] = raw;
        return raw;
      } catch (err) {
        console.warn(`[DiseaseFeatureMapper] Failed reading schema at ${p}:`, err.message);
      }
    }
  }

  return {
    disease: dKey,
    canonical_features: []
  };
}

/**
 * Computes model readiness strictly against the selected disease's feature schema.
 * @param {Object} report - Complete report record with labResults and symptoms
 * @param {String} diseaseName - 'diabetes' | 'dengue' | 'malaria' | 'chikungunya' | 'typhoid'
 */
function computeDiseaseModelReadiness(report, diseaseName = 'diabetes') {
  const disease = (diseaseName || 'diabetes').toLowerCase().trim();

  // 1. Diabetes: Preserve 100% authoritative Pima Indians 8-feature schema
  if (disease === 'diabetes') {
    const pimaReadiness = computePimaDiabetesReadiness(report);
    pimaReadiness.disease = 'diabetes';
    pimaReadiness.diseaseDisplayName = 'Type 2 Diabetes Mellitus';
    return pimaReadiness;
  }

  // 2. Multi-Disease Dynamic Mapping (Dengue, Malaria, Chikungunya, Typhoid)
  const schema = getDiseaseSchema(disease);
  const canonicalFeatures = schema.canonical_features || [];

  const labResults = (report && Array.isArray(report.labResults))
    ? report.labResults
    : (Array.isArray(report) ? report : []);

  // Collect text from symptoms, chief complaint, and history
  const symptomsList = Array.isArray(report?.symptoms) ? report.symptoms : (typeof report?.symptoms === 'string' ? report.symptoms.split(',') : []);
  const combinedClinicalText = [
    ...(symptomsList || []),
    report?.chiefComplaint || '',
    report?.chief_complaint || '',
    report?.history || '',
    report?.rawOcrText || '',
    report?.raw_ocr_text || ''
  ].join(' ').toLowerCase();

  const featureValues = {};
  const featureSources = {};
  const mappingDiagnostics = [];
  const availableFeatureNames = [];
  const missingFeatureNames = [];

  for (const fInfo of canonicalFeatures) {
    const featName = fInfo.name;
    const label = fInfo.clinical_label || featName;
    const unit = fInfo.unit || '';
    const synonyms = (fInfo.report_synonyms || [featName.toLowerCase()]).map(s => s.toLowerCase());

    let candidateVal = null;
    let candidateSource = null;

    // 1. Dedicated physiological biomarker resolvers for infectious disease modules
    if (featName === 'leukopenia') {
      const wbcItem = labResults.find(item => {
        const n = `${item.normalizedName || ''} ${item.rawName || ''} ${item.testName || ''}`.toLowerCase();
        return n.includes('wbc') || n.includes('white blood cell') || n.includes('total count');
      });
      if (wbcItem) {
        const wbcVal = parseFloat(wbcItem.value);
        if (!isNaN(wbcVal)) {
          const hasLeukopenia = wbcVal < 4000 || wbcItem.status === 'LOW';
          candidateVal = hasLeukopenia ? 1 : 0;
          candidateSource = {
            sourceType: 'laboratory_result',
            rawName: `WBC Count: ${wbcVal} cells/µL (${hasLeukopenia ? 'Leukopenia Detected' : 'Normal / Preserved'})`,
            value: candidateVal,
            unit: 'present'
          };
        }
      }
    } else if (featName === 'thrombocytopenia') {
      const platItem = labResults.find(item => {
        const n = `${item.normalizedName || ''} ${item.rawName || ''} ${item.testName || ''}`.toLowerCase();
        return n.includes('platelet') || n.includes('thrombocyte');
      });
      if (platItem) {
        const platVal = parseFloat(platItem.value);
        if (!isNaN(platVal)) {
          const hasThrombocytopenia = platVal < 100000 || platItem.status === 'LOW';
          candidateVal = hasThrombocytopenia ? 1 : 0;
          candidateSource = {
            sourceType: 'laboratory_result',
            rawName: `Platelet Count: ${platVal} cells/µL (${hasThrombocytopenia ? 'Thrombocytopenia Detected' : 'Normal / Preserved'})`,
            value: candidateVal,
            unit: 'present'
          };
        }
      }
    }

    // 2. Check laboratory results if not yet resolved by dedicated resolvers
    if (candidateVal === null) {
      for (const item of labResults) {
        const rawName = (item.rawName || item.testName || item.raw_name || item.test_name || '').toLowerCase().trim();
        const normName = (item.normalizedName || item.normalized_name || '').toLowerCase().trim();

        const isMatch = synonyms.some(syn =>
          normName === syn ||
          rawName === syn ||
          normName.includes(syn) ||
          rawName.includes(syn)
        );

        if (isMatch) {
          // If the feature is binary (0-1), don't take raw unrelated numbers like CRP as the value
          if (fInfo.valid_range && fInfo.valid_range.max === 1) {
            candidateVal = 1;
            candidateSource = {
              sourceType: 'laboratory_result',
              rawName: item.rawName || item.testName || label,
              value: 1,
              unit: 'present'
            };
            break;
          }

          const val = parseFloat(item.value);
          if (!isNaN(val)) {
            candidateVal = val;
            candidateSource = {
              sourceType: 'laboratory_result',
              rawName: item.rawName || item.testName || item.raw_name || 'Lab Result',
              value: candidateVal,
              unit: item.units || item.unit || unit
            };
            break;
          } else if (typeof item.value === 'string' && /positive|detected|present|reactive|high/i.test(item.value)) {
            candidateVal = 1;
            candidateSource = {
              sourceType: 'laboratory_serology',
              rawName: item.rawName || item.testName || 'Serology',
              value: candidateVal,
              unit: 'qualitative'
            };
            break;
          }
        }
      }
    }

    // 3. Check clinical symptoms text if not found in lab results
    if (candidateVal === null) {
      const hasSymptom = synonyms.some(syn => {
        const regex = new RegExp(`\\b${syn.replace(/_/g, '[\\s_]')}\\b`, 'i');
        return regex.test(combinedClinicalText);
      });

      if (hasSymptom) {
        candidateVal = 1;
        candidateSource = {
          sourceType: 'clinical_symptom',
          rawName: `Observed Symptom: ${label}`,
          value: 1,
          unit: 'present'
        };
      }
    }

    if (candidateVal !== null) {
      // Ensure binary features are strictly 0 or 1
      if (fInfo.valid_range && fInfo.valid_range.max === 1) {
        candidateVal = candidateVal > 0 ? 1 : 0;
      }
      featureValues[featName] = candidateVal;
      featureSources[featName] = candidateSource;
      availableFeatureNames.push(featName);

      mappingDiagnostics.push({
        feature: featName,
        clinicalLabel: label,
        status: candidateVal > 0 ? 'AVAILABLE' : 'ABSENT',
        value: candidateVal,
        unit: candidateSource ? candidateSource.unit : unit,
        source: candidateSource ? candidateSource.rawName : 'clinical_observation',
        isSuspicious: false,
        warning: null
      });
    } else {
      missingFeatureNames.push(featName);
      featureValues[featName] = 0; // Default zero for unobserved sign
      mappingDiagnostics.push({
        feature: featName,
        clinicalLabel: label,
        status: 'UNOBSERVED',
        value: 0,
        unit: unit,
        reason: 'Parameter not documented in uploaded laboratory findings or clinical symptoms.'
      });
    }
  }

  // Clinical Syndrome Readiness:
  // For infectious diseases (Dengue, Malaria, Chikungunya, Typhoid), clinical triage runs on available evidence
  const isReady = availableFeatureNames.length >= 1;
  const readinessStatus = isReady ? 'READY' : 'INSUFFICIENT_DATA';

  const diseaseTitles = {
    dengue: 'Dengue Fever Infection',
    malaria: 'Malaria Clinical Severity',
    chikungunya: 'Chikungunya Arboviral Disease',
    typhoid: 'Typhoid Enteric Fever'
  };

  return {
    disease,
    diseaseDisplayName: diseaseTitles[disease] || disease.toUpperCase(),
    model: `v1.0.0-${disease}`,
    status: readinessStatus,
    requiredFeatures: canonicalFeatures.length,
    requiredFeatureNames: canonicalFeatures.map(f => f.name),
    availableFeatures: availableFeatureNames.length,
    availableFeatureNames: availableFeatureNames,
    missingFeatures: missingFeatureNames,
    missingCount: missingFeatureNames.length,
    featureValues: featureValues,
    featureSources: featureSources,
    mappingDiagnostics: mappingDiagnostics
  };
}

module.exports = {
  getDiseaseSchema,
  computeDiseaseModelReadiness
};
