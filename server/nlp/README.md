# MediAgent Multilingual NLP — Task 5 Documentation

## Overview

This directory documents the **Multilingual NLP, Symptom Understanding and Voice Input** subsystem (Task 5) of the MediAgent clinical decision-support prototype.

The subsystem provides:
- **Free-text symptom input** in 10 languages: English, Kannada, Hindi, Tamil, Telugu, Malayalam, Marathi, Bengali, Gujarati, Punjabi (native script + Romanized code-switching)
- **Language selector + auto-detect** via Unicode script detection and keyword heuristics
- **Structured symptom extraction**: name, duration, severity, frequency, onset, associated symptoms, negations, conditions, temperature
- **Translation strategy** with environment-variable credentials (no hardcoded keys) and provider failure handling
- **Voice input** via browser Speech Recognition API (Web Speech API) with MediaRecorder fallback, start/stop, edit-before-submit, permission/unsupported-browser/silence handling
- **MANDATORY patient verification screen**: review, edit, remove, add symptoms, correct duration/severity, confirm negatives — clinical assessment never runs without explicit patient confirmation
- **Integration with Task 4 model readiness**: no symptom→Pima mapping, `INSUFFICIENT_DATA` for missing features, no unvalidated models
- **Safety disclaimers**: no diagnosis claims, emergency warnings, clinical decision-support only
- **Backend API endpoints** with auth, input validation, no sensitive logging
- **Frontend 7-step workflow**
- **Automated tests**

---

## Architecture

```
client/src/pages/app/MultilingualVoicePage.jsx   → 7-step frontend workflow
client/src/components/FloatingVoiceAssistant.jsx → Floating health companion
client/src/services/api.js                       → nlpService API client
server/routes/nlp.js                             → Express routes (auth-protected)
server/agents/multilingualAgent.js               → Agent orchestration + symptom→feature mapping
server/services/multilingualService.js           → Python subprocess bridge
server/services/multilingualNlp.py               → Multilingual NLP engine (Python)
server/services/speechService.py                 → Speech transcription (Python)
server/services/ttsService.py                    → Text-to-speech (Python)
server/db/database.js                            → SQLite persistence (multilingual_consultations table)
```

---

## Backend API Endpoints

All endpoints are mounted under `/api/nlp` and protected by `authenticateToken` JWT middleware.

| Endpoint | Method | Description | Auth |
|---|---|---|---|
| `/languages` | GET | List 10 supported languages | Yes |
| `/detect-language` | POST | Detect input text language | Yes |
| `/transcribe` | POST | Upload + transcribe voice audio | Yes |
| `/process-text` | POST | Full multilingual NLP entity extraction | Yes |
| `/process-voice` | POST | Audio upload + transcribe + NLP extraction | Yes |
| `/synthesize-speech` | POST | Text-to-speech voice generation | Yes |
| `/consultation` | POST | Complete agentic clinical assessment (gated on `userConfirmed`) | Yes |
| `/verify-symptoms` | POST | **Task 5**: Submit patient-verified symptoms + run assessment | Yes |
| `/consultations` | GET | Retrieve all consultations | Yes |
| `/consultations/:id` | GET | Retrieve single consultation | Yes |
| `/model-readiness/:disease` | GET | **Task 5**: Check Task 4 model readiness for a disease | Yes |

### POST /api/nlp/verify-symptoms (Task 5 — New)

Submits patient-verified/corrected symptoms and runs the full clinical assessment. This is the mandatory verification endpoint — assessment never runs without `userConfirmed: true`.

**Request body:**
```json
{
  "text": "original symptom text",
  "preferredLanguage": "en",
  "patientId": "PAT-8001",
  "patientName": "Sarah Johnson",
  "patientAge": 45,
  "patientGender": "Female",
  "vitals": null,
  "synthesizeAudio": true,
  "verifiedSymptoms": ["fever", "headache", "cough"]
}
```

**Response:** Full consultation result with `status: "COMPLETE"`, `clinicalEntities`, `assessment`, `featureMappings`, `localizedResponseText`, `audioUrl`.

If `userConfirmed` is not `true`, the consultation endpoint returns:
```json
{
  "status": "REQUIRES_USER_CONFIRMATION",
  "needsUserConfirmation": true,
  "activeSymptoms": ["fever", "headache"],
  "clarificationQuestions": ["Please review and confirm..."]
}
```

### GET /api/nlp/model-readiness/:disease (Task 5 — New)

Returns Task 4 model readiness status for a disease. Used by the frontend to gate symptom→disease feature mapping.

