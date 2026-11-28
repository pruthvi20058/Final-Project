# MediAgent — Final Demonstration Workflow

**Duration:** 10–15 minutes
**Presenter:** Academic evaluator / project author
**Audience:** Faculty panel / project examiners
**Format:** Live demonstration with synthetic/fictional data only

---

## Pre-Demo Checklist

- [ ] Server running on port 3001 (`npm start` in `/server`)
- [ ] Frontend running on port 5173 (`npm run dev` in `/client`)
- [ ] Health endpoints accessible: `/api/health`, `/api/health/ready`, `/api/health/models`
- [ ] No real patient data loaded — only DEMO_PATIENTS (synthetic)
- [ ] Browser open to `http://localhost:5173`
- [ ] Terminal visible for health endpoint output (optional)

---

## 1. Opening (2 minutes)

**Script:**
> "MediAgent is an autonomous clinical decision support system — an academic prototype built with React, Express, SQLite, and Python ML. It is NOT a certified medical device. It does not diagnose. It provides AI-assisted screening support with clinician-in-the-loop review."

**Show:**
- Project README / architecture overview
- Tech stack: React 18, Vite, Express, SQLite, Python/scikit-learn
- Key modules: Disease Prediction, OCR Lab Report Parsing, RAG Medical Evidence,
  Multilingual NLP, Agentic AI Orchestration, Clinical Risk Stratification

---

## 2. Health Check & System Status (2 minutes)

**Actions:**
1. Open browser to `http://localhost:5173`
2. Show Landing Page — highlights: multilingual support, 5 disease models, OCR, RAG
3. Call `/api/health` — expect `HEALTHY` with database check
4. Call `/api/health/ready` — expect `READY` with database/python-ml/model-artifacts
5. Call `/api/health/models` — show model registry:
   - Diabetes: VERIFIED
   - Dengue: NEEDS_CLEANING (flagged — possible data leakage)
   - Malaria: VERIFIED_LOW_PERFORMANCE
   - Chikungunya: NEEDS_CLEANING (flagged — duplicate rows)
   - Typhoid: NOT_TRAINED/UNAVAILABLE (gated)

**Key talking points:**
- System self-validates on startup
- Model limitations are transparently displayed
- Typhoid model is gated — no inference served
- Correlation IDs on every request for traceability

---

## 3. Laboratory Report Upload & OCR (3 minutes)

**Actions:**
1. Navigate to Reports / Upload page
2. Upload a fictional/demo lab report (PDF or image)
3. Watch OCR extraction — Tesseract.js parses text, extracts lab values
4. Show normalized test names and unit validation
5. Show range validation flags (high/low/normal)
6. Submit for disease prediction

**Expected flow:**
```
Upload → OCR Extraction → Feature Mapping → Model Readiness Check → Prediction
```

**If Typhoid selected:** Show "MODEL_NOT_AVAILABLE — gated" response (no fabricated prediction)

**Key talking points:**
- OCR handles PDF and image uploads (15MB limit)
- Lab values normalized to standard names/units
- Out-of-range values flagged for clinician review
- No prediction served for models that aren't trained/validated

---

## 4. Disease Prediction & Explainability (3 minutes)

**Actions:**
1. Select Diabetes model (verified, VERIFIED status)
2. Enter features: Pregnancies, Plasma Glucose, Blood Pressure, BMI, etc.
3. Submit prediction
4. Show result: probability, outcome category, clinical disclaimer
5. Show SHAP explanation — which features contributed most
6. Show RAG evidence — medical references with citations from knowledge base

**Key talking points:**
- Logistic Regression for diabetes (NOT XGBoost as older docs may say)
- SHAP feature attribution for explainability
- RAG retrieves WHO/CDC/NHS/ADA sources with citations
- Every prediction includes clinical disclaimer
- ML probability ≠ clinical risk score

---

## 5. Multilingual NLP & Voice (2 minutes)

**Actions:**
1. Navigate to Health Companion / Symptom Checker
2. Enter symptoms in English: "I have fever and headache for 3 days"
3. Show symptom extraction: fever, headache, duration=3 days
4. Switch language to Kannada or Hindi
5. Enter equivalent symptoms in that language
6. Show same symptom extraction works

**Key talking points:**
- 10 languages supported: English, Kannada, Hindi, Tamil, Telugu, Malayalam, Marathi, Bengali, Gujarati, Punjabi
- Native script detection (Unicode ranges)
- Romanized code-switching detection (e.g., "mujhe bukhar hai")
- Negation detection: "I have no fever" → fever negated
- Temporal detection: "I had fever last week" → historical, not current

**Limitation to disclose:** Kannada negation detection has a known issue (`ಇಲ್ಲ` regex)

---

## 6. Agentic AI Workflow (2 minutes)

**Actions:**
1. Show Agent Workflow page / orchestration trace
2. Walk through a sample patient input → risk assessment → final report
3. Show each agent step: Triage → Diagnostic → RAG → Medication → Image → Guardrail
4. Show gate points: verification required, model unavailable

**Key talking points:**
- 6 specialized agents with defined responsibilities
- Execution trace available for audit
- Guardrail agent performs final safety validation
- Human-in-the-loop: doctor reviews and signs off

---

## 7. Clinical Safety Features (1 minute)

**Actions:**
1. Show Doctor Review page — doctor must review and sign off
2. Show clinical disclaimers on every prediction
3. Show risk stratification: Low / Moderate / High / Critical
4. Show emergency alerts for critical cases

**Key talking points:**
- Doctor-in-the-loop design — AI never acts alone
- No automated treatment recommendations
- All outputs carry clinical disclaimers
- Risk categories guide clinician attention, not replace it

---

## 8. Security & Privacy (1 minute)

**Actions:**
1. Show /api/health — no sensitive data exposed
2. Mention JWT auth with bcrypt password hashing
3. Mention rate limiting: 300 req/15min API, 20 req/15min auth
4. Mention PII files removed from git tracking
5. Mention structured logging with PII redaction

**Key talking points:**
- No patient data in git history (4 PII files removed)
- Rate limiting on all endpoints
- CORS restricted to configured origin
- Security headers via Helmet middleware

---

## 9. Closing (1 minute)

**Script:**
> "MediAgent is an academic clinical decision support prototype. It demonstrates modern AI/ML, RAG, multilingual NLP, and agentic orchestration — all with appropriate clinical safety guardrails. Model limitations are transparently documented. The system is ready for academic evaluation with clearly labeled synthetic data."

**Final show:**
- README with project summary
- Documentation index (12 docs in `/docs`)
- Git branch: `arena/370e8461-final-project`

---

## Demo Do's and Don'ts

| Do | Don't |
|----|-------|
| Use only DEMO_PATIENTS (synthetic) | Use real patient data |
| Show model limitations honestly | Hide flagged models |
| Include clinical disclaimers | Claim medical certification |
| Show Typhoid as NOT_TRAINED | Fabricate typhoid predictions |
| Use fictional lab reports | Claim clinical validation |
| Show health endpoints working | Claim Docker verified (not tested in sandbox) |

---

## Estimated Timing

| Segment | Time |
|---------|------|
| Opening | 2 min |
| Health Check | 2 min |
| Lab Report + OCR | 3 min |
| Disease Prediction + Explainability | 3 min |
| Multilingual NLP | 2 min |
| Agentic AI Workflow | 2 min |
| Clinical Safety | 1 min |
| Security & Privacy | 1 min |
| Closing | 1 min |
| **Total** | **~17 min** (can trim to 15) |

