# MediAgent — Complete Project Audit, Critical Evaluation & Enhancement Roadmap

**Project:** MediAgent — Intelligent Multi-Disease Clinical Decision Support System
**Repository:** `pruthvi20058/Final-Project` at `/home/user/Final-Project`
**Branch audited:** `arena/370e8461-final-project` (branched from `286e03182bf3cfa495560c3b903edbd82f9dcc1e` of `main`)
**Audit date:** 2026-11-25
**Auditor role:** Senior AI Engineer / AI-ML Researcher / Full-Stack Architect / Healthcare AI Specialist / Cybersecurity Auditor / Project Reviewer
**Status:** Treatment as a clinical decision-support / research prototype — NOT a medical device, NOT a substitute for a doctor.

---

## A. Executive Summary

### Overall project quality
MediAgent is a **genuinely engineered full-stack prototype**, not a hollow shell. It contains real, trained scikit-learn models (Logistic Regression for diabetes and malaria, Random Forest for dengue and chikungunya, Gradient Boosting for typhoid) trained on real, identifiable public datasets (UCI Pima Indians, a dengue clinical cohort, a malaria severity cohort, Brazil SINAN chikungunya, and a typhoid clinical CSV). It has a real OCR pipeline (pdf-parse + Tesseract with spatial layout analysis), a real multilingual NLP engine (rule-based symptom lexicon with negation, duration, and script detection across 10 Indian languages), a real SQLite database with audit tables, and a working Express backend with REST routes.

### Current maturity
**Prototype / early-demo stage.** The pipeline runs end-to-end for the happy path (upload a diabetes-style lab report → OCR → feature mapping → ML prediction → SHAP → risk), but large parts of the user-facing experience are either simulated, hardcoded, or silently replaced with fabricated demo data when the backend is unreachable.

### What works well
1. **ML inference for diabetes** — real LogisticRegression artifact, real 8-feature Pima gating, real SHAP LinearExplanation with additive-consistency checks, honest ~71% accuracy / 0.82 ROC-AUC.
2. **OCR & lab-value extraction** — working pdf-parse + Tesseract, with column-aware spatial extraction and a strong normalization map (includes deliberate guards: HbA1c is NOT mapped to plasma glucose; systolic is NOT mapped to diastolic).
3. **Multilingual NLP** — the strongest component: script detection, romanized code-switching, negation detection, duration extraction, severity, and historical-vs-current classification for Kannada, Hindi, English, Tamil, Telugu, Malayalam, Marathi, Bengali, Gujarati, Punjabi.
4. **Feature mapping rigor** — `pimaFeatureMapper.js` refuses ambiguous mappings and reports missing/invalid features explicitly rather than fabricating inputs.
5. **Transparent anti-fabrication posture** — a `deprecated/` directory archives the old synthetic-data trainer with an explicit notice; dataset provenance is documented.

### Biggest weaknesses
1. **Silent fabrication of clinical results.** `client/src/services/api.js` contains `getClinicalFallback()` which returns hardcoded `FALLBACK_PREDICTION`, `FALLBACK_REPORT`, `FALLBACK_XAI`, `FALLBACK_EVIDENCE`, `FALLBACK_RISK`, and a `DEMO_EVALUATION` claiming **100% accuracy on "1,200 Cases"** whenever any API call fails or the backend is unreachable. `IS_DEMO` is exported as `false`, yet the app routinely displays fabricated patient "Sarah Johnson" (74% diabetes probability) and fabricated metrics. The `DemoBanner` claims "All patient records and model inference parameters are synthetic/demo data" on every page, contradicting the real-backend happy path. This is the single most misleading aspect of the project.
2. **Authentication is not realistically enforced.** `LoginPage.jsx` silently falls back to hardcoded demo credentials (`pavan@mediagent.com` / `pavan123`, etc.) when the backend is unreachable and stores a doctor object + a literal `"token-demo-session"` in localStorage. `api.js` never sends an `Authorization: Bearer` header, so `/api/auth/me` is never satisfied in the frontend. Backend stores passwords in **plaintext** (`doctor.password !== password`) and exposes `cors({ origin: '*' })` with no rate limiting.
3. **Chikungunya data leakage.** `model_metadata.json` itself reports `duplicate_rows_detected: 8319` out of 10,000 records (83% duplicates). Unless duplicates were strictly kept out of the test split (no evidence they were), the reported metrics (accuracy 0.5665, ROC-AUC 0.5799) are unreliable and likely optimistically biased.
4. **Typhoid is internally contradictory.** `DATASET_PROVENANCE.md` states Typhoid is "UNAVAILABLE (NO_VERIFIED_DATASET) ... explicitly locked," yet `model_registry.json` has typhoid status `TRAINED`, a real `GradientBoostingClassifier` artifact (`models/typhoid/model.joblib`, 109 KB), `typhoid_clinical.csv` (600 records), and suspiciously perfect metrics (recall 1.0, ROC-AUC 0.9923, accuracy 98.33%, zero false negatives). `test-multidisease-ml.js` asserts typhoid returns `UNAVAILABLE`, which contradicts the running code.
5. **XAI is fabricated for 4 of 5 diseases.** `/reports/:id/xai` returns hardcoded SHAP values for chikungunya/dengue/malaria/typhoid (e.g., "Anti-CHIKV IgM +45.0%") that are never computed from the actual models. Only diabetes uses real SHAP.
6. **"Agentic AI" is simulated.** `server/agents/orchestrator.js` runs a fixed sequence of plain JS functions with hardcoded `delay(800…1600)` calls to fake async agent work. There is no tool calling, no planning, no task decomposition, no memory, no conditional routing, no error recovery, no loops, and no human-in-the-loop gate. `imageAgent.js` is explicitly simulated and invents radiology findings from filename keywords.
7. **RAG is not FAISS and is disease-narrow.** README claims a "FAISS Vector Store"; the code uses an in-memory TF-IDF cosine search over 18 hardcoded conditions in `server/knowledge/medicalKB.js`. No `faiss` package is installed. `retrieveMedicalEvidence` loads only 4 diabetes sources, so non-diabetes predictions retrieve no evidence. The `/api/chat` endpoint assembles canned KB text rather than generating grounded answers with citations.
8. **Risk scoring is hardcoded and diabetes-centric.** Glucose ≥126 → risk 75/HIGH; HbA1c ≥6.5 → 80/HIGH — ADA diagnostic thresholds repurposed as a generic risk score regardless of disease. The uncertainty block is mostly constants (confidence 95.0, margin 5.0, dataCompleteness 100).
9. **No testing discipline.** Six ad-hoc Node scripts; no test runner, no frontend tests, no security tests, no end-to-end tests against a live server. README's "38/38 Master Integration Suite PASSED / 13/13 SHAP / 15/15 pages CLEAN" corresponds to no test suite in the repository — an unverifiable claim.
10. **Frontend "progress" is fake.** `AnalysisProgressPage.jsx` advances steps via a hardcoded `setInterval` timer every 450 ms; it is not connected to any real backend pipeline progress.

### Honest assessment
MediAgent is **a solid student major-project prototype with real ML and real OCR underneath**, but its current demo-day presentation relies on fabricated fallbacks, simulated agents, and overstated claims (FAISS, 100% accuracy, 38/38 tests). It is **not** ready for clinical demonstration as a validated decision-support tool without the P0 fixes below. Its genuine engineering (OCR, multilingual NLP, Pima gating, SHAP) is creditable; its presentation layer (fallback data, fake agents, inflated metrics) is its main liability.

---

## B. Project Scorecard

Scores are 0–10, based strictly on inspected code and artifacts (not README claims).

