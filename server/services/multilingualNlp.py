"""
MediAgent Multilingual Clinical NLP Engine
Supports: English (en), Kannada (kn), Hindi (hi), Tamil (ta), Telugu (te),
          Malayalam (ml), Marathi (mr), Bengali (bn), Gujarati (gu), Punjabi (pa),
          and Romanized Code-Switching.
"""

import sys
import json
import re
import os

# Set UTF-8 encoding for standard I/O on Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Translation credentials — loaded from environment, NEVER hardcoded.
# MYMEMORY_EMAIL: optional MyMemory translator contact email (higher rate limit).
# TRANSLATION_PROVIDER: 'mymemory' | 'none' (fallback to dictionary only).
TRANSLATION_PROVIDER = os.environ.get('TRANSLATION_PROVIDER', 'mymemory')
MYMEMORY_EMAIL = os.environ.get('MYMEMORY_EMAIL', None)

# Optional translation import
try:
    from deep_translator import MyMemoryTranslator
    HAS_TRANSLATOR = True
except ImportError:
    HAS_TRANSLATOR = False

# Script code ranges
SCRIPT_RANGES = {
    'kn': (0x0C80, 0x0CFF), # Kannada
    'hi': (0x0900, 0x097F), # Devanagari (Hindi / Marathi)
    'ta': (0x0B80, 0x0BFF), # Tamil
    'te': (0x0C00, 0x0C7F), # Telugu
    'ml': (0x0D00, 0x0D7F), # Malayalam
    'bn': (0x0980, 0x09FF), # Bengali
    'gu': (0x0A80, 0x0AFF), # Gujarati
    'pa': (0x0A00, 0x0A7F), # Gurmukhi (Punjabi)
}

LANGUAGE_NAMES = {
    'en': 'English',
    'kn': 'Kannada (ಕನ್ನಡ)',
    'hi': 'Hindi (हिन्दी)',
    'ta': 'Tamil (தமிழ்)',
    'te': 'Telugu (తెలుగు)',
    'ml': 'Malayalam (മലയാളം)',
    'mr': 'Marathi (मराठी)',
    'bn': 'Bengali (বাংলা)',
    'gu': 'Gujarati (ગુજરાતી)',
    'pa': 'Punjabi (ਪੰਜਾਬੀ)'
}

# Regional codes for MyMemory / Speech
LOCALE_MAP = {
    'en': 'en-GB',
    'kn': 'kn-IN',
    'hi': 'hi-IN',
    'ta': 'ta-IN',
    'te': 'te-IN',
    'ml': 'ml-IN',
    'mr': 'mr-IN',
    'bn': 'bn-IN',
    'gu': 'gu-IN',
    'pa': 'pa-IN'
}

# Romanized keywords for code-switching identification
ROMANIZED_KEYWORDS = {
    'kn': ['nange', 'namage', 'jwara', 'jvara', 'talenovu', 'novina', 'kasa', 'ide', 'illa', 'beku', 'tumba', 'dinagala', 'dinadinda', 'kaleda', 'ivattu'],
    'hi': ['mujhe', 'humko', 'bukhar', 'bukhaar', 'sirdard', 'dard', 'hai', 'nahi', 'tha', 'din', 'dino', 'se', 'pichle', 'hafte', 'ulti', 'khasi'],
    'ta': ['enakku', 'kaachal', 'kaichal', 'thalaiwali', 'vali', 'irukku', 'illai', 'naatkal', 'naalaaga'],
    'te': ['naaku', 'jwaram', 'talanopvi', 'noppi', 'undi', 'ledu', 'rojula', 'nunchi'],
    'ml': ['enikku', 'pani', 'thalavedhana', 'undu', 'illa', 'divasamayi']
}