**Response:**
```json
{
  "disease": "malaria",
  "status": "TRAINED",
  "readiness": "VERIFIED_LOW_PERFORMANCE",
  "gated": false,
  "features": ["age", "sex", "fever", ...],
  "feature_count": 17
}
```

Gated diseases (`NEEDS_CLEANING`, `UNAVAILABLE`) return `gated: true` and no inference is served.

---

## Symptom → Disease Feature Mapping (Task 4 Integration)

Located in `server/agents/multilingualAgent.js` — `mapSymptomsToDiseaseFeatures(symptoms, diseaseKey)`.

**Rules (per Task 4 requirements):**

1. **No symptom→Pima mapping**: The Pima diabetes model is strictly tabular (8 numerical features: `preg, plas, pres, skin, insu, mass, pedi, age`). Symptoms are never mapped to Pima features. Returns `PIMA_TABULAR_ONLY`.

2. **Model readiness gating**: Diseases with readiness `NEEDS_CLEANING` (dengue, chikungunya) or `UNAVAILABLE` (typhoid) are gated — no feature mapping or inference is served. Returns `MODEL_GATED_<readiness>`.

3. **INSUFFICIENT_DATA**: For eligible but not-fully-covered diseases (e.g., malaria `VERIFIED_LOW_PERFORMANCE`), symptoms map to available features but missing required features (lab values, vitals) result in `INSUFFICIENT_DATA` status.

4. **Eligible mapping**: Only diseases with readiness `VERIFIED` or `VERIFIED_LOW_PERFORMANCE` (excluding diabetes/Pima) are eligible for symptom→feature mapping.

**Example — malaria with [fever, headache, fatigue]:**
```json
{
  "status": "INSUFFICIENT_DATA",
  "mappedFeatures": {
    "fever": { "sourceSymptom": "fever", "value": 1 },
    "headace": { "sourceSymptom": "headache", "value": 1 },
    "fatigue": { "sourceSymptom": "fatigue", "value": 1 }
  },
  "missingRequired": ["age", "sex", "cold", "rigor", ...],
  "message": "Symptom-only extraction is insufficient; clinical measurements required."
}
```

---

## Translation Strategy (No Hardcoded Keys)

Translation credentials are loaded exclusively from environment variables:

| Env Var | Description | Default |
|---|---|---|
| `TRANSLATION_PROVIDER` | Translation provider: `mymemory` or `none` | `mymemory` |
| `MYMEMORY_EMAIL` | Optional MyMemory translator contact email (higher rate limit) | `null` |

**No API keys are hardcoded** in any source file. The Python `multilingualNlp.py` reads `os.environ.get('TRANSLATION_PROVIDER')` and `os.environ.get('MYMEMORY_EMAIL')`.

**Provider failure handling:**
1. If MyMemory provider is enabled and `deep_translator` is installed, attempt translation.
2. On provider failure (network, rate limit, auth), fall back to a static clinical dictionary for core phrases (fever, headache, etc.) in all 10 languages.
3. If no fallback is available, return the original text.

Add to `.env`:
```
TRANSLATION_PROVIDER=mymemory
MYMEMORY_EMAIL=your-email@example.com
```

---

## Voice Input

Two voice input paths are supported:

### 1. Browser Speech Recognition (Web Speech API) — Primary
- Uses `window.SpeechRecognition` / `window.webkitSpeechRecognition`
- Start/stop with visual feedback
- Interim + final results
- **Permission handling**: `not-allowed` → shows permission-denied message, falls back to text input
- **Unsupported browser**: detected at init, shows "Not Supported" banner, offers MediaRecorder/Text alternatives
- **Silence handling**: 3-second silence timeout auto-stops recognition
- **Edit-before-submit**: final transcript shown in an editable box; user can confirm or discard

### 2. MediaRecorder / Web Audio API — Fallback
- 16kHz PCM WAV encoding
- Upload to `/api/nlp/transcribe` for server-side Python speech_recognition transcription
- Used when Web Speech API is unavailable

---

## Frontend: 7-Step Workflow

Located in `client/src/pages/app/MultilingualVoicePage.jsx`.

