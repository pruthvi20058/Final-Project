const {
  normalizeLabName,
  parseLabValuesFromText,
  extractDemographicsFromText
} = require('../services/reportParser');
const { computeModelReadiness } = require('../services/pimaFeatureMapper');

let passed = 0;
let total = 0;

function assert(condition, testName, extra = '') {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ TEST ${total}: ${testName} — PASSED`);
  } else {
    console.error(`  ❌ TEST ${total}: ${testName} — FAILED ${extra ? `(${extra})` : ''}`);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 MediAgent Scanned PDF, Demographics & Normalization Test Suite');
  console.log('================================================================\n');

  // TEST 1: Age vs Page Number Collision Prevention
  const demoA = { age: null, sex: null };
  extractDemographicsFromText('Medical Laboratory Report Page 1 of 2', demoA);
  assert(demoA.age === null, 'Pure page number string ("Page 1 of 2") does NOT set age to 1', `Age was: ${demoA.age}`);

  // TEST 2: Genuine Demographic Extraction
  const demoB = { age: null, sex: null };
  extractDemographicsFromText('Patient Demographics: Age: 54 Years | Sex: Female', demoB);
  assert(demoB.age === 54 && demoB.sex === 'Female', 'Explicit Age: 54 and Sex: Female correctly extracted', JSON.stringify(demoB));

  // TEST 3: Slash Demographic Format
  const demoC = { age: null, sex: null };
  extractDemographicsFromText('Age / Gender: 62 / M', demoC);
  assert(demoC.age === 62 && demoC.sex === 'Male', 'Age / Gender: 62 / M correctly extracted', JSON.stringify(demoC));

  // TEST 4: Normalization Substring Collision — "Fasting" must NOT become "ast"
  const normAst = normalizeLabName('Fasting Blood Sugar');
  assert(normAst === 'glucose', 'Fasting Blood Sugar normalizes to glucose, NOT ast', `Got: ${normAst}`);

  // TEST 5: Normalization Substring Collision — "Plasma Creatinine" must NOT become "glucose" (via "plas")
  const normCreat = normalizeLabName('Plasma Creatinine');
  assert(normCreat === 'creatinine', 'Plasma Creatinine normalizes to creatinine, NOT glucose', `Got: ${normCreat}`);

  // TEST 6: Normalization Substring Collision — Standalone AST normalizes to "ast"
  const standAst = normalizeLabName('AST (SGOT)');
  assert(standAst === 'ast', 'AST (SGOT) normalizes to ast', `Got: ${standAst}`);

  // TEST 7: Path B Populates detectedRows
  const sampleReportText = `
CLINICAL BIOCHEMISTRY
Glucose Fasting: 112 mg/dL (70-99)
Serum Creatinine: 0.9 mg/dL (0.6-1.2)
Total Cholesterol: 195 mg/dL (<200)
`;
  const parsed = parseLabValuesFromText(sampleReportText, 'PDF_PARSE');
  assert(parsed.detectedRows && parsed.detectedRows.length === 3, 'Path B correctly populates detectedRows array', `Count: ${parsed.detectedRows ? parsed.detectedRows.length : 0}`);

  // TEST 8: Male Patient Pregnancy Mapping
  const maleReport = {
    id: 'REP-MALE-TEST',
    patientDemographics: { age: 48, sex: 'Male' },
    labResults: [
      { id: 'LR-1', rawName: '2-Hour Oral Glucose', normalizedName: 'glucose', value: 130, unit: 'mg/dL' },
      { id: 'LR-2', rawName: 'Diastolic Blood Pressure', normalizedName: 'diastolic_bp', value: 78, unit: 'mmHg' },
      { id: 'LR-3', rawName: 'Triceps Skinfold', normalizedName: 'skin_fold', value: 24, unit: 'mm' },
      { id: 'LR-4', rawName: '2-Hour Serum Insulin', normalizedName: 'insulin', value: 85, unit: 'uU/mL' },
      { id: 'LR-5', rawName: 'Body Mass Index', normalizedName: 'bmi', value: 26.5, unit: 'kg/m2' },
      { id: 'LR-6', rawName: 'Diabetes Pedigree Function', normalizedName: 'pedigree', value: 0.45, unit: 'score' }
    ]
  };
  const maleReadiness = computeModelReadiness(maleReport);
  assert(maleReadiness.featureValues.preg === 0, 'Male patient pregnancy count mapped to biological 0', `Preg: ${maleReadiness.featureValues.preg}`);
  assert(maleReadiness.status === 'READY', 'Male patient with all features reaches READY status (not deadlocked)', `Status: ${maleReadiness.status}`);

  // TEST 9: Suspicious Range Warning in Diagnostics
  const suspReport = {
    id: 'REP-SUSP-TEST',
    patientDemographics: { age: 45, sex: 'Female' },
    labResults: [
      { id: 'LR-10', rawName: 'Plasma Glucose', normalizedName: 'glucose', value: 350, unit: 'mg/dL' }
    ]
  };
  const suspReadiness = computeModelReadiness(suspReport);
  const plasDiag = suspReadiness.mappingDiagnostics.find(d => d.feature === 'plas');
  assert(plasDiag && plasDiag.isSuspicious === true && plasDiag.warning, 'Glucose value 350 mg/dL triggers isSuspicious warning flag', JSON.stringify(plasDiag));

  console.log('\n================================================================');
  console.log(`📊 TEST SUITE RESULTS: ${passed} / ${total} PASSED`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