# Multilingual Symptom Lexicon
# Maps localized words / phrases -> standardized canonical symptom
SYMPTOM_LEXICON = {
    'fever': {
        'en': ['fever', 'high temperature', 'febrile', 'pyrexia', 'chills', 'rigors'],
        'kn': ['ಜ್ವರ', 'ಬಿಸಿ ಮೈ', 'ಶೀತಜ್ವರ', 'ಜ್ವರದ', 'ಉಷ್ಣಾಂಶ'],
        'hi': ['बुखार', 'ताप', 'ज्वर', 'गरम शरीर', 'कंपकंपी'],
        'ta': ['காய்ச்சல்', 'சூடு', 'நடுக்கம்'],
        'te': ['జ్వరం', 'తాపం', 'చలి జ్వరం'],
        'ml': ['പനി', 'വിറയൽ'],
        'mr': ['ताप', 'भरला'],
        'bn': ['জ্বর', 'গা গরম'],
        'gu': ['તાવ'],
        'pa': ['ਬੁਖਾਰ'],
        'romanized': ['jwara', 'jvara', 'bukhar', 'bukhaar', 'kaachal', 'kaichal', 'jwaram', 'pani', 'taap']
    },
    'headache': {
        'en': ['headache', 'head ache', 'head pain', 'migraine', 'throbbing head'],
        'kn': ['ತಲೆನೋವು', 'ತಲೆ ನೋವು', 'ತಲೆ ಸಿಡಿಯುವುದು'],
        'hi': ['सिरदर्द', 'सिर दर्द', 'माथा दर्द'],
        'ta': ['தலைவலி', 'தலை வலி'],
        'te': ['తలనొప్పి', 'తల నొప్పి'],
        'ml': ['തലവേദന'],
        'mr': ['डोकेदुखी', 'डोकं दुखणे'],
        'bn': ['মাথাব্যথা', 'মাথা ব্যাথা'],
        'gu': ['માથાનો દુખાવો', 'માથું દુખવું'],
        'pa': ['ਸਿਰਦਰਦ'],
        'romanized': ['talenovu', 'tale novu', 'sirdard', 'sar dard', 'thalaiwali', 'talanopvi', 'thalavedhana']
    },
    'cough': {
        'en': ['cough', 'coughing', 'dry cough', 'wet cough', 'phlegm'],
        'kn': ['ಕೆಮ್ಮು', 'ಒಣ ಕೆಮ್ಮು', 'ಕಫ'],
        'hi': ['खांसी', 'खाँसी', 'कफ', 'बलगम'],
        'ta': ['இருமல்', 'சளி'],
        'te': ['దగ్గు', 'కఫం'],
        'ml': ['ചുമ'],
        'mr': ['खोकला'],
        'bn': ['কাশি', 'কফ'],
        'gu': ['ખાંસી', 'ઉધરસ'],
        'pa': ['ਖੰਘ'],
        'romanized': ['kemmu', 'khasi', 'khaansi', 'irumal', 'daggu', 'chuma']
    },
    'fatigue': {
        'en': ['fatigue', 'tiredness', 'exhaustion', 'weakness', 'lethargy'],
        'kn': ['ಆಯಾಸ', 'ದಣಿವು', 'ನಿಶ್ಯಕ್ತಿ', 'ಸುಸ್ತು'],
        'hi': ['थकान', 'कमजोरी', 'सुस्ती', 'थकावट'],
        'ta': ['சோர்வு', 'பலவீனம்'],
        'te': ['అలసట', 'నీరసం', 'బలహీనత'],
        'ml': ['ക്ഷീണം'],
        'mr': ['थकवा'],
        'bn': ['ক্লান্তি', 'দুর্বলতা'],
        'gu': ['થાક'],
        'pa': ['ਥਕਾਵਟ'],
        'romanized': ['aayasa', 'sustu', 'thakan', 'kamjori', 'thalarchhi', 'alasata', 'neerasam']
    },
    'joint pain': {
        'en': ['joint pain', 'body pain', 'arthralgia', 'body ache', 'limb pain', 'joint swelling'],
        'kn': ['ಕೀಲು ನೋವು', 'ಮೈ ನೋವು', 'ಮೈಕೈ ನೋವು', 'ಕೀಲು ಊತ'],
        'hi': ['जोड़ों का दर्द', 'बदन दर्द', 'शरीर दर्द', 'जोड़ों में सूजन'],
        'ta': ['மூட்டு வலி', 'உடல் வலி'],
        'te': ['కీళ్ల నొప్పులు', 'ఒంటి నొప్పులు'],
        'ml': ['സന്ധി വേദന', 'ശരീര വേദന'],
        'mr': ['सांधेदुखी', 'अंगदुखी'],
        'bn': ['গাঁটের ব্যথা', 'শরীর ব্যথা'],
        'gu': ['સાંધાનો દુખાવો'],
        'pa': ['ਜੋੜਾਂ ਦਾ ਦਰਦ'],
        'romanized': ['keelu novu', 'mai novu', 'badan dard', 'jodon ka dard', 'mootu vali', 'keella noppi']
    },
    'nausea': {
        'en': ['nausea', 'vomiting', 'throwing up', 'queasiness'],
        'kn': ['ವಾಂತಿ', 'ವಾಕರಿಕೆ', 'ತಲೆತಿರುಗುವಿಕೆ'],
        'hi': ['उल्टी', 'मतली', 'जी मिचलाना'],
        'ta': ['வாந்தி', 'குமட்டல்'],
        'te': ['వాంతులు', 'వికారం'],
        'ml': ['ഛർദ്ദി'],
        'mr': ['उलटी'],
        'bn': ['বমি'],
        'gu': ['ઊલટી'],
        'pa': ['ਉਲਟੀ'],
        'romanized': ['vaanti', 'ulti', 'matli', 'vaanthi', 'vaantulu']
    },
    'chest pain': {
        'en': ['chest pain', 'chest pressure', 'chest tightness', 'heart pain'],
        'kn': ['ಎದೆ ನೋವು', 'ಎದೆ ಬಿಗಿತ'],
        'hi': ['छाती में दर्द', 'सीने में दर्द', 'छाती में जकड़न'],
        'ta': ['நெஞ்சு வலி'],
        'te': ['ఛాతీ నొప్పి'],
        'ml': ['നെഞ്ചുവേദന'],
        'mr': ['छातीत दुखणे'],
        'bn': ['বুকে ব্যথা'],
        'gu': ['છાતીમાં દુખાવો'],
        'pa': ['ਛਾਤੀ ਦਾ ਦਰਦ'],
        'romanized': ['ede novu', 'seene mein dard', 'chhati me dard', 'nenju vali']
    },
    'shortness of breath': {
        'en': ['shortness of breath', 'breathlessness', 'difficulty breathing', 'dyspnea'],
        'kn': ['ಉಸಿರಾಟದ ತೊಂದರೆ', 'ಉಸಿರು ಕಟ್ಟುವುದು'],
        'hi': ['सांस फूलना', 'सांस लेने में तकलीफ', 'दम घुटना'],
        'ta': ['மூச்சுத் திணறல்'],
        'te': ['శ్వాస ఆడకపోవడం'],
        'ml': ['ശ്വാസതടസ്സം'],
        'mr': ['श्वास घेण्यास त्रास'],
        'bn': ['শ্বাসকষ্ট'],
        'gu': ['શ્વાસ લેવામાં તકલીફ'],
        'pa': ['ਸਾਹ ਚੜ੍ਹਨਾ'],
        'romanized': ['usiratada tondare', 'saans phoolna', 'dam ghutna']
    },
    'abdominal pain': {
        'en': ['stomach pain', 'abdominal pain', 'belly ache', 'cramps'],
        'kn': ['ಹೊಟ್ಟೆ ನೋವು', 'ಹೊಟ್ಟೆ ಬೇನೆಯಾಗುವುದು'],
        'hi': ['पेट दर्द', 'पेट में दर्द'],
        'ta': ['வயிற்று வலி'],
        'te': ['కడుపు నొప్పి'],
        'ml': ['വയറുവേദന'],
        'mr': ['पोटदुखी'],
        'bn': ['পেট ব্যথা'],
        'gu': ['પેટમાં દુખાવો'],
        'pa': ['ਢਿੱਡ ਦਰਦ'],
        'romanized': ['hotte novu', 'pet dard', 'pet me dard', 'vayitru vali', 'kadupu noppi']
    }
}