| Step | Name | Description |
|---|---|---|
| 1 | **Language Selection** | Select from 10 languages or Auto-Detect |
| 2 | **Symptom Input** | Voice (browser Speech Recognition or MediaRecorder), file upload, or text — with edit-before-submit |
| 3 | **Entity Extraction Preview** | View NLP-extracted symptoms (active, negated, historical) |
| 4 | **Patient Verification** *(MANDATORY)* | Review, edit, remove, add symptoms; correct duration/severity; confirm negated symptoms |
| 5 | **Clinical Assessment** | Triage + differential diagnosis + RAG (runs only after verification) |
| 6 | **Results** | Localized response, TTS audio, symptom→feature mapping, safety disclaimers |
| 7 | **Consultation History** | View past verified consultations from SQLite |

**Step 4 is mandatory** — the assessment endpoint returns `REQUIRES_USER_CONFIRMATION` until the patient explicitly confirms their symptoms via `userConfirmed: true`.

---

## Safety & Disclaimers

- This system is a **clinical decision-support / research prototype**, not a replacement for a doctor.
- **No diagnosis claims**: The system provides symptom differentials and triage levels only.
- **Emergency warnings**: Critical triage levels (Emergency/Urgent) trigger mandatory physician review flags.
- **Guardrail Agent**: Validates all outputs for safety compliance before presentation.
- **No sensitive logging**: Clinical text is not logged to server stdout/stderr.
- **Input validation**: All API endpoints validate required fields and return 400 on missing/invalid input.

---

## Testing

Run the multilingual NLP test suite:

```bash
node server/tests/test-multilingual-nlp.js
```

Note: HTTP-based tests (endpoints 1–12 in the original suite) require a running Express server on port 3001. Direct function tests (Task 5: model readiness, symptom mapping, mandatory verification) run without a server.

### Test Coverage (Task 5 additions)

| Test | Description |
|---|---|
| 13 | Dengue model readiness gating (NEEDS_CLEANING) |
| 14 | Malaria model readiness (VERIFIED_LOW_PERFORMANCE, not gated) |
| 15 | Typhoid model readiness gating (UNAVAILABLE) |
| 16 | No symptom→Pima mapping for diabetes |
| 17 | Malaria symptom mapping + INSUFFICIENT_DATA for missing features |
| 18 | Dengue gated — no feature mapping |
| 19 | Mandatory verification: no `userConfirmed` → `REQUIRES_USER_CONFIRMATION` |
| 20 | Mandatory verification: `userConfirmed=true` → `COMPLETE` |
| 21 | Verified symptoms override NLP extraction |

---

## Environment Variables

Add to `.env` (see `.env.example`):

```bash
# Translation (Task 5)
TRANSLATION_PROVIDER=mymemory
MYMEMORY_EMAIL=your-email@example.com

# Existing (unchanged)
PORT=3001
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173
```

---

## Data Flow

```
Patient Input (Voice/Text, EN/Kn/Hi/Ta/Te/Ml/Mr/Bn/Gu/Pa)
        ↓
[Step 1] Language Selection / Auto-Detect
        ↓
[Step 2] Symptom Input → Browser Speech Recognition or MediaRecorder
        ↓ (edit-before-submit)
[Step 3] NLP Entity Extraction (Python multilingualNlp.py)
        ↓
[Step 4] MANDATORY Patient Verification — edit, remove, add, correct duration/severity, confirm negatives
        ↓ (userConfirmed = true)
[Step 5] Clinical Assessment → Triage + Diagnostic + RAG + Guardrail
        ↓
[Step 6] Results → Localized response + TTS + Symptom→Feature Mapping (Task 4)
        ↓
[Step 7] Consultation History (SQLite persistence)
```

---

## Files Reference

| File | Purpose |
|---|---|
| `server/routes/nlp.js` | Express routes: 10 endpoints including `/verify-symptoms` and `/model-readiness/:disease` |
| `server/agents/multilingualAgent.js` | Agent orchestration, symptom→feature mapping, model readiness gating, mandatory verification gate |
| `server/services/multilingualService.js` | Node↔Python bridge, translation env var pass-through |
| `server/services/multilingualNlp.py` | Multilingual NLP: language detection, symptom extraction, negation, translation |
| `server/services/speechService.py` | Audio transcription (Google Speech ASR via speech_recognition) |
| `server/services/ttsService.py` | Text-to-speech (edge-tts neural voices + gTTS fallback) |
| `server/db/database.js` | SQLite: `multilingual_consultations` table with `user_confirmed`, `user_corrections` columns |
| `client/src/pages/app/MultilingualVoicePage.jsx` | 7-step frontend workflow with verification screen |
| `client/src/services/api.js` | `nlpService.verifySymptoms()` and `nlpService.getModelReadiness()` |
| `server/tests/test-multilingual-nlp.js` | Test suite including Task 5 verification/mapping/gating tests |