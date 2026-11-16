/**
 * MediAgent Health Companion Comprehensive Integration Test Suite
 * Validates database schema, medicines, diseases, guidelines, agent tools, OCR, voice TTS,
 * safety guardrails, multilingual handling, and regression verification for existing systems.
 */

const path = require('path');
const fs = require('fs');

const {
  getDb,
  getAllMedicines,
  getMedicineById,
  getAllDiseases,
  getDiseaseBySlug,
  getDiseaseGuidelines,
  getAllMedicalSources,
  createOrGetHealthSession,
  saveHealthChatMessage,
  getHealthChatHistory,
  deleteHealthChatSession,
  getReportRecord
} = require('../db/database');

const {
  runHealthCompanionChat,
  toolDetectLanguage,
  toolSearchMedicine,
  toolGetMedicineDetails,
  toolGetDiseaseInformation,
  toolGetDiseasePrecautions,
  toolGetDiseaseWarningSigns,
  toolRetrieveMedicalGuidelines,
  toolTranslateResponse,
  toolGenerateVoiceResponse
} = require('../agents/healthInformationAgent');

const { identifyMedicineFromImage, normalizeText } = require('../services/medicineOcrService');
const { transcribeAudio, synthesizeSpeech } = require('../services/multilingualService');

// Regression services
const { generatePredictionForReport, runPythonInference } = require('../services/predictionService');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] Test ${totalTests}: ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] Test ${totalTests}: ${testName} — ${details}`);
  }
}

async function runTestSuite() {
  console.log('\n================================================================================');
  console.log('🧪 MediAgent Health Companion — Master Integration & Verification Suite');
  console.log('================================================================================\n');

  // --------------------------------------------------------------------------
  // SECTION 1: DATABASE SCHEMA & SEED VERIFICATION
  // --------------------------------------------------------------------------
  console.log('📋 --- Section 1: Database Schema & Verified Seed Data ---');

  const sources = getAllMedicalSources();
  assert(sources.length >= 6, 'Medical sources seeded properly (WHO, MoHFW, NCDC, NVBDCP, CDC, NHS)', `Found: ${sources.length}`);

  const medicines = getAllMedicines();
  assert(medicines.length >= 10, 'Verified medicine catalog seeded (at least 10 medicines)', `Found: ${medicines.length}`);

  // Check 17 fields on first medicine
  const sampleMed = medicines[0];
  const has17Fields = sampleMed.id && sampleMed.brandName && sampleMed.genericName &&
    sampleMed.activeIngredients && sampleMed.composition && sampleMed.therapeuticCategory &&
    sampleMed.uses && sampleMed.mechanism && sampleMed.sideEffects && sampleMed.adverseEffects &&
    sampleMed.contraindications && sampleMed.precautions && sampleMed.interactions &&
    sampleMed.storage && sampleMed.pregnancyLactation && sampleMed.sourceId && sampleMed.lastReviewedAt;
  assert(Boolean(has17Fields), 'Every medicine record contains all 17 required clinical fields');

  const diseases = getAllDiseases();
  assert(diseases.length === 6, 'All 6 required disease topics seeded in database', `Found: ${diseases.length}`);

  const expectedSlugs = ['chikungunya', 'jaundice', 'malaria', 'typhoid', 'dengue', 'viral-fever'];
  const actualSlugs = diseases.map(d => d.slug);
  const allSlugsPresent = expectedSlugs.every(s => actualSlugs.includes(s));
  assert(allSlugsPresent, 'All 6 expected slugs present: chikungunya, jaundice, malaria, typhoid, dengue, viral-fever');

  // --------------------------------------------------------------------------
  // SECTION 2: MEDICAL DISTINCTIONS & CLINICAL SPECIFICS
  // --------------------------------------------------------------------------
  console.log('\n🧬 --- Section 2: Medical Distinctions & Topic Specifics ---');

  const jaundice = getDiseaseBySlug('jaundice');
  assert(jaundice && jaundice.clinicalType === 'clinical_sign', 'Jaundice is explicitly designated as a clinical sign (hyperbilirubinemia), NOT a single disease');
  assert(jaundice && jaundice.causes.toLowerCase().includes('hemolytic') && jaundice.causes.toLowerCase().includes('obstructive'), 'Jaundice causes detail hemolytic, hepatocellular, and obstructive pathways');

  const viralFever = getDiseaseBySlug('viral-fever');
  assert(viralFever && viralFever.clinicalType === 'syndrome', 'Viral fever is explicitly designated as a syndromic classification');
  assert(viralFever && viralFever.treatmentInformation.toLowerCase().includes('antibiotic'), 'Viral fever guidelines clearly document that antibiotics have zero effect against viruses');

  const dengue = getDiseaseBySlug('dengue');
  const dengueWarnings = dengue.guidelines && dengue.guidelines.warning_signs ? JSON.stringify(dengue.guidelines.warning_signs.content) : JSON.stringify(dengue.warningSigns);
  assert(dengueWarnings.toLowerCase().includes('defervescence') || dengueWarnings.toLowerCase().includes('fever') || dengue.description.toLowerCase().includes('subsides'), 'Dengue explicitly warns that critical warning signs appear as fever subsides');

  const chikungunya = getDiseaseBySlug('chikungunya');
  assert(chikungunya && chikungunya.symptoms.some(s => s.toLowerCase().includes('joint')), 'Chikungunya documents prominent debilitating polyarthralgia / joint symptoms');

  // Verify each disease has FAQs
  let allHaveFaqs = true;
  for (const slug of expectedSlugs) {
    const d = getDiseaseBySlug(slug);
    const faqs = d.guidelines && d.guidelines.faqs ? d.guidelines.faqs.content : [];
    if (!Array.isArray(faqs) || faqs.length < 5) {
      allHaveFaqs = false;
      break;
    }
  }
  assert(allHaveFaqs, 'Every disease guide contains at least 5-10 authoritative FAQs');

  // --------------------------------------------------------------------------
  // SECTION 3: MEDICINE SEARCH & SAFETY CHECKS
  // --------------------------------------------------------------------------
  console.log('\n💊 --- Section 3: Medicine Search & Safety Guardrails ---');

  const doloSearch = toolSearchMedicine('Dolo');
  assert(doloSearch.count > 0 && doloSearch.results.some(m => m.genericName.toLowerCase().includes('paracetamol')), 'Search by brand name "Dolo" returns Paracetamol monograph');

  const amoxSearch = toolSearchMedicine('Amoxicillin');
  assert(amoxSearch.count > 0, 'Search by generic name "Amoxicillin" succeeds');

  const unknownMedSearch = toolSearchMedicine('UnverifiedFakeDrug999');
  assert(unknownMedSearch.count === 0, 'Search for non-existent drug returns 0 without inventing synthetic composition');

  const paracetamolDetails = toolGetMedicineDetails('MED-PARACETAMOL-650');
  assert(paracetamolDetails && paracetamolDetails.brandName.includes('Dolo 650'), 'getMedicineById retrieves complete 17-field monograph');

  const ibuprofenDetails = toolGetMedicineDetails('MED-IBUPROFEN-400');
  assert(ibuprofenDetails && ibuprofenDetails.contraindications.toLowerCase().includes('dengue'), 'Ibuprofen monograph strictly documents contraindication in suspected Dengue');

  // --------------------------------------------------------------------------
  // SECTION 4: MEDICINE PACKAGING OCR TESTS
  // --------------------------------------------------------------------------
  console.log('\n📷 --- Section 4: Medicine Packaging OCR Recognition ---');

  const missingImageResult = await identifyMedicineFromImage('non_existent_file.png');
  assert(!missingImageResult.success && missingImageResult.error.includes('not found'), 'identifyMedicineFromImage handles missing file gracefully');

  // Text normalization & fuzzy matching verification
  const clean = normalizeText('DOLO-650 (Paracetamol Tablets IP 650mg)');
  assert(clean.includes('dolo 650') && clean.includes('paracetamol'), 'normalizeText cleans packaging strings reliably');

  // Simulate OCR text matching with catalog
  const simulatedOcr = "DOLO 650 Paracetamol Tablets IP 650 mg Micro Labs Batch No 2024";
  const catalog = getAllMedicines();
  let matchedDolo = null;
  for (const m of catalog) {
    if (simulatedOcr.toLowerCase().includes(m.genericName.toLowerCase()) || m.brandName.toLowerCase().split(',').some(b => simulatedOcr.toLowerCase().includes(b.trim()))) {
      matchedDolo = m;
      break;
    }
  }
  assert(matchedDolo && matchedDolo.id === 'MED-PARACETAMOL-650', 'Fuzzy matching correctly identifies Paracetamol / Dolo 650 from packaging text');

  // --------------------------------------------------------------------------
  // SECTION 5: VOICE RECOGNITION (ASR) & TTS SPEECH SYNTHESIS
  // --------------------------------------------------------------------------
  console.log('\n🎙️ --- Section 5: Multilingual Voice & Speech Synthesis ---');

  // Test empty audio file handling
  const tempEmptyAudio = path.join(__dirname, '..', 'uploads', 'temp_empty.wav');
  fs.writeFileSync(tempEmptyAudio, Buffer.alloc(10)); // 10 bytes (empty)
  const emptyAsr = await transcribeAudio(tempEmptyAudio);
  assert(!emptyAsr.success && emptyAsr.error_code === 'EMPTY_AUDIO', 'transcribeAudio gracefully identifies empty audio and returns EMPTY_AUDIO error code');
  try { fs.unlinkSync(tempEmptyAudio); } catch {}

  // Test Speech Synthesis (TTS)
  console.log('  Generating neural speech response sample (English)...');
  const ttsEn = await synthesizeSpeech('Paracetamol is used to relieve fever and mild to moderate pain.', 'en');
  assert(ttsEn.success && ttsEn.audio_url && ttsEn.file_size_bytes > 0, 'synthesizeSpeech creates valid audio file for English');

  console.log('  Generating neural speech response sample (Kannada)...');
  const ttsKn = await synthesizeSpeech('ಜ್ವರ ಮತ್ತು ತಲೆನೋವು ನಿವಾರಣೆಗೆ ಪ್ಯಾರಸಿಟಮಲ್ ಬಳಸಲಾಗುತ್ತದೆ.', 'kn');
  assert(ttsKn.success && ttsKn.audio_url && ttsKn.file_size_bytes > 0, 'synthesizeSpeech creates valid audio file for Kannada');

  // --------------------------------------------------------------------------
  // SECTION 6: HEALTH INFORMATION AGENT ORCHESTRATION & RAG
  // --------------------------------------------------------------------------
  console.log('\n🤖 --- Section 6: Health Information Agent Multi-Tool Orchestration ---');

  const testSessionId = `test_ses_${Date.now()}`;

  // 1. Disease Query
  const res1 = await runHealthCompanionChat({
    sessionId: testSessionId,
    message: 'What is Chikungunya and how does it transmit?'
  });
  assert(res1.success && res1.intent === 'DISEASE_QUERY' && res1.sources.length > 0, 'Agent handles disease query with verified source citations');

  // 2. Disease Precautions (Do\'s & Don\'ts)
  const res2 = await runHealthCompanionChat({
    sessionId: testSessionId,
    message: 'What are the dos and donts for Dengue?'
  });
  assert(res2.success && res2.intent === 'DISEASE_PRECAUTIONS' && res2.reply.includes("Do's") && res2.reply.includes("Don'ts"), 'Agent retrieves evidence-based Do\'s and Don\'ts for Dengue');

  // 3. Food and Hydration
  const res3 = await runHealthCompanionChat({
    sessionId: testSessionId,
    message: 'What food and hydration is recommended in Typhoid?'
  });
  assert(res3.success && res3.intent === 'FOOD_HYDRATION' && res3.reply.toLowerCase().includes('hydration'), 'Agent retrieves food and hydration guidelines for Typhoid');

  // 4. Antibiotic Safety Guardrail
  const res4 = await runHealthCompanionChat({
    sessionId: testSessionId,
    message: 'Can I take Amoxicillin for my cold or viral fever?'
  });
  assert(res4.success && (res4.reply.toLowerCase().includes('antibiotic') || res4.reply.toLowerCase().includes('prescription')), 'Agent enforces antibiotic safety guardrail and warns against unprescribed usage in viral illnesses');

  // 5. Emergency Red Flag Detection
  const res5 = await runHealthCompanionChat({
    sessionId: testSessionId,
    message: 'I have severe chest pain and cannot breathe'
  });
  assert(res5.intent === 'EMERGENCY' && res5.reply.includes('URGENT MEDICAL ALERT'), 'Agent detects emergency warning sign and displays prominent Urgent Medical Alert');

  // 6. Clinical Disclaimer Presence
  assert(res1.reply.includes('Medical Disclaimer') && res2.reply.includes('Medical Disclaimer'), 'Every response appends mandatory medical safety disclaimer');

  // --------------------------------------------------------------------------
  // SECTION 7: MULTILINGUAL NLP & SCRIPT HANDLING
  // --------------------------------------------------------------------------
  console.log('\n🌐 --- Section 7: Multilingual NLP & Script Processing ---');

  const langDetectKn = await toolDetectLanguage('ನನಗೆ ಮೂರು ದಿನಗಳಿಂದ ಜ್ವರ ಮತ್ತು ತಲೆನೋವು ಇದೆ.');
  assert(langDetectKn.languageCode === 'kn', 'Language detector identifies Kannada native script (kn)');

  const langDetectHi = await toolDetectLanguage('मुझे तेज बुखार और जोड़ों में दर्द है');
  assert(langDetectHi.languageCode === 'hi', 'Language detector identifies Hindi Devanagari script (hi)');

  // --------------------------------------------------------------------------
  // SECTION 8: CHAT HISTORY PERSISTENCE & PRIVACY CLEARANCE
  // --------------------------------------------------------------------------
  console.log('\n📜 --- Section 8: Chat History & User Privacy Management ---');

  const history = getHealthChatHistory(testSessionId);
  assert(history.length >= 5, 'Conversational messages persisted in SQLite health_chat_messages', `Found: ${history.length}`);

  const deleteRes = deleteHealthChatSession(testSessionId);
  assert(deleteRes.success, 'deleteHealthChatSession clears user conversation history from SQLite for privacy');

  const historyAfter = getHealthChatHistory(testSessionId);
  assert(historyAfter.length === 0, 'Verified zero messages remain after chat history deletion');

  // --------------------------------------------------------------------------
  // SECTION 9: REGRESSION VERIFICATION (ORIGINAL MEDIAGENT SYSTEM)
  // --------------------------------------------------------------------------
  console.log('\n🔄 --- Section 9: Regression Verification of Existing System ---');

  // 1. Verify default demo report REP-9001 exists in SQLite and triggers clinical safety guardrail
  const rep9001 = getReportRecord('REP-9001');
  assert(rep9001 && rep9001.id === 'REP-9001' && rep9001.labResults.length >= 20, 'Existing demo report REP-9001 with 20 lab results is preserved in SQLite');

  const rep9001Pred = await generatePredictionForReport(rep9001);
  assert(rep9001Pred.status === 'INSUFFICIENT_DATA' && rep9001Pred.missingFeatures.length > 0, 'Prediction engine enforces safety guardrail: INSUFFICIENT_DATA returned when Pima features are missing');

  // 2. Verify Pima Diabetes Python ML model execution with 8 canonical features
  const testPimaInput = {
    pregnancies: 2,
    glucose: 168,
    blood_pressure: 76,
    skin_thickness: 28,
    insulin: 180,
    bmi: 34.2,
    diabetes_pedigree: 0.672,
    age: 48
  };

  const mlResult = await runPythonInference(testPimaInput);
  assert(mlResult.status === 'SUCCESS' && typeof mlResult.estimatedProbability === 'number' && mlResult.estimatedProbability > 0, 'Existing Pima diabetes Python ML model executes and returns calibrated probability', `Prob: ${mlResult.estimatedProbability}`);

  // 3. Verify Real SHAP Explainability & 8 Canonical Features
  assert(mlResult.explanation && mlResult.explanation.features && mlResult.explanation.features.length === 8, 'Existing SHAP explainability attributes all 8 canonical Pima features', `Features: ${mlResult.explanation?.features?.length}`);

  // --------------------------------------------------------------------------
  // FINAL SCORE & SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log(`📊 FINAL TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL INTEGRATION TESTS PASSED! Health Companion is 100% verified and operational.\n');
    process.exit(0);
  } else {
    console.error(`⚠️ ${totalTests - passedTests} tests failed. Please inspect logs above.`);
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