# Negation terms across languages
NEGATION_TERMS = {
    'en': [r'\bno\b', r'\bnot\b', r'\bdon\'t have\b', r'\bdoes not have\b', r'\bdenies\b', r'\bwithout\b', r'\babsent\b'],
    'kn': [r'ಇಲ್ಲ\b', r'ಇಲ್ಲವೇ ಇಲ್ಲ', r'ಕಾಣಿಸಿಕೊಂಡಿಲ್ಲ', r'ಇಲ್ಲದ', r'ಆಗಿಲ್ಲ'],
    'hi': [r'नहीं है', r'नहीं', r'ना है', r'गायब है'],
    'ta': [r'இல்லை\b', r'கிடையாது'],
    'te': [r'లేదు\b', r'రావడం లేదు'],
    'ml': [r'ഇല്ല\b'],
    'mr': [r'नाही\b'],
    'bn': [r'নেই\b', r'না\b'],
    'gu': [r'નથી\b'],
    'pa': [r'ਨਹੀਂ\b'],
    'romanized': [r'\billa\b', r'\bnahi hai\b', r'\bnahi\b', r'\billai\b', r'\bledu\b', r'\bnathi\b', r'\bnaahi\b']
}

# Temporal (Historical vs Current)
HISTORICAL_TERMS = {
    'en': [r'\blast week\b', r'\blast month\b', r'\byesterday\b', r'\bhad\b', r'\bpreviously\b', r'\bpast\b', r'\bresolved\b'],
    'kn': [r'ಕಳೆದ ವಾರ', r'ಹಿಂದಿನ ವಾರ', r'ನಿನ್ನೆ', r'ಇತ್ತು', r'ಮೊದಲು'],
    'hi': [r'पिछले हफ्ते', r'पिछले महीने', r'कल था', r'पहले था', r'था\b', r'थी\b'],
    'ta': [r'கடந்த வாரம்', r'நேற்று'],
    'te': [r'గత వారం', r'నిన్న', r'ఉండెను'],
    'ml': [r'കഴിഞ്ഞ ആഴ്ച'],
    'mr': [r'गेल्या आठवड्यात'],
    'bn': [r'গত সপ্তাহে'],
    'gu': [r'ગયા અઠવાડિયે'],
    'pa': [r'ਪਿਛਲੇ ਹਫ਼ਤੇ'],
    'romanized': [r'\bkaleda vaara\b', r'\bpichle hafte\b', r'\bkal tha\b', r'\bithu\b', r'\btha\b']
}