| Category | Score / 10 | Evidence | Main weakness |
|---|---:|---|---|
| Frontend | 5 | React/Vite pages exist and navigate; `api.js` silently returns hardcoded `FALLBACK_*` clinical data on API failure (`client/src/services/api.js` lines ~620-720); `DemoBanner` labels all data as demo on every page; `AnalysisProgressPage` fakes progress with a timer; no auth headers sent | Silent fabrication of results; demo-vs-real ambiguity |
| Backend | 6 | Express routes are real and functional; SQLite schema is well-designed; multer upload, pdf-parse, tesseract integrated | `cors({origin:'*'})`, plaintext passwords (`server/routes/auth.js`), no rate limiting, no helmet, 50 MB JSON body limit |
| ML implementation | 6 | Real sklearn artifacts for all 5 diseases; real Pima 8-feature gating; stratified train/test; scaler fit on train only | Chikungunya 83% duplicate rows; typhoid metrics suspiciously perfect; heuristic fallbacks bypass models (`server/services/diseaseInferenceEngine.js` dengue `0.78/0.35` rule) |
| Data quality | 4 | Real public datasets present; provenance documented | Chikungunya duplicate leakage; typhoid `sample_size: 0` in registry vs 600-row CSV; no imbalance handling documented beyond warnings; no external validation |
| Multi-disease support | 5 | 5 disease modules with models and schemas; diabetes gating is strict | Typhoid registry says TRAINED while provenance says GUARDED; only diabetes has real SHAP; dengue/malaria/chikungunya/typhoid explanations hardcoded |
| NLP | 7 | Rule-based lexicon, negation, duration, severity, historical/current for 10 Indian languages (`server/services/multilingualNlp.py`) | No medical NER library (spaCy/MedCAT); translation via optional `deep_translator` MyMemory (unreliable for clinical terms); no clinical spell-check |
| Multilingual support | 6 | Script detection + romanized keywords; ASR via Google Speech (unauthenticated, internet-dependent); TTS via edge-tts/gTTS | ASR/TTS need network and API keys not configured; no fallback strategy documented; voice not integrated into main prediction flow |
| Report extraction | 6 | Real pdf-parse + Tesseract + spatial column extraction; per-line OCR confidence; duplicate detection; strong exclusion guards | No per-value confidence; no mandatory user verification before prediction (backend auto-predicts); scanned-PDF path shells out to `python pdfRenderer.py` (PyMuPDF dependency not in package.json) |
| Computer vision | 2 | `imageAgent.js` is explicitly simulated — invents radiology findings from filename keywords; no real image model | No genuine CV; OCR is image processing, not computer vision |
| RAG | 3 | TF-IDF over 18 hardcoded conditions (`server/knowledge/medicalKB.js`); 4 diabetes sources in `sources.json` | README claims FAISS but no faiss installed; no generative answering; no citations to live URLs; no evidence for non-diabetes diseases; no hallucination/uncertainty handling |
| Agentic AI | 2 | `orchestrator.js` runs fixed agent sequence with hardcoded `delay()` calls to fake async work | No tool calling, planning, memory, conditional routing, error recovery, or human-in-the-loop; "agents" are plain functions |
| Explainable AI | 5 | Real SHAP LinearExplainer for diabetes with additive-consistency check; additive diff logged | Non-diabetes XAI is hardcoded fiction (`server/routes/reports.js` xai endpoint); no calibration plots; SHAP not connected to non-Pima models |
| Risk assessment | 3 | Hardcoded diabetes thresholds (glucose ≥126, HbA1c ≥6.5) applied generically; uncertainty block mostly constants | Arbitrary thresholds, no disease-specific stratification, false-reassurance risk (missing data → LOW score), no clinical validation |
| Security | 3 | Input validation on uploads; audit-log tables exist | Plaintext passwords; open CORS; no rate limiting; no auth header forwarding from frontend; secrets not present (good) but no secret management needed |
| Testing | 2 | 6 ad-hoc Node scripts (no runner); no frontend, security, or e2e tests | README's "38/38 PASSED" has no corresponding test suite in repo |
| User experience | 6 | Polished Tailwind UI, disease tabs, probability bars, safety disclaimers | DemoBanner/fabricated data undermines trust; fake progress page; mobile layout untested |
| Research novelty | 3 | Multilingual Indian-language symptom NLP is the most novel element; Pima gating guards are good engineering | Mostly a symptom/lab-report checker; no external validation; no novelty claim is verifiable; "agentic" and "FAISS RAG" are mislabelled |
| Overall project | 4.5 | Real ML + OCR + NLP + SQLite backend, deployable | Fabricated fallbacks, simulated agents, unverifiable claims, security gaps, ML data-quality issues |

---

## C. Critical Issues

### C1. Silent fabrication of clinical results on API failure
**Evidence/file:** `client/src/services/api.js` — `getClinicalFallback()` (lines ~620-720) returns `FALLBACK_PREDICTION` (Sarah Johnson, 74% diabetes), `FALLBACK_XAI`, `FALLBACK_EVIDENCE`, `FALLBACK_RISK`, and `DEMO_EVALUATION` (claims `modelAccuracy: 1.0`, `precision: 1.0`, etc. on "1,200 Cases"). `IS_DEMO = false` yet fallback is demo data. `DemoBanner.jsx` states "All patient records and model inference parameters are synthetic/demo data" on every page.
**Why it matters:** When the Render backend spins down (free tier) or is unreachable, a demonstrator or user sees fully fabricated clinical numbers, ICD-10 codes, SHAP attributions, and "100% accuracy" metrics without any clear indication that they are synthetic. In a healthcare context this is dangerous and academically misleading.
**Severity:** CRITICAL
**Solution:** Remove `getClinicalFallback` substitution or gate it behind an explicit `DEMO_MODE` flag that renders a prominent "OFFLINE — DEMO DATA ONLY" banner. Never substitute fabricated predictions, probabilities, or accuracy metrics for real API responses. Show a genuine connection-error state instead.

### C2. Authentication not enforced; demo-credential fallback
**Evidence/file:** `client/src/components/LoginPage.jsx` (catch block, lines ~170-205) falls back to hardcoded `nameMap` credentials and sets `localStorage.setItem('mediagent_token', 'token-demo-session')` when the backend is unreachable. `client/src/App.jsx` `handleLogin` stores a doctor object in localStorage without validating a token. `client/src/services/api.js` never sends `Authorization: Bearer <token>`.
**Why it matters:** The frontend "login" is theatrical — any email works offline, and no protected backend call is actually authorized. Role-based access (doctor review, admin dataset studio) is not real.
**Severity:** CRITICAL
**Solution:** Wire login to `/api/auth/login`, store the real JWT/token, send it on every API request, add a `/api/auth/me` guard on app load, and remove the offline credential fallback (or mark it explicitly as offline demo mode).

### C3. Plaintext passwords and open CORS
**Evidence/file:** `server/routes/auth.js` (`doctor.password !== password` — plaintext comparison); `server/index.js` `app.use(cors({ origin: '*' }))`; `server/db/database.js` `doctors` table stores `password TEXT NOT NULL` with no hashing.
**Why it matters:** Any database leak exposes all clinician credentials; open CORS allows any site to call the backend. No rate limiting on login enables brute force.
**Severity:** CRITICAL
**Solution:** Hash passwords with bcrypt/argon2; add `express-rate-limit` on `/api/auth/login` and `/api/nlp/*`; restrict CORS to known frontend origins; add `helmet` and `express-mongo-sanitize`-style input sanitization.

### C4. Chikungunya training data leakage (83% duplicates)
**Evidence/file:** `server/ml/diseases/chikungunya/model_metadata.json` — `"duplicate_rows_detected": 8319` of 10,000 records; `server/ml/data/chikungunya_clinical.csv`.
**Why it matters:** If duplicated rows fall across the train/test split, the model memorizes rather than generalizes, making the reported 0.5799 ROC-AUC / 0.5665 accuracy meaningless. Chikungunya predictions cannot be trusted.
**Severity:** CRITICAL
**Solution:** De-duplicate the SINAN cohort before splitting; use a group-aware or patient-aware split so no patient appears in both train and test; re-train and re-report metrics; document de-duplication in provenance.

### C5. Typhoid internal contradiction and suspiciously perfect metrics
**Evidence/file:** `server/ml/data/DATASET_PROVENANCE.md` ("Typhoid ... UNAVAILABLE ... explicitly locked ... ML inference for Typhoid is explicitly locked") vs `server/ml/models/model_registry.json` (typhoid `status: TRAINED`, real `GradientBoostingClassifier` artifact, metrics `recall: 1.0`, `roc_auc: 0.9923`, `accuracy: 0.9833`, zero false negatives on 120-test-row split) vs `server/tests/test-multidisease-ml.js` TEST 9 (asserts typhoid returns `UNAVAILABLE`, which the code contradicts).
**Why it matters:** The project simultaneously claims typhoid is guarded/unavailable and ships a trained typhoid model with near-perfect metrics. A zero false-negative rate on a real clinical dataset is not credible and risks false reassurance.
**Severity:** CRITICAL
**Solution:** Resolve the contradiction: either remove the typhoid model/artifacts and keep the guardrail (matching the provenance document), or publish the typhoid training dataset, re-train with proper stratification, report realistic metrics with confidence intervals, and remove the heuristic `0.85/0.25` Widal-titer fallback in `diseaseInferenceEngine.js`.

### C6. Fabricated XAI for non-diabetes diseases
**Evidence/file:** `server/routes/reports.js` `GET /:id/xai` — returns hardcoded SHAP lists for chikungunya ("Anti-CHIKV IgM +45.0%", "Polyarthralgia +28.0%"), dengue, malaria, typhoid that are never computed from any model.
**Why it matters:** Presenting fabricated feature attributions as "SHAP explainability" misleads users about why a prediction was made. Only diabetes has real SHAP.
**Severity:** HIGH
**Solution:** Compute real feature importances for tree models (dengue, chikungunya) and coefficients for logistic models (malaria, typhoid), or return a clear "explainability unavailable for this model" message. Never hardcode attributions.

