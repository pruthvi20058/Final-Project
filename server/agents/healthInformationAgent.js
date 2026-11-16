/**
 * MediAgent Health Information Agent
 * Central multi-tool agent for educational health inquiries (medicines, diseases, guidelines, precautions, voice)
 * Authoritative evidence-grounded responses with strict clinical safety guardrails.
 */

const {
  getAllMedicines,
  getMedicineById,
  getAllDiseases,
  getDiseaseBySlug,
  getDiseaseGuidelines,
  getAllMedicalSources,
  saveHealthChatMessage,
  getHealthChatHistory,
  createOrGetHealthSession
} = require('../db/database');

const {
  processMultilingualText,
  translateText,
  transcribeAudio,
  synthesizeSpeech
} = require('../services/multilingualService');

// Supported language codes & names
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'hi', name: 'Hindi (हिंदी)' },
  { code: 'te', name: 'Telugu (తెలుగు)' },
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'ml', name: 'Malayalam (മലയാളം)' },
  { code: 'mr', name: 'Marathi (मराठी)' },
  { code: 'bn', name: 'Bengali (বাংলা)' },
  { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
  { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)' }
];

// Standard clinical disclaimer
const CLINICAL_DISCLAIMER = `\n\n> ⚕️ **Medical Disclaimer**: *MediAgent Health Companion is an educational information assistant, not a doctor. It does not provide medical diagnoses, prescribe medications, or replace professional clinical judgment. If you or someone you know is experiencing severe symptoms or a medical emergency, seek immediate medical attention from an emergency department or qualified healthcare professional.*`;

// Emergency symptom triggers
const EMERGENCY_KEYWORDS = [
  'chest pain', 'heart attack', 'cant breathe', 'cannot breathe', 'difficulty breathing',
  'breathlessness', 'short of breath', 'loss of consciousness', 'passed out', 'unconscious',
  'fainting', 'seizure', 'convulsion', 'coughing blood', 'vomiting blood', 'blood in stool',
  'black stool', 'severe bleeding', 'paralysis', 'slurred speech', 'sudden weakness',
  'severe dehydration', 'unresponsive', 'blue lips', 'rigid abdomen'
];

/**
 * Tool 1: detect_language
 */
async function toolDetectLanguage(text) {
  const nlp = await processMultilingualText(text);
  return {
    languageCode: nlp.detected_language,
    languageName: nlp.detected_language_name,
    normalizedText: nlp.normalized_text
  };
}

/**
 * Tool 2: transcribe_voice
 */
async function toolTranscribeVoice(audioPath, preferredLang = 'auto') {
  return await transcribeAudio(audioPath, preferredLang);
}

/**
 * Tool 3: search_medicine
 */
function toolSearchMedicine(query, category) {
  const medicines = getAllMedicines({ query, category, limit: 10 });
  return {
    count: medicines.length,
    results: medicines
  };
}

/**
 * Tool 4: get_medicine_details
 */
function toolGetMedicineDetails(medicineIdOrName) {
  return getMedicineById(medicineIdOrName);
}

/**
 * Tool 5: search_disease
 */
function toolSearchDisease(query) {
  const allDiseases = getAllDiseases();
  const q = query.toLowerCase().trim();
  const matched = allDiseases.filter(d =>
    d.diseaseName.toLowerCase().includes(q) ||
    d.slug.toLowerCase().includes(q) ||
    d.description.toLowerCase().includes(q) ||
    (d.symptoms || []).some(s => s.toLowerCase().includes(q))
  );
  return matched;
}

/**
 * Tool 6: get_disease_information
 */
function toolGetDiseaseInformation(slug) {
  return getDiseaseBySlug(slug);
}

/**
 * Tool 7: get_disease_precautions
 */
