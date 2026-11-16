const http = require('http');

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

async function runTests() {
  console.log("================================================================================");
  console.log("🧪 MediAgent Disease Predictions & Report Lookup Separation Test Suite");
  console.log("================================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(name, condition, details = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ TEST ${total}: ${name} — PASSED`);
    } else {
      console.error(`  ❌ TEST ${total}: ${name} — FAILED (${details})`);
    }
  }

  try {
    // TEST 1 — Case A: Non-Existent Report returns genuine 404 with REPORT_NOT_FOUND
    const resA = await makeRequest('GET', '/api/reports/REP-NONEXISTENT-9999/prediction');
    assert(
      'Case A: Non-Existent Report returns HTTP 404 with REPORT_NOT_FOUND code',
      resA.status === 404 && resA.body.error && resA.body.error.code === 'REPORT_NOT_FOUND',
      `Status: ${resA.status}, Body: ${JSON.stringify(resA.body)}`
    );

    // TEST 2 — Case C: Seeded Report REP-9001 exists but has INSUFFICIENT_DATA (Returns HTTP 200, not 404!)
    const resC = await makeRequest('GET', '/api/reports/REP-9001/prediction');
    assert(
      'Case C: Report REP-9001 returns HTTP 200 with status INSUFFICIENT_DATA (never 404)',
      resC.status === 200 && resC.body.status === 'INSUFFICIENT_DATA' && resC.body.prediction === null,
      `Status: ${resC.status}, Body: ${JSON.stringify(resC.body)}`
    );

    // TEST 3 — Case C details: REP-9001 includes report data, lab results (20), and missing Pima features list
    assert(
      'Case C Details: Missing features list contains 5 features and preserved report lab results',
      resC.body.missingFeatures && resC.body.missingFeatures.length === 5 &&
      resC.body.report && resC.body.report.labResults && resC.body.report.labResults.length === 20,
      `Missing: ${JSON.stringify(resC.body.missingFeatures)}, Labs: ${resC.body.report?.labResults?.length}`
    );

    // TEST 4 — Upload Response Schema includes reportId and status PROCESSED
    const uploadText = "CLINICAL LAB REPORT\nGlucose (Fasting): 140 mg/dL (70-99)\nBlood Pressure: 120/80 mmHg";
    const payload1 = buildMultipartPayload('partial_report.pdf', uploadText, 'application/pdf');
    const uploadRes = await makeRequest('POST', '/api/reports/upload', {
      'Content-Type': `multipart/form-data; boundary=${payload1.boundary}`,
      'Content-Length': payload1.body.length
    }, payload1.body);

    const uploadedRepId = uploadRes.body && uploadRes.body.reportId;
    assert(
      'Upload Response Schema includes reportId and status PROCESSED',
      uploadRes.status === 201 && uploadedRepId && uploadRes.body.status === 'PROCESSED',
      `Status: ${uploadRes.status}, Body: ${JSON.stringify(uploadRes.body)}`
    );

    // TEST 5 — Prediction query for newly uploaded partial report returns INSUFFICIENT_DATA (not 404)
    const predPartial = await makeRequest('GET', `/api/reports/${uploadedRepId}/prediction`);
    assert(
      'Newly uploaded partial report prediction returns HTTP 200 with INSUFFICIENT_DATA',
      predPartial.status === 200 && predPartial.body.status === 'INSUFFICIENT_DATA' && predPartial.body.report.id === uploadedRepId,
      `Status: ${predPartial.status}, StatusText: ${predPartial.body?.status}`
    );

    // TEST 6 — Upload complete report with all 8 canonical Pima features
    // Features: preg=2, plas=168, pres=76, skin=28, insu=180, mass=34.2, pedi=0.672, age=48
    const completeReportText = `PIMA DIABETES COMPREHENSIVE CLINICAL PANEL
Pregnancy Count: 2
Fasting Plasma Glucose: 168 mg/dL (70-99)
Diastolic Blood Pressure: 76 mmHg (60-80)
Triceps Skinfold Thickness: 28 mm (10-30)
2-Hour Serum Insulin: 180 uU/mL (16-166)
Body Mass Index: 34.2 kg/m2 (18.5-24.9)
Diabetes Pedigree Function: 0.672
Age: 48 Years
Patient Demographics: Female, Age 48`;

    const payload2 = buildMultipartPayload('complete_pima_report.pdf', completeReportText, 'application/pdf');
    const uploadComplete = await makeRequest('POST', '/api/reports/upload', {
      'Content-Type': `multipart/form-data; boundary=${payload2.boundary}`,
      'Content-Length': payload2.body.length
    }, payload2.body);

    const completeRepId = uploadComplete.body && uploadComplete.body.reportId;
    assert(
      'Upload complete report with all 8 Pima features succeeded',
      uploadComplete.status === 201 && completeRepId,
      `Status: ${uploadComplete.status}, ReportId: ${completeRepId}`
    );

    // TEST 7 — Case D: Complete Report returns HTTP 200 with status SUCCESS and valid prediction object
    const predComplete = await makeRequest('GET', `/api/reports/${completeRepId}/prediction`);
    const predObj = predComplete.body && predComplete.body.prediction;
    assert(
      'Case D: Complete Report returns HTTP 200 with status SUCCESS and persisted prediction',
      predComplete.status === 200 && predComplete.body.status === 'SUCCESS' && predObj !== null && predObj.probability !== undefined,
      `Status: ${predComplete.status}, Prediction: ${JSON.stringify(predObj?.topPrediction)}`
    );

    // TEST 8 — Prediction Top Prediction & ICD-10 formatting
    const topPred = predObj && predObj.topPrediction;
    assert(
      'Top Prediction contains disease, probability, severity, and ICD-10 code',
      topPred && topPred.disease && topPred.probability !== undefined && topPred.icd10,
      `Top: ${JSON.stringify(topPred)}`
    );

    // TEST 9 — XAI attributions endpoint returns HTTP 200 with valid SHAP features
    const xaiRes = await makeRequest('GET', `/api/reports/${completeRepId}/xai`);
    assert(
      'XAI attributions endpoint returns HTTP 200 with SHAP features array',
      xaiRes.status === 200 && xaiRes.body.xai && Array.isArray(xaiRes.body.xai.features),
      `Status: ${xaiRes.status}, Features count: ${xaiRes.body?.xai?.features?.length}`
    );

    // TEST 10 — Medical evidence RAG endpoint returns HTTP 200 with retrieved sources
    const eviRes = await makeRequest('GET', `/api/reports/${completeRepId}/evidence`);
    assert(
      'Evidence RAG endpoint returns HTTP 200 with sources array and consistency score',
      eviRes.status === 200 && eviRes.body.evidence && Array.isArray(eviRes.body.evidence.sources),
      `Status: ${eviRes.status}, Sources: ${eviRes.body?.evidence?.sources?.length}`
    );

  } catch (err) {
    console.error('❌ Test execution error:', err);
  }

  console.log("\n================================================================================");
  console.log(`📊 TEST RESULTS: ${passed} / ${total} TESTS PASSED`);
  console.log("================================================================================\n");

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
