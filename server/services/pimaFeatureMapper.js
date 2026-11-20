const path = require('path');
const fs = require('fs');

// Load Authoritative Canonical Feature Schema
const schemaPath = path.join(__dirname, '..', 'ml', 'models', 'diabetes', 'feature_schema.json');
let cachedSchema = null;

function getFeatureSchema() {
  if (!cachedSchema) {
    if (fs.existsSync(schemaPath)) {
      cachedSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    } else {
      // Fallback schema if file not readable
      cachedSchema = {
        model_version: 'v2.0.0-pima-diabetes',
        canonical_features: [
          { name: 'preg', clinical_label: 'Pregnancies', unit: 'count', valid_range: { min: 0, max: 20 }, required: true },
          { name: 'plas', clinical_label: 'Plasma Glucose', unit: 'mg/dL', valid_range: { min: 40.0, max: 500.0 }, required: true },
          { name: 'pres', clinical_label: 'Diastolic Blood Pressure', unit: 'mmHg', valid_range: { min: 40.0, max: 160.0 }, required: true },
          { name: 'skin', clinical_label: 'Triceps Skin Fold Thickness', unit: 'mm', valid_range: { min: 5.0, max: 99.0 }, required: true },
          { name: 'insu', clinical_label: '2-Hour Serum Insulin', unit: 'uU/mL', valid_range: { min: 5.0, max: 900.0 }, required: true },
          { name: 'mass', clinical_label: 'Body Mass Index (BMI)', unit: 'kg/m2', valid_range: { min: 10.0, max: 80.0 }, required: true },
          { name: 'pedi', clinical_label: 'Diabetes Pedigree Function', unit: 'score', valid_range: { min: 0.05, max: 3.0 }, required: true },
          { name: 'age', clinical_label: 'Age', unit: 'years', valid_range: { min: 18, max: 120 }, required: true }
        ]
      };
    }
  }
  return cachedSchema;
}

function parseNumericValue(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    const match = trimmed.match(/^[-+]?[0-9]*\.?[0-9]+/);
    if (match) {
      const n = parseFloat(match[0]);
      return isNaN(n) ? null : n;
    }
  }
  return null;
}

/**
 * Safely maps extracted laboratory results and verified patient demographics
 * to the authoritative Pima Diabetes feature set.
 *
 * @param {Object|Array} report - Complete report record with labResults and demographics, or array of lab results
 * @param {Object} patient - Optional associated patient record from DB or demographics object
 * @returns {Object} Structured model readiness and mapping diagnostics
 */