function toolGetDiseasePrecautions(slug) {
  const dos = getDiseaseGuidelines(slug, 'dos');
  const donts = getDiseaseGuidelines(slug, 'donts');
  return {
    diseaseSlug: slug,
    dos: dos.length > 0 ? dos[0].content : [],
    donts: donts.length > 0 ? donts[0].content : [],
    sources: [...dos, ...donts].map(d => ({ name: d.sourceName, url: d.sourceUrl }))
  };
}

/**
 * Tool 8: get_disease_warning_signs
 */
function toolGetDiseaseWarningSigns(slug) {
  const warnings = getDiseaseGuidelines(slug, 'warning_signs');
  const disease = getDiseaseBySlug(slug);
  return {
    diseaseSlug: slug,
    diseaseName: disease ? disease.diseaseName : slug,
    warningSigns: warnings.length > 0 ? warnings[0].content : (disease ? disease.warningSigns : []),
    sources: warnings.map(w => ({ name: w.sourceName, url: w.sourceUrl }))
  };
}

/**
 * Tool 9: retrieve_medical_guidelines
 */
function toolRetrieveMedicalGuidelines(slug, guidelineType) {
  return getDiseaseGuidelines(slug, guidelineType);
}

/**
 * Tool 10: translate_response
 */
async function toolTranslateResponse(text, targetLang) {
  if (targetLang === 'en' || !targetLang) return text;
  try {
    const res = await translateText(text, 'en', targetLang);
    return res.translated_text || text;
  } catch (err) {
    console.warn('[HealthAgent] Translation failed, returning original:', err.message);
    return text;
  }
}

/**
 * Tool 11: generate_voice_response
 */
async function toolGenerateVoiceResponse(text, lang = 'en') {
  return await synthesizeSpeech(text, lang);
}

/**
 * Classify user intent
 */
function classifyIntent(text) {
  const lower = text.toLowerCase();

  // Check emergency red flags
  for (const term of EMERGENCY_KEYWORDS) {
    if (lower.includes(term)) {
      return { type: 'EMERGENCY', keyword: term };
    }
  }

  // Check translation command (e.g. "explain in kannada", "translate to hindi")
  const translateMatch = lower.match(/(?:explain|translate|tell me|speak)\s+(?:this\s+)?(?:in|to)\s+(kannada|hindi|tamil|telugu|malayalam|marathi|bengali|gujarati|punjabi|english)/i);
  if (translateMatch) {
    const langMap = {
      kannada: 'kn', hindi: 'hi', tamil: 'ta', telugu: 'te', malayalam: 'ml',
      marathi: 'mr', bengali: 'bn', gujarati: 'gu', punjabi: 'pa', english: 'en'
    };
    return { type: 'TRANSLATE_REQUEST', targetLang: langMap[translateMatch[1].toLowerCase()] || 'en' };
  }

  // Check Do's and Don'ts / precautions
  if (lower.includes('do') && lower.includes('dont') || lower.includes("don't") || lower.includes('avoid') || lower.includes('precaution')) {
    const diseaseMatch = matchDiseaseSlug(lower);
    if (diseaseMatch) {
      return { type: 'DISEASE_PRECAUTIONS', diseaseSlug: diseaseMatch };
    }
  }

  // Check Food / Diet / Hydration
  if (lower.includes('food') || lower.includes('diet') || lower.includes('eat') || lower.includes('drink') || lower.includes('hydration') || lower.includes('water')) {
    const diseaseMatch = matchDiseaseSlug(lower);
    if (diseaseMatch) {
      return { type: 'FOOD_HYDRATION', diseaseSlug: diseaseMatch };
    }
  }

  // Check Warning Signs
  if (lower.includes('warning') || lower.includes('danger') || lower.includes('red flag') || lower.includes('emergency')) {
    const diseaseMatch = matchDiseaseSlug(lower);
    if (diseaseMatch) {
      return { type: 'DISEASE_WARNINGS', diseaseSlug: diseaseMatch };
    }
  }

  // Check Medicine queries
  const medicineMatch = matchMedicine(lower);
  if (medicineMatch) {
    return { type: 'MEDICINE_QUERY', medicine: medicineMatch };
  }
  if (lower.includes('medicine') || lower.includes('tablet') || lower.includes('syrup') || lower.includes('dose') || lower.includes('drug') || lower.includes('antibiotic')) {
    return { type: 'MEDICINE_SEARCH', query: lower };
  }

  // Check Disease queries
  const diseaseMatch = matchDiseaseSlug(lower);
  if (diseaseMatch) {
    return { type: 'DISEASE_QUERY', diseaseSlug: diseaseMatch };
  }

  return { type: 'GENERAL_HEALTH' };
}

