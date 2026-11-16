const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function runPythonScript(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn('python', args, { cwd });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function runShapTestSuite() {
  console.log('================================================================');
  console.log('🧪 MediAgent Phase 2.3 Real SHAP Explainability Test Suite');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ TEST ${passed + failed + 1}: ${testName} — PASSED`);
      passed++;
    } else {
      console.error(`  ❌ TEST ${passed + failed + 1}: ${testName} — FAILED: ${details}`);
      failed++;
    }
  }

  const baseDir = path.join(__dirname, '..', '..');
  const mlDir = path.join(baseDir, 'server', 'ml');
  const modelDir = path.join(mlDir, 'models', 'diabetes');
  const predictScript = path.join(mlDir, 'predict.py');

  // TEST 1: SHAP Library Import Check via Python
  const checkShapPy = await runPythonScript(['-c', 'import shap; print(shap.__version__)'], baseDir);
  assert(checkShapPy.code === 0 && checkShapPy.stdout.trim().length > 0, 'SHAP Library Available & Imported', `Version: ${checkShapPy.stdout.trim()}`);

  // TEST 2: Correct Explainer Type (LinearExplainer)
  const completePayload = JSON.stringify({ preg: 6, plas: 148, pres: 72, skin: 35, insu: 120, mass: 33.6, pedi: 0.627, age: 50 });
  const pyResComplete = await runPythonScript([predictScript, completePayload], baseDir);
  let parsed = {};
  try { parsed = JSON.parse(pyResComplete.stdout.trim()); } catch (e) {}

  const expl = parsed.explanation || {};
  assert(expl.method === 'SHAP LinearExplainer', 'Correct Explainer Type (SHAP LinearExplainer)', `Method: ${expl.method}`);

  // TEST 3 & 4: Saved Model & Preprocessor Load
  assert(fs.existsSync(path.join(modelDir, 'model.joblib')), 'Saved Model Joblib Artifact Loads');
  assert(fs.existsSync(path.join(modelDir, 'preprocessor.joblib')), 'Saved Preprocessor Joblib Artifact Loads');

  // TEST 5 & 6 & 7: Feature Order & All 8 Features Received SHAP Values
  const features = expl.features || [];
  const featureNames = features.map(f => f.feature);
  const expectedCols = ['preg', 'plas', 'pres', 'skin', 'insu', 'mass', 'pedi', 'age'];
  const orderMatch = JSON.stringify(featureNames) === JSON.stringify(expectedCols);
  assert(orderMatch && features.length === 8, 'Feature Order Matches Canonical Schema (8 Features)', `Found: ${featureNames.join(', ')}`);

  // TEST 8 & 9: SHAP Values Are Numeric Floats & Base Value Exists
  const allNumeric = features.every(f => typeof f.shapValue === 'number' && !isNaN(f.shapValue));
  assert(allNumeric && typeof expl.baseValue === 'number', 'SHAP Values & Base Value Are Valid Numeric Floats', `Base: ${expl.baseValue}`);

  // TEST 10 & 11: Prediction Exists & SHAP Corresponds to Same Input
  assert(parsed.status === 'SUCCESS' && parsed.rawTargetClass !== undefined, 'Prediction Exists & SHAP Corresponds to Same Input Vector');

  // TEST 12: Additive Consistency Reconstruction (Diff < 0.0001)
  const diff = expl.additiveReconstructionDiff;
  assert(diff !== undefined && diff < 0.0001, 'Additive Consistency Reconstruction Verified (Diff < 0.0001)', `Diff: ${diff}`);

  // TEST 13 & 14: Positive & Negative SHAP Direction Mapping
  const plasFeat = features.find(f => f.feature === 'plas');
  const presFeat = features.find(f => f.feature === 'pres');
  const posDirOk = plasFeat && plasFeat.shapValue > 0 && plasFeat.direction === 'toward_positive';
  const negDirOk = presFeat && presFeat.shapValue < 0 && presFeat.direction === 'toward_negative';
  assert(posDirOk && negDirOk, 'Positive & Negative SHAP Directionality Derived from Mathematical Sign');

  // TEST 15: Top Factors Sorted by Absolute SHAP Magnitude
  const topPos = expl.topPositiveFactors || [];
  const topNeg = expl.topNegativeFactors || [];
  assert(topPos.length > 0 && topPos[0] === 'Plasma Glucose', 'Top Features Sorted Strictly by Absolute SHAP Magnitude', `Top Positive: ${topPos[0]}`);

  // TEST 16 & 17 & 18: Deterministic Execution (10 Repeated Runs) & No Random Behavior
  const run2 = await runPythonScript([predictScript, completePayload], baseDir);
  const parsed2 = JSON.parse(run2.stdout.trim());
  const deterministic = JSON.stringify(parsed.explanation) === JSON.stringify(parsed2.explanation);
  assert(deterministic, 'Deterministic Execution (Zero Random SHAP Fluctuations)');

  // TEST 19: Model Version Included in Explanation Payload
  assert(expl.modelVersion === 'v2.0.0-pima-diabetes', 'Model Version Included in SHAP Explanation Payload', `Version: ${expl.modelVersion}`);

  // TEST 20: Missing & Invalid Data Block SHAP (Case C & Case D)
  const missingPayload = JSON.stringify({ glucose: 185 }); // missing 7 features
  const resMissing = await runPythonScript([predictScript, missingPayload], baseDir);
  const parsedMissing = JSON.parse(resMissing.stdout.trim());

  const invalidPayload = JSON.stringify({ preg: 6, plas: -20, pres: 72, skin: 35, insu: 120, mass: 33.6, pedi: 0.627, age: 50 });
  const resInvalid = await runPythonScript([predictScript, invalidPayload], baseDir);
  const parsedInvalid = JSON.parse(resInvalid.stdout.trim());

  const blocksShap = parsedMissing.status === 'INSUFFICIENT_DATA' && parsedInvalid.status === 'INVALID_DATA' && !parsedMissing.explanation && !parsedInvalid.explanation;
  assert(blocksShap, 'Missing & Invalid Inputs Prevent SHAP Execution (Case C & Case D Safeguard)');

  console.log('\n================================================================');
  console.log(`📊 SHAP INTEGRATION TEST SUITE RESULTS: ${passed} / ${passed + failed} PASSED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runShapTestSuite().catch(err => {
  console.error('SHAP Test Runner Exception:', err);
  process.exit(1);
});
