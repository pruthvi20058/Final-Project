/**
 * MediAgent Phase 3 Spatial Layout & Table Extraction Test Suite
 * Validates layout-aware multi-column laboratory document parsing and zero false positives
 */

const assert = require('assert');
const { parseLabValuesFromText, normalizeLabName, VALID_UNITS } = require('../services/reportParser');

let passed = 0;
let failed = 0;

function runTest(testName, fn) {
  try {
    fn();
    console.log(`  ✅ ${testName} — PASSED`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${testName} — FAILED:`, err.message);
    failed++;
  }
}

console.log('\n================================================================');
console.log('🧪 MediAgent Phase 3 Spatial Table Extraction Test Suite (20 Tests)');
console.log('================================================================\n');

// 1. Phone Number Rejection
runTest('TEST 1: Phone Number Rejection', () => {
  const text = "Expertise. Empowering You. Ph -40401234 80\nHemoglobin 13.2 g/dL 12.0-16.0";
  const parsed = parseLabValuesFromText(text, 'TEST');
  const phoneRes = parsed.results.find(r => r.rawName.includes('Ph') || r.unit === '-40401234');
  assert(!phoneRes, 'Phone number must NOT be extracted as a lab result');
  assert(parsed.discardedCandidates.some(c => c.line.includes('40401234')), 'Phone line must be recorded in discardedCandidates');
});

// 2. Report Number Rejection
runTest('TEST 2: Report Number Rejection', () => {
  const text = "Report No: AD2503147890\nGlucose 96 mg/dL 70-99";
  const parsed = parseLabValuesFromText(text, 'TEST');
  const reportNoRes = parsed.results.find(r => r.rawName.includes('Report') || r.value === 2503147890);
  assert(!reportNoRes, 'Report number must NOT be extracted as a lab result');
});

// 3. Date & Time Rejection
runTest('TEST 3: Date & Time Rejection', () => {
  const text = "06/06/2020 12:35PM\nCreatinine 0.9 mg/dL 0.6-1.2";
  const parsed = parseLabValuesFromText(text, 'TEST');
  const dateRes = parsed.results.find(r => r.rawName.includes('06/06') || r.value === 2020);
  assert(!dateRes, 'Date/Time string must NOT be extracted as a lab result');
});

// 4. Page Number Rejection
runTest('TEST 4: Page Number Rejection', () => {
  const text = "Medical Laboratory Page 1 of 2\nUrea 28 mg/dL 10-50";
  const parsed = parseLabValuesFromText(text, 'TEST');
  const pageRes = parsed.results.find(r => r.rawName.includes('Page') && r.value === 1);
  assert(!pageRes, 'Page header must NOT be extracted as a lab result');
});

// 5. Patient ID Rejection
runTest('TEST 5: Patient ID Rejection', () => {
  const text = "Patient ID: APD250001\nPlatelets 250 Lakhs/cu 1.4-4.5";
  const parsed = parseLabValuesFromText(text, 'TEST');
  const patIdRes = parsed.results.find(r => r.rawName.includes('Patient ID'));
  assert(!patIdRes, 'Patient ID line must NOT be extracted as a lab result');
});

// 6. Demographic Separation (Age/Sex)
runTest('TEST 6: Demographic Separation (Age / Sex)', () => {
  const text = "Age / Sex: 50 Years / Female\nHemoglobin 13.5 g/dL 12-16";
  const parsed = parseLabValuesFromText(text, 'TEST');
  const ageRes = parsed.results.find(r => r.rawName.includes('Age / Sex') || r.unit === 'Years');
  assert(!ageRes, 'Demographic information must NOT be classified as a lab result');
});

// 7. Table Header Detection
runTest('TEST 7: Table Header Detection', () => {
  const text = "TEST PARAMETER RESULT UNIT REFERENCE RANGE\nGlucose Fasting 96 mg/dL 70-99";
  const parsed = parseLabValuesFromText(text, 'TEST');
  assert(parsed.results.length === 1 && parsed.results[0].value === 96, 'Table header line must be processed without producing a false positive');
});

// 8. Spatial Row Grouping by Y Coordinates
runTest('TEST 8: Spatial Row Grouping by Y Coordinates', () => {
  // Simulate TSV words from 2 distinct visual rows
  const mockTSV = `level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext
5\t1\t1\t1\t1\t1\t100\t100\t100\t20\t95\tHemoglobin
5\t1\t1\t1\t1\t2\t800\t105\t50\t20\t95\t13.2
5\t1\t1\t1\t1\t3\t1200\t105\t50\t20\t95\tg/dL
5\t1\t1\t1\t2\t1\t100\t200\t100\t20\t95\tGlucose
5\t1\t1\t1\t2\t2\t800\t205\t50\t20\t95\t96
5\t1\t1\t1\t2\t3\t1200\t205\t50\t20\t95\tmg/dL`;

  const parsed = parseLabValuesFromText('', 'TEST', { tsv: mockTSV });
  assert(parsed.results.length === 2, `Should extract exactly 2 distinct rows (got ${parsed.results.length})`);
  assert(parsed.results[0].normalizedName === 'hemoglobin' && parsed.results[0].value === 13.2, 'Row 1 must be Hemoglobin 13.2');
  assert(parsed.results[1].normalizedName === 'glucose' && parsed.results[1].value === 96, 'Row 2 must be Glucose 96');
});

// 9. Spatial Column Detection by X Coordinates
runTest('TEST 9: Spatial Column Detection by X Coordinates', () => {
  const mockTSV = `level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext
5\t1\t1\t1\t1\t1\t100\t100\t200\t20\t95\tSerum Creatinine
5\t1\t1\t1\t1\t2\t850\t100\t50\t20\t95\t0.9
5\t1\t1\t1\t1\t3\t1250\t100\t50\t20\t95\tmg/dL
5\t1\t1\t1\t1\t4\t1550\t100\t100\t20\t95\t0.6-1.2`;

  const parsed = parseLabValuesFromText('', 'TEST', { tsv: mockTSV });
  assert(parsed.results.length === 1, 'Should parse 1 column-aligned row');
  const res = parsed.results[0];
  assert(res.value === 0.9 && res.unit === 'mg/dL' && res.referenceRange.raw === '0.6-1.2', 'Values, units, and ranges must match column X zones');
});

// 10. CBC Panel Extraction
runTest('TEST 10: Hematology / CBC Extraction', () => {
  const text = "HEMATOLOGY\nHemoglobin 13.2 g/dL 12-16\nWBC Count 7.5 cells/µL 4.0-11.0\nPlatelets 250 Lakhs/cu 1.4-4.5";
  const parsed = parseLabValuesFromText(text, 'TEST');
  assert(parsed.results.length === 3, 'All 3 CBC parameters must be extracted');
  assert(parsed.results.every(r => r.section.includes('HEMATOLOGY')), 'Section must be captured');
});

// 11. Biochemistry Panel Extraction
runTest('TEST 11: Biochemistry Panel Extraction', () => {
  const text = "BIOCHEMISTRY\nFasting Plasma Glucose 148 mg/dL 70-99\nHbA1c 7.2 % 4.0-5.6";
  const parsed = parseLabValuesFromText(text, 'TEST');
  assert(parsed.results.length === 2, 'Biochemistry parameters must be extracted');
  assert(parsed.results[0].normalizedName === 'glucose' && parsed.results[1].normalizedName === 'hba1c');
});

// 12. Lipid Profile Panel Extraction
runTest('TEST 12: Lipid Profile Extraction', () => {
  const text = "LIPID PROFILE\nTotal Cholesterol 196 mg/dL < 200\nTriglycerides 143 mg/dL < 150";
  const parsed = parseLabValuesFromText(text, 'TEST');
  assert(parsed.results.length === 2, 'Lipid profile parameters extracted');
  assert(parsed.results[0].normalizedName === 'total_cholesterol');
});

// 13. Kidney Function Test Extraction
runTest('TEST 13: Kidney Function Test Extraction', () => {
  const text = "KIDNEY FUNCTION TEST\nSerum Creatinine 1.1 mg/dL 0.6-1.2\nBUN 15.9 mg/dL 4.7-23.3\neGFR 95 mL/min > 90";
  const parsed = parseLabValuesFromText(text, 'TEST');
  assert(parsed.results.length === 3, 'Kidney panel parameters extracted');
  assert(parsed.results.some(r => r.normalizedName === 'egfr'));
});

// 14. Liver Function Test Extraction
runTest('TEST 14: Liver Function Test Extraction', () => {
  const text = "LIVER FUNCTION TEST\nALT (SGPT) 28 U/L 7-56\nAST (SGOT) 24 U/L 10-40";
  const parsed = parseLabValuesFromText(text, 'TEST');
  assert(parsed.results.length === 2, 'Liver panel parameters extracted');
  assert(parsed.results[0].normalizedName === 'alt');
});

// 15. Vitamin & Mineral Profile Extraction
runTest('TEST 15: Vitamin & Mineral Profile Extraction', () => {
  const text = "VITAMIN & MINERAL PROFILE\nVitamin D 32.5 ng/mL 30-100\nCalcium 9.5 mg/dL 8.5-10.2\nMagnesium 2.1 mg/dL 1.7-2.2";
  const parsed = parseLabValuesFromText(text, 'TEST');
  assert(parsed.results.length === 3, 'Vitamin & Mineral parameters extracted');
});

// 16. Thyroid Function Test Extraction
runTest('TEST 16: Thyroid Function Test Extraction', () => {
  const text = "THYROID FUNCTION TEST\nTSH 2.4 µU/mL 0.4-4.0";
  const parsed = parseLabValuesFromText(text, 'TEST');
  assert(parsed.results.length === 1 && parsed.results[0].normalizedName === 'tsh');
});

// 17. Urine Analysis Extraction
runTest('TEST 17: Urine Analysis Extraction', () => {
  const text = "URINE ANALYSIS\nUrine Glucose 0 mg/dL Negative";
  const parsed = parseLabValuesFromText(text, 'TEST');
  assert(parsed.results.length === 1, 'Urine Analysis parameter extracted');
});

// 18. Separated Pima Feature Selection Mapping
runTest('TEST 18: Separated Pima Feature Selection Mapping', () => {
  const text = "BIOCHEMISTRY\nPlasma Glucose 148 mg/dL 70-99\nDiastolic Blood Pressure 72 mmHg 60-80\n2-Hour Serum Insulin 120 µU/mL 16-166\nBody Mass Index 33.6 kg/m² 18.5-24.9\nDiabetes Pedigree Function 0.627 count 0.1-1.0";
  const parsed = parseLabValuesFromText(text, 'TEST');
  const pimaFeatures = ['plas', 'pres', 'insu', 'mass', 'pedi'];
  const extractedKeys = parsed.results.map(r => r.normalizedName);
  const matchedPima = extractedKeys.filter(k => ['glucose', 'diastolic_bp', 'insulin', 'bmi', 'pedigree'].includes(k));
  assert(matchedPima.length === 5, 'Pima canonical features mapped correctly post-extraction');
});

// 19. Multiple Tables Spatial Isolation
runTest('TEST 19: Multiple Tables Spatial Isolation', () => {
  const text = "HEMATOLOGY\nHemoglobin 13.2 g/dL 12-16\n\nBIOCHEMISTRY\nGlucose 96 mg/dL 70-99";
  const parsed = parseLabValuesFromText(text, 'TEST');
  assert(parsed.results[0].section.includes('HEMATOLOGY') && parsed.results[1].section.includes('BIOCHEMISTRY'), 'Sections isolate distinct tables');
});

// 20. Zero False Positives Assertion
runTest('TEST 20: Zero False Positives Assertion', () => {
  const noisyDocument = `Medical Laboratory Page 1 of 1
Ph: 080-40401234
Report No: AD2503147890
06/06/2020 12:35PM
Patient ID: APD250001
Age / Sex: 50 Years / Female

COMPLETE BLOOD COUNT (CBC)
Hemoglobin 13.2 g/dL 12-16
WBC 7.5 cells/µL 4-11

Expertise. Empowering You. Ph -40401234 80`;

  const parsed = parseLabValuesFromText(noisyDocument, 'TEST');
  assert(parsed.results.length === 2, `Should extract EXACTLY 2 legitimate lab results (got ${parsed.results.length})`);
  assert(parsed.results.every(r => ['hemoglobin', 'wbc'].includes(r.normalizedName)), 'Extracted results must contain ZERO false positive metadata lines');
});

console.log('\n================================================================');
console.log(`📊 TABLE EXTRACTION TEST SUITE RESULTS: ${passed} / ${passed + failed} PASSED`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
}
