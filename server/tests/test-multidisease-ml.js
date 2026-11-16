const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { runDiseaseInference } = require('../services/predictionService');

async function runTests() {
  console.log('================================================================');
  console.log('🧪 MediAgent Empirical Multi-Disease Machine Learning Test Suite');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function record(title, condition, detail = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ TEST ${total}: ${title} — PASSED`);
      if (detail) console.log(`     ↳ ${detail}`);
    } else {
      console.error(`  ❌ TEST ${total}: ${title} — FAILED!`);
      if (detail) console.error(`     ↳ ${detail}`);
    }
  }

  // TEST 1: Dataset Provenance Catalog File Exists
  const provPath = path.join(__dirname, '..', 'ml', 'data', 'DATASET_PROVENANCE.md');
  record(
    'Dataset Provenance Catalog Exists',
    fs.existsSync(provPath),
    `Path: ${provPath}`
  );

  // TEST 2: Preserved Pima Indians Dataset Exists & Not Overwritten
  const pimaPath = path.join(__dirname, '..', 'ml', 'data', 'pima_diabetes.csv');
  record(
    'Preserved Pima Diabetes Dataset Intact',
    fs.existsSync(pimaPath) && fs.statSync(pimaPath).size > 20000,
    `Size: ${fs.existsSync(pimaPath) ? fs.statSync(pimaPath).size : 0} bytes`
  );

  // TEST 3: Empirical Dengue Dataset Exists
  const denguePath = path.join(__dirname, '..', 'ml', 'data', 'dengue_clinical.csv');
  record(
    'Empirical Dengue Clinical Dataset Ingested',
    fs.existsSync(denguePath) && fs.statSync(denguePath).size > 20000,
    `Size: ${fs.existsSync(denguePath) ? fs.statSync(denguePath).size : 0} bytes`
  );

  // TEST 4: Empirical Malaria Dataset Exists
  const malariaPath = path.join(__dirname, '..', 'ml', 'data', 'malaria_clinical.csv');
  record(
    'Empirical Malaria Clinical Dataset Ingested',
    fs.existsSync(malariaPath) && fs.statSync(malariaPath).size > 8000,
    `Size: ${fs.existsSync(malariaPath) ? fs.statSync(malariaPath).size : 0} bytes`
  );

  // TEST 5: Empirical Chikungunya Dataset Exists (SINAN Cohort)
  const chikPath = path.join(__dirname, '..', 'ml', 'data', 'chikungunya_clinical.csv');
  record(
    'Empirical Chikungunya (SINAN) Dataset Ingested',
    fs.existsSync(chikPath) && fs.statSync(chikPath).size > 100000,
    `Size: ${fs.existsSync(chikPath) ? fs.statSync(chikPath).size : 0} bytes`
  );

  // TEST 6: Dengue Model Prediction Execution
  try {
    const resDengue = await runDiseaseInference({
      disease: 'dengue',
      Gender: 1, Age: 26, NS1: 1, IgG: 0, IgM: 1,
      Fever_Duration: 4, Body_Temperature: 39.5, Platelet_Count: 45000, WBC_Count: 2900,
      Joint_Pain: 2, Headache: 1, Retro_Orbital_Pain: 1, Myalgia: 1, Rash: 1
    });
    record(
      'Dengue Inference Returns Valid Probabilistic Output',
      resDengue.status === 'SUCCESS' && resDengue.predictedOutcome === 'Dengue Positive' && resDengue.estimatedProbability > 0.5,
      `Outcome: ${resDengue.predictedOutcome}, Prob: ${resDengue.estimatedProbability}`
    );
  } catch (err) {
    record('Dengue Inference Execution', false, err.message);
  }

  // TEST 7: Malaria Model Prediction Execution
  try {
    const resMalaria = await runDiseaseInference({
      disease: 'malaria',
      age: 42, sex: 1, fever: 1, cold: 1, rigor: 1, fatigue: 1,
      headace: 1, bitter_tongue: 1, vomitting: 1, diarrhea: 0,
      Convulsion: 0, Anemia: 0, jundice: 0, cocacola_urine: 0,
      hypoglycemia: 0, prostraction: 0, hyperpyrexia: 0
    });
    record(
      'Malaria Severity Inference Returns Valid Probabilistic Output',
      resMalaria.status === 'SUCCESS' && typeof resMalaria.estimatedProbability === 'number',
      `Outcome: ${resMalaria.predictedOutcome}, Prob: ${resMalaria.estimatedProbability}`
    );
  } catch (err) {
    record('Malaria Severity Inference Execution', false, err.message);
  }

  // TEST 8: Chikungunya Model Prediction Execution
  try {
    const resChik = await runDiseaseInference({
      disease: 'chikungunya',
      fever: 1, myalgia: 1, headache: 1, rash: 1,
      vomiting: 0, nausea: 0, back_pain: 1, conjunctivitis: 1,
      arthritis: 1, arthralgia: 1, petechiae: 0, leukopenia: 1
    });
    record(
      'Chikungunya Inference Returns Valid Probabilistic Output',
      resChik.status === 'SUCCESS' && resChik.predictedOutcome === 'Chikungunya Confirmed',
      `Outcome: ${resChik.predictedOutcome}, Prob: ${resChik.estimatedProbability}`
    );
  } catch (err) {
    record('Chikungunya Inference Execution', false, err.message);
  }

  // TEST 9: Typhoid Anti-Fabrication Scientific Guardrail
  try {
    const resTyphoid = await runDiseaseInference({
      disease: 'typhoid',
      fever: 1, headache: 1
    });
    record(
      'Typhoid Inference Strictly Guarded (Status UNAVAILABLE, No Synthetic Fabrication)',
      resTyphoid.status === 'UNAVAILABLE' && resTyphoid.message.includes('synthetic'),
      `Status: ${resTyphoid.status}, Message: "${resTyphoid.message.slice(0, 60)}..."`
    );
  } catch (err) {
    record('Typhoid Anti-Fabrication Guardrail', false, err.message);
  }

  // TEST 10: Model Provenance Invariance & Metadata Audit
  const dengueMeta = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ml', 'models', 'dengue', 'model_metadata.json'), 'utf8'));
  const malariaMeta = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ml', 'models', 'malaria', 'model_metadata.json'), 'utf8'));
  const chikMeta = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ml', 'models', 'chikungunya', 'model_metadata.json'), 'utf8'));

  record(
    'All Trained Models Record Zero Synthetic Data in Metadata',
    dengueMeta.dataset_provenance.synthetic_data_used === false &&
    malariaMeta.dataset_provenance.synthetic_data_used === false &&
    chikMeta.dataset_provenance.synthetic_data_used === false,
    `Audit: Synthetic data used = FALSE across all 3 newly trained models`
  );

  console.log('\n================================================================');
  console.log(`📊 MULTI-DISEASE TEST SUITE RESULTS: ${passed} / ${total} PASSED`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test Suite Unhandled Exception:', err);
  process.exit(1);
});