### C7. "Agentic AI" is simulated, not autonomous
**Evidence/file:** `server/agents/orchestrator.js` — every agent step uses `await delay(800)` / `delay(1200)` / `delay(400)` to simulate work; fixed linear sequence with no conditional routing. `server/agents/imageAgent.js` explicitly simulates radiology findings from filename keywords.
**Why it matters:** Claiming "Agentic AI" in README/pitch while the pipeline is a hardcoded script with artificial delays is misleading for a viva/hackathon evaluation.
**Severity:** HIGH
**Solution:** Either re-label as a "deterministic pipeline" or implement genuine agent orchestration (tool-calling LLM router, conditional routing, guardrail-driven human-in-the-loop, execution logging) per Section H.

### C8. README/test claims unverifiable (possible misrepresentation)
**Evidence/file:** `README.md` "✅ Test Results" table claims "Master Integration Suite (38 tests) 38/38 PASSED", "SHAP Explainability Suite (13 tests) 13/13 PASSED", "Multi-Disease ML Suite 10/10 PASSED", "Frontend Pages 15/15 CLEAN." No such test suites exist in `server/tests/` (only 6 ad-hoc scripts) and there is no frontend test directory.
**Why it matters:** Citing non-existent passing test suites is academically dishonest and will collapse under viva questioning.
**Severity:** HIGH
**Solution:** Remove the fabricated test-results table from README until real suites exist; adopt Vitest (frontend) + Jest/Node (backend) + pytest (ML) with committed test files.

### C9. Hardcoded, disease-agnostic risk scoring
**Evidence/file:** `server/routes/reports.js` `GET /:id/risk` — glucose ≥126 → score 75/HIGH; HbA1c ≥6.5 → 80/HIGH regardless of disease; `uncertainty.confidence = 95.0`, `margin = 5.0`, `dataCompleteness = 100` hardcoded.
**Why it matters:** Applying diabetes diagnostic thresholds to dengue/malaria/typhoid reports is clinically wrong; constant uncertainty values imply false precision.
**Severity:** HIGH
**Solution:** Implement disease-specific risk stratification with transparent thresholds clearly labeled as requiring clinical validation (Section D).

### C10. No mandatory user verification of OCR-extracted lab values before prediction
**Evidence/file:** `server/routes/reports.js` `POST /upload` — OCR → parse → `generatePredictionForReport` → save prediction, all without requiring user verification. The `PUT /:id/lab-results` verification endpoint exists but is optional.
**Why it matters:** OCR misreads (e.g., 148 vs 14.8, wrong decimal) flow directly into ML prediction and risk scoring with no human check.
**Severity:** HIGH
**Solution:** Add a `verified` flag; predictions on unverified reports must return `PREDICTION_PENDING_USER_VERIFICATION`; the frontend must show an extraction-review screen before allowing prediction (Section J).

---

## D. Complete Drawbacks List

### 1. ML and dataset
- Chikungunya: 8319/10,000 duplicate rows (83%) recorded in metadata; likely train/test contamination.
- Typhoid: provenance says guarded/unavailable, but registry says TRAINED with a real artifact and near-perfect metrics (recall 1.0, ROC-AUC 0.9923); `sample_size: 0` in registry contradicts 600-row CSV.
- Dengue: JS inference engine has a hardcoded heuristic fallback `(ns1 === 1 || plt < 100000) ? 0.78 : 0.35` that bypasses the RandomForest.
- Typhoid: JS engine has hardcoded Widal-titer fallback `(widalTh >= 160 || widalTo >= 160) ? 0.85 : 0.25`.
- Malaria: only 337 records; single-cohort; no pediatric/adult stratification.
- Pima: restricted to adult females of Pima Indian heritage — not generalizable to the Indian (Mysuru/Karnataka) user population; zero values in biological fields represent missing data but are treated as real (documented limitation, not mitigated in inference).
- No cross-validation for non-diabetes models; no calibration plots; no decision-curve analysis; no external validation cohort.
- No model versioning, drift monitoring, or retraining triggers in production.

### 2. Clinical logic
- No distinction between "risk of disease" and "diagnosis" is consistently maintained; some UI text says "Dengue Positive / Confirmed" from an ML screen.
- ICD-10 codes assigned from model output without clinical confirmation.
- Medication agent recommends real drugs (e.g., Ceftriaxone, Azithromycin, Artemether-Lumefantrine) from symptom-match alone — prescribing-level output from a symptom matcher, with no dosage, pregnancy, or renal adjustments.
- No drug–disease contraindication checks beyond the static `drugInteractions` list (e.g., ibuprofen/dengue guardrail mentioned in README not visibly enforced in code paths).

### 3. Risk scoring
- Hardcoded ADA diabetes thresholds (glucose ≥126 mg/dL, HbA1c ≥6.5%) applied as a generic risk score for all diseases.
- Uncertainty block is constant (confidence 95.0, margin 5.0, dataCompleteness 100).
- Missing data can lower apparent risk (e.g., absent features default to 0 in dengue/malaria/chikungunya feature mapping).
- No contradictory-data detection (e.g., high NS1 + normal platelets + no fever).
- No urgent-symptom escalation integrated into the report-upload path (triage only lives in the consultation agent).

### 4. Report extraction
- OCR confidence is document-level (Tesseract overall), not per-value; no per-value confidence shown to user.
- No image-quality detection (blur, glare, cut-off headers) before OCR.
- No user verification gate before prediction (see C10).
- Scanned-PDF path requires `python pdfRenderer.py` / PyMuPDF, which is not declared in `server/package.json` — will fail in production unless Python tooling is present.
- Table extraction is spatial/heuristic, not model-based; multi-page reports merge with "--- PAGE BREAK ---" but no cross-page record linkage.
- No handling of unsupported formats beyond 4 extensions; no virus/malware scanning of uploads.

### 5. NLP and multilingual support
- No clinical NER (relies on static lexicon); out-of-vocabulary symptoms are silently dropped.
- Translation uses `deep_translator` MyMemory (unauthenticated, rate-limited, not clinical-grade); medical meaning can be lost in back-translation.
- No spell-check for misspelled symptom words.
- ASR depends on unauthenticated Google Speech API (network + quota dependent) with no API key configured.
- No confirmation that Kannada/Hindi ASR actually works without Google credentials; `speech_recognition` `recognize_google` is unofficial and unreliable in production.

### 6. Agentic AI
- Agents are plain functions with hardcoded `delay()` calls (simulated latency).
- No tool calling, no planning, no task decomposition, no memory, no conditional routing, no error recovery, no loops, no human-in-the-loop gate.
- `imageAgent` fabricates radiology impressions from filename keywords.
- No agent execution log that survives a server restart (kept in memory `Map` only).
- No safety guardrail integrated into ML prediction path (guardrail only runs in the consultation pipeline).

### 7. RAG and medical evidence
- No FAISS (README claim false); in-memory TF-IDF over 18 hardcoded conditions.
- Knowledge base contains only 4 diabetes documents; no evidence retrieval for dengue/malaria/typhoid/chikungunya predictions.
- `/api/chat` returns canned KB text, not generated answers with per-claim citations.
- No hallucination detection, no "no-answer" handling beyond a generic message, no source-date freshness checks.
- Source URLs in `sources.json` are not verified as reachable.

### 8. Explainable AI
- Real SHAP only for diabetes; all other diseases return hardcoded fiction.
- SHAP values explained as log-odds but shown to users as if they were clinical weights — causality implication risk.
- No explanation of "why more information is needed" when `INSUFFICIENT_DATA` beyond listing missing features.
- No model-limitation or population-bias explanation (Pima heritage limitation not shown to users).

### 9. Frontend
- Silent fallback to fabricated `FALLBACK_*` clinical data on any API error (C1).
- `AnalysisProgressPage` fakes pipeline progress with a client-side timer (not connected to backend).
- `DemoBanner` claims all data is demo on every page, contradicting the real-backend path.
- No auth token sent with requests (auth is theatrical).
- No loading/error states that distinguish "backend down" from "demo mode."
- Mobile responsiveness and accessibility (ARIA, color contrast, keyboard navigation) not audited/verified.

### 10. Backend
- Plaintext password storage; no password policy.
- `cors({ origin: '*' })`; no rate limiting; no `helmet`.
- `express.json({ limit: '50mb' })` — large-payload DoS surface.
- Multer writes files to disk by original name pattern with UUID prefix but no content-type validation (extension-only allowlist); no antivirus scan.
- Python subprocesses invoked with user-derived paths (`filePath` from request body) — path traversal risk if `filePath` is not strictly bounded (`ml.js` inspect endpoint resolves `path.join(__dirname, '..', '..', filePath)`).
- No structured request validation (Joi/Zod) on prediction payloads.
- No API versioning; no OpenAPI/Swagger spec.

### 11. Security and privacy
- OCR text and lab results (potential PHI) stored in plaintext SQLite; no encryption at rest.
- Chat messages stored with raw user text; no PII redaction before logging (RAG sanitizer only removes a few hardcoded patterns).
- No data-deletion / right-to-erasure endpoint.
- No consent capture for data processing.
- Audit log exists (`audit_logs` table) but no tamper-evidence or export.
- Secrets: none hardcoded (good), but no env var validation at startup.

