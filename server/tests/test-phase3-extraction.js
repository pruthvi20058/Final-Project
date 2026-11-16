const fs = require('fs');
const path = require('path');
const http = require('http');
const { parseLabValuesFromText, extractTextFromFile, normalizeLabName } = require('../services/reportParser');

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

async function runPhase3ExtractionTests() {
  console.log('================================================================');
  console.log('🧪 MediAgent Phase 3 Complete Lab Extraction Integration Test Suite');
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

  // Sample Multi-Parameter Clinical Report Text (15+ Parameters)
  const multiLabReportText = `
--- Page 1 ---
COMPREHENSIVE CLINICAL METABOLIC & HEMATOLOGY PANEL
Patient: Sarah Johnson | ID: PAT-8001 | Date: 2026-10-04

GLUCOSE FASTING: 142 mg/dL (70-99)
HbA1c: 7.2 % (4.0-5.6)
Hemoglobin: 13.5 g/dL (12.0-16.0)
WBC Count: 6800 cells/uL (4000-11000)
Platelets: 245000 /uL (150000-450000)
Serum Creatinine: 1.1 mg/dL (0.6-1.2)
eGFR: 92 mL/min/1.73m2 (> 90)
BUN: 14 mg/dL (7-20)
ALT (SGPT): 42 U/L (7-56)
AST (SGOT): 35 U/L (10-40)
Total Cholesterol: 210 mg/dL (< 200)
Triglycerides: 180 mg/dL (< 150)
HDL Cholesterol: 45 mg/dL (> 40)
LDL Cholesterol: 129 mg/dL (< 100)
Serum Sodium: 140 mEq/L (135-145)
Serum Potassium: 4.2 mEq/L (3.5-5.0)
TSH: 2.1 mIU/L (0.4-4.0)
`;

  // TEST 1: Multi-Parameter Report Extraction (ALL 17 Parameters Extracted)
  const { results: multiResults, discardedCandidates } = parseLabValuesFromText(multiLabReportText, 'PDF_PARSE');
  assert(multiResults.length >= 15, 'Extraction Engine Captures ALL Detectable Lab Values (>= 15 items)', `Extracted ${multiResults.length} parameters`);

  // TEST 2: Non-ML Parameters Preserved (Hemoglobin, ALT, AST, TSH, Sodium are NOT discarded)
  const hasHgb = multiResults.some(r => r.normalizedName === 'hemoglobin');
  const hasAlt = multiResults.some(r => r.normalizedName === 'alt');
  const hasTsh = multiResults.some(r => r.normalizedName === 'tsh');
  const hasNa = multiResults.some(r => r.normalizedName === 'sodium');
  assert(hasHgb && hasAlt && hasTsh && hasNa, 'Non-ML Laboratory Parameters Preserved without Deletion');

  // TEST 3: Preservation of Raw Test Name and Normalized Name
  const hgbItem = multiResults.find(r => r.normalizedName === 'hemoglobin');
  const rawPreserved = hgbItem && hgbItem.rawName === 'Hemoglobin' && hgbItem.testName === 'Hemoglobin';
  assert(rawPreserved, 'Both rawName and normalizedName Preserved', `rawName: ${hgbItem ? hgbItem.rawName : 'N/A'}, normalized: ${hgbItem ? hgbItem.normalizedName : 'N/A'}`);

  // TEST 4: Units and Reference Ranges Preserved
  const glucoseItem = multiResults.find(r => r.normalizedName === 'glucose');
  const refStr = typeof (glucoseItem && glucoseItem.referenceRange) === 'string' ? glucoseItem.referenceRange : (glucoseItem && glucoseItem.referenceRange ? glucoseItem.referenceRange.raw : '');
  const unitsPreserved = glucoseItem && glucoseItem.units === 'mg/dL' && refStr.includes('70-99');
  assert(unitsPreserved, 'Units and Reference Ranges Preserved from Document', `Unit: ${glucoseItem ? glucoseItem.units : 'N/A'}, Range: ${refStr}`);

  // TEST 5: Source Line and Page Tracking Preserved
  const pageTracked = glucoseItem && glucoseItem.source && glucoseItem.source.page === 1 && glucoseItem.source.text.includes('GLUCOSE FASTING');
  assert(pageTracked, 'Page Number and Line Source Text Tracked per Extracted Result');

  // TEST 6: True Null Confidence (No Fabricated 0.95 or 96)
  const trueNullConf = glucoseItem && glucoseItem.confidence === null;
  assert(trueNullConf, 'True Null Confidence (No Fabricated 0.95 or 96)');

  // TEST 7: Table Layout Pattern Extraction (TEST | RESULT | UNIT | RANGE)
  const tableText = `
TEST NAME       RESULT   UNITS      REF RANGE
Glucose         148      mg/dL      70-99
Creatinine      1.2      mg/dL      0.6-1.2
ALT             45       U/L        7-56
`;
  const { results: tableResults } = parseLabValuesFromText(tableText, 'PDF_PARSE');
  assert(tableResults.length === 3, 'Generic Multi-Column Table Layout Extraction Supported', `Extracted ${tableResults.length} table rows`);

  // TEST 8: Backend HTTP Upload Endpoint returns separate reportExtraction and modelReadiness
  const payload = buildMultipartPayload('complete_panel.pdf', multiLabReportText, 'application/pdf');
  const uploadRes = await makeRequest('POST', '/api/reports/upload', {
    'Content-Type': `multipart/form-data; boundary=${payload.boundary}`,
    'Content-Length': payload.body.length
  }, payload.body);

  const hasExtractionObj = uploadRes.body && uploadRes.body.reportExtraction && uploadRes.body.reportExtraction.totalResults >= 15;
  const hasReadinessObj = uploadRes.body && uploadRes.body.modelReadiness && uploadRes.body.modelReadiness.model === 'pima_diabetes';
  assert(uploadRes.status === 201 && hasExtractionObj && hasReadinessObj, 'Upload API Returns Separate reportExtraction and modelReadiness Objects');

  // TEST 9: Extraction Debug Endpoint (GET /api/reports/:id/extraction-debug)
  const reportId = uploadRes.body.report.id;
  const debugRes = await makeRequest('GET', `/api/reports/${reportId}/extraction-debug`);
  const debugOk = debugRes.status === 200 && debugRes.body.rawText && debugRes.body.totalExtracted >= 15 && Array.isArray(debugRes.body.discardedCandidates);
  assert(debugOk, 'Extraction Debug Endpoint (GET /api/reports/:id/extraction-debug) Functioning');

  // TEST 10: Data Quality Classification (VALID vs SUSPICIOUS vs INVALID)
  const invalidText = "Glucose: -20 mg/dL\nHbA1c: 7.2 %";
  const { results: invalidResults } = parseLabValuesFromText(invalidText, 'GENERIC');
  const negGlucose = invalidResults.find(r => r.normalizedName === 'glucose');
  assert(negGlucose && negGlucose.quality === 'INVALID', 'Data Quality Engine Flags Negative Values as INVALID');

  console.log('\n================================================================');
  console.log(`📊 PHASE 3 EXTRACTION TEST SUITE RESULTS: ${passed} / ${passed + failed} PASSED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3ExtractionTests().catch(err => {
  console.error('Phase 3 Extraction Test Exception:', err);
  process.exit(1);
});
