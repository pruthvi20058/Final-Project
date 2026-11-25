/**
 * MediAgent Multilingual Agentic AI Engine
 * Coordinates language detection, speech recognition, multilingual NLP,
 * clinical entity validation, guideline retrieval, and speech synthesis.
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { processMultilingualText, transcribeAudio, synthesizeSpeech } = require('../services/multilingualService');
const triageAgent = require('./triageAgent');
const diagnosticAgent = require('./diagnosticAgent');
const ragAgent = require('./ragAgent');
const guardrailAgent = require('./guardrailAgent');

// --- Model Registry (Task 4 readiness) ---
const ML_DIR = path.join(__dirname, '..', 'ml');
const MODEL_REGISTRY_PATH = path.join(ML_DIR, 'models', 'model_registry.json');

let modelRegistryCache = null;
let modelRegistryLoadError = null;

function loadModelRegistry() {
  if (modelRegistryCache) return modelRegistryCache;
  if (modelRegistryLoadError) return null;
  try {
    const raw = fs.readFileSync(MODEL_REGISTRY_PATH, 'utf8');
    modelRegistryCache = JSON.parse(raw);
    return modelRegistryCache;
  } catch (err) {
    modelRegistryLoadError = err.message;
    console.error('[MultilingualAgent] Failed to load model registry:', err.message);
    return null;
  }
}

function getModelReadiness(diseaseKey) {
  const registry = loadModelRegistry();
  if (!registry) return null;
  const entry = registry[diseaseKey];
  if (!entry) return null;
  return {
    disease: entry.disease,
    status: entry.status,
    readiness: entry.readiness,
    readiness_reason: entry.readiness_reason,
    model_type: entry.model_type,
    feature_count: entry.feature_count,
    features: entry.features || [],
    gated: entry.readiness !== 'VERIFIED' && entry.readiness !== 'VERIFIED_LOW_PERFORMANCE',
  };
}

function isModelGated(diseaseKey) {
  const readiness = getModelReadiness(diseaseKey);
  if (!readiness) return true; // unknown → treat as gated
  return readiness.gated;
}

// --- Symptom → Disease Feature Mapping (Task 4 integration) ---
// Maps extracted clinical symptoms to disease-specific feature names.
// Strictly NO mapping into Pima diabetes tabular features (safeguard per Task 4).
// Only diseases that pass readiness gating are eligible for mapping.

const SYMPTOM_TO_FEATURE_MAP = {
  // Malaria (VERIFIED_LOW_PERFORMANCE — usable with extreme caution)
  malaria: {
    fever: 'fever',
    headache: 'headace',
    fatigue: 'fatigue',
    vomiting: 'vomitting',
    'shortness of breath': null, // no direct feature
    'chest pain': null,
    'joint pain': null,
    'abdominal pain': null,
    nausea: null,
    cough: null,
  },
  // Dengue (NEEDS_CLEANING — gated, no inference)
  dengue: {
    fever: 'Fever_Duration',
    headache: 'Headache',
    'joint pain': 'Joint_Pain',
    'shortness of breath': null,
    'chest pain': null,
    fatigue: null,
    nausea: null,
    vomiting: null,
    cough: null,
  },
  // Chikungunya (NEEDS_CLEANING — gated, no inference)
  chikungunya: {
    fever: 'fever',
    headache: 'headache',
    'joint pain': 'arthralgia',
    fatigue: null,
    nausea: null,
    vomiting: 'vomiting',
    'shortness of breath': null,
    'chest pain': null,
    cough: null,
  },
  // Typhoid — UNAVAILABLE, no mapping
  typhoid: {},
  // Diabetes — Pima is tabular-only, NO symptom mapping (hard safeguard)
  diabetes: {},
};

function mapSymptomsToDiseaseFeatures(activeSymptoms, diseaseKey) {
  const readiness = getModelReadiness(diseaseKey);

  // Unknown or gated disease → no mapping
  if (!readiness || readiness.gated) {
    return {
      diseaseKey,
      eligible: false,
      gated: true,
      readiness,
      mappedFeatures: {},
      missingRequired: [],
      status: readiness
        ? `MODEL_GATED_${readiness.readiness}`
        : 'MODEL_NOT_AVAILABLE',
      message: readiness
        ? `Model for '${diseaseKey}' is gated (readiness: ${readiness.readiness}). ${readiness.readiness_reason || ''}`
        : `No model registry entry for disease '${diseaseKey}'.`,
    };
  }

  // Diabetes → Pima is strictly tabular, no symptom mapping
  if (diseaseKey === 'diabetes') {
    return {
      diseaseKey: 'diabetes',
      eligible: false,
      gated: false,
      readiness,
      mappedFeatures: {},
      missingRequired: readiness.features,
      status: 'PIMA_TABULAR_ONLY',
      message:
        'Symptom→Pima mapping is prohibited. Pima diabetes model requires validated 8-parameter numerical vectors only.',
    };
  }

  const featureMap = SYMPTOM_TO_FEATURE_MAP[diseaseKey] || {};
  const mappedFeatures = {};
  const missingRequired = [];

  for (const symptom of activeSymptoms) {
    const symKey = symptom.toLowerCase().trim();
    const featureName = featureMap[symKey];
    if (featureName) {
      mappedFeatures[featureName] = {
        sourceSymptom: symptom,
        mappedFrom: 'symptom_extraction',
        value: 1, // binary presence flag from NLP
      };
    }
  }

  // Identify required features not covered by symptoms
  for (const feat of readiness.features) {
    if (!mappedFeatures[feat]) {
      missingRequired.push(feat);
    }
  }

  const hasRequired = missingRequired.length === 0;
  const status = hasRequired ? 'OK' : 'INSUFFICIENT_DATA';

  return {
    diseaseKey,
    eligible: hasRequired,
    gated: false,
    readiness,
    mappedFeatures,
    missingRequired,
    status,
    message: hasRequired
      ? `All required features for ${diseaseKey} covered by extracted symptoms.`
      : `Missing required features for ${diseaseKey}: ${missingRequired.join(', ')}. Symptom-only extraction is insufficient; clinical measurements required.`,
  };
}

// Language display metadata
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' }
];

// --- 12 SPECIALIZED AGENT TOOLS ---

async function detect_language(text) {
  const nlp = await processMultilingualText(text);
  return {
    languageCode: nlp.detected_language,
    languageName: nlp.detected_language_name
  };
}

async function transcribe_audio(audioPath, language = 'auto') {
  return await transcribeAudio(audioPath, language);
}

async function translate_clinical_text(text, sourceLang, targetLang = 'en') {
  if (sourceLang === targetLang) return text;
  const nlp = await processMultilingualText(text, sourceLang);
  return nlp.normalized_text;
}

async function extract_symptoms(text, language = null) {
  const nlp = await processMultilingualText(text, language);
  return {
    symptoms: nlp.symptoms,
    activeSymptoms: nlp.active_symptoms,
    negatedSymptoms: nlp.negated_symptoms,
    historicalSymptoms: nlp.historical_symptoms,
    temporalContext: nlp.temporal_context
  };
}

function validate_clinical_entities(entities) {
  const valid = [];
  const rejected = [];
  const flags = [];

  for (const s of (entities.symptoms || [])) {
    if (s.negated) {
      flags.push(`Symptom '${s.name}' explicitly negated by patient (ruled out).`);
    } else if (s.is_historical) {
      flags.push(`Symptom '${s.name}' is historical (resolved, not active acute event).`);
    } else {
      valid.push(s.name);
    }
  }

  return {
    validActiveSymptoms: valid,
    validationFlags: flags,
    isValid: valid.length > 0 || flags.length > 0
  };
}

function request_user_clarification(ambiguities) {
  if (!ambiguities || ambiguities.length === 0) {
    return { required: false, questions: [] };
  }
  return {
    required: true,
    questions: ambiguities.map(a => `Clarification needed: ${a}`)
  };
}

function normalize_clinical_data(nlpResult) {
  return {
    originalText: nlpResult.original_text,
    detectedLanguage: nlpResult.detected_language,
    normalizedLanguage: 'en',
    normalizedText: nlpResult.normalized_text,
    activeSymptoms: nlpResult.active_symptoms || [],
    negatedSymptoms: nlpResult.negated_symptoms || [],
    historicalSymptoms: nlpResult.historical_symptoms || [],
    medications: nlpResult.medications || [],
    temporalContext: nlpResult.temporal_context || {},
    ambiguities: nlpResult.ambiguities || [],
    needsUserConfirmation: nlpResult.needs_user_confirmation
  };
}

function map_disease_features(standardizedData) {
  // Pima features are strict numerical lab indicators.
  // Symptoms DO NOT silently map into Pima features (safeguard per requirement #5).
  return {
    pimaFeaturesMapped: 0,
    isPimaEligible: false,
    symptomFeaturesMapped: standardizedData.activeSymptoms.length
  };
}

function run_disease_assessment(patientData, activeSymptoms, vitals) {
  const triageRes = triageAgent.analyze(vitals, activeSymptoms, patientData?.age || 45);
  const diagRes = diagnosticAgent.analyze(
    activeSymptoms,
    patientData?.history || [],
    patientData?.age || 45,
    patientData?.gender || 'Unknown'
  );
  return {
    triage: triageRes,
    diagnostic: diagRes
  };
}

function retrieve_clinical_guidelines(activeSymptoms, differentialDiagnoses) {
  const query = activeSymptoms.join(' ');
  return ragAgent.analyze(query, activeSymptoms, differentialDiagnoses);
}

function generate_multilingual_response(assessment, languageCode, patientName = 'Patient') {
  const topDiag = assessment.diagnostic?.primaryDiagnosis;
  const triage = assessment.triage;
  const topCondition = topDiag?.condition || 'Clinical Condition';
  const confidence = topDiag?.confidence || 0;
  const level = triage?.triageLevel || 'Non-Urgent';

  const enResponse = `Clinical Screening Summary for ${patientName}: Based on presenting symptoms, the primary clinical consideration is ${topCondition} (${confidence}% symptom match). Triage level is evaluated as ${level}. Please consult a licensed medical professional for confirmatory testing and personal evaluation.`;

  // Localized clinical summaries for target languages
  const localized = {
    kn: `${patientName} ಅವರ ಕ್ಲಿನಿಕಲ್ ಸಾರಾಂಶ: ನೀವು ವರದಿ ಮಾಡಿದ ಲಕ್ಷಣಗಳ ಪ್ರಕಾರ, ಪ್ರಾಥಮಿಕ ಸಂಭವನೀಯತೆ "${topCondition}" (${confidence}% ಹೊಂದಾಣಿಕೆ). ತುರ್ತು ಮಟ್ಟ: ${level}. ದಯವಿಟ್ಟು ನಿಖರ ರೋಗನಿರ್ಣಯ ಮತ್ತು ಚಿಕಿತ್ಸೆಗಾಗಿ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.`,
    hi: `${patientName} के लिए नैदानिक सारांश: आपके द्वारा बताए गए लक्षणों के आधार पर, प्राथमिक संभावना "${topCondition}" (${confidence}% मिलान) है। तात्कालिकता स्तर: ${level} है। कृपया पुष्टि और उपचार के लिए डॉक्टर से परामर्श करें।`,
    ta: `${patientName} க்கான மருத்துவ மதிப்பீடு: தெரிவிக்கப்பட்ட அறிகுறிகளின் அடிப்படையில், முதன்மை சாத்தியம் "${topCondition}" (${confidence}% பொருத்தம்). அவசர நிலை: ${level}. மருத்துவ ஆலோசனையைப் பெறவும்.`,
    te: `${patientName} కోసం వైద్య సారాంశం: లక్షణాల ఆధారంగా ప్రాథమిక పరిశీలన "${topCondition}" (${confidence}% మ్యాచ్). అత్యవసర స్థాయి: ${level}. దయచేసి వైద్యుడిని సంప్రదించండి.`,
    ml: `${patientName} നുള്ള ക്ലിനിക്കൽ സംഗ്രഹം: ലക്ഷണങ്ങളുടെ അടിസ്ഥാനത്തിൽ പ്രധാന സാധ്യത "${topCondition}" (${confidence}% പൊരുത്തം). ഡോക്ടറെ സമീപിക്കുക.`,
    mr: `${patientName} साठी वैद्यकीय सारांश: लक्षणांवर आधारित प्राथमिक शक्यता "${topCondition}" (${confidence}% जुळणी) आहे. कृपया डॉक्टरांचा सल्ला घ्या.`,
    bn: `${patientName} এর জন্য ক্লিনিকাল মূল্যায়ন: লক্ষণগুলির উপর ভিত্তি করে প্রাথমিক সম্ভাবনা "${topCondition}" (${confidence}% মিল)। ডাক্তারের পরামর্শ নিন।`,
    gu: `${patientName} માટે ક્લિનિકલ સારાંશ: લક્ષણોના આધારે પ્રાથમિક સંભાવના "${topCondition}" (${confidence}% મેળ) છે. કૃપા કરીને ડૉક્ટરની સલાહ લો.`,
    pa: `${patientName} ਲਈ ਕਲੀਨਿਕਲ ਮੁਲਾਂਕਣ: ਲੱਛਣਾਂ ਦੇ ਆਧਾਰ 'ਤੇ ਪ੍ਰਾਇਮਰੀ ਸੰਭਾਵਨਾ "${topCondition}" (${confidence}% ਮੈਚ) ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਡਾਕਟਰ ਦੀ ਸਲਾਹ ਲਓ।`,
    en: enResponse
  };

  return localized[languageCode] || enResponse;
}

async function synthesize_speech(responseText, languageCode) {
  try {
    return await synthesizeSpeech(responseText, languageCode);
  } catch (err) {
    console.warn('[MultilingualAgent] Speech synthesis fallback:', err.message);
    return { success: false, error: err.message };
  }
}

// --- ORCHESTRATED MULTILINGUAL WORKFLOW ---

async function runMultilingualConsultation({
  inputType = 'text',
  audioPath = null,
  rawText = '',
  preferredLanguage = null,
  patientData = {},
  vitals = null,
  synthesizeAudio = true,
  userConfirmed = false,
  verifiedSymptoms = null // User-corrected/verified symptom set (overrides NLP extraction)
}) {
  const trace = [];
  const startTs = Date.now();

  let originalText = rawText;
  let originalTranscript = null;
  let asrMetadata = null;

  // Step 1: Speech Recognition if audio provided
  if (inputType === 'voice' && audioPath) {
    trace.push({ step: 'transcribe_audio', status: 'running', detail: 'Executing multilingual speech recognition' });
    const asrRes = await transcribe_audio(audioPath, preferredLanguage);
    if (!asrRes.success) {
      return {
        success: false,
        errorCode: asrRes.error_code || 'ASR_ERROR',
        message: asrRes.message || 'Could not recognize speech.',
        trace
      };
    }
    originalText = asrRes.transcript;
    originalTranscript = asrRes.transcript;
    asrMetadata = {
      provider: asrRes.provider,
      detectedLanguage: asrRes.detected_language,
      confidence: asrRes.confidence // Authentic or null, never fabricated
    };
    trace.push({ step: 'transcribe_audio', status: 'complete', detail: `Transcribed text: "${originalText}" (Confidence: ${asrRes.confidence !== null ? asrRes.confidence : 'Provider Unspecified'})` });
  }

  // Step 2: Multilingual NLP & Entity Extraction
  trace.push({ step: 'extract_symptoms', status: 'running', detail: 'Parsing multilingual text, negation, and temporal factors' });
  const nlpResult = await processMultilingualText(originalText, preferredLanguage);
  trace.push({ step: 'extract_symptoms', status: 'complete', detail: `Detected: ${nlpResult.detected_language_name} | Active Symptoms: [${nlpResult.active_symptoms.join(', ')}] | Negated: [${nlpResult.negated_symptoms.join(', ')}]` });

  // Step 3: Clinical Validation & Negation Safeguard
  trace.push({ step: 'validate_clinical_entities', status: 'running', detail: 'Verifying negation and historical status' });
  const validation = validate_clinical_entities(nlpResult);
  trace.push({ step: 'validate_clinical_entities', status: 'complete', detail: `Validated ${validation.validActiveSymptoms.length} active symptoms` });

  // Step 4: Determine the symptom set to use.
  // If user provided verified/corrected symptoms, use those. Otherwise use NLP extraction.
  let activeSymptoms = validation.validActiveSymptoms;
  let symptomSource = 'nlp_extraction';
  let userCorrections = {};

  if (verifiedSymptoms && Array.isArray(verifiedSymptoms)) {
    activeSymptoms = verifiedSymptoms;
    symptomSource = 'user_verified';
    userCorrections = {
      sourceOverride: true,
      originalNlpSymptoms: validation.validActiveSymptoms,
      userSymptoms: verifiedSymptoms,
    };
    trace.push({ step: 'user_verification', status: 'complete', detail: `Using user-verified symptoms: [${verifiedSymptoms.join(', ')}]` });
  }

  // Step 5: MANDATORY user confirmation gate.
  // Disease assessment never runs without explicit patient confirmation of symptoms.
  if (!userConfirmed) {
    return {
      success: true,
      status: 'REQUIRES_USER_CONFIRMATION',
      needsUserConfirmation: true,
      originalText,
      originalTranscript,
      detectedLanguage: nlpResult.detected_language,
      detectedLanguageName: nlpResult.detected_language_name,
      normalizedText: nlpResult.normalized_text,
      extractedEntities: nlpResult,
      validation,
      activeSymptoms,
      negatedSymptoms: nlpResult.negated_symptoms,
      historicalSymptoms: nlpResult.historical_symptoms,
      clarificationQuestions: [
        'Please review and confirm the extracted symptoms before clinical assessment.',
        'You may edit, remove, or add symptoms, and correct duration/severity values.',
      ],
      trace,
    };
  }

  // Step 6: Standardized Clinical Representation
  const standardized = {
    originalText: nlpResult.original_text,
    detectedLanguage: nlpResult.detected_language,
    normalizedLanguage: 'en',
    normalizedText: nlpResult.normalized_text,
    activeSymptoms,
    negatedSymptoms: nlpResult.negated_symptoms || [],
    historicalSymptoms: nlpResult.historical_symptoms || [],
    medications: nlpResult.medications || [],
    temporalContext: nlpResult.temporal_context || {},
    ambiguities: nlpResult.ambiguities || [],
    needsUserConfirmation: false,
    symptomSource,
    userCorrections,
  };

  // Step 7: Disease-Specific Assessment + Symptom→Feature Mapping (Task 4 readiness)
  trace.push({ step: 'run_disease_assessment', status: 'running', detail: 'Cross-referencing symptoms with Triage & Diagnostic models' });
  const assessment = run_disease_assessment(patientData, activeSymptoms, vitals);
  trace.push({ step: 'run_disease_assessment', status: 'complete', detail: `Triage: ${assessment.triage.triageLevel} | Top Diagnosis: ${assessment.diagnostic.primaryDiagnosis?.condition || 'Undetermined'}` });

  // Step 7: Medical Guidelines RAG Retrieval
  trace.push({ step: 'retrieve_clinical_guidelines', status: 'running', detail: 'Querying medical knowledge base vector index' });
  const ragResult = retrieve_clinical_guidelines(standardized.activeSymptoms, assessment.diagnostic.differentialDiagnoses);
  trace.push({ step: 'retrieve_clinical_guidelines', status: 'complete', detail: `Retrieved ${ragResult.retrievedDocuments.length} clinical citations` });

  // Step 8: Multilingual Response Generation
  trace.push({ step: 'generate_multilingual_response', status: 'running', detail: `Synthesizing explanation in ${nlpResult.detected_language_name}` });
  const localizedResponse = generate_multilingual_response(assessment, nlpResult.detected_language, patientData?.name || 'Patient');
  trace.push({ step: 'generate_multilingual_response', status: 'complete', detail: localizedResponse });

  // Step 9: Text-to-Speech Voice Synthesis (Optional)
  let ttsResult = null;
  if (synthesizeAudio) {
    trace.push({ step: 'synthesize_speech', status: 'running', detail: `Generating speech using ${nlpResult.detected_language} neural voice` });
    ttsResult = await synthesize_speech(localizedResponse, nlpResult.detected_language);
    trace.push({ step: 'synthesize_speech', status: ttsResult.success ? 'complete' : 'failed', detail: ttsResult.audio_url || ttsResult.error });
  }

  // Step 8: Symptom→Disease Feature Mapping (Task 4 readiness integration)
  // Maps verified symptoms to disease-specific features for eligible models.
  // Strictly NO symptom→Pima mapping. Gated diseases return ineligible status.
  const featureMappings = {};
  const eligibleDiseases = ['malaria', 'dengue', 'chikungunya', 'typhoid'];
  for (const diseaseKey of eligibleDiseases) {
    featureMappings[diseaseKey] = mapSymptomsToDiseaseFeatures(activeSymptoms, diseaseKey);
  }

  // Final Guardrail Check
  const guardrail = guardrailAgent.analyze(assessment.triage, assessment.diagnostic, null);

  return {
    success: true,
    status: 'COMPLETE',
    consultationId: `CONS-MULTI-${uuidv4().substring(0, 8)}`,
    originalText,
    originalTranscript,
    asrMetadata,
    detectedLanguage: nlpResult.detected_language,
    detectedLanguageName: nlpResult.detected_language_name,
    normalizedText: nlpResult.normalized_text,
    clinicalEntities: {
      ...standardized,
      symptomSource,
      userCorrections,
    },
    assessment: {
      triage: assessment.triage,
      diagnostic: assessment.diagnostic,
      rag: ragResult,
      guardrail: guardrail
    },
    featureMappings,
    localizedResponseText: localizedResponse,
    audioUrl: ttsResult?.audio_url || null,
    ttsMetadata: ttsResult?.success ? ttsResult : null,
    trace,
    durationMs: Date.now() - startTs
  };
}

module.exports = {
  SUPPORTED_LANGUAGES,
  detect_language,
  transcribe_audio,
  translate_clinical_text,
  extract_symptoms,
  validate_clinical_entities,
  request_user_clarification,
  normalize_clinical_data,
  map_disease_features,
  mapSymptomsToDiseaseFeatures,
  getModelReadiness,
  isModelGated,
  run_disease_assessment,
  retrieve_clinical_guidelines,
  generate_multilingual_response,
  synthesize_speech,
  runMultilingualConsultation
};