### 12. Testing
- No test runner; 6 ad-hoc scripts; no assertions against a running HTTP server.
- No frontend tests (Vitest/RTL absent).
- No security tests (auth bypass, injection, file-upload).
- No ML regression tests with fixed input → expected output contracts.
- No OCR accuracy tests with known-good reports.

### 13. Deployment
- `render.yaml` / `vercel.json` exist but the Render free tier spins down, triggering the frontend fallback-fabrication path (C1).
- `server/package.json` does not declare Python dependencies (`scikit-learn`, `shap`, `pandas`, `numpy`, `joblib`, `PyMuPDF`, `speech_recognition`, `edge_tts`, `gtts`, `deep_translator`) — the Render build command installs them via `pip install ...` inline, which is fragile and not version-pinned.
- `client` tesseract.js and `eng.traineddata` bundled, but server-side Python OCR (`pdfRenderer.py`) depends on system `python` and PyMuPDF not declared.
- No Dockerfile, no CI pipeline (` .github/workflows/deploy.yml` exists but content not inspected as functional), no health-check endpoint beyond `/api/health`.

### 14. Research novelty
- "Agentic AI" and "FAISS RAG" are mislabelled (simulated pipeline; TF-IDF KB).
- No external validation; no comparison with existing symptom checkers.
- No reproducibility package (fixed seeds, requirements.txt with pins, data hashes).
- Novelty claim rests mainly on multilingual Indian-language NLP, which is genuinely implemented but modest in scope.

---

## E. Recommended Enhancements

| Priority | Existing drawback | Enhancement | Technologies/tools | Difficulty | Expected impact |
|---|---|---|---|---|---|
| P0 | Silent fallback fabricates clinical results (C1) | Remove `getClinicalFallback` substitution; return real errors; add explicit offline/demo banner only behind a flag | `client/src/services/api.js` | Easy | Stops dangerous fabricated results; restores trust |
| P0 | Plaintext passwords + open CORS + no rate limiting (C3) | bcrypt hashing, rate-limit login, restrict CORS origins, add helmet | `bcryptjs`, `express-rate-limit`, `helmet`, `server/routes/auth.js`, `server/index.js` | Easy | Secures clinician accounts and API |
| P0 | Auth not enforced in frontend (C2) | Send Bearer token on requests; `/api/auth/me` guard; remove offline demo-credential fallback | `client/src/services/api.js`, `LoginPage.jsx`, `App.jsx` | Easy | Makes access control real |
| P0 | Chikungunya duplicate-row leakage (C4) | De-duplicate SINAN cohort; patient-level train/test split; re-train; re-report metrics | Python, pandas, `server/ml/data/chikungunya_clinical.csv` | Medium | Trustworthy chikungunya metrics |
| P0 | Typhoid contradiction / perfect metrics (C5) | Resolve: publish typhoid data or remove model + artifacts; remove Widal-titer heuristic | `server/ml/data/typhoid_clinical.csv`, `server/services/diseaseInferenceEngine.js` | Medium | Clinically defensible typhoid module |
| P0 | No mandatory OCR verification before prediction (C10) | `verified` flag; block prediction until user confirms extracted values | `server/routes/reports.js`, `client/src/pages/app/ReportExtractionPage.jsx` | Medium | Prevents OCR errors from driving predictions |
| P0 | Fabricated XAI for non-diabetes (C6) | Compute real tree importances / logistic coefficients; or return "explainability unavailable" | `shap`, `sklearn`, `server/routes/reports.js` | Medium | Honest explanations |
| P1 | "Agentic AI" simulated (C7) | Re-label as deterministic pipeline, or implement real tool-calling orchestrator with guardrails and human-in-the-loop | `server/agents/orchestrator.js` | Medium | Honest agent claim; safer workflow |
| P1 | README fabricated test claims (C8) | Remove non-existent test table; add real Vitest/Jest/pytest suites | `client/`, `server/tests/`, `server/ml/tests/` | Easy | Academic integrity |
| P1 | Hardcoded diabetes-centric risk scoring (C9) | Disease-specific risk stratification; thresholds labeled as requiring clinical validation | `server/routes/reports.js`, `server/services/riskService.js` (new) | Medium | Clinically meaningful risk |
| P1 | RAG not FAISS / disease-narrow (C7) | Add FAISS or pgvector; ingest authoritative sources per disease; citation-per-claim; no-answer handling | `faiss-cpu` / `langchain`, `server/knowledge/`, `server/services/ragService.js` | Medium | Genuine evidence retrieval |
| P1 | No testing discipline (C12) | Commit unit/API/ML/security tests; CI workflow | `vitest`, `supertest`, `pytest`, `gh-actions` | Medium | Demonstratable reliability |
| P1 | ASR/TTS internet-dependent, no keys (D-5) | Add graceful offline fallback; document API-key requirement; or switch to browser Web Speech API for ASR | `Web Speech API`, `edge-tts`, `server/services/speechService.py` | Easy | Reliable voice in demo |
| P2 | Missing data defaults to 0 in infectious disease models | Explicit "feature missing → abstain" rather than zero-imputation for clinically meaningful fields | `server/services/diseaseFeatureMapper.js` | Medium | Avoids false reassurance |
| P2 | No image-quality detection before OCR | Blur/glare/dim detection; reject or warn before extraction | `opencv-python-headless` / `sharp` metrics | Medium | Better extraction quality |
| P2 | No clinical NER / spell-check | Add symptom spell-check and optional MedCAT/spaCy NER for entity recognition | `spaCy`, `symspellpy` | Harder | Robust free-text symptom entry |
| P2 | No model versioning/drift monitoring | Model registry with versions, input-drift checks, retraining prompts | `mlflow` lite or custom registry | Medium | Maintainable ML |
| P2 | Medication agent recommends drugs from symptom match | Restrict to informational monographs only; remove dosing/treatment recommendation from symptom-only path | `server/agents/medicationAgent.js` | Easy | Reduces unsafe prescribing output |
| P2 | No external validation | Hold-out validation on a separate cohort; report sensitivity/specificity with CIs | Python, sklearn | Medium | Credible performance claims |
| P3 | Docker + CI + pinned requirements | Dockerfile for server (Node + Python), pinned `requirements.txt`, GitHub Actions CI | `Docker`, `requirements.txt`, `.github/workflows/ci.yml` | Medium | Reproducible deployment |
| P3 | Accessibility / mobile | ARIA labels, color-contrast audit, responsive tables | Tailwind, axe-core | Easy | Inclusive UI |
| P3 | Data deletion / consent | Delete-account and data-erasure endpoints; consent capture | `server/routes/patients.js` | Easy | Privacy compliance |

---

## F. Proposed MediAgent 2.0 Architecture

Retain existing stack: React 18 + Vite frontend, Express + better-sqlite3 backend, Python scikit-learn/shap ML, Tesseract OCR. Add: FAISS vector store, bcrypt/rate-limit/helm, Vitest/pytest, optional Docker.

