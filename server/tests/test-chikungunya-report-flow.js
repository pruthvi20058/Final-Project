/**
 * Integration Test: Multi-Disease Automatic Detection and Prediction Routing
 * Validates that Chikungunya reports are automatically identified and evaluated with
 * Chikungunya ML model and feature schema, while Diabetes reports remain 100% Pima.
 */

const assert = require('assert');
const {
  saveReportRecord,
  saveLabResultsRecord,
  getReportRecord,
  getPredictionRecord,
  savePredictionRecord
} = require('../db/database');
const { computeDiseaseModelReadiness } = require('../services/diseaseFeatureMapper');
const { generatePredictionForReport } = require('../services/predictionService');

async function runTests() {
  console.log('--- Starting Multi-Disease Pipeline Test ---');

  // Test 1: Chikungunya Report Ingestion & Disease Detection
  const chikReportId = 'TEST-CHIK-101';
  const chikReportObj = {
    id: chikReportId,
    patient_id: 'PAT-8001',
    patient_name: 'Arboviral Patient',
    original_filename: 'chikungunya_screening_lab_report.png',
    stored_filename: 'chikungunya_screening_lab_report.png',
    file_type: 'image',
    file_size: 1048576,
    raw_ocr_text: 'Chikungunya IgM ELISA Positive, WBC 3400 cells/uL, Platelets 165000, CRP 42.5 mg/L, High fever 103F, Severe Joint Pain',
    ocr_confidence: 94,
    chief_complaint: 'Severe bilateral polyarthralgia and acute high fever',
    symptoms: 'fever, arthralgia, myalgia, leukopenia',
    status: 'analyzed'
  };

  saveReportRecord(chikReportObj);
  saveLabResultsRecord(chikReportId, [
    { testName: 'Chikungunya Virus IgM Antibody', rawName: 'Chikungunya IgM', value: 'Positive', units: 'Index', status: 'HIGH' },
    { testName: 'White Blood Cell Count', rawName: 'WBC Count', value: '3400', units: 'cells/µL', status: 'LOW' },
    { testName: 'Platelet Count', rawName: 'Platelets', value: '165000', units: 'cells/µL', status: 'NORMAL' },
    { testName: 'C-Reactive Protein', rawName: 'CRP', value: '42.5', units: 'mg/L', status: 'HIGH' }
  ]);

  const fetchedChikReport = getReportRecord(chikReportId);
  console.log('✓ Fetched Chikungunya Report detected disease:', fetchedChikReport.disease);
  assert.strictEqual(fetchedChikReport.disease, 'chikungunya', 'Report should be auto-detected as chikungunya');

  // Test 2: Chikungunya Feature Schema & Readiness Check (Never Pima 8 features)
  const chikReadiness = computeDiseaseModelReadiness(fetchedChikReport, fetchedChikReport.disease);
  console.log('✓ Chikungunya Readiness Status:', chikReadiness.status);
  console.log('✓ Chikungunya Required Feature Names:', chikReadiness.requiredFeatureNames.slice(0, 5));
  assert(chikReadiness.requiredFeatureNames.includes('fever'), 'Should include fever');
  assert(chikReadiness.requiredFeatureNames.includes('arthralgia'), 'Should include arthralgia');
  assert(!chikReadiness.requiredFeatureNames.includes('skin'), 'Must NOT require Pima skinfold feature');
  assert(!chikReadiness.requiredFeatureNames.includes('pedi'), 'Must NOT require Pima diabetes pedigree');

  // Test 3: Chikungunya ML Model Inference Execution
  const chikPrediction = await generatePredictionForReport(fetchedChikReport, chikReadiness, 'chikungunya');
  console.log('✓ Chikungunya Prediction Status:', chikPrediction.status);
  console.log('✓ Chikungunya Model Name:', chikPrediction.modelName);
  console.log('✓ Chikungunya Top Disease:', chikPrediction.topPrediction.disease);
  console.log('✓ Chikungunya Top ICD-10:', chikPrediction.topPrediction.icd10);
  assert.strictEqual(chikPrediction.status, 'SUCCESS');
  assert(chikPrediction.modelName.toLowerCase().includes('chikungunya'), 'Model name must reference Chikungunya');
  assert(/chikungunya/i.test(chikPrediction.topPrediction.disease), 'Top prediction must be Chikungunya condition');
  assert(['A92.0', 'Z03.8'].includes(chikPrediction.topPrediction.icd10), 'ICD-10 must be A92.0 or Z03.8');

  // Save to DB and verify getPredictionRecord retrieval
  savePredictionRecord(chikPrediction);
  const dbChikPred = getPredictionRecord(chikReportId);
  console.log('✓ Database Retrieved Prediction Disease:', dbChikPred.disease);
  console.log('✓ Database Top Prediction:', dbChikPred.topPrediction.disease);
  assert.strictEqual(dbChikPred.disease, 'chikungunya');
  assert(/chikungunya/i.test(dbChikPred.topPrediction.disease));

  // Test 4: Verify Diabetes Module is 100% Preserved with Pima features
  const diabReportId = 'TEST-DIAB-202';
  const diabReportObj = {
    id: diabReportId,
    patient_id: 'PAT-8001',
    patient_name: 'Sarah Johnson',
    original_filename: 'complete_pima_report.pdf',
    stored_filename: 'complete_pima_report.pdf',
    file_type: 'pdf',
    file_size: 1048576,
    raw_ocr_text: 'Glucose 148, Blood Pressure 82, Insulin 110, BMI 33.6, Pedigree 0.627, Age 45, Skin 32, Pregnancies 3',
    ocr_confidence: 95,
    chief_complaint: 'Routine diabetes screening evaluation',
    symptoms: 'polyuria, polydipsia',
    demographics: { age: 45, sex: 'female' },
    status: 'analyzed'
  };

  saveReportRecord(diabReportObj);
  saveLabResultsRecord(diabReportId, [
    { testName: 'Plasma Glucose', rawName: 'Glucose', value: '148', units: 'mg/dL', status: 'HIGH' },
    { testName: 'Diastolic Blood Pressure', rawName: 'Diastolic Blood Pressure', value: '82', units: 'mmHg', status: 'HIGH' },
    { testName: '2-Hour Serum Insulin', rawName: 'Insulin', value: '110', units: 'µU/mL', status: 'NORMAL' },
    { testName: 'Body Mass Index', rawName: 'BMI', value: '33.6', units: 'kg/m²', status: 'HIGH' },
    { testName: 'Diabetes Pedigree Function', rawName: 'Pedigree', value: '0.627', units: 'score', status: 'NORMAL' },
    { testName: 'Triceps Skinfold', rawName: 'Skin', value: '32', units: 'mm', status: 'NORMAL' },
    { testName: 'Pregnancies', rawName: 'Pregnancies', value: '3', units: 'count', status: 'NORMAL' }
  ]);

  const fetchedDiabReport = getReportRecord(diabReportId);
  assert.strictEqual(fetchedDiabReport.disease, 'diabetes', 'Report should be auto-detected as diabetes');

  const diabReadiness = computeDiseaseModelReadiness(fetchedDiabReport, 'diabetes');
  assert.strictEqual(diabReadiness.status, 'READY');
  assert.strictEqual(diabReadiness.requiredFeatures, 8, 'Pima diabetes requires exactly 8 canonical features');

  const diabPrediction = await generatePredictionForReport(fetchedDiabReport, diabReadiness, 'diabetes');
  console.log('✓ Diabetes Prediction Status:', diabPrediction.status);
  console.log('✓ Diabetes Top Condition:', diabPrediction.topPrediction.disease);
  console.log('✓ Diabetes ICD-10:', diabPrediction.topPrediction.icd10);
  assert(diabPrediction.topPrediction.disease.includes('Diabetes'));
  assert.strictEqual(diabPrediction.topPrediction.icd10, 'E11.9');

  console.log('--- ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
