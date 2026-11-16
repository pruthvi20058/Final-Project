const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function runTestCommand(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function runLegitimateMLTestSuite() {
  console.log('=======================================================');
  console.log('🧪 MediAgent Legitimate ML Pipeline Integration Test Suite');
  console.log('=======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ ${testName} — PASSED`);
      passed++;
    } else {
      console.error(`  ❌ ${testName} — FAILED: ${details}`);
      failed++;
    }
  }

  const baseDir = path.join(__dirname, '..', '..');
  const mlDir = path.join(baseDir, 'server', 'ml');
  const pimaCsv = path.join(mlDir, 'data', 'pima_diabetes.csv');
  const modelDir = path.join(mlDir, 'models', 'diabetes');
  const modelJoblib = path.join(modelDir, 'model.joblib');
  const prepJoblib = path.join(modelDir, 'preprocessor.joblib');
  const schemaJson = path.join(modelDir, 'feature_schema.json');
  const metaJson = path.join(modelDir, 'model_metadata.json');

  // TEST 1: Legitimate Dataset File Exists
  assert(fs.existsSync(pimaCsv), 'TEST 1: Legitimate Pima Diabetes CSV Dataset Exists');

  // TEST 2: Dataset Content Audit
  let csvLines = [];
  if (fs.existsSync(pimaCsv)) {
    csvLines = fs.readFileSync(pimaCsv, 'utf-8').trim().split('\n');
  }
  assert(csvLines.length === 769, 'TEST 2: Exact Dataset Dimensions (768 data rows + 1 header)', `Found ${csvLines.length} lines`);

  // TEST 3: Schema Predictors
  const header = csvLines[0] ? csvLines[0].trim().split(',') : [];
  const expectedCols = ['preg', 'plas', 'pres', 'skin', 'insu', 'mass', 'pedi', 'age', 'outcome'];
  const hasCols = expectedCols.every(c => header.includes(c));
  assert(hasCols, 'TEST 3: Dataset Contains Canonical 8 Predictors + Outcome', `Header: ${header.join(',')}`);

  // TEST 4: Model Artifacts Exist
  assert(fs.existsSync(modelJoblib) && fs.existsSync(prepJoblib), 'TEST 4: Trained Model & Preprocessor Joblib Artifacts Exist');
  assert(fs.existsSync(schemaJson) && fs.existsSync(metaJson), 'TEST 5: Schema & Metadata JSON Artifacts Exist');

  // TEST 6: Model Metadata Validity & No Synthetic 100% Accuracy
  let meta = {};
  if (fs.existsSync(metaJson)) {
    meta = JSON.parse(fs.readFileSync(metaJson, 'utf-8'));
  }
  const testAcc = meta.selected_model_test_metrics ? meta.selected_model_test_metrics.accuracy : 0;
  const isRealistic = testAcc > 0.65 && testAcc < 0.95;
  assert(isRealistic, 'TEST 6: Realistic Test Accuracy (Not Synthetic 100%)', `Recorded Test Accuracy: ${testAcc}`);

  // TEST 7: 5-Fold Cross Validation & Leakage Check
  const cvAccMean = meta.selected_model_cv_metrics ? meta.selected_model_cv_metrics.cv_accuracy_mean : 0;
  const noLeakage = meta.leakage_audit && meta.leakage_audit.scaler_fitted_on_train_only === true;
  assert(cvAccMean > 0.70 && noLeakage, 'TEST 7: 5-Fold Stratified CV Executed with Zero Data Leakage', `CV Acc: ${cvAccMean}, Leakage Audit: ${noLeakage}`);

  // TEST 8: Valid Python Inference with Complete 8 Features
  const validPayload = JSON.stringify({ preg: 6, plas: 148, pres: 72, skin: 35, insu: 120, mass: 33.6, pedi: 0.627, age: 50 });
  const pyResValid = await runTestCommand('python', [path.join(mlDir, 'predict.py'), validPayload], baseDir);
  let parsedValid = {};
  try { parsedValid = JSON.parse(pyResValid.stdout.trim()); } catch (e) {}

  assert(pyResValid.code === 0 && parsedValid.status === 'SUCCESS', 'TEST 8: Python ML Inference Runs Successfully for Valid Input');

  // TEST 9: Probability Vector Range & Sum Check
  const probaVec = parsedValid.probabilityVector || {};
  const probSum = (probaVec.negative || 0) + (probaVec.positive || 0);
  assert(Math.abs(probSum - 1.0) < 0.01 && parsedValid.estimatedProbability >= 0.0 && parsedValid.estimatedProbability <= 1.0, 'TEST 9: Probability Vector Sums to 1.0 (Valid Range 0.0-1.0)', `Sum: ${probSum}, Prob: ${parsedValid.estimatedProbability}`);

  // TEST 10: Missing Feature Rejection (INSUFFICIENT_DATA)
  const missingPayload = JSON.stringify({ bmi: 33.6, age: 50 }); // missing 7 features
  const pyResMissing = await runTestCommand('python', [path.join(mlDir, 'predict.py'), missingPayload], baseDir);
  let parsedMissing = {};
  try { parsedMissing = JSON.parse(pyResMissing.stdout.trim()); } catch (e) {}

  assert(parsedMissing.status === 'INSUFFICIENT_DATA' && parsedMissing.missingFeatures.length > 0, 'TEST 10: Missing Required Feature Rejection (INSUFFICIENT_DATA)', `Status: ${parsedMissing.status}`);

  // TEST 11: Non-Diagnostic Screening Language Enforced
  const hasDisclaimer = parsedValid.disclaimer && parsedValid.disclaimer.toLowerCase().includes('not a confirmed');
  assert(hasDisclaimer, 'TEST 11: Non-Diagnostic Screening Language & Disclaimer Enforced');

  // TEST 12: Deprecated Synthetic Files Archived
  const deprecatedNotice = path.join(mlDir, 'deprecated', 'DEPRECATED_SYNTHETIC_DATA_NOTICE.md');
  assert(fs.existsSync(deprecatedNotice), 'TEST 12: Deprecated Synthetic Files Archived in server/ml/deprecated/');

  console.log('\n=======================================================');
  console.log(`📊 TEST SUITE RESULTS: ${passed} / ${passed + failed} PASSED`);
  console.log('=======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runLegitimateMLTestSuite().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