### Architecture diagram (text)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (React + Vite)                        │
│  ┌─────────────┐  ┌─────────────────┐  ┌───────────────────────┐   │
│  │ Symptom NLP │  │ Report Upload   │  │ Dashboard / Results   │   │
│  │ (multilingual│  │ (OCR preview +  │  │ (risk, SHAP, evidence)│   │
│  │  lexicon + ASR│ │ user verification)│  │                       │   │
│  └──────┬──────┘  └────────┬────────┘  └───────────┬───────────┘   │
└─────────┼──────────────────┼───────────────────────┼───────────────┘
          │ HTTPS / JSON     │ HTTPS / multipart    │ HTTPS / JSON
          ▼                  ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (Express, Node.js)                  │
│  Auth (bcrypt + rate-limit) · CORS · Helmet · Request validation   │
│  ───────────────────────────────────────────────────────────────  │
│  /api/auth · /api/patients · /api/reports · /api/ml · /api/nlp   │
│  /api/chat (RAG) · /api/assessments · /api/knowledge · /api/health│
└─────────┬──────────────────────────────────────────────────────┬────┘
          │                                                      │
   ┌──────┴──────┐                                     ┌────────▼────────┐
   │ SQLITE DB   │                                     │   PYTHON ML     │
   │ (better-sqlite3│                                    │ microservice    │
   │  + WAL, audit) │    ┌──────────────────────┐      │ (scikit-learn)  │
   │ patients     │    │   ML MODEL LAYER       │      │ • predict.py    │
   │ reports      │    │  ├─ diabetes: LR + SHAP│      │ • train_*.py    │
   │ lab_results  │    │  ├─ dengue: RandomForest│      │ • shap explainer│
   │ predictions  │    │  ├─ malaria: LogisticR │      │ • model registry│
   │ rag_records  │    │  ├─ chikungunya: RF    │      │ • requirements.txt│
   │ audit_logs   │    │  └─ typhoid: GB (guarded)│      └─────────┬───────┘
   └─────────────┘    └──────────────────────┘                │
          │                                                   ▼
          │                                  ┌─────────────────────────┐
          └─────────────────────────────────►│  FAISS Vector Store     │
                     (via /api/chat RAG)     │  + authoritative sources│
                                              │  (WHO/MoHFW/NCDC/ADA)   │
                                              └─────────────────────────┘

Data flow (verified path):
1. User enters symptoms (text/voice, EN/KN/HI) → NLP extracts entities (negation/duration aware) → triage agent checks urgent symptoms → if critical, EMERGENCY escalation + human review, no silent prediction.
2. User uploads PDF/image report → OCR (pdf-parse/Tesseract) → image-quality check → spatial extraction → PREVIEW for user verification (test name, value, unit, reference range) → user confirms/corrects → store verified lab results.
3. ML readiness check against disease schema → if READY → real model inference (python subprocess) → probability + class → real SHAP/feature importance → risk stratification (disease-specific thresholds) → RAG evidence retrieval with citations → guardrail review → final report with disclaimer.
4. If NOT READY → list missing features → offer manual entry or symptom-based differential only (no fabricated probability).
5. All steps logged (audit_logs); prediction stored with model version, input hash, and SHAP payload for traceability.
```

### Flow notes
- **Deterministic components (keep as functions):** OCR extraction, feature mapping/readiness gating, scaler transform, model inference, risk thresholds, input validation.
- **Agent components (genuine tool-calling, optional):** Symptom-extraction agent, report-interpretation agent, disease-analysis agent, evidence-retrieval agent, risk agent, critic/verification agent, report-generation agent. These should be orchestrated by an LLM router that calls tools (not hardcoded delays).
- **Boundary:** Agents never output a final probability or diagnosis; they recommend, and a deterministic ML model + gate produces the number. The critic agent checks for contradictions (e.g., high predicted risk but all labs normal) before the result is shown.

---

## G. Disease-wise Improvement Plan

### Diabetes
- **Dataset:** UCI Pima Indians (768 records) — retain, but document population limitation (adult females, Pima heritage). For the Indian (Karnataka) context, add an Indian diabetes cohort (e.g., ICMR/NDFW or CURE-Dis) as an external validation set.
- **Features:** 8 canonical Pima features. Keep strict gating. Add optional BMI-from-height/weight and age-from-demographics (already partially supported).
- **Algorithm:** Logistic Regression (interpretable, calibrated) — retain. Consider Random Forest as a secondary model with calibration (Platt/isotonic) and compare via Brier score.
- **Validation:** 5-fold stratified CV (already done), report sensitivity/specificity/F1/ROC-AUC with 95% CIs; external validation on an Indian cohort.
- **Evidence:** ADA Standards of Care, WHO diagnostic criteria (already in sources.json).
- **Why:** Logistic regression coefficients are clinically interpretable and SHAP-consistent; appropriate for a screening tool where explainability matters more than raw accuracy.

### Malaria
- **Dataset:** Hospital clinical severity cohort (337 records) — retain but expand; add parasitemia count, species (P. falciparum vs vivax), and organ-damage markers.
- **Features:** 17 binary symptoms/signs + age/sex. Retain; add blood-smear/RDT result as a strong feature.
- **Algorithm:** Logistic Regression — appropriate for severity triage with interpretable coefficients.
- **Validation:** stratified split; sensitivity is critical (missing severe malaria is dangerous) — prioritize recall over precision; report confusion matrix.
- **Evidence:** WHO severe-malaria criteria (prostration, hypoglycemia, hemoglobinuria, etc. are already features — good alignment).
- **Why:** Symptoms-only model is a triage aid, not a diagnosis; must always recommend smear/RDT confirmation.

### Typhoid
- **Resolution required:** Either (a) remove the typhoid model and keep the "guarded/unavailable" notice consistent with DATASET_PROVENANCE.md, or (b) publish the typhoid_clinical.csv source, de-duplicate, re-train Gradient Boosting with stratification, and report realistic metrics (the current recall = 1.0 / ROC-AUC = 0.9923 is not credible).
- **Features (if retained):** fever_duration, body_temperature, widal_to/widal_th, blood_culture, wbc, platelets, hepatomegaly, splenomegaly — clinically appropriate for enteric fever.
- **Algorithm:** Gradient Boosting — acceptable if calibrated; blood culture must remain the gold-standard recommendation in output.
- **Validation:** stratified split; report sensitivity/specificity with CIs; external validation on an independent typhoid cohort.
- **Why:** Widal titers have known sensitivity/specificity limitations; the model must not be presented as a substitute for blood culture.

### Chikungunya
- **Dataset:** Brazil SINAN cohort — **must de-duplicate** (83% duplicates recorded). Re-split so no duplicate patient appears in train and test.
- **Features:** 12 binary clinical signs (fever, arthralgia, arthritis, rash, leukopenia, etc.) — appropriate for acute arboviral triage.
- **Algorithm:** Random Forest — acceptable; calibrate probabilities (the current uncalibrated RF probabilities are poorly reliable given AUC ≈ 0.58).
- **Validation:** group-aware split; report sensitivity/specificity/F1/AUC with CIs; given AUC ≈ 0.58, the model is near-chance — be honest that it adds little over clinical judgment.
- **Evidence:** CDC/WHO chikungunya clinical management guidance (already referenced in hardcoded XAI; move to sourced RAG).
- **Why:** With AUC near 0.58, this module should be positioned as "symptom triage support only — confirm with RT-PCR/IgM" and not as a diagnostic test.

---

## H. Agentic AI Enhancement Plan

### Recommended architecture (deterministic core + optional genuine agents)

Keep deterministic: OCR → parsing → normalization → readiness gating → scaler → model inference → SHAP/importance → risk thresholds → database persistence.

Make agents (thin LLM tool-call wrappers) for: symptom extraction/report interpretation (ambiguous cases), evidence retrieval (query reformulation), criticism/verification (contradiction detection), and report generation (plain-language summary). Agents must never compute the ML probability.

### Agent roles and tools

| Agent | Role | Tools | Deterministic validation required |
|---|---|---|---|
| Input Understanding Agent | Language detection, ASR transcript cleanup, symptom normalization | multilingualNlp.py, speechService.py | Negation/historical filtering (already rule-based) |
| Symptom Extraction Agent | Map free text to canonical symptoms; detect ambiguity; ask clarifying questions | SYMPTOM_LEXICON, NEGATION_TERMS, duration parser | Rule-based negation guard; no ML output |
| Lab Report Interpretation Agent | OCR quality check, test-name normalization, unit conversion, flag impossible values | reportParser.js, NORMALIZATION_MAP | Range validation; user confirmation gate |
| Disease Analysis Agent | Select disease model, run inference, return probability + class | predict.py / diseaseInferenceEngine.js | Schema readiness gate (no prediction if missing) |
| ML Prediction Tool (not an agent) | Pure inference: scaler.transform → model.predict → probability | sklearn joblib artifacts | None (already deterministic) |
| Clinical Evidence Retrieval Agent | Reformulate query, retrieve from FAISS/KB, attach citations | FAISS index, sources.json | No patient PII in query (sanitize) |
| Risk Assessment Agent | Apply disease-specific thresholds, produce Low/Moderate/High/Critical | Risk tables (to be validated clinically) | Thresholds flagged as requiring clinical validation |
| Verification/Critic Agent | Detect contradictions (e.g., high risk + all-normal labs; dengue NS1+ with normal platelets), flag for human review | Rules over labs + prediction | Human-in-the-loop for critical |
| Final Report Generation Agent | Compose plain-language result with disclaimer, uncertainty, next steps | Template engine | Must not alter model probability |

### Step-by-step behavior

1. **User enters symptoms only:** NLP extracts active/negated/historical symptoms → triage checks vitals/urgent symptoms → if emergency (chest pain, SpO2 < 90, etc.), show EMERGENCY escalation and stop; otherwise differential symptom-matched from KB + guidance; offer report upload for ML; no disease probability without labs.
2. **User uploads report only:** OCR → extraction preview → user verifies/corrects values → readiness check → if READY, model inference + real explainability + disease-specific risk + cited evidence → if NOT READY, list missing features, offer manual entry, no fabricated probability.
3. **Symptoms + report:** Both paths run; critic agent checks symptom–lab agreement (e.g., reports "no fever" but dengue model features all positive from OCR — flag contradiction); if conflict, show both and recommend physician review.
4. **Information missing:** Return `INSUFFICIENT_DATA` with the exact missing features; allow manual entry; never default missing features to 0 for clinically meaningful values.
5. **Data conflicts:** Critic agent flags (e.g., HbA1c 6.5% but glucose 90 mg/dL; or OCR value outside plausible range); asks user to confirm before prediction.
6. **Urgent symptoms:** Triage agent returns Emergency/Urgent → override any "Low risk" ML output → show emergency guidance + human-review-required banner.
7. **Model output and evidence disagree:** Show both with the model probability labelled "ML screen" and evidence labelled "general guidance"; critic agent adds "consult clinician" disclaimer; no single definitive answer.
8. **System cannot determine next step:** Return `REQUIRES_CLINICIAN_REVIEW` with a summary of what is known/missing; never guess.

### Preventing failure modes
- No infinite loops: fixed maximum of 3 agent turns; escalate to human after.
- No unnecessary LLM calls: agents only invoked when deterministic path is ambiguous.
- No hallucinated diagnoses: agents are forbidden from outputting probabilities or ICD-10 codes; only the ML model outputs probability; only clinicians assign diagnoses.
- Traceability: every agent step logged to `audit_logs` with timestamp, agent name, tool called, input hash, output, and human-review flag.

---

## I. Multilingual NLP Enhancement

The existing `multilingualNlp.py` is the project's strongest asset. Recommended implementation:

**Stage 1 — Strengthen detection & extraction (immediate, no new models):**
- Keep Unicode script detection + romanized keyword heuristic for EN/KN/HI/TA/TE/ML/MR/BN/GU/PA.
- Add a small clinical spell-checker (SymSpell) per language for common misspellings.
- Expand the lexicon with more symptom variants and add "red-flag" symptom detection (chest pain, breathlessness, confusion) that bypasses translation and triggers triage immediately.

**Stage 2 — Translation without losing medical meaning:**
- Do NOT translate symptoms to English and then treat the English as ground truth. Instead: extract entities in the source language using the native-language lexicon (already done), then map canonical symptom names to the model's feature space. Translation is only for displaying the response back to the user.
- Use a clinical glossary for term consistency (e.g., "jwara" → fever → `fever` canonical). Back-translate for user confirmation ("You reported fever for 3 days — is that correct?").

**Stage 3 — Voice:**
- Prefer the browser Web Speech API for ASR (client-side, no API key) with `lang` attributes (`kn-IN`, `hi-IN`, `en-IN`, etc.); fall back to Google Speech/`speech_recognition` only when configured.
- TTS: keep edge-tts/gTTS fallback; cache common phrases.

**Testing:**
- Acceptance: given "ನನಗೆ ಮೂರು ದಿನಗಳಿಂದ ಜ್ವರ ಮತ್ತು ತಲೆನೋವು ಇದೆ" → detected `kn`, active symptoms `[fever, headache]`, duration 3 days, not negated, not historical.
- Given "मुझे बुखार नहीं है" → `hi`, fever negated.
- Given mixed "I have fever and jwara since 2 days" → romanized+EN detected, both map to `fever`, duration 2.
- Undsupported language → polite message in English + offer to type in English.

---

## J. Report Processing Enhancement

**Robust pipeline for PDF, scanned PDF, images:**

1. **Intake & validation:** extension allowlist (.pdf, .jpg, .jpeg, .png, .webp), max 15 MB, virus scan (ClamAV sidecar or cloud scan), reject password-protected PDFs.
2. **Image-quality detection:** blur (Laplacian variance), brightness, contrast, skew; warn user if below threshold before OCR; allow "upload anyway" with a low-quality flag.
3. **Text layer first:** `pdf-parse` on selectable PDFs. If text length < 30 chars → scanned → render pages (PyMuPDF/pdfRenderer.py — declare dependency) at 150–200 DPI → preprocess with sharp (grayscale, normalize, sharpen, resize to ~1400 px width) → Tesseract OCR with TSV.
4. **Extraction:** spatial column assignment (existing logic is good) + line-pattern fallback. Normalize via NORMALIZATION_MAP; parse reference ranges; flag values outside plausible clinical ranges (e.g., glucose > 300, creatinine > 5).
5. **Confidence scoring:** per-line average OCR word confidence → per-value confidence; document-level Tesseract confidence as secondary. Display confidence to user; low-confidence values highlighted for review.
6. **User verification (mandatory):** Before any prediction, render a review screen: test name, value, unit, reference range, status (NORMAL/HIGH/LOW/INVALID), confidence, and the raw OCR line. User must confirm or correct each value used for prediction. Store `validated_by_user = 1`.
7. **Validation & contradiction detection:** glucose vs HbA1c consistency (ADA); systolic vs diastolic (already guarded); platelet vs NS1 for dengue; age plausibility (1–120); WBC/platelet plausibility.
8. **Unreadable/unsupported:** Return `EXTRACTION_FAILED` with clear message ("We couldn't read this report clearly — please upload a clearer image or enter values manually"); never silently use bad values.
9. **Audit:** store raw OCR text, extraction method, per-value confidence, and user-verification status in `lab_results` + `audit_logs`.

---

## K. Testing and Validation Roadmap

Acceptance criteria are behavioral/structural — no invented medical accuracy targets.

| # | Test | Success criterion |
|---|---|---|
| 1 | Upload valid PDF lab report (diabetes panel) | 200 response; all 8 Pima features extracted or flagged missing; readiness status correct |
| 2 | Upload blurry/low-contrast image | Quality warning shown; user can still proceed with low-quality flag; extraction not silently trusted |
| 3 | Upload unsupported file (.docx, .exe) | 400 `UNSUPPORTED_FILE_TYPE`; no file written to disk outside uploads/ |
| 4 | Upload oversized file (>15 MB) | 400 `FILE_TOO_LARGE` |
| 5 | Extract lab values correctly | Extracted value matches ground-truth entry for ≥ 90% of fields on a known-good report; units and reference ranges preserved |
| 6 | Detect abnormal values | glucose ≥126 flagged HIGH; HbA1c ≥6.5 flagged HIGH; platelets <100k flagged LOW |
| 7 | Handle missing values | `INSUFFICIENT_DATA` with exact `missingFeatures` list; no prediction generated |
| 8 | Handle contradictions | HbA1c ≥6.5 with glucose 90 → contradiction warning before prediction |
| 9 | Unsupported language NLP | Polite English response; offer to type in English; no crash |
| 10 | API failure handling | Frontend shows genuine connection error, NOT fabricated `FALLBACK_PREDICTION` (after P0 fix) |
| 11 | Model prediction consistency | Same input → same probability across 10 repeated calls (determinism) |
| 12 | Security: auth | Protected endpoints return 401 without valid Bearer token |
| 13 | Security: file upload | Non-allowlist extension rejected; no path traversal via `filePath` parameter |
| 14 | Security: rate limit | > 10 login attempts/min → 429 |
| 15 | ML: missing feature rejection | 7-of-8 Pima features → `INSUFFICIENT_DATA` (already covered by test-ml-legitimate TEST 10) |
| 16 | ML: probability range | probabilityVector sums to 1.0; estimatedProbability in [0,1] (TEST 9) |
| 17 | XAI: diabetes | SHAP additive reconstruction diff < 1e-4 vs model decision_function (already in train.py) |
| 18 | XAI: non-diabetes | No hardcoded SHAP values returned; either real importance or "unavailable" |
| 19 | E2E: upload → verify → predict → view SHAP | Full flow completes with real backend data; no fallback data shown |
| 20 | Log integrity | Every prediction has matching audit_log entry with model version and input hash |

Definition of done per test: automated in CI (Vitest + supertest + pytest), run on every push, results committed as `test-results/`.

---

## L. Prioritized Implementation Roadmap

### Phase 1 — Critical Fixes
| Tasks | Files/modules | Dependencies | Expected result | DoD | Priority | Difficulty |
|---|---|---|---|---|---|---|
| Remove `getClinicalFallback`; real error states | `client/src/services/api.js` | None | No fabricated results on API error | Fallback returns connection error | P0 | Easy |
| bcrypt passwords, rate-limit login, restrict CORS, helmet | `server/routes/auth.js`, `server/index.js` | bcryptjs, express-rate-limit, helmet | Passwords hashed; login rate-limited | Login works with hashed pw; 429 on brute force | P0 | Easy |
| Forward Bearer token; `/api/auth/me` guard; remove demo-credential fallback | `client/src/services/api.js`, `LoginPage.jsx`, `App.jsx` | None | Real auth enforced | Token sent; offline login disabled | P0 | Easy |
| Mandatory OCR user verification before prediction | `server/routes/reports.js`, `client/src/pages/app/ReportExtractionPage.jsx` | None | Predictions only on verified values | `verified` gate blocks unverified prediction | P0 | Medium |
| Resolve typhoid contradiction (remove model+artifacts or publish data + re-train) | `server/ml/models/typhoid/`, `server/ml/data/typhoid_clinical.csv`, `server/ml/data/DATASET_PROVENANCE.md`, `server/services/diseaseInferenceEngine.js` | None | Consistent typhoid story | Registry matches provenance; no perfect fake metrics | P0 | Medium |
| De-duplicate chikungunya; re-split; re-train; report realistic metrics | `server/ml/data/chikungunya_clinical.csv`, `server/ml/diseases/chikungunya/train.py` | pandas, sklearn | No duplicate leakage | Duplicate count = 0 in train/test split | P0 | Medium |
| Remove fabricated XAI for non-diabetes | `server/routes/reports.js` (`/xai` endpoint) | None | Real or "unavailable" explanations | No hardcoded SHAP values | P0 | Medium |
| Remove fabricated README test table; add real tests | `README.md`, `server/tests/`, `client/` | vitest, supertest, pytest | Test claims match code | CI runs tests on push | P0 | Easy |

### Phase 2 — ML and Dataset Improvement
| Tasks | Files | Dependencies | Expected result | DoD | Priority | Difficulty |
|---|---|---|---|---|---|---|
| External validation cohort for diabetes (Indian population) | new `server/ml/data/indian_diabetes_validation.csv` | pandas, sklearn | Sensitivity/specificity with CIs on external data | Validation report committed | P1 | Medium |
| Calibrate non-diabetes model probabilities (dengue/chikungunya RF) | `server/services/diseaseInferenceEngine.js` | sklearn (via python) | Calibrated probabilities | Calibration curve plotted | P1 | Medium |
| Add class-imbalance handling (malaria 337 records) | `server/ml/diseases/malaria/train.py` | imbalanced-learn | Class weights / SMOTE documented | Training logs show class balance | P1 | Medium |
| Model versioning + drift monitoring stub | `server/ml/common/model_registry.py` | None | Model versions recorded | New version on retrain | P1 | Medium |

### Phase 3 — Report Extraction
| Tasks | Files | Dependencies | Expected result | DoD | Priority | Difficulty |
|---|---|---|---|---|---|---|
| Declare Python OCR dependencies; Dockerize server | `server/requirements.txt`, `Dockerfile` | PyMuPDF, scikit-learn, shap, etc. | Reproducible builds | `docker build` succeeds | P1 | Medium |
| Image-quality detection before OCR | `server/services/reportParser.js` (new module) | sharp / opencv-python | Blur/glare warning | Quality gate works | P1 | Medium |
| Per-value confidence display | `server/services/reportParser.js`, frontend extraction page | None | Confidence shown per lab value | UI shows confidence | P1 | Medium |

### Phase 4 — NLP and Multilingual Support
| Tasks | Files | Dependencies | Expected result | DoD | Priority | Difficulty |
|---|---|---|---|---|---|---|
| Clinical spell-check + expanded lexicon | `server/services/multilingualNlp.py` | symspellpy | Misspelled symptoms mapped | Test suite passes | P1 | Medium |
| Browser Web Speech ASR primary, Google fallback | `client/src/pages/app/MultilingualVoicePage.jsx` | None | Voice works offline for supported langs | ASR returns transcript | P1 | Easy |
| Confirmation ("You said X — correct?") before assessment | `server/agents/multilingualAgent.js` | None | Disambiguation step | User can confirm/correct | P1 | Easy |

### Phase 5 — Agentic AI
| Tasks | Files | Dependencies | Expected result | DoD | Priority | Difficulty |
|---|---|---|---|---|---|---|
| Replace hardcoded `delay()` pipeline with real orchestration or re-label deterministic | `server/agents/orchestrator.js` | None | Honest agent claim | No fake delays | P1 | Medium |
| Implement Critic/Verifier agent (contradiction detection) | `server/agents/criticAgent.js` (new) | None | Contradictions flagged | Test: conflicting labs flagged | P2 | Medium |
| Human-in-the-loop gate for critical triage | `server/agents/guardrailAgent.js` | None | Critical cases require review | Guardrail returns humanReviewRequired | P2 | Easy |
| Agent execution logging (persistent) | `server/db/database.js` (audit_logs) | None | Logs survive restart | Audit entries present | P2 | Easy |

### Phase 6 — RAG and Evidence
| Tasks | Files | Dependencies | Expected result | DoD | Priority | Difficulty |
|---|---|---|---|---|---|---|
| Replace TF-IDF with FAISS/pgvector; ingest per-disease authoritative sources | `server/knowledge/`, `server/services/ragService.js` | faiss-cpu | Disease-specific evidence retrieved | Sources cited per disease | P1 | Medium |
| Citation-per-claim in `/api/chat`; no-answer handling | `server/routes/knowledge.js`, `server/index.js` (/api/chat) | None | Grounded answers with citations | No canned KB assembly | P1 | Medium |

### Phase 7 — Explainability and Risk
| Tasks | Files | Dependencies | Expected result | DoD | Priority | Difficulty |
|---|---|---|---|---|---|---|
| Disease-specific risk stratification (thresholds labeled for validation) | `server/services/riskService.js` (new) | None | Risk per disease, not diabetes-only | Thresholds documented as unvalidated | P1 | Medium |
| Real feature importance for all models | `server/ml/diseases/*/predict.py` | sklearn/shap | Real explanations everywhere | XAI endpoint returns real data | P1 | Medium |
| Calibration plots + Brier score reporting | `server/ml/common/evaluation.py` | sklearn | Calibration reported | Plots committed | P2 | Medium |

### Phase 8 — Security and Testing
| Tasks | Files | Dependencies | Expected result | DoD | Priority | Difficulty |
|---|---|---|---|---|---|---|
| Full test suite: unit, API, ML, security, OCR | `server/tests/`, `client/` | vitest, supertest, pytest | 100% of K-section tests pass | CI green | P1 | Medium |
| Penetration-style checks (path traversal, file upload) | `server/tests/security.test.js` | supertest | No traversal; no exec | 400/403 on malicious input | P1 | Medium |

### Phase 9 — UI/UX and Deployment
| Tasks | Files | Dependencies | Expected result | DoD | Priority | Difficulty |
|---|---|---|---|---|---|---|
| Remove fake AnalysisProgress timer; connect to real backend events | `client/src/pages/app/AnalysisProgressPage.jsx` | None | Real progress or remove page | Progress tied to backend | P2 | Easy |
| Accessibility + mobile audit | `client/src/` | axe-core | ARIA, contrast, responsive | Audit report | P2 | Easy |
| Docker + CI + pinned requirements | `Dockerfile`, `.github/workflows/ci.yml` | docker | One-command deploy | `docker-compose up` works | P2 | Medium |

---

## M. What I Should Implement Next (Top 10)

**Enhancement 1:** Eliminate fabricated clinical fallbacks
- Current problem: `client/src/services/api.js` `getClinicalFallback()` returns hardcoded `FALLBACK_PREDICTION`, `FALLBACK_XAI`, `FALLBACK_EVIDENCE`, `FALLBACK_RISK`, and `DEMO_EVALUATION` (100% accuracy) whenever the API fails; `DemoBanner` claims all data is demo on every page.
- What I need to implement: Remove `getClinicalFallback` substitution; return genuine connection errors; gate any demo data behind an explicit `DEMO_MODE` flag with a prominent banner.
- Technologies: `client/src/services/api.js`, `client/src/components/DemoBanner.jsx`.
- Expected result: Users never see fabricated probabilities, ICD-10 codes, or accuracy metrics; trustworthy error states instead.
- Priority: P0

**Enhancement 2:** Fix authentication (real tokens, hashed passwords, no demo fallback)
- Current problem: Plaintext passwords in SQLite; `LoginPage.jsx` falls back to hardcoded `pavan@mediagent.com/pavan123` credentials offline; frontend never sends Bearer tokens.
- What I need to implement: bcrypt password hashing, rate-limited login, restrict CORS, helmet, store real token, send `Authorization: Bearer` on requests, `/api/auth/me` guard, remove offline credential fallback.
- Technologies: `bcryptjs`, `express-rate-limit`, `helmet`, `server/routes/auth.js`, `server/index.js`, `client/src/services/api.js`, `LoginPage.jsx`.
- Expected result: Genuine, enforceable clinician access control.
- Priority: P0

**Enhancement 3:** Mandatory user verification of OCR-extracted values before prediction
- Current problem: Backend auto-predicts immediately after OCR; no requirement that a human confirms extracted lab values (misreads flow into ML predictions).
- What I need to implement: Add `verified` flag to lab results; prediction endpoint returns `PREDICTION_PENDING_USER_VERIFICATION` until user confirms/corrects values; frontend review screen.
- Technologies: `server/routes/reports.js`, `client/src/pages/app/ReportExtractionPage.jsx`, `server/db/database.js`.
- Expected result: OCR errors cannot silently drive clinical risk scores.
- Priority: P0

**Enhancement 4:** Resolve typhoid contradiction and remove heuristic fallbacks
- Current problem: Provenance doc says typhoid is "guarded/unavailable" but registry says TRAINED with a real GradientBoosting artifact and near-perfect metrics (recall 1.0, ROC-AUC 0.9923); hardcoded Widal-titer `0.85/0.25` rule bypasses the model.
- What I need to implement: Either publish typhoid data, de-duplicate, re-train, report realistic metrics with CIs — or remove typhoid model/artifacts and keep the guardrail; remove the heuristic rule from `diseaseInferenceEngine.js`.
- Technologies: `server/ml/data/typhoid_clinical.csv`, `server/ml/diseases/typhoid/train.py`, `server/ml/data/DATASET_PROVENANCE.md`, `server/services/diseaseInferenceEngine.js`.
- Expected result: Clinically defensible, consistent typhoid module.
- Priority: P0

**Enhancement 5:** De-duplicate chikungunya data and re-train
- Current problem: `model_metadata.json` records 8319/10,000 duplicate rows; metrics unreliable due to likely train/test contamination.
- What I need to implement: De-duplicate SINAN cohort, patient-level stratified split, re-train Random Forest, report honest metrics (expect near-chance AUC ≈ 0.58 to be confirmed or refuted).
- Technologies: pandas, sklearn, `server/ml/data/chikungunya_clinical.csv`.
- Expected result: Trustworthy chikungunya performance figures; honest positioning as triage support only.
- Priority: P0

**Enhancement 6:** Real explainability for non-diabetes diseases (remove hardcoded SHAP)
- Current problem: `/reports/:id/xai` returns fabricated SHAP values (e.g., Anti-CHIKV IgM +45%) for dengue/malaria/chikungunya/typhoid.
- What I need to implement: Compute real tree feature importances (dengue/chikungunya) or logistic coefficients (malaria/typhoid); return "explainability unavailable" if not computable.
- Technologies: sklearn feature_importances_/coef_, `server/routes/reports.js`.
- Expected result: Explanations match actual models; no fabricated attributions.
- Priority: P0

**Enhancement 7:** Disease-specific risk scoring (replace hardcoded diabetes thresholds)
- Current problem: Glucose ≥126 / HbA1c ≥6.5 applied generically; uncertainty block hardcoded (confidence 95, margin 5, completeness 100).
- What I need to implement: Per-disease risk thresholds clearly labeled as requiring clinical validation; dynamic uncertainty from model probability and data completeness.
- Technologies: new `server/services/riskService.js`, `server/routes/reports.js`.
- Expected result: Risk levels are disease-appropriate; uncertainty reflects real model/data state.
- Priority: P1

**Enhancement 8:** Genuine RAG with citations (replace TF-IDF/FAISS misclaim)
- Current problem: README claims FAISS; code uses TF-IDF over 18 hardcoded conditions; only 4 diabetes sources; no evidence for other diseases; no citations.
- What I need to implement: FAISS/pgvector index with per-disease authoritative sources (WHO, MoHFW, NCDC, CDC, ADA); citation-per-claim; no-answer handling; PII sanitization.
- Technologies: `faiss-cpu`, `server/knowledge/`, `server/services/ragService.js`, `/api/chat`.
- Expected result: Retrievable, citable medical evidence per disease.
- Priority: P1

**Enhancement 9:** Honest agent architecture (remove simulated delays)
- Current problem: `orchestrator.js` uses hardcoded `delay(800…1600)` to fake agent work; `imageAgent` invents radiology findings from filenames.
- What I need to implement: Re-label pipeline as deterministic, or implement real tool-calling agents with guardrails, critic verification, and human-in-the-loop; persistent execution logging.
- Technologies: `server/agents/orchestrator.js`, `server/agents/criticAgent.js` (new), `audit_logs`.
- Expected result: Agentic claim matches implementation; safe conditional routing.
- Priority: P1

**Enhancement 10:** Committed test suite and removal of fabricated test claims
- Current problem: README cites "38/38 Master Integration Suite", "13/13 SHAP", "15/15 pages" — no such suites exist; only 6 ad-hoc scripts.
- What I need to implement: Vitest (frontend), supertest (backend API), pytest (ML), security tests; CI workflow; remove fabricated table from README.
- Technologies: `vitest`, `supertest`, `pytest`, `.github/workflows/ci.yml`.
- Expected result: Verifiable, repeatable validation; academic integrity.
- Priority: P1

---

## N. Honest Final Verdict

1. **Is MediAgent currently a genuinely advanced AI healthcare project or mainly a prototype?**
   It is a **genuine but early-stage prototype** with real engineering underneath (trained sklearn models on real public datasets, real OCR + spatial extraction, real multilingual NLP with negation/duration handling, real SQLite audit schema). It is **not** an advanced or clinically validated system. The presentation layer (fabricated fallbacks, simulated agents, inflated claims) currently outweighs the substance in a demo setting.

2. **Is its Agentic AI implementation genuine?**
   **No.** The agents are plain JavaScript functions executed in a fixed sequence with hardcoded `delay()` calls to simulate asynchronous work. There is no tool calling, planning, task decomposition, memory, conditional routing, error recovery, or human-in-the-loop. The term "agentic" is being used misleadingly.

3. **What is its most serious technical weakness?**
   **Silent fabrication of clinical results:** `api.js` substitutes hardcoded patient data, predictions, SHAP explanations, evidence, and "100% accuracy" metrics whenever the backend is unreachable, without clearly telling the user. In a healthcare demonstrator this is dangerous and academically misleading.

4. **What is the biggest risk if I demonstrate it in its current state?**
   A demo on the live Render backend (free tier, spins down) or poor network will cause the frontend to fall back to the fabricated "Sarah Johnson" 74%-diabetes report and "100% accuracy" evaluation dashboard. A knowledgeable evaluator can spot the hardcoded data (fixed IDs REP-9001/PAT-8001, static probabilities), which destroys credibility and misrepresents prototype performance as validated clinical performance.

5. **What features are genuinely impressive?**
   - The multilingual NLP engine (`multilingualNlp.py`) — script detection, romanized code-switching, negation, duration, severity, historical-vs-current for 10 Indian languages is well-implemented and rare in student projects.
   - Strict Pima feature gating with anti-leakage guards (HbA1c not mapped to glucose; systolic not mapped to diastolic; explicit missing/INVALID reporting).
   - Real OCR + spatial table extraction pipeline (pdf-parse + Tesseract + column assignment).
   - SHAP explainability with additive-consistency verification for diabetes.
   - Well-designed SQLite schema with audit logs and a documented dataset-provenance catalog.

6. **What features are merely superficial?**
   - "Agentic AI" pipeline (simulated with `delay()`).
   - "FAISS RAG" (actually TF-IDF over 18 hardcoded conditions; only 4 diabetes sources).
   - XAI for dengue/malaria/chikungunya/typhoid (hardcoded fiction).
   - DemoBanner/fabricated fallback data presented as real results.
   - `AnalysisProgressPage` (client-side timer fake).
   - README's "38/38 tests passed" (no such suite).
   - Medication agent recommending real prescription drugs from symptom matches.

7. **What 5 enhancements would make the project significantly better?**
   1. Remove fabricated fallbacks; real error states + explicit demo-mode banner (P0).
   2. Real authentication (bcrypt, tokens, rate-limiting) and enforce it end-to-end (P0).
   3. Mandatory user verification of OCR-extracted lab values before any prediction (P0).
   4. Fix chikungunya duplicate leakage and resolve the typhoid guarded-vs-trained contradiction (P0).
   5. Real per-disease explainability and disease-specific risk scoring (no hardcoded SHAP) (P1).

8. **What would make MediAgent stand out from other college AI projects?**
   Honesty about limitations, plus the multilingual Indian-language symptom NLP (Kannada/Hindi/English with negation and duration) combined with a transparent "this is a screening prototype, here are the missing features, here is the evidence, consult a doctor" framing. Most college symptom-checkers overclaim; MediAgent could stand out by **underclaiming and showing its work** (missing-feature gating, real SHAP, cited evidence, uncertainty). Pair that with a reproducible Docker build and a committed test suite, and it becomes a credible final-year engineering project.

9. **What should I avoid wasting time implementing?**
   - More "agents" for the sake of agent count; a 9-agent pipeline with hardcoded delays is worse than a clean deterministic pipeline.
   - A full microservices split, Kubernetes, or real-time WebSockets — unnecessary for this scope.
   - Prescription/dosing recommendations from symptom matching (unsafe; keep medicines as informational monographs only).
   - Claiming diagnostic accuracy for chikungunya with AUC ≈ 0.58 — position it honestly as triage support.
   - Image "computer vision" beyond OCR — there is no genuine image model; don't pretend radiology findings are computed.

10. **If you were my project guide, what changes would I insist on before final submission?**
   - Remove all fabricated fallback data and fabricated test-result claims; the demo must show real backend output or a genuine error screen.
   - Fix authentication (hashed passwords + real tokens) and secure the API (CORS, rate limit, helmet).
   - Add a mandatory OCR verification step before predictions.
   - De-duplicate chikungunya data; make the typhoid story consistent (data or no model).
   - Replace hardcoded non-diabetes SHAP with real importances or "unavailable."
   - Add a real test suite (Vitest + supertest + pytest) run in CI, and remove the fake "38/38" table from README.
   - Add a prominent, persistent disclaimer that this is a research prototype, not a diagnostic device, with population limitations (Pima heritage) stated on every prediction page.

---

### Immediate next step (do this first)
Fix Enhancement 1 (remove `getClinicalFallback` fabricated-data substitution in `client/src/services/api.js`) before any public demonstration — everything else builds on the user being able to trust that the numbers on screen came from a real model, not a hardcoded constant.

---

**Audit basis:** All findings are supported by inspected source files under `/home/user/Final-Project` (server routes, services, agents, ML Python code, model artifacts, `client/src/services/api.js`, client pages, README, dataset-provenance catalog, model metadata JSONs, and test scripts). No code was modified during this audit. No clinical validation or real-world diagnostic capability is claimed for MediAgent.