const http = require('http');
const assert = require('assert');
const { computeModelReadiness } = require('../services/pimaFeatureMapper');
const { getReportRecord } = require('../db/database');

function makeRequest(method, pathUrl, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: pathUrl,
      method: method,
      headers: headers
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function buildMultipartPayload(filename, content, mimeType = 'text/plain') {
  const boundary = '----WebKitFormBoundaryTest' + Math.random().toString(36).substring(2);
  let payload = '';
  payload += `--${boundary}\r\n`;
  payload += `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`;
  payload += `Content-Type: ${mimeType}\r\n\r\n`;
  payload += content;
  payload += `\r\n--${boundary}--\r\n`;

  return {
    boundary,
    body: Buffer.from(payload, 'utf8')
  };
}

async function runRegressionTests() {
  console.log('================================================================');
  console.log('🧪 MediAgent Model Readiness & Extraction Integration Test Suite');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function testAssert(condition, name, details = '') {
    if (condition) {
      console.log(`  ✅ ${name} — PASSED`);
      passed++;
    } else {
      console.error(`  ❌ ${name} — FAILED: ${details}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // SCENARIO A: General lab report with NO Pima-compatible features
    // -------------------------------------------------------------
    console.log('\n--- Scenario A: General Lab Report (No Pima Features) ---');
    const generalLabsReport = `
COMPREHENSIVE HEMATOLOGY & RENAL REPORT
HEMOGLOBIN: 14.2 g/dL (13.0-17.0)
WBC COUNT: 6800 cells/µL (4000-11000)
PLATELETS: 220000 cells/µL (150000-450000)
SERUM CREATININE: 0.9 mg/dL (0.6-1.2)
BLOOD UREA NITROGEN: 15 mg/dL (7-20)
SERUM SODIUM: 139 mEq/L (135-145)
SERUM POTASSIUM: 4.1 mEq/L (3.5-5.0)
CHLORIDE: 102 mEq/L (96-106)
TOTAL BILIRUBIN: 0.7 mg/dL (0.2-1.2)
ALT: 24 U/L (7-56)
AST: 21 U/L (10-40)
`;
    const payloadA = buildMultipartPayload('general_panel_no_pima.pdf', generalLabsReport, 'application/pdf');
    const uploadResA = await makeRequest('POST', '/api/reports/upload', {
      'Content-Type': `multipart/form-data; boundary=${payloadA.boundary}`,
      'Content-Length': payloadA.body.length
    }, payloadA.body);

    const reportA = uploadResA.body.report;
    const readinessA = uploadResA.body.modelReadiness;
    const predA = uploadResA.body.prediction;

    testAssert(
      uploadResA.status === 201 && reportA && reportA.labResults.length >= 10,
      'Scenario A.1: Preserves all valid generic results without deletion',
      `Extracted count: ${reportA ? reportA.labResults.length : 0}`
    );

    // No Pima features present in general labs (none of preg, plas, pres, skin, insu, mass, pedi)
    // Note: if patient demographics Sarah Johnson (age 45) is associated, age may be 1/8, or 0/8 if no demographics
    testAssert(
      readinessA && readinessA.status === 'INSUFFICIENT_DATA',
      'Scenario A.2: Readiness status is INSUFFICIENT_DATA',
      `Status: ${readinessA ? readinessA.status : 'undefined'}`
    );

    testAssert(
      predA && predA.status === 'INSUFFICIENT_DATA' && predA.probability === 0.0,
      'Scenario A.3: Model does NOT run inference when required features missing',
      `Prediction status: ${predA ? predA.status : 'undefined'}`
    );

    testAssert(
      readinessA.missingFeatures.includes('plas') && readinessA.missingFeatures.includes('pres') && readinessA.missingFeatures.includes('skin'),
      'Scenario A.4: Missing features are explicitly identified and enumerated',
      `Missing: ${readinessA.missingFeatures.join(', ')}`
    );

    // -------------------------------------------------------------
    // SCENARIO B: Report containing some safely mappable features (e.g. 3/8)
    // -------------------------------------------------------------
    console.log('\n--- Scenario B: Partial Mappable Features (e.g. Glucose + BP + Age) ---');
    const partialReport = `
METABOLIC LAB REPORT
Patient Age / Sex: 45 Y / Female
FASTING BLOOD SUGAR: 165 mg/dL (70-99)
DIASTOLIC BLOOD PRESSURE: 84 mmHg (60-80)
SERUM CREATININE: 1.0 mg/dL (0.6-1.2)
TOTAL CHOLESTEROL: 210 mg/dL (<200)
TRIGLYCERIDES: 180 mg/dL (<150)
HEMOGLOBIN: 13.8 g/dL (12.0-16.0)
`;
    const payloadB = buildMultipartPayload('partial_metabolic.pdf', partialReport, 'application/pdf');
    const uploadResB = await makeRequest('POST', '/api/reports/upload', {
      'Content-Type': `multipart/form-data; boundary=${payloadB.boundary}`,
      'Content-Length': payloadB.body.length
    }, payloadB.body);

    const reportB = uploadResB.body.report;
    const readinessB = uploadResB.body.modelReadiness;
    const predB = uploadResB.body.prediction;

    testAssert(
      reportB && reportB.labResults.length >= 6,
      'Scenario B.1: Displays all valid generic laboratory results',
      `Extracted: ${reportB ? reportB.labResults.length : 0}`
    );

    // Safely mapped: plas (165), pres (84), age (45) -> available = 3, missing = 5
    testAssert(
      readinessB && readinessB.availableFeatures === 3 && readinessB.missingFeatures.length === 5,
      'Scenario B.2: Reports exactly 3/8 available features and 5 missing features',
      `Available: ${readinessB.availableFeatures}, Missing: ${readinessB.missingFeatures.length}`
    );

    testAssert(
      readinessB.featureValues.plas === 165 && readinessB.featureValues.pres === 84 && readinessB.featureValues.age === 45,
      'Scenario B.3: Feature values accurately mapped from Fasting Blood Sugar, Diastolic BP, and Demographics',
      JSON.stringify(readinessB.featureValues)
    );

    testAssert(
      predB.status === 'INSUFFICIENT_DATA',
      'Scenario B.4: Model inference safely blocked while 5 features remain missing',
      `Prediction status: ${predB.status}`
    );

    // -------------------------------------------------------------
    // SCENARIO C: Report containing ALL 8 valid required features
    // -------------------------------------------------------------
    console.log('\n--- Scenario C: All 8 Valid Required Features ---');
    const fullPimaReport = `
PIMA CLINICAL SCREENING EVALUATION REPORT
Patient: Maria Hernandez
Age: 50 Y
Pregnancies: 6 count (0-20)
Plasma Glucose: 148 mg/dL (70-99)
Diastolic Blood Pressure: 72 mmHg (60-80)
Triceps Skin Fold: 35 mm (10-50)
2-Hour Serum Insulin: 120 uU/mL (15-276)
Body Mass Index: 33.6 kg/m2 (18.5-24.9)
Diabetes Pedigree Function: 0.627 score (0.05-2.5)
`;
    const payloadC = buildMultipartPayload('full_pima_panel.pdf', fullPimaReport, 'application/pdf');
    const uploadResC = await makeRequest('POST', '/api/reports/upload', {
      'Content-Type': `multipart/form-data; boundary=${payloadC.boundary}`,
      'Content-Length': payloadC.body.length
    }, payloadC.body);

    const reportC = uploadResC.body.report;
    const readinessC = uploadResC.body.modelReadiness;
    const predC = uploadResC.body.prediction;

    testAssert(
      readinessC && readinessC.availableFeatures === 8 && readinessC.missingFeatures.length === 0,
      'Scenario C.1: Reports 8/8 available features with 0 missing',
      `Available: ${readinessC.availableFeatures}, Missing: ${readinessC.missingFeatures.length}`
    );

    testAssert(
      readinessC.status === 'READY',
      'Scenario C.2: Model readiness status evaluates to READY',
      `Status: ${readinessC.status}`
    );

    testAssert(
      predC && predC.status === 'SUCCESS' && typeof predC.probability === 'number' && predC.probability > 0,
      'Scenario C.3: Saved model executes legitimate inference returning valid decimal probability',
      `Probability: ${predC.probability}, Outcome: ${predC.predictedClass}`
    );

    testAssert(
      predC.shapExplanation && Array.isArray(predC.shapExplanation.features) && predC.shapExplanation.features.length === 8,
      'Scenario C.4: Real mathematical SHAP explanation generated with 8 feature contributions',
      `SHAP features count: ${predC.shapExplanation ? predC.shapExplanation.features.length : 0}`
    );

    // -------------------------------------------------------------
    // SCENARIO D: Sequential distinct report isolation
    // -------------------------------------------------------------
    console.log('\n--- Scenario D: Report Isolation and State Reset ---');
    // Upload a new report D after C
    const reportDContent = `
RENAL ONLY REPORT
SERUM CREATININE: 1.4 mg/dL (0.6-1.2)
eGFR: 58 mL/min (>90)
BLOOD UREA NITROGEN: 28 mg/dL (7-20)
`;
    const payloadD = buildMultipartPayload('renal_isolated.pdf', reportDContent, 'application/pdf');
    const uploadResD = await makeRequest('POST', '/api/reports/upload', {
      'Content-Type': `multipart/form-data; boundary=${payloadD.boundary}`,
      'Content-Length': payloadD.body.length
    }, payloadD.body);

    const reportD = uploadResD.body.report;
    const readinessD = uploadResD.body.modelReadiness;
    const predD = uploadResD.body.prediction;

    testAssert(
      reportD.id !== reportC.id,
      'Scenario D.1: Consecutive uploads assign distinct unique Report IDs',
      `Report C: ${reportC.id}, Report D: ${reportD.id}`
    );

    testAssert(
      readinessD.status === 'INSUFFICIENT_DATA' && predD.status === 'INSUFFICIENT_DATA',
      'Scenario D.2: Report D does NOT inherit Report C readiness status or prediction',
      `Report D Readiness: ${readinessD.status}, Prediction: ${predD.status}`
    );

    testAssert(
      predD.shapExplanation === undefined || predD.probability === 0.0,
      'Scenario D.3: Report D does NOT inherit Report C SHAP explanation',
      `Report D Probability: ${predD.probability}`
    );

    // Verify GET /api/reports/:id retrieves report-specific modelReadiness
    const getResC = await makeRequest('GET', `/api/reports/${reportC.id}`);
    const getResD = await makeRequest('GET', `/api/reports/${reportD.id}`);

    testAssert(
      getResC.body.modelReadiness.status === 'READY' && getResD.body.modelReadiness.status === 'INSUFFICIENT_DATA',
      'Scenario D.4: GET /api/reports/:id retrieves isolated, report-specific modelReadiness',
      `C: ${getResC.body.modelReadiness.status}, D: ${getResD.body.modelReadiness.status}`
    );

    // -------------------------------------------------------------
    // SCENARIO E: Unreadable / ambiguous / invalid laboratory rows
    // -------------------------------------------------------------
    console.log('\n--- Scenario E: Ambiguous & Invalid Laboratory Rows ---');
    const ambiguousReport = `
AMBIGUOUS & EXTREME LAB REPORT
HbA1c: 8.5 % (4.0-5.6)
Blood Pressure: 125 mmHg
Glucose: -25 mg/dL
Urine Glucose: 50 mg/dL
`;
    const payloadE = buildMultipartPayload('ambiguous_panel.pdf', ambiguousReport, 'application/pdf');
    const uploadResE = await makeRequest('POST', '/api/reports/upload', {
      'Content-Type': `multipart/form-data; boundary=${payloadE.boundary}`,
      'Content-Length': payloadE.body.length
    }, payloadE.body);

    const readinessE = uploadResE.body.modelReadiness;
    const predE = uploadResE.body.prediction;

    testAssert(
      readinessE.featureValues.plas === undefined,
      'Scenario E.1: Negative Glucose (-25) is NOT silently mapped to a valid feature',
      `plas in featureValues: ${readinessE.featureValues.plas}`
    );

    const plasDiag = readinessE.mappingDiagnostics.find(d => d.feature === 'plas');
    testAssert(
      plasDiag && (plasDiag.status === 'INVALID' || plasDiag.status === 'MISSING'),
      'Scenario E.2: Negative Glucose is flagged as INVALID or MISSING in mapping diagnostics',
      `Diagnostic status: ${plasDiag ? plasDiag.status : 'none'}, Reason: ${plasDiag ? plasDiag.reason : 'none'}`
    );

    const presDiag = readinessE.mappingDiagnostics.find(d => d.feature === 'pres');
    testAssert(
      presDiag && (presDiag.status === 'AMBIGUOUS' || presDiag.status === 'MISSING'),
      'Scenario E.3: Generic single-number Blood Pressure is flagged as AMBIGUOUS or MISSING',
      `Diagnostic: ${presDiag ? presDiag.status : 'none'}, Reason: ${presDiag ? presDiag.reason : 'none'}`
    );

    testAssert(
      readinessE.featureValues.pres === undefined,
      'Scenario E.4: Ambiguous Blood Pressure without diastolic designation is NOT mapped to pres',
      `pres in featureValues: ${readinessE.featureValues.pres}`
    );

    testAssert(
      uploadResE.body.prediction.status === 'INVALID_DATA' || uploadResE.body.prediction.status === 'INSUFFICIENT_DATA',
      'Scenario E.5: Model prediction safely rejected due to invalid/insufficient data',
      `Status: ${uploadResE.body.prediction.status}`
    );

    // -------------------------------------------------------------
    // SCENARIO F: Default Demo Report REP-9001 Seeding & 20 Parameters
    // -------------------------------------------------------------
    console.log('\n--- Scenario F: Default Report REP-9001 Persistence ---');
    const rep9001Record = getReportRecord('REP-9001');
    const getRes9001 = await makeRequest('GET', '/api/reports/REP-9001');

    testAssert(
      rep9001Record && rep9001Record.labResults.length === 20,
      'Scenario F.1: Default report REP-9001 contains exactly 20 generic lab parameters',
      `Lab count: ${rep9001Record ? rep9001Record.labResults.length : 0}`
    );

    testAssert(
      getRes9001.status === 200 && getRes9001.body.modelReadiness && getRes9001.body.modelReadiness.availableFeatures === 3,
      'Scenario F.2: REP-9001 returns 3/8 available features (plas, pres, age) and 5 missing',
      `Available: ${getRes9001.body.modelReadiness ? getRes9001.body.modelReadiness.availableFeatures : 0}`
    );

    testAssert(
      getRes9001.body.modelReadiness.status === 'INSUFFICIENT_DATA',
      'Scenario F.3: REP-9001 status is INSUFFICIENT_DATA',
      `Status: ${getRes9001.body.modelReadiness ? getRes9001.body.modelReadiness.status : 'none'}`
    );

    console.log('\n================================================================');
    console.log(`📊 INTEGRATION REGRESSION SUITE: ${passed} / ${passed + failed} PASSED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test Suite Unexpected Exception:', err);
    process.exit(1);
  }
}

runRegressionTests();