# Number words mapped to integers across languages
NUMBER_WORDS = {
    'ಒಂದು': 1, 'ಎರಡು': 2, 'ಮೂರು': 3, 'ನಾಲ್ಕು': 4, 'ಐದು': 5, 'ಆರು': 6, 'ಏಳು': 7, 'ಹತ್ತು': 10,
    'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'छह': 6, 'सात': 7, 'दस': 10,
    'ஒன்று': 1, 'இரண்டு': 2, 'மூன்று': 3, 'நான்கு': 4, 'ஐந்து': 5,
    'ఒకటి': 1, 'రెండు': 2, 'మూడు': 3, 'నాలుగు': 4, 'ఐదు': 5,
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7,
    'ondhu': 1, 'eradu': 2, 'mooru': 3, 'naalku': 4, 'aidu': 5,
    'ek': 1, 'do': 2, 'teen': 3, 'char': 4, 'paanch': 5
}

# Explicit medications dictionary
KNOWN_MEDICATIONS = [
    'paracetamol', 'dolo', 'crocin', 'metformin', 'aspirin', 'amoxicillin',
    'azithromycin', 'ceftriaxone', 'pantoprazole', 'omeprazole', 'atorvastatin',
    'lisinopril', 'amlodipine', 'insulin', 'artemether', 'coartem', 'primaquine'
]


