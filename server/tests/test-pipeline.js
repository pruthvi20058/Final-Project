const fs = require('fs');
const path = require('path');
const http = require('http');
const { getDb } = require('../db/database');
const { runPythonInference } = require('../services/predictionService');

// Helper to make HTTP request to running backend
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

// Multipart FormData Builder for Node without external dependencies
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
  console.log("=======================================================");
  console.log("🧪 MediAgent Master Automated Integration Test Suite");
  console.log("=======================================================\n");

  let passedCount = 0;
  let totalCount = 0;

  function assertTest(name, condition, details = '') {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`  ✅ TEST ${totalCount}: ${name} — PASSED`);
    } else {
      console.error(`  ❌ TEST ${totalCount}: ${name} — FAILED (${details})`);
    }
  }

  try {
    // TEST 1 — Health Check
    const health = await makeRequest('GET', '/api/stats');
    assertTest('Backend Health Check', health.status === 200 && health.body.totalPatients !== undefined);

    // TEST 2 — Valid Diabetes Report Upload
    const diabetesContent = "METABOLIC LABORATORY REPORT\nGLUCOSE FASTING: 185 mg/dL (70-99)\nHbA1c: 8.1 % (4.0-5.6)\nSERUM CREATININE: 1.0 mg/dL (0.6-1.2)";
    const payloadA = buildMultipartPayload('diabetes_report.pdf', diabetesContent, 'application/pdf');
    const uploadA = await makeRequest('POST', '/api/reports/upload', {
      'Content-Type': `multipart/form-data; boundary=${payloadA.boundary}`,
      'Content-Length': payloadA.body.length
    }, payloadA.body);

    const reportA = uploadA.body && uploadA.body.report;
    const predA = uploadA.body && uploadA.body.prediction;
    assertTest('Valid Diabetes Report Upload Payload', uploadA.status === 201 && reportA && reportA.id, JSON.stringify(uploadA.body));

    // TEST 3 — Lab Value Extraction Accuracy (Case Insensitive Match)
    const glucoseResult = reportA && reportA.labResults && reportA.labResults.find(l => (l.testName || l.test_name || '').toLowerCase().includes('glucose'));
    const hba1cResult = reportA && reportA.labResults && reportA.labResults.find(l => (l.testName || l.test_name || '').toLowerCase().includes('hba1c'));
    assertTest('Exact Lab Parameter Extraction (Glucose = 185, HbA1c = 8.1)', glucoseResult && glucoseResult.value === 185 && hba1cResult && hba1cResult.value === 8.1);

    // TEST 4 — Second Distinct Report Upload
    const anemiaContent = "BLOOD LABORATORY REPORT\nGLUCOSE: 92 mg/dL (70-99)\nHEMOGLOBIN: 8.2 g/dL (13.0-17.0)\nWBC COUNT: 6800 /uL (4000-11000)";
    const payloadB = buildMultipartPayload('anemia_report.pdf', anemiaContent, 'application/pdf');
    const uploadB = await makeRequest('POST', '/api/reports/upload', {
      'Content-Type': `multipart/form-data; boundary=${payloadB.boundary}`,
      'Content-Length': payloadB.body.length
    }, payloadB.body);

    const reportB = uploadB.body && uploadB.body.report;
    const predB = uploadB.body && uploadB.body.prediction;
    assertTest('Second Distinct Report Upload', uploadB.status === 201 && reportB && reportB.id !== reportA.id);

    // TEST 5 — Report Isolation Test
    const getReportA = await makeRequest('GET', `/api/reports/${reportA.id}`);
    const getReportB = await makeRequest('GET', `/api/reports/${reportB.id}`);
    assertTest('Report Isolation (Report A fetchable by ID != Report B)', getReportA.status === 200 && getReportB.status === 200 && getReportA.body.report.id !== getReportB.body.report.id);

    // TEST 6 — Re-Upload Independence
    const uploadA2 = await makeRequest('POST', '/api/reports/upload', {
      'Content-Type': `multipart/form-data; boundary=${payloadA.boundary}`,
      'Content-Length': payloadA.body.length
    }, payloadA.body);
    assertTest('Re-Upload Generates Unique Report ID', uploadA2.status === 201 && uploadA2.body.report.id !== reportA.id);

    // TEST 7 — Empty File Handling
    const emptyPayload = buildMultipartPayload('empty.pdf', '', 'application/pdf');
    const uploadEmpty = await makeRequest('POST', '/api/reports/upload', {
      'Content-Type': `multipart/form-data; boundary=${emptyPayload.boundary}`,
      'Content-Length': emptyPayload.body.length
    }, emptyPayload.body);
    assertTest('Empty File Payload Rejection (HTTP 400)', uploadEmpty.status === 400 && uploadEmpty.body.error.code === 'EMPTY_FILE');

    // TEST 8 — Invalid Unsupported File Type (.exe)
    const exePayload = buildMultipartPayload('malware.exe', 'binarycontent', 'application/x-msdownload');
    const uploadExe = await makeRequest('POST', '/api/reports/upload', {
      'Content-Type': `multipart/form-data; boundary=${exePayload.boundary}`,
      'Content-Length': exePayload.body.length
    }, exePayload.body);
    assertTest('Unsupported File Type Rejection (.exe)', uploadExe.status === 400 && uploadExe.body.error.code === 'UNSUPPORTED_FILE_TYPE');

    // TEST 9 — Invalid Non-Existent Report ID (404)
    const getInvalid = await makeRequest('GET', '/api/reports/REP-INVALID-999');
    assertTest('Invalid Report ID Returns HTTP 404', getInvalid.status === 404 && getInvalid.body.error.code === 'REPORT_NOT_FOUND');

    // TEST 10 — Missing Model Features Safety
    const mlPythonTest = await runPythonInference({ bmi: 33.6, age: 50 });
    const hasMissing = mlPythonTest.status === 'INSUFFICIENT_DATA' && (mlPythonTest.missingFeatures.includes('plas') || mlPythonTest.missingFeatures.includes('glucose'));
    assertTest('ML Python Inference Missing Features Rejection', hasMissing);

    // TEST 11 — Model Loading Verification
    const artifactsExist = fs.existsSync(path.join(__dirname, '..', 'ml', 'models', 'diabetes', 'model.joblib'));
    assertTest('Model Joblib Artifact Exists on Disk', artifactsExist);

    // TEST 12 — Probability Range Verification
    assertTest('Valid ML Probability Bounds (0 <= proba <= 100)', predA.probability >= 0 && predA.probability <= 100);

    // TEST 13 — Database SQLite Persistence
    const db = getDb();
    const dbRecord = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportA.id);
    assertTest('Database SQLite Persistence Verification', dbRecord && dbRecord.id === reportA.id);

  } catch (err) {
    console.error('❌ Test Suite Exception:', err);
  }

  console.log("\n=======================================================");
  console.log(`📊 MASTER TEST SUITE RESULTS: ${passedCount} / ${totalCount} PASSED`);
  console.log("=======================================================\n");

  if (passedCount === totalCount) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