function matchDiseaseSlug(text) {
  const map = {
    chikungunya: 'chikungunya',
    jaundice: 'jaundice',
    malaria: 'malaria',
    typhoid: 'typhoid',
    dengue: 'dengue',
    'viral fever': 'viral-fever',
    viral: 'viral-fever',
    fever: 'viral-fever',
    breakbone: 'dengue'
  };
  for (const [key, slug] of Object.entries(map)) {
    if (text.includes(key)) return slug;
  }
  return null;
}

function matchMedicine(text) {
  const catalog = getAllMedicines({ limit: 100 });
  for (const m of catalog) {
    if (text.includes(m.genericName.toLowerCase())) return m;
    for (const b of m.brandName.split(',')) {
      const brandTrimmed = b.trim().toLowerCase();
      if (brandTrimmed.length >= 3 && text.includes(brandTrimmed)) {
        return m;
      }
    }
  }
  return null;
}

/**
 * Formats a grounded, evidence-based response based on intent and retrieved knowledge
 */
async function generateGroundedResponse(userQuery, intent, conversationContext = []) {
  let responseText = '';
  const sources = [];
  let toolInvoked = '';

  switch (intent.type) {
    case 'EMERGENCY': {
      toolInvoked = 'get_disease_warning_signs';
      responseText = `🚨 **URGENT MEDICAL ALERT — IMMEDIATE ATTENTION REQUIRED**\n\n`;
      responseText += `You mentioned **"${intent.keyword}"**. This may indicate a serious medical complication or emergency situation.\n\n`;
      responseText += `### What you should do immediately:\n`;
      responseText += `1. **Call emergency medical services (108 / 112 in India, 911 in US) or go to the nearest emergency department right away.**\n`;
      responseText += `2. Do not attempt to drive yourself; have someone drive you or call an ambulance.\n`;
      responseText += `3. Stay in a safe, seated or semi-reclined resting position while help arrives.\n`;
      responseText += `4. Do not take self-prescribed medications or painkillers until assessed by emergency medical personnel.\n\n`;
      responseText += `**Common Red-Flag Warning Signs That Require Emergency Hospitalization:**\n`;
      responseText += `• Inability to breathe normally or rapid shallow respirations\n`;
      responseText += `• Unresponsiveness, severe confusion, or seizures\n`;
      responseText += `• Persistent vomiting preventing fluid intake\n`;
      responseText += `• Vomiting blood or passing black, tarry stools\n`;
      responseText += `• Sudden cold, clammy skin with very weak pulse (circulatory collapse)`;

      sources.push({
        name: 'World Health Organization (WHO) Emergency Guidelines',
        url: 'https://www.who.int'
      });
      break;
    }

    case 'MEDICINE_QUERY': {
      const med = intent.medicine;
      toolInvoked = 'get_medicine_details';

      // Clinical safety check: Antibiotic inquiry
      const isAntibiotic = med.therapeuticCategory.toLowerCase().includes('antibiotic');
      const isNsaid = med.therapeuticCategory.toLowerCase().includes('nsaid');

      responseText = `### 💊 ${med.genericName} (${med.brandName.split(',')[0].trim()})\n\n`;
      responseText += `**Therapeutic Class**: ${med.therapeuticCategory}\n`;
      responseText += `**Composition**: ${med.composition}\n\n`;
      responseText += `#### Approved Clinical Uses\n${med.uses}\n\n`;
      responseText += `#### How It Works (Mechanism of Action)\n${med.mechanism}\n\n`;

      if (isAntibiotic) {
        responseText += `> ⚠️ **PRESCRIPTION ONLY — ANTIBIOTIC CAUTION**:\n`;
        responseText += `> This medicine is a prescription antibacterial agent. It is completely ineffective against viruses (viral fever, common cold, chikungunya, dengue). Inappropriate or self-directed antibiotic use causes dangerous global antimicrobial resistance. Only take antibiotics under a physician's prescription.\n\n`;
      }

      if (isNsaid) {
        responseText += `> 🛑 **CRITICAL DENGUE CONTRAINDICATION**:\n`;
        responseText += `> Non-steroidal anti-inflammatory drugs (NSAIDs) like Ibuprofen are **STRICTLY CONTRAINDICATED in suspected or confirmed Dengue**, as they inhibit platelets and trigger catastrophic gastrointestinal bleeding!\n\n`;
      }

      responseText += `#### Key Precautions\n${med.precautions}\n\n`;

      const sideEffectsList = Array.isArray(med.sideEffects) ? med.sideEffects : JSON.parse(med.sideEffects || '[]');
      if (sideEffectsList.length > 0) {
        responseText += `#### Common Side Effects\n`;
        sideEffectsList.forEach(s => { responseText += `• ${s}\n`; });
        responseText += `\n`;
      }

      responseText += `#### Serious Adverse Reactions & Warning Signs\n${med.adverseEffects}\n\n`;
      responseText += `#### Drug Interactions\n${med.interactions}\n\n`;
      responseText += `#### Storage\n${med.storage}\n\n`;
      responseText += `#### Pregnancy & Breastfeeding\n${med.pregnancyLactation}\n\n`;
      responseText += `*Last Reviewed: ${med.lastReviewedAt} | Source: ${med.sourceName || 'WHO Model Formulary'}*`;

      sources.push({
        name: med.sourceName || 'WHO Model List of Essential Medicines',
        url: med.sourceUrl || 'https://list.essentialmeds.org'
      });
      break;
    }

    case 'MEDICINE_SEARCH': {
      toolInvoked = 'search_medicine';
      const searchRes = toolSearchMedicine(userQuery);
      if (searchRes.count > 0) {
        responseText = `I found **${searchRes.count} verified medicines** matching your query in the MediAgent formulary:\n\n`;
        for (const m of searchRes.results) {
          responseText += `• **${m.genericName}** (*${m.brandName.split(',')[0]}*) — ${m.therapeuticCategory}\n  ${m.uses.slice(0, 140)}...\n\n`;
        }
        responseText += `*Ask for details on any specific medicine (e.g., "Tell me about Paracetamol" or "Precautions for Novamox") to view composition, side effects, and precautions.*`;
        sources.push({
          name: 'WHO Model List of Essential Medicines & British National Formulary',
          url: 'https://list.essentialmeds.org'
        });
      } else {
        responseText = `I could not locate a matching medicine in our verified formulary for "${userQuery}". For your safety, MediAgent does not guess or generate unverified medicine compositions. Please consult a licensed pharmacist or doctor.`;
      }
      break;
    }

    case 'DISEASE_PRECAUTIONS': {
      toolInvoked = 'get_disease_precautions';
      const precautions = toolGetDiseasePrecautions(intent.diseaseSlug);
      const disease = toolGetDiseaseInformation(intent.diseaseSlug);
      const diseaseName = disease ? disease.diseaseName : intent.diseaseSlug;

      responseText = `### 📋 Evidence-Based Precautions: ${diseaseName}\n\n`;
      responseText += `#### ✅ Recommended Do's\n`;
      const dosList = Array.isArray(precautions.dos) ? precautions.dos : JSON.parse(precautions.dos || '[]');
      dosList.forEach(item => { responseText += `• ${item}\n`; });

      responseText += `\n#### ❌ Important Don'ts\n`;
      const dontsList = Array.isArray(precautions.donts) ? precautions.donts : JSON.parse(precautions.donts || '[]');
      dontsList.forEach(item => { responseText += `• ${item}\n`; });

      responseText += `\n*Always monitor for emergency warning signs and attend scheduled medical follow-ups.*`;

      (precautions.sources || []).forEach(s => {
        if (!sources.some(existing => existing.name === s.name)) sources.push(s);
      });
      if (sources.length === 0) {
        sources.push({
          name: 'National Centre for Disease Control (NCDC) Guidelines',
          url: 'https://ncdc.gov.in'
        });
      }
      break;
    }

    case 'FOOD_HYDRATION': {
      toolInvoked = 'retrieve_medical_guidelines';
      const guidelines = toolRetrieveMedicalGuidelines(intent.diseaseSlug, 'food_hydration');
      const disease = toolGetDiseaseInformation(intent.diseaseSlug);
      const diseaseName = disease ? disease.diseaseName : intent.diseaseSlug;

      responseText = `### 🥣 Food & Hydration Guidance: ${diseaseName}\n\n`;
      if (guidelines.length > 0 && guidelines[0].content) {
        const fh = guidelines[0].content;
        responseText += `**Hydration Target**: ${fh.hydration_target || '2.5 to 3 liters daily'}\n\n`;

        responseText += `#### Recommended Fluids\n`;
        (fh.recommended_fluids || []).forEach(f => { responseText += `• ${f}\n`; });

        responseText += `\n#### Recommended Nutritional Foods\n`;
        (fh.dietary_guidelines || []).forEach(d => { responseText += `• ${d}\n`; });

        responseText += `\n#### Foods to Avoid\n`;
        (fh.foods_to_avoid || []).forEach(a => { responseText += `• ${a}\n`; });

        sources.push({
          name: guidelines[0].sourceName || 'Ministry of Health and Family Welfare (MoHFW)',
          url: guidelines[0].sourceUrl || 'https://www.mohfw.gov.in'
        });
      } else {
        responseText += `General clinical hydration guidance: Drink plenty of clean boiled water, Oral Rehydration Salts (ORS), and thin soups. Eat light, non-greasy, freshly cooked meals like khichdi and porridge.`;
      }
      break;
    }

    case 'DISEASE_WARNINGS': {
      toolInvoked = 'get_disease_warning_signs';
      const warnings = toolGetDiseaseWarningSigns(intent.diseaseSlug);

      responseText = `### ⚠️ Emergency Warning Signs: ${warnings.diseaseName}\n\n`;
      if (intent.diseaseSlug === 'dengue') {
        responseText += `> 🚨 **CRITICAL DENGUE WARNING**: Dengue warning signs paradoxically emerge **as the high fever drops (defervescence, days 3–7)**. Absence of fever does NOT mean the patient is safe! Meticulous monitoring during this phase is essential.\n\n`;
      } else if (intent.diseaseSlug === 'jaundice') {
        responseText += `> 🚨 **CRITICAL JAUNDICE WARNING**: Jaundice accompanied by confusion, severe belly pain, vomiting blood, or extreme sleepiness signals possible acute liver failure or infected bile ducts (cholangitis).\n\n`;
      }

      responseText += `If any of the following signs appear, seek immediate emergency medical care:\n`;
      const warnList = Array.isArray(warnings.warningSigns) ? warnings.warningSigns : JSON.parse(warnings.warningSigns || '[]');
      warnList.forEach(w => { responseText += `• ${w}\n`; });

      (warnings.sources || []).forEach(s => {
        if (!sources.some(existing => existing.name === s.name)) sources.push(s);
      });
      break;
    }

    case 'DISEASE_QUERY': {
      toolInvoked = 'get_disease_information';
      const disease = toolGetDiseaseInformation(intent.diseaseSlug);

      responseText = `### 🦠 ${disease.diseaseName}\n\n`;

      if (disease.clinicalType === 'clinical_sign') {
        responseText += `> 📌 **IMPORTANT CLINICAL DISTINCTION**: *Jaundice is a clinical sign of elevated bilirubin (hyperbilirubinemia), NOT a single disease entity. It can stem from red blood cell breakdown (hemolysis), liver injury (viral hepatitis), or bile duct obstruction (gallstones).*\n\n`;
      } else if (disease.clinicalType === 'syndrome') {
        responseText += `> 📌 **IMPORTANT CLINICAL DISTINCTION**: *"Viral fever" is a descriptive syndromic classification for non-specific acute viral illnesses, not a single confirmed pathogen diagnosis. Antibiotics have ZERO activity against viral fever.*\n\n`;
      }

      responseText += `${disease.description}\n\n`;
      responseText += `#### Causes & Transmission\n`;
      responseText += `• **Causes**: ${disease.causes}\n`;
      responseText += `• **Transmission**: ${disease.transmission}\n`;
      if (disease.incubationPeriod) {
        responseText += `• **Incubation Period**: ${disease.incubationPeriod}\n`;
      }
      responseText += `\n`;

      responseText += `#### Common Symptoms\n`;
      const symptomsList = Array.isArray(disease.symptoms) ? disease.symptoms : JSON.parse(disease.symptoms || '[]');
      symptomsList.slice(0, 6).forEach(s => { responseText += `• ${s}\n`; });
      responseText += `\n`;

      responseText += `#### General Clinical Management\n${disease.treatmentInformation}\n\n`;

      responseText += `#### Key Prevention Strategies\n${disease.prevention}\n\n`;

      responseText += `*Last Reviewed: ${disease.lastReviewedAt}*`;

      sources.push({
        name: 'World Health Organization (WHO) & NCDC India Guidelines',
        url: 'https://www.who.int'
      });
      break;
    }

    case 'TRANSLATE_REQUEST': {
      toolInvoked = 'translate_response';
      // Retrieve the last assistant response from conversationContext
      const lastMsg = conversationContext.slice().reverse().find(m => m.role === 'assistant');
      const textToTranslate = lastMsg ? lastMsg.response : "Here is your verified clinical health guidance from MediAgent.";
      responseText = await toolTranslateResponse(textToTranslate, intent.targetLang);
      sources.push({
        name: 'MediAgent Multilingual Neural Translator',
        url: 'https://mediagent.internal'
      });
      break;
    }

    default: {
      toolInvoked = 'search_disease';
      // Attempt broad search across diseases and medicines
      const disMatches = toolSearchDisease(userQuery);
      const medMatches = toolSearchMedicine(userQuery);

      if (disMatches.length > 0) {
        const topDis = disMatches[0];
        responseText = `Based on your question about **${topDis.diseaseName}**:\n\n${topDis.description}\n\n`;
        responseText += `**Common Symptoms**: ${(topDis.symptoms || []).slice(0, 4).join(', ')}\n\n`;
        responseText += `**General Care**: ${topDis.treatmentInformation}\n\n`;
        responseText += `*Ask about Do's & Don'ts, Food Guidance, or Warning Signs for ${topDis.diseaseName} to learn more.*`;
        sources.push({
          name: 'World Health Organization (WHO) Fact Sheets',
          url: 'https://www.who.int'
        });
      } else if (medMatches.count > 0) {
        const topMed = medMatches.results[0];
        responseText = `Based on your question about **${topMed.genericName}**:\n\n`;
        responseText += `**Category**: ${topMed.therapeuticCategory}\n`;
        responseText += `**Approved Uses**: ${topMed.uses}\n\n`;
        responseText += `**Key Precautions**: ${topMed.precautions}\n\n`;
        responseText += `*Always check with your clinician or pharmacist before modifying any medication.*`;
        sources.push({
          name: topMed.sourceName || 'WHO Model Formulary',
          url: topMed.sourceUrl || 'https://list.essentialmeds.org'
        });
      } else {
        responseText = `I could not find verified clinical information specifically matching your question in the MediAgent authoritative knowledge base.\n\n` +
          `To assist you effectively, MediAgent Health Companion provides evidence-grounded guidance on:\n` +
          `• **Medicines**: Uses, composition, precautions, side effects (Paracetamol, ORS, Amoxicillin, Azithromycin, Chloroquine, Cetirizine, Pantoprazole, Metformin, Ibuprofen)\n` +
          `• **Conditions**: Chikungunya, Jaundice, Malaria, Typhoid, Dengue, Viral Fever\n` +
          `• **Evidence-based Care**: Do's, Don'ts, Hydration & Nutrition, and Emergency Warning Signs.\n\n` +
          `Please rephrase your question with specific medical terms, or consult a qualified physician for personalized clinical care.`;
      }
      break;
    }
  }

  // Append clinical disclaimer
  responseText += CLINICAL_DISCLAIMER;

  return {
    response: responseText,
    sources,
    toolInvoked
  };
}