def detect_language(text, user_override=None):
    """Detects text language using Unicode script detection + keyword heuristic fallback."""
    if user_override and user_override in LANGUAGE_NAMES:
        return user_override, LANGUAGE_NAMES[user_override]

    counts = {k: 0 for k in SCRIPT_RANGES}
    for char in text:
        cp = ord(char)
        for code, (start, end) in SCRIPT_RANGES.items():
            if start <= cp <= end:
                counts[code] += 1

    best_code = max(counts, key=counts.get)
    if counts[best_code] > 0:
        # Differentiate Marathi vs Hindi if Devanagari
        if best_code == 'hi':
            if any(w in text.lower() for w in ['आहे', 'नाही', 'मला', 'डोकेदुखी', 'ताप']):
                return 'mr', LANGUAGE_NAMES['mr']
        return best_code, LANGUAGE_NAMES[best_code]

    # Check Romanized Indian code-switching
    lower = text.lower()
    for lang_code, words in ROMANIZED_KEYWORDS.items():
        if any(re.search(r'\b' + re.escape(w) + r'\b', lower) for w in words):
            return lang_code, f"{LANGUAGE_NAMES[lang_code]} (Romanized)"

    return 'en', LANGUAGE_NAMES['en']


def extract_duration_days(text):
    """Extracts duration in days from multilingual text."""
    lower = text.lower()

    # Digit match: "3 days", "3 ದಿನಗಳಿಂದ", "3 din se", "3 நாட்களாக"
    match = re.search(r'(\d+)\s*(days?|ದಿನಗಳಿಂದ|ದಿನಗಳ|ದಿನ|दिनों?\s*से|दिन|நாட்களாக|நாட்கள்|రోజులుగా|రోజులు|divasamayi|दिवसांपासून)', lower)
    if match:
        return int(match.group(1))

    # Digit weeks match: "2 weeks" -> 14 days
    match_wk = re.search(r'(\d+)\s*(weeks?|ವಾರಗಳಿಂದ|ವಾರ|हफ़्तों?\s*से|हफ़्ते|வாரங்களாக|వారాలుగా)', lower)
    if match_wk:
        return int(match_wk.group(1)) * 7

    # Word match: "ಮೂರು ದಿನಗಳಿಂದ", "तीन दिनों से", "three days"
    for word, num in NUMBER_WORDS.items():
        if re.search(r'\b' + re.escape(word) + r'\s*(days?|ದಿನಗಳಿಂದ|ದಿನಗಳ|ದಿನ|दिनों?\s*से|दिन|நாட்களாக|రోజులుగా|divasamayi)', lower):
            return num
        if re.search(r'\b' + re.escape(word) + r'\s*(weeks?|ವಾರಗಳಿಂದ|ವಾರ|हफ़्तों?\s*से|हफ़्ते)', lower):
            return num * 7

    if 'yesterday' in lower or 'ನಿನ್ನೆ' in lower or 'कल से' in lower or 'నిన్న' in lower:
        return 1

    return None


def is_negated(text, term_pos, term_len):
    """Checks whether a clinical term is negated within its clause-bounded context."""
    # Split text into distinct clauses by punctuation, contrastive conjunctions, or 'and no'
    parts = []
    last_end = 0
    clause_delimiters = r'[,.;!?|\n]|\bbut\b|\bhowever\b|\balthough\b|\bwhile\b|\bಆದರೆ\b|\bಆದ್ರೆ\b|\badare\b|\bलेकिन\b|\bपरंतु\b|\band no\b|\band not\b|\baur nahi\b'
    for m in re.finditer(clause_delimiters, text, flags=re.IGNORECASE):
        parts.append((text[last_end:m.start()].strip(), last_end, m.start()))
        last_end = m.end()
    parts.append((text[last_end:].strip(), last_end, len(text)))

    # Find the specific clause containing this term
    target_clause = ""
    for c_text, s, e in parts:
        if s <= term_pos < max(s + 1, e):
            target_clause = c_text.lower()
            break
    if not target_clause:
        target_clause = text.lower()

    for lang, patterns in NEGATION_TERMS.items():
        for pat in patterns:
            if re.search(pat, target_clause, re.IGNORECASE):
                # Safety check: ensure "ಇಲ್ಲಿದೆ" (here it is) isn't confused with "ಇಲ್ಲ" (no)
                if 'ಇಲ್ಲಿದೆ' in target_clause and not re.search(r'ಇಲ್ಲ\b', target_clause.replace('ಇಲ್ಲಿದೆ', '')):
                    continue
                return True
    return False



