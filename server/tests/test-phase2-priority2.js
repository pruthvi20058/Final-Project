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

async function runPriority2TestSuite() {
  console.log('================================================================');
  console.log('🧪 MediAgent Phase 2 Priority 2 Integration & Validation Test Suite');
  console.log('================================================================\n');

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
  const modelDir = path.join(mlDir, 'models', 'diabetes');
  const schemaPath = path.join(modelDir, 'feature_schema.json');
  const metaPath = path.join(modelDir, 'model_metadata.json');
  const cardPath = path.join(modelDir, 'model_card.md');
  const predictScript = path.join(mlDir, 'predict.py');

  // TEST 1: Feature Schema File Exists
  assert(fs.existsSync(schemaPath), 'TEST 1: Canonical Feature Schema Exists');

  // TEST 2: Schema Defines All 8 Canonical Required Features
  let schema = {};
  if (fs.existsSync(schemaPath)) schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  const canonFeatures = schema.canonical_features || [];
  const reqCount = canonFeatures.filter(f => f.required === true).length;
  assert(canonFeatures.length === 8 && reqCount === 8, 'TEST 2: Canonical Feature Schema Explicitly Defines All 8 Required Pima Features', `Found ${reqCount} required features`);

  // TEST 3: General Labs Only Report (Missing 7 Pima Features) -> INSUFFICIENT_DATA (Model DOES NOT run)
  const generalLabsPayload = JSON.stringify({
    glucose: 185,
    hba1c: 8.1,
    creatinine: 1.0,
    alt: 28,
    ast: 24,
    hemoglobin: 13.8
  });
  const resGenLabs = await runPythonScript([predictScript, generalLabsPayload], baseDir);
  let parsedGenLabs = {};
  try { parsedGenLabs = JSON.parse(resGenLabs.stdout.trim()); } catch (e) {}

  assert(parsedGenLabs.status === 'INSUFFICIENT_DATA' && parsedGenLabs.missingFeatures.length === 7, 'TEST 3: General Labs Only Report Returns INSUFFICIENT_DATA (Model Does NOT Run)', `Status: ${parsedGenLabs.status}, Missing: ${parsedGenLabs.missingFeatures}`);

  // TEST 4: Complete 8 Pima Features Payload -> Successful Inference
  const completePimaPayload = JSON.stringify({
    preg: 6,
    plas: 148,
    pres: 72,
    skin: 35,
    insu: 120,
    mass: 33.6,
    pedi: 0.627,
    age: 50
  });
  const resComplete = await runPythonScript([predictScript, completePimaPayload], baseDir);
  let parsedComplete = {};
  try { parsedComplete = JSON.parse(resComplete.stdout.trim()); } catch (e) {}

  assert(resComplete.code === 0 && parsedComplete.status === 'SUCCESS', 'TEST 4: Complete 8 Pima Feature Set Payload Yields Successful Inference');

  // TEST 5: Raw Probability Range (0.0 <= p <= 1.0) & Decimal Representation
  const rawProb = parsedComplete.estimatedProbability;
  assert(typeof rawProb === 'number' && rawProb >= 0.0 && rawProb <= 1.0, 'TEST 5: Probability Stored & Returned as Valid Decimal (0.0 <= prob <= 1.0)', `Raw Prob: ${rawProb}`);

  // TEST 6: Target Terminology (Positive / Negative Outcome)
  const outcome = parsedComplete.predictedOutcome;
  assert(outcome === 'Positive' || outcome === 'Negative', 'TEST 6: Preserved Dataset Target Terminology (Positive / Negative)', `Outcome: ${outcome}`);

  // TEST 7: Invalid Negative Value Rejection (Glucose = -20)
  const invalidNegPayload = JSON.stringify({
    preg: 6, plas: -20, pres: 72, skin: 35, insu: 120, mass: 33.6, pedi: 0.627, age: 50
  });
  const resInvalid = await runPythonScript([predictScript, invalidNegPayload], baseDir);
  let parsedInvalid = {};
  try { parsedInvalid = JSON.parse(resInvalid.stdout.trim()); } catch (e) {}

  assert(parsedInvalid.status === 'INVALID_DATA' && parsedInvalid.invalidFeatures.length > 0, 'TEST 7: Invalid Negative Measurement Rejection (Glucose = -20 mg/dL)', `Status: ${parsedInvalid.status}`);

  // TEST 8: Suspicious Extreme Value Flagging (Glucose = 350 mg/dL)
  const suspiciousPayload = JSON.stringify({
    preg: 6, plas: 350, pres: 72, skin: 35, insu: 120, mass: 33.6, pedi: 0.627, age: 50
  });
  const resSuspicious = await runPythonScript([predictScript, suspiciousPayload], baseDir);
  let parsedSuspicious = {};
  try { parsedSuspicious = JSON.parse(resSuspicious.stdout.trim()); } catch (e) {}

  assert(parsedSuspicious.status === 'SUCCESS' && parsedSuspicious.suspiciousFeatures.length > 0, 'TEST 8: Suspicious Extreme Measurement Flagged without Silent Modification', `Suspicious count: ${parsedSuspicious.suspiciousFeatures ? parsedSuspicious.suspiciousFeatures.length : 0}`);

  // TEST 9: Calibration Brier Score Verification
  let meta = {};
  if (fs.existsSync(metaPath)) meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  const brier = meta.selected_model_test_metrics ? meta.selected_model_test_metrics.brier_score : 0;
  assert(brier > 0.0 && brier < 0.3, 'TEST 9: Held-Out Calibration Brier Score Calculated & Stored', `Brier Score: ${brier}`);

  // TEST 10: Model Card Artifact Verification
  assert(fs.existsSync(cardPath), 'TEST 10: Model Card Artifact Exists (model_card.md)');

  console.log('\n================================================================');
  console.log(`📊 PRIORITY 2 TEST SUITE RESULTS: ${passed} / ${passed + failed} PASSED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPriority2TestSuite().catch(err => {
  console.error('Test runner exception:', err);
  process.exit(1);
});