function computeModelReadiness(report, patient = null) {
  const schema = getFeatureSchema();
  const canonicalFeatures = schema.canonical_features || [];
  
  // Support both report object and raw labResults array
  const labResults = (report && Array.isArray(report.labResults))
    ? report.labResults
    : (Array.isArray(report) ? report : []);

  const featureValues = {};
  const featureSources = {};
  const mappingDiagnostics = [];
  const availableFeatureNames = [];
  const missingFeatureNames = [];
  let hasInvalidFeature = false;

  // Extract patient age & vitals from verified demographics or patient profile
  const rawDemoAge = (report && report.patientDemographics && report.patientDemographics.age !== undefined)
    ? report.patientDemographics.age
    : (report && report.demographics && report.demographics.age !== undefined)
      ? report.demographics.age
      : (report && report.patientAge !== undefined)
        ? report.patientAge
        : (patient && patient.age !== undefined)
          ? patient.age
          : (patient && patient.patientAge !== undefined)
            ? patient.patientAge
            : null;

  const demographicAge = parseNumericValue(rawDemoAge);

  const demographicGender = (report && report.patientDemographics && (report.patientDemographics.sex || report.patientDemographics.gender))
    ? (report.patientDemographics.sex || report.patientDemographics.gender)
    : (report && report.demographics && (report.demographics.sex || report.demographics.gender))
      ? (report.demographics.sex || report.demographics.gender)
      : (report && (report.patientGender || report.gender))
        ? (report.patientGender || report.gender)
        : (patient && (patient.gender || patient.sex))
          ? (patient.gender || patient.sex)
          : null;

  const demographicWeight = parseNumericValue(patient && (patient.weight || patient.patientWeight));
  const demographicHeight = parseNumericValue(patient && (patient.height || patient.patientHeight));

  // Evaluate each canonical feature in strict accordance with clinical criteria
  for (const fInfo of canonicalFeatures) {
    const featName = fInfo.name;
    const label = fInfo.clinical_label || featName;
    const validRange = fInfo.valid_range || { min: -Infinity, max: Infinity };
    const requiredUnit = fInfo.unit;

    let candidateValue = null;
    let candidateSource = null;
    let rejectionReason = null;
    let isAmbiguous = false;

    if (featName === 'plas') {
      // 1. Plasma Glucose:
      // Must be plasma or fasting blood glucose.
      // MUST NOT map HbA1c to plasma glucose!
      // MUST NOT map Urine Glucose to plasma glucose!
      for (const item of labResults) {
        const rawName = (item.rawName || item.testName || '').toLowerCase().trim();
        const normName = (item.normalizedName || '').toLowerCase().trim();

        // Strict Exclusion Guards
        if (rawName.includes('hba1c') || rawName.includes('a1c') || rawName.includes('glycated') || normName === 'hba1c') {
          continue; // HbA1c is separate glycated hemoglobin, not plasma glucose
        }
        if (rawName.includes('urine') || rawName.includes('urinary') || normName.includes('urine')) {
          continue; // Urine glucose is not plasma glucose
        }

        const isGlucoseMatch = normName === 'glucose' ||
          rawName.includes('fasting blood sugar') ||
          rawName.includes('fasting glucose') ||
          rawName.includes('fbs') ||
          rawName.includes('plasma glucose') ||
          rawName.includes('blood sugar') ||
          rawName.includes('blood glucose') ||
          rawName.includes('glucose (fasting)') ||
          rawName === 'glucose' ||
          rawName === 'plas';

        const parsedVal = parseNumericValue(item.value);
        if (isGlucoseMatch && parsedVal !== null) {
          let numVal = parsedVal;
          let unitStr = (item.units || item.unit || 'mg/dL').trim();

          // Safely handle mmol/L conversion to mg/dL if documented
          if (/^mmol/i.test(unitStr) && numVal < 30) {
            numVal = Math.round(numVal * 18.018 * 10) / 10;
            unitStr = 'mg/dL';
          }

          candidateValue = numVal;
          candidateSource = {
            resultId: item.id,
            rawName: item.rawName || item.testName,
            value: numVal,
            unit: unitStr,
            sourceType: 'laboratory_result'
          };
          break;
        }
      }
    } else if (featName === 'pres') {
      // 2. Diastolic Blood Pressure:
      // Must be diastolic blood pressure (mmHg).
      // MUST NOT map systolic blood pressure to diastolic!
      // MUST NOT map ambiguous total blood pressure without distinction!
      for (const item of labResults) {
        const rawName = (item.rawName || item.testName || '').toLowerCase().trim();
        const normName = (item.normalizedName || '').toLowerCase().trim();

        // Reject systolic
        if (rawName.includes('systolic') || rawName.includes('sbp')) {
          continue;
        }

        // Check if generic "blood pressure" without explicit diastolic designation
        const isGenericBp = rawName === 'blood pressure' || rawName === 'bp' || normName === 'blood_pressure';
        if (isGenericBp && !rawName.includes('diastolic') && !rawName.includes('dbp') && rawName !== 'pres') {
          // Check for composite BP string like "120/80" in source text or reference range
          const sourceText = (item.source && item.source.text) ? item.source.text : (item.referenceRange || '');
          const compositeMatch = sourceText.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
          if (compositeMatch) {
            const diastolicVal = parseFloat(compositeMatch[2]);
            if (!isNaN(diastolicVal) && diastolicVal >= validRange.min && diastolicVal <= validRange.max) {
              candidateValue = diastolicVal;
              candidateSource = {
                resultId: item.id,
                rawName: `${item.rawName || item.testName} (Diastolic component of ${compositeMatch[0]})`,
                value: diastolicVal,
                unit: 'mmHg',
                sourceType: 'laboratory_result'
              };
              break;
            }
          }

          isAmbiguous = true;
          rejectionReason = `Blood pressure entry "${item.rawName || item.testName}: ${item.value}" lacks explicit systolic/diastolic designation and cannot be safely mapped to diastolic pressure.`;
          continue;
        }

        const isExplicitDiastolic = rawName.includes('diastolic') ||
          rawName.includes('dbp') ||
          rawName === 'pres' ||
          rawName.includes('diastolic blood pressure') ||
          normName === 'diastolic_bp';

        const parsedPres = parseNumericValue(item.value);
        if (isExplicitDiastolic && parsedPres !== null) {
          candidateValue = parsedPres;
          candidateSource = {
            resultId: item.id,
            rawName: item.rawName || item.testName,
            value: candidateValue,
            unit: item.units || item.unit || 'mmHg',
            sourceType: 'laboratory_result'
          };
          break;
        }
      }
    } else if (featName === 'skin') {
      // 3. Triceps Skin Fold Thickness (mm):
      for (const item of labResults) {
        const rawName = (item.rawName || item.testName || '').toLowerCase().trim();
        const normName = (item.normalizedName || '').toLowerCase().trim();

        const isSkinMatch = normName === 'skin_fold' ||
          normName === 'skin' ||
          rawName.includes('triceps') ||
          rawName.includes('skin fold') ||
          rawName.includes('skinfold') ||
          rawName.includes('skin thickness') ||
          rawName === 'skin';

        const parsedSkin = parseNumericValue(item.value);
        if (isSkinMatch && parsedSkin !== null) {
          candidateValue = parsedSkin;
          candidateSource = {
            resultId: item.id,
            rawName: item.rawName || item.testName,
            value: candidateValue,
            unit: item.units || item.unit || 'mm',
            sourceType: 'laboratory_result'
          };
          break;
        }
      }
    } else if (featName === 'insu') {
      // 4. 2-Hour Serum Insulin (uU/mL):
      for (const item of labResults) {
        const rawName = (item.rawName || item.testName || '').toLowerCase().trim();
        const normName = (item.normalizedName || '').toLowerCase().trim();

        if (rawName.includes('antibody') || rawName.includes('igf')) {
          continue;
        }

        const isInsulinMatch = normName === 'insulin' ||
          normName === 'insu' ||
          rawName.includes('insulin') ||
          rawName.includes('serum insulin') ||
          rawName === 'insu';

        const parsedInsu = parseNumericValue(item.value);
        if (isInsulinMatch && parsedInsu !== null) {
          candidateValue = parsedInsu;
          candidateSource = {
            resultId: item.id,
            rawName: item.rawName || item.testName,
            value: candidateValue,
            unit: item.units || item.unit || 'uU/mL',
            sourceType: 'laboratory_result'
          };
          break;
        }
      }
    } else if (featName === 'mass') {
      // 5. Body Mass Index (BMI, kg/m2):
      // Check lab results first
      for (const item of labResults) {
        const rawName = (item.rawName || item.testName || '').toLowerCase().trim();
        const normName = (item.normalizedName || '').toLowerCase().trim();

        const isBmiMatch = normName === 'bmi' ||
          normName === 'mass' ||
          rawName.includes('body mass index') ||
          rawName.includes('bmi') ||
          rawName === 'mass';

        const parsedBmi = parseNumericValue(item.value);
        if (isBmiMatch && parsedBmi !== null) {
          candidateValue = parsedBmi;
          candidateSource = {
            resultId: item.id,
            rawName: item.rawName || item.testName,
            value: candidateValue,
            unit: 'kg/m2',
            sourceType: 'laboratory_result'
          };
          break;
        }
      }

      // If not in lab results, check if patient has recorded weight and height
      if (candidateValue === null && demographicWeight && demographicHeight) {
        const heightM = demographicHeight > 3 ? demographicHeight / 100 : demographicHeight;
        if (heightM > 0.5 && heightM < 2.5 && demographicWeight > 20 && demographicWeight < 300) {
          const calculatedBmi = Math.round((demographicWeight / (heightM * heightM)) * 10) / 10;
          candidateValue = calculatedBmi;
          candidateSource = {
            value: calculatedBmi,
            unit: 'kg/m2',
            sourceType: 'patient_demographics',
            details: `Calculated from Weight: ${demographicWeight}kg, Height: ${demographicHeight}cm`
          };
        }
      }
    } else if (featName === 'pedi') {
      // 6. Diabetes Pedigree Function:
      // Must be a verified numeric score. DO NOT infer from unquantified medical history!
      for (const item of labResults) {
        const rawName = (item.rawName || item.testName || '').toLowerCase().trim();
        const normName = (item.normalizedName || '').toLowerCase().trim();

        const isPedigreeMatch = normName === 'pedigree' ||
          normName === 'pedi' ||
          rawName.includes('pedigree') ||
          rawName.includes('diabetes pedigree') ||
          rawName === 'pedi';

        const parsedPedi = parseNumericValue(item.value);
        if (isPedigreeMatch && parsedPedi !== null) {
          candidateValue = parsedPedi;
          candidateSource = {
            resultId: item.id,
            rawName: item.rawName || item.testName,
            value: candidateValue,
            unit: 'score',
            sourceType: 'laboratory_result'
          };
          break;
        }
      }
    } else if (featName === 'preg') {
      // 7. Pregnancies:
      // Check lab results or clinical vitals
      for (const item of labResults) {
        const rawName = (item.rawName || item.testName || '').toLowerCase().trim();
        const normName = (item.normalizedName || '').toLowerCase().trim();

        const isPregMatch = normName === 'pregnancies' ||
          normName === 'preg' ||
          rawName.includes('pregnanc') ||
          rawName.includes('gravida') ||
          rawName === 'preg';

        const parsedPreg = parseNumericValue(item.value);
        if (isPregMatch && parsedPreg !== null) {
          candidateValue = Math.round(parsedPreg);
          candidateSource = {
            resultId: item.id,
            rawName: item.rawName || item.testName,
            value: candidateValue,
            unit: 'count',
            sourceType: 'laboratory_result'
          };
          break;
        }
      }

      // If male patient, biological pregnancy count is 0
      if (candidateValue === null && demographicGender && demographicGender.toLowerCase().startsWith('m')) {
        candidateValue = 0;
        candidateSource = {
          value: 0,
          unit: 'count',
          sourceType: 'demographic_inferred',
          details: 'Patient demographic is recorded as Male; biological pregnancy count is 0.'
        };
      }
    } else if (featName === 'age') {
      // 8. Age:
      // Check lab results first (supports user manual addition, verification, and OCR extracted age parameter)
      for (const item of labResults) {
        const rawName = (item.rawName || item.testName || '').toLowerCase().trim();
        const normName = (item.normalizedName || '').toLowerCase().trim();
        const numVal = parseNumericValue(item.value);

        const isAgeMatch = normName === 'age' ||
          normName === 'patient_age' ||
          normName === 'years_old' ||
          normName.startsWith('age') ||
          rawName === 'age' ||
          rawName === 'patient age' ||
          rawName.startsWith('age ') ||
          rawName.startsWith('age:') ||
          rawName.startsWith('age-') ||
          rawName.startsWith('age_') ||
          rawName.includes('patient age') ||
          /\bage\b/i.test(rawName);

        if (isAgeMatch && numVal !== null) {
          candidateValue = Math.round(numVal);
          candidateSource = {
            resultId: item.id,
            rawName: item.rawName || item.testName,
            value: candidateValue,
            unit: 'years',
            sourceType: 'laboratory_result'
          };
          break;
        }
      }

      // If not present in lab results, fallback to verified patient demographics
      if (candidateValue === null && demographicAge !== null && !isNaN(demographicAge)) {
        candidateValue = Math.round(demographicAge);
        candidateSource = {
          value: candidateValue,
          unit: 'years',
          sourceType: 'patient_demographics',
          details: 'Verified from patient demographics / clinical case header'
        };
      }
    }

    // Diagnostic validation and classification
    if (candidateValue !== null) {
      if (candidateValue < validRange.min || candidateValue > validRange.max) {
        hasInvalidFeature = true;
        mappingDiagnostics.push({
          feature: featName,
          clinicalLabel: label,
          status: 'INVALID',
          value: candidateValue,
          unit: candidateSource ? candidateSource.unit : requiredUnit,
          reason: `Measurement value ${candidateValue} is out of valid clinical range [${validRange.min}, ${validRange.max}].`,
          source: candidateSource ? (candidateSource.rawName || candidateSource.sourceType) : 'unknown',
          sourceId: candidateSource ? candidateSource.resultId : null
        });
      } else {
        featureValues[featName] = candidateValue;
        featureSources[featName] = candidateSource;
        availableFeatureNames.push(featName);

        const suspRange = fInfo.suspicious_range;
        const isSuspicious = suspRange && (candidateValue >= suspRange.min && candidateValue <= suspRange.max);

        mappingDiagnostics.push({
          feature: featName,
          clinicalLabel: label,
          status: 'AVAILABLE',
          value: candidateValue,
          unit: candidateSource ? candidateSource.unit : requiredUnit,
          source: candidateSource ? (candidateSource.rawName || candidateSource.details || candidateSource.sourceType) : 'verified',
          sourceId: candidateSource ? candidateSource.resultId : null,
          isSuspicious: !!isSuspicious,
          warning: isSuspicious ? `Value ${candidateValue} is within clinically suspicious/extreme range [${suspRange.min}, ${suspRange.max}].` : null
        });
      }
    } else {
      missingFeatureNames.push(featName);
      mappingDiagnostics.push({
        feature: featName,
        clinicalLabel: label,
        status: isAmbiguous ? 'AMBIGUOUS' : 'MISSING',
        reason: rejectionReason || `Measurement absent from laboratory report and patient record.`
      });
    }
  }

  // Determine Overall Model Readiness Status
  let readinessStatus = 'INSUFFICIENT_DATA';
  if (hasInvalidFeature) {
    readinessStatus = 'INVALID_DATA';
  } else if (missingFeatureNames.length === 0 && availableFeatureNames.length === 8) {
    readinessStatus = 'READY';
  } else {
    readinessStatus = 'INSUFFICIENT_DATA';
  }

  return {
    model: 'pima_diabetes',
    status: readinessStatus,
    requiredFeatures: 8,
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

/**
 * Diagnostic logger that prints clean, clinical mapping details
 * with ZERO unnecessary patient identifying information.
 */
function logReadinessDiagnostics(reportId, labResults, readiness) {
  const validCount = labResults.filter(l => l.quality === 'VALID').length;
  const reviewCount = labResults.filter(l => l.quality === 'SUSPICIOUS' || l.quality === 'INVALID').length;
  const normalizedNames = [...new Set(labResults.map(l => l.normalizedName || l.testName || 'unknown'))].slice(0, 15);

  console.log(`\n==================================================`);
  console.log(`[ModelReadiness] Report ID: ${reportId}`);
  console.log(`[ModelReadiness] Extracted Laboratory Results: ${labResults.length}`);
  console.log(`[ModelReadiness] Valid Results: ${validCount}, Requiring Review: ${reviewCount}`);
  console.log(`[ModelReadiness] Normalized Test Names: ${normalizedNames.join(', ')}`);
  console.log(`[ModelReadiness] Pima Feature Mappings (${readiness.availableFeatures}/8):`);
  for (const [feat, src] of Object.entries(readiness.featureSources || {})) {
    console.log(`  - ${feat}: ${src.value} ${src.unit || ''} (Source: ${src.sourceType}, ID: ${src.resultId || 'N/A'})`);
  }
  console.log(`[ModelReadiness] Missing Features (${readiness.missingFeatures.length}):`);
  readiness.mappingDiagnostics
    .filter(d => d.status !== 'AVAILABLE')
    .forEach(d => {
      console.log(`  - ${d.feature}: [${d.status}] ${d.reason}`);
    });
  console.log(`[ModelReadiness] Final Readiness Status: ${readiness.status}`);
  console.log(`==================================================\n`);
}

module.exports = {
  getFeatureSchema,
  computeModelReadiness,
  logReadinessDiagnostics
};