def is_historical(text, term_pos, term_len):
    """Checks whether a clinical term is historical/past rather than current."""
    # Split text into distinct clauses by punctuation or contrastive conjunctions
    parts = []
    last_end = 0
    pattern = r'[,.;]|\bbut\b|\bhowever\b|\balthough\b|\bwhile\b|\bಆದರೆ\b|\bಆದ್ರೆ\b|\badare\b|\bलेकिन\b|\bपरंतु\b'
    for m in re.finditer(pattern, text, flags=re.IGNORECASE):
        parts.append((text[last_end:m.start()].strip(), last_end, m.start()))
        last_end = m.end()
    parts.append((text[last_end:].strip(), last_end, len(text)))

    # Find the specific clause containing this term
    target_clause = ""
    for c_text, s, e in parts:
        if s <= term_pos < max(s + 1, e):
            target_clause = c_text.lower()
            break
    if not target_clause:
        target_clause = text.lower()

    # Check if clause explicitly indicates current status (e.g. "now", "currently", "today", "ಈಗ", "ಇದೆ", "अब")
    current_markers = [
        r'\bnow\b', r'\bcurrently\b', r'\btoday\b', r'\bactive\b', r'\bpresent\b',
        r'\bಈಗ\b', r'\bಇವತ್ತು\b', r'\bಇಂದು\b', r'\bಇದೆ\b',
        r'\bअब\b', r'\bआज\b', r'\bहै\b', r'\bதற்போது\b', r'\bఇప్పుడు\b'
    ]
    if any(re.search(pat, target_clause) for pat in current_markers) and not re.search(r'\blast\b|\bpast\b|\bಹಿಂದಿನ\b|\bಕಳೆದ\b|\bपहले\b', target_clause):
        return False

    # Check for historical terms within the clause
    for lang, patterns in HISTORICAL_TERMS.items():
        for pat in patterns:
            if re.search(pat, target_clause, re.IGNORECASE):
                return True
    return False


def extract_clinical_entities(text, detected_lang='en'):
    """Extracts structured clinical entities with negation, duration, severity, and timing."""
    extracted_symptoms = []
    seen_symptoms = set()
    lower_text = text.lower()

    duration = extract_duration_days(text)

    # Search for symptoms across all languages & Romanized variants
    for canon_name, lang_dict in SYMPTOM_LEXICON.items():
        found = False
        match_start = -1
        match_raw = ""

        # Check in detected language first, then all
        target_lists = [lang_dict.get(detected_lang, [])] + list(lang_dict.values())
        for term_list in target_lists:
            for term in term_list:
                term_lower = term.lower()
                pos = lower_text.find(term_lower)
                if pos != -1:
                    found = True
                    match_start = pos
                    match_raw = text[pos:pos+len(term)]
                    break
            if found:
                break

        if found and canon_name not in seen_symptoms:
            seen_symptoms.add(canon_name)
            negated = is_negated(text, match_start, len(match_raw))
            historical = is_historical(text, match_start, len(match_raw))

            symptom_obj = {
                'name': canon_name,
                'raw_term': match_raw,
                'present': not negated and not historical,
                'timing': 'historical' if historical else 'current',
                'negated': negated,
                'is_historical': historical
            }

            if not negated and not historical and duration:
                symptom_obj['duration_days'] = duration

            # Severity extraction
            if any(w in lower_text for w in ['severe', 'ಹೆಚ್ಚು', 'ತುಂಬಾ', 'ತೀವ್ರ', 'बहुत', 'तीव्र', 'அதிக', 'తీవ్ర']):
                symptom_obj['severity'] = 'severe'
            elif any(w in lower_text for w in ['mild', 'ಸ್ವಲ್ಪ', 'हल्का', 'லேசான', 'స్వల్ప']):
                symptom_obj['severity'] = 'mild'
            else:
                symptom_obj['severity'] = 'moderate'

            extracted_symptoms.append(symptom_obj)

    # Explicit medication extraction
    extracted_meds = []
    for med in KNOWN_MEDICATIONS:
        if re.search(r'\b' + re.escape(med) + r'\b', lower_text):
            extracted_meds.append(med.capitalize())

    # Ambiguity / Uncertainty detection
    ambiguities = []
    uncertain_words = ['maybe', 'not sure', 'perhaps', 'possibly', 'ಬಹುಶಃ', 'ಇರಬಹುದು', 'ಶಂಕೆ', 'शायद', 'संभवतः', 'ஒருகால்', 'బహుశా']
    for uw in uncertain_words:
        if uw in lower_text:
            ambiguities.append(f"Uncertain statement detected ('{uw}'). Clinician confirmation recommended.")

    needs_confirmation = len(ambiguities) > 0 or (len(extracted_symptoms) == 0 and len(text.strip().split()) > 4)

    return {
        'symptoms': extracted_symptoms,
        'medications': extracted_meds,
        'temporal_context': {
            'duration_days': duration,
            'has_duration': duration is not None,
            'is_historical': any(s.get('is_historical') for s in extracted_symptoms)
        },
        'ambiguities': ambiguities,
        'needs_user_confirmation': needs_confirmation
    }


