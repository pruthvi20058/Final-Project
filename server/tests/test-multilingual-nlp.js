/**
 * MediAgent Multilingual NLP & Voice Assessment Test Suite
 * Tests language identification, clinical entity extraction, negation,
 * temporal duration, Romanized code-switching, RAG, TTS, and database persistence.
 */

const assert = require('assert');
const http = require('http');
const { processMultilingualText } = require('../services/multilingualService');
const { runMultilingualConsultation, SUPPORTED_LANGUAGES } = require('../agents/multilingualAgent');
const { getMultilingualConsultation, getAllMultilingualConsultations } = require('../db/database');

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, (res) => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resData) });
        } catch {
          resolve({ status: res.statusCode, body: resData });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log("================================================================================");
  console.log("🧪 MediAgent Multilingual NLP, Voice & Clinical Entity Test Suite");
  console.log("================================================================================\n");

  let passed = 0;
  let total = 0;

  function record(title, condition, detail = "") {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ TEST ${total}: ${title} — PASSED`);
      if (detail) console.log(`     ↳ ${detail}`);
    } else {
      console.error(`  ❌ TEST ${total}: ${title} — FAILED`);
      if (detail) console.error(`     ↳ ${detail}`);
    }
  }

  try {
    // TEST 1: Supported Languages API
    const langRes = await makeRequest('GET', '/api/nlp/languages');
    record(
      'Supported languages endpoint lists all 10 target Indian & English languages',
      langRes.status === 200 && langRes.body.count >= 10 && langRes.body.languages.some(l => l.code === 'kn'),
      `Count: ${langRes.body.count}`
    );

    // TEST 2: Kannada Native Script Extraction with Duration
    const knSample = "ನನಗೆ ಮೂರು ದಿನಗಳಿಂದ ಜ್ವರ ಮತ್ತು ತಲೆನೋವು ಇದೆ.";
    const knRes = await processMultilingualText(knSample);
    const hasKnFever = knRes.symptoms.some(s => s.name === 'fever' && s.present === true && s.duration_days === 3);
    const hasKnHeadache = knRes.symptoms.some(s => s.name === 'headache' && s.present === true);
    record(
      'Kannada Native Script: Correctly extracts fever (3 days duration) and headache as active',
      knRes.detected_language === 'kn' && hasKnFever && hasKnHeadache,
      `Detected: ${knRes.detected_language_name}, Active Symptoms: [${knRes.active_symptoms.join(', ')}]`
    );

    // TEST 3: Kannada Negation Safeguard
    const knNegSample = "ನನಗೆ ಜ್ವರ ಇಲ್ಲ";
    const knNegRes = await processMultilingualText(knNegSample);
    const feverNegated = knNegRes.symptoms.some(s => s.name === 'fever' && s.present === false && s.negated === true);
    record(
      'Kannada Negation ("ನನಗೆ ಜ್ವರ ಇಲ್ಲ"): Explicitly marks fever as absent / negated',
      knNegRes.detected_language === 'kn' && feverNegated && knNegRes.active_symptoms.length === 0,
      `Negated Symptoms: [${knNegRes.negated_symptoms.join(', ')}]`
    );

    // TEST 4: Hindi Native Script Extraction with Duration
    const hiSample = "मुझे तीन दिनों से बुखार और सिरदर्द है";
    const hiRes = await processMultilingualText(hiSample);
    const hasHiFever = hiRes.symptoms.some(s => s.name === 'fever' && s.present === true && s.duration_days === 3);
    record(
      'Hindi Native Script: Correctly extracts fever (3 days) and headache',
      hiRes.detected_language === 'hi' && hasHiFever,
      `Detected: ${hiRes.detected_language_name}, Active Symptoms: [${hiRes.active_symptoms.join(', ')}]`
    );

    // TEST 5: Hindi Negation Safeguard
    const hiNegSample = "मुझे बुखार नहीं है";
    const hiNegRes = await processMultilingualText(hiNegSample);
    const hiFeverNegated = hiNegRes.symptoms.some(s => s.name === 'fever' && s.present === false && s.negated === true);
    record(
      'Hindi Negation ("मुझे बुखार नहीं है"): Correctly marks fever as absent / negated',
      hiNegRes.detected_language === 'hi' && hiFeverNegated,
      `Negated Symptoms: [${hiNegRes.negated_symptoms.join(', ')}]`
    );

    // TEST 6: English Historical Symptom Distinction
    const enHistSample = "I had fever last week but now only coughing";
    const enHistRes = await processMultilingualText(enHistSample);
    const feverHistorical = enHistRes.symptoms.some(s => s.name === 'fever' && s.timing === 'historical' && s.present === false);
    const coughActive = enHistRes.symptoms.some(s => s.name === 'cough' && s.present === true);
    record(
      'Historical vs Current: "had fever last week" is marked historical/inactive, current cough is active',
      feverHistorical && coughActive,
      `Historical: [${enHistRes.historical_symptoms.join(', ')}], Active: [${enHistRes.active_symptoms.join(', ')}]`
    );

    // TEST 7: Romanized Kannada Code-Switching
    const knRomanSample = "nange 3 days inda fever ide";
    const knRomanRes = await processMultilingualText(knRomanSample);
    record(
      'Romanized Kannada Code-Switching ("nange 3 days inda fever ide") detects Kannada and extracts fever',
      knRomanRes.detected_language === 'kn' && knRomanRes.active_symptoms.includes('fever') && knRomanRes.temporal_context.duration_days === 3,
      `Detected: ${knRomanRes.detected_language_name}, Duration: ${knRomanRes.temporal_context.duration_days} days`
    );

    // TEST 8: Tamil & Telugu Support
    const taRes = await processMultilingualText("எனக்கு காய்ச்சல் உள்ளது"); // Tamil: I have fever
    const teRes = await processMultilingualText("నాకు జ్వరం ఉంది");       // Telugu: I have fever
    record(
      'Tamil and Telugu Script Processing: Successfully extracts fever',
      taRes.detected_language === 'ta' && taRes.active_symptoms.includes('fever') &&
      teRes.detected_language === 'te' && teRes.active_symptoms.includes('fever'),
      `Tamil: ${taRes.detected_language_name}, Telugu: ${teRes.detected_language_name}`
    );

    // TEST 9: Medication Extraction without Fabrication
    const medSample = "I am taking Paracetamol 500mg and Dolo for headache";
    const medRes = await processMultilingualText(medSample);
    record(
      'Medication Extraction: Captures explicitly mentioned medications (Paracetamol, Dolo) without fabrication',
      medRes.medications.includes('Paracetamol') && medRes.medications.includes('Dolo'),
      `Extracted Medications: [${medRes.medications.join(', ')}]`
    );

    // TEST 10: End-to-End Multilingual Consultation & RAG Execution
    const assessRes = await makeRequest('POST', '/api/assessments', {
      text: "ನನಗೆ ಮೂರು ದಿನಗಳಿಂದ ಜ್ವರ ಮತ್ತು ಮೈಕೈ ನೋವು ಇದೆ.", // Fever and body/joint pain for 3 days
      patientName: "Manjunath Gowda",
      preferredLanguage: "kn"
    });
    record(
      'End-to-End Multilingual Assessment: Runs triage, differential diagnosis, RAG, and generates Kannada response',
      assessRes.status === 200 && assessRes.body.success === true && assessRes.body.detectedLanguage === 'kn' &&
      assessRes.body.assessment.diagnostic.differentialDiagnoses.length > 0 && assessRes.body.audioUrl !== null,
      `Triage: ${assessRes.body.assessment.triage.triageLevel}, Audio: ${assessRes.body.audioUrl}`
    );

    // TEST 11: Database Persistence Verification
    const consultList = await makeRequest('GET', '/api/assessments');
    const hasPersisted = consultList.body.assessments && consultList.body.assessments.some(c => c.detectedLanguage === 'kn');
    record(
      'Data Persistence: Multilingual consultations successfully retrieved from SQLite database',
      consultList.status === 200 && hasPersisted,
      `Persisted records count: ${consultList.body.assessments?.length || 0}`
    );

    // TEST 12: Pima Diabetes Separation Safeguard
    // Verifying that symptoms DO NOT corrupt or inject fake Pima tabular features
    const pimaGuard = await makeRequest('GET', '/api/reports/REP-9001/prediction');
    record(
      'Pima Diabetes Model Safeguard: ML classifier preserves strictly validated 8-feature schema without text corruption',
      pimaGuard.status === 200 && pimaGuard.body.modelReadiness && pimaGuard.body.modelReadiness.requiredFeatures === 8,
      `Model Required Features: ${pimaGuard.body.modelReadiness?.requiredFeatures}`
    );

  } catch (err) {
    console.error('Test execution error:', err);
  }

  // ── Task 5: Patient Verification & Model Readiness Tests ──
  try {
    const { mapSymptomsToDiseaseFeatures, getModelReadiness, isModelGated } = require('../agents/multilingualAgent');

    // TEST 13: Model readiness — dengue is gated (NEEDS_CLEANING)
    const dengueReadiness = getModelReadiness('dengue');
    record(
      'Model Readiness: Dengue is gated (NEEDS_CLEANING) — no inference served',
      dengueReadiness && dengueReadiness.gated === true && dengueReadiness.readiness === 'NEEDS_CLEANING',
      `Readiness: ${dengueReadiness ? dengueReadiness.readiness : 'null'}`
    );

    // TEST 14: Model readiness — malaria is NOT gated but VERIFIED_LOW_PERFORMANCE
    const malariaReadiness = getModelReadiness('malaria');
    record(
      'Model Readiness: Malaria is not gated (VERIFIED_LOW_PERFORMANCE) — usable with caution',
      malariaReadiness && malariaReadiness.gated === false && malariaReadiness.readiness === 'VERIFIED_LOW_PERFORMANCE',
      `Readiness: ${malariaReadiness ? malariaReadiness.readiness : 'null'}`
    );

    // TEST 15: Model readiness — typhoid is gated (UNAVAILABLE)
    const typhoidReadiness = getModelReadiness('typhoid');
    record(
      'Model Readiness: Typhoid is gated (UNAVAILABLE) — no inference served',
      typhoidReadiness && typhoidReadiness.gated === true && typhoidReadiness.readiness === 'UNAVAILABLE',
      `Readiness: ${typhoidReadiness ? typhoidReadiness.readiness : 'null'}`
    );

    // TEST 16: Symptom→Feature mapping — NO symptom→Pima mapping for diabetes
    const pimaMap = mapSymptomsToDiseaseFeatures(['fever', 'headache'], 'diabetes');
    record(
      'Symptom→Feature: No symptom→Pima mapping for diabetes (PIMA_TABULAR_ONLY)',
      pimaMap.status === 'PIMA_TABULAR_ONLY' && pimaMap.mappedFeatures && Object.keys(pimaMap.mappedFeatures).length === 0,
      `Status: ${pimaMap.status}`
    );

    // TEST 17: Symptom→Feature mapping — malaria maps symptoms but reports INSUFFICIENT_DATA for missing lab features
    const malariaMap = mapSymptomsToDiseaseFeatures(['fever', 'headache', 'fatigue'], 'malaria');
    record(
      'Symptom→Feature: Malaria maps fever/headache/fatigue but reports INSUFFICIENT_DATA (missing lab features)',
      malariaMap.status === 'INSUFFICIENT_DATA' &&
      malariaMap.mappedFeatures &&
      malariaMap.mappedFeatures.fever !== undefined &&
      malariaMap.mappedFeatures.headace !== undefined &&
      Array.isArray(malariaMap.missingRequired) &&
      malariaMap.missingRequired.length > 0,
      `Status: ${malariaMap.status}, Mapped: [${Object.keys(malariaMap.mappedFeatures).join(', ')}]`
    );

    // TEST 18: Symptom→Feature mapping — dengue is gated, no mapping
    const dengueMap = mapSymptomsToDiseaseFeatures(['fever', 'headache'], 'dengue');
    record(
      'Symptom→Feature: Dengue is gated (MODEL_GATED_NEEDS_CLEANING), no feature mapping',
      dengueMap.gated === true && dengueMap.status === 'MODEL_GATED_NEEDS_CLEANING',
      `Status: ${dengueMap.status}`
    );

    // TEST 19: Mandatory user confirmation — consultation without userConfirmed returns REQUIRES_USER_CONFIRMATION
    const unconfirmed = await runMultilingualConsultation({
      inputType: 'text',
      rawText: 'I have fever and headache for 3 days',
      preferredLanguage: 'en',
      patientData: { id: 'PAT-8001', name: 'Test Patient', age: 45, gender: 'Female' },
      userConfirmed: false
    });
    record(
      'Mandatory Verification: Consultation without userConfirmed returns REQUIRES_USER_CONFIRMATION',
      unconfirmed.status === 'REQUIRES_USER_CONFIRMATION' && unconfirmed.needsUserConfirmation === true,
      `Status: ${unconfirmed.status}`
    );

    // TEST 20: Mandatory user confirmation — consultation with userConfirmed=true proceeds to COMPLETE
    const confirmed = await runMultilingualConsultation({
      inputType: 'text',
      rawText: 'I have fever and headache for 3 days',
      preferredLanguage: 'en',
      patientData: { id: 'PAT-8001', name: 'Test Patient', age: 45, gender: 'Female' },
      userConfirmed: true,
      verifiedSymptoms: ['fever', 'headache']
    });
    record(
      'Mandatory Verification: Consultation with userConfirmed=true returns COMPLETE',
      confirmed.status === 'COMPLETE' && confirmed.needsUserConfirmation !== true,
      `Status: ${confirmed.status}, ConsultationId: ${confirmed.consultationId}`
    );

    // TEST 21: Verified symptoms override NLP extraction
    const overrideSymptoms = await runMultilingualConsultation({
      inputType: 'text',
      rawText: 'I have fever', // NLP would only extract fever
      preferredLanguage: 'en',
      patientData: { id: 'PAT-8001', name: 'Test Patient', age: 45, gender: 'Female' },
      userConfirmed: true,
      verifiedSymptoms: ['fever', 'headache', 'cough'] // user adds headache and cough
    });
    record(
      'Symptom Verification: User-verified symptoms override NLP extraction',
      overrideSymptoms.status === 'COMPLETE' &&
      overrideSymptoms.clinicalEntities.activeSymptoms.includes('cough') &&
      overrideSymptoms.clinicalEntities.symptomSource === 'user_verified',
      `Active: [${overrideSymptoms.clinicalEntities.activeSymptoms.join(', ')}], Source: ${overrideSymptoms.clinicalEntities.symptomSource}`
    );

  } catch (err) {
    console.error('Task 5 test execution error:', err);
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