/**
 * Main Central Health Information Agent orchestrator function
 */
async function runHealthCompanionChat({
  sessionId,
  message,
  preferredLanguage = 'en',
  generateVoice = false
}) {
  if (!message || !message.trim()) {
    throw new Error('Message is required');
  }

  // 1. Language Detection & Normalization via Tool 1
  const langResult = await toolDetectLanguage(message);
  const detectedLang = langResult.languageCode || 'en';
  const detectedLangName = langResult.languageName || 'English';
  const effectiveLang = preferredLanguage !== 'en' ? preferredLanguage : detectedLang;

  // 2. Load recent conversation history for session context
  const history = getHealthChatHistory(sessionId);

  // 3. Classify intent
  const intent = classifyIntent(langResult.normalizedText || message);

  // 4. Generate grounded response using specialized tools
  const { response, sources, toolInvoked } = await generateGroundedResponse(
    langResult.normalizedText || message,
    intent,
    history
  );

  // 5. If user's language is an Indian language (non-English), translate response via Tool 10
  let finalResponse = response;
  if (effectiveLang !== 'en') {
    finalResponse = await toolTranslateResponse(response, effectiveLang);
  }

  // 6. Save message record into SQLite
  const savedRecord = saveHealthChatMessage({
    sessionId,
    role: 'assistant',
    originalLanguage: effectiveLang,
    originalMessage: message,
    translatedQuery: langResult.normalizedText !== message ? langResult.normalizedText : null,
    response: finalResponse,
    sources,
    toolInvoked
  });

  // 7. Optional voice response generation via Tool 11
  let voiceResult = null;
  if (generateVoice) {
    voiceResult = await toolGenerateVoiceResponse(finalResponse, effectiveLang);
  }

  return {
    success: true,
    sessionId,
    messageId: savedRecord.id,
    detectedLanguage: detectedLang,
    detectedLanguageName: detectedLangName,
    preferredLanguage: effectiveLang,
    originalQuery: message,
    normalizedQuery: langResult.normalizedText,
    intent: intent.type,
    toolInvoked,
    reply: finalResponse,
    sources,
    voice: voiceResult && voiceResult.success ? voiceResult : null
  };
}

module.exports = {
  SUPPORTED_LANGUAGES,
  runHealthCompanionChat,
  toolDetectLanguage,
  toolTranscribeVoice,
  toolSearchMedicine,
  toolGetMedicineDetails,
  toolSearchDisease,
  toolGetDiseaseInformation,
  toolGetDiseasePrecautions,
  toolGetDiseaseWarningSigns,
  toolRetrieveMedicalGuidelines,
  toolTranslateResponse,
  toolGenerateVoiceResponse
};