def translate_text(text, source_lang, target_lang='en', translation_provider='mymemory', mymemory_email=None):
    """Translates text reliably between languages using MyMemory with fallback dictionary.

    Translation credentials are loaded from environment variables — never hardcoded.
    Provider failure is handled gracefully with dictionary fallback.
    """
    if source_lang == target_lang or not text.strip():
        return text

    src_code = LOCALE_MAP.get(source_lang, source_lang)
    tgt_code = LOCALE_MAP.get(target_lang, target_lang)

    # Attempt MyMemory translation only if provider is enabled and library is installed
    if translation_provider == 'mymemory' and HAS_TRANSLATOR:
        try:
            translator = MyMemoryTranslator(source=src_code, target=tgt_code)
            if mymemory_email:
                try:
                    translator.email = mymemory_email
                except Exception:
                    pass
            res = translator.translate(text)
            if res and not res.startswith('MYMEMORY WARNING') and not res.startswith('MYMEMORY ERROR'):
                return res
        except Exception:
            # Provider failure — fall through to dictionary fallback
            pass

    # Dictionary fallback for core clinical responses (no external dependency)
    fallback = _dictionary_fallback(text, target_lang)
    if fallback is not None:
        return fallback

    return text


def _dictionary_fallback(text, target_lang):
    """Static clinical phrase fallback when translation provider is unavailable."""
    lower = text.lower()
    if target_lang == 'kn':
        if 'fever' in lower:
            return "ನಿಮ್ಮ ಲಕ್ಷಣಗಳ ಆಧಾರದ ಮೇಲೆ, ಜ್ವರದ ಸಾಧ್ಯತೆಯಿದೆ. ದಯವಿಟ್ಟು ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ."
        if 'headache' in lower:
            return "ನಿಮಗೆ ತಲೆನೋವು ಇದೆ. ದಯವಿಟ್ಟು ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ."
        return f"{text} (ಕನ್ನಡ ಭಾಷಾಂತರ ಲಭ್ಯವಿದೆ)"
    elif target_lang == 'hi':
        if 'fever' in lower:
            return "आपके लक्षणों के आधार पर बुखार की संभावना है। कृपया डॉक्टर से परामर्श लें।"
        if 'headache' in lower:
            return "आपको सिरदर्द है। कृपया डॉक्टर से परामर्श लें।"
        return f"{text} (हिंदी अनुवाद उपलब्ध है)"
    elif target_lang == 'ta':
        if 'fever' in lower:
            return "உங்கள் அறிகுறிகளின் அடிப்படையில் காய்ச்சல் வாய்ப்பு உள்ளது. மருத்துவரை சந்திக்கவும்."
        return f"{text} (தமிழ் மொழிபெயர்ப்பு கிடைக்கிறது)"
        if 'fever' in lower:
            return "మీ లక్షణాల ఆధారంగా జ్వరం ఉండవచ్చు. దయచేసి vaidudini sampradinchandi."
            return "మీ లక్షణాల ఆధారంగా జ్వరం ఉండవచ్చు. దయచేసి vaidudini sampradinchandi."
        return f"{text} (తెలుగు అనువాది ಲಭ్యమే)"
    elif target_lang == 'ml':
        if 'fever' in lower:
            return "നിങ്ങളുടെ ലക്ഷണന്റെ അടിസ്ഥാനത്തിൽ പനി സാധ്യതയുണ്ട്. ഡോക്ടറെ സമീപിക്കുക."
        return f"{text} (മലയാളം വിവർത്തനം ലഭ്യമാണ്)"
    elif target_lang == 'mr':
        if 'fever' in lower:
            return "आपल्या लक्षणांच्या आधारे तापाची शक्यता आहे. कृपया डॉक्टरांचा सल्ला घ्या."
        return f"{text} (मराठी भाषांतर उपलब्ध आहे)"
    elif target_lang == 'bn':
        if 'fever' in lower:
            return "আপনার লক্ষণದ ভিত্তিতে জ্বর থাকার সম্ভাবনা রয়েছে। দয়া করে চিকিৎসকের পরামর্শ নিন।"
        return f"{text} (বাংলা অনুবাদ উপলব্ধ রয়েছে)"
    elif target_lang == 'gu':
        if 'fever' in lower:
            return "તમારા લક્ષણોના આધારે તાવની શક્યતા છે. કૃપા કરીને ડૉક્ટરની સલાહ લો."
        return f"{text} (ગુજરાતી ભાષાંતર ઉપલબ્ધ છે)"
    elif target_lang == 'pa':
        if 'fever' in lower:
            return "ਤੁਹਾਡੇ ਲੱਛਣਾਂ ਦੇ ਅਧਾਰ 'ਤੇ ਬੁਖਾਰ ਦੀ ਸੰਭਾਵਨਾ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਡਾਕਟਰ ਦੀ ਸਲਾਹ ਲਓ."
        return f"{text} (ਪੰਜਾਬੀ ਅਨੁਵਾਦ ਉਪਲਬਧ ਹੈ)"
    return None


def process_multilingual_input(input_text, preferred_language=None):
    """
    Main processing pipeline:
    Detects language -> Extracts clinical entities -> Translates -> Formats standardized JSON schema.
    """
    detected_code, lang_name = detect_language(input_text, preferred_language)

    # Extract structured clinical data
    entities = extract_clinical_entities(input_text, detected_code)

    # Normalize to English for medical reasoning engines
    if detected_code != 'en':
        normalized_en = translate_text(input_text, detected_code, 'en')
    else:
        normalized_en = input_text

    return {
        'original_text': input_text,
        'detected_language': detected_code,
        'detected_language_name': lang_name,
        'normalized_language': 'en',
        'normalized_text': normalized_en,
        'symptoms': entities['symptoms'],
        'active_symptoms': [s['name'] for s in entities['symptoms'] if s['present']],
        'negated_symptoms': [s['name'] for s in entities['symptoms'] if s['negated']],
        'historical_symptoms': [s['name'] for s in entities['symptoms'] if s['is_historical']],
        'medications': entities['medications'],
        'temporal_context': entities['temporal_context'],
        'ambiguities': entities['ambiguities'],
        'needs_user_confirmation': entities['needs_user_confirmation'],
        'supported_languages': list(LANGUAGE_NAMES.keys())
    }


if __name__ == '__main__':
    # CLI interface for Node.js child_process integration
    if len(sys.argv) > 1:
        try:
            payload = json.loads(sys.argv[1])
            action = payload.get('action', 'process')
            if action == 'translate':
                text = payload.get('text', '')
                src = payload.get('source_lang', 'auto')
                tgt = payload.get('target_lang', 'en')
                translated = translate_text(text, src, tgt)
                print(json.dumps({
                    'success': True,
                    'original_text': text,
                    'translated_text': translated,
                    'source_lang': src,
                    'target_lang': tgt
                }, ensure_ascii=False))
            else:
                text = payload.get('text', '')
                lang = payload.get('preferred_language', None)
                res = process_multilingual_input(text, lang)
                print(json.dumps(res, ensure_ascii=False))
        except Exception as err:
            print(json.dumps({'error': str(err)}))
    else:
        # Default self-test
        sample = "ನನಗೆ ಮೂರು ದಿನಗಳಿಂದ ಜ್ವರ ಮತ್ತು ತಲೆನೋವು ಇದೆ."
        print(json.dumps(process_multilingual_input(sample), ensure_ascii=False, indent=2))
