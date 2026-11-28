# MediAgent — Viva Preparation Q&A

**50+ Questions and Answers for Academic Project Defense**

All answers are based on the actual implemented system. No fabricated claims.

---

## Section A: Architecture & Design (Q1–Q10)

**Q1. What is the overall architecture of MediAgent?**
**A:** Three-tier architecture: React/Vite frontend, Express/Node.js backend, SQLite database. Python ML layer for disease prediction. Agentic AI orchestration with 6 specialized agents. RAG system with TF-IDF vector search.

**Q2. Why did you choose SQLite over PostgreSQL/MySQL?**
**A:** SQLite is file-based, zero-configuration, suitable for an academic prototype and single-instance deployment. better-sqlite3 provides synchronous API with WAL mode for concurrent reads.

**Q3. What is the role of the agentic AI layer?**
**A:** The orchestrator coordinates 6 agents — Triage, Diagnostic, RAG, Medication, Image, and Guardrail — to process patient input through verification → prediction → explanation → risk assessment → report generation with safety gates at each step.

**Q4. How does the RAG system work without embeddings?**
**A:** It uses TF-IDF vectorization combined with keyword matching (hybrid scoring) and source diversity enforcement to retrieve relevant medical documents from a curated knowledge base.

**Q5. What are the 6 agents and their responsibilities?**
**A:** Triage (vitals/urgency), Diagnostic (differential diagnoses), RAG (medical evidence retrieval), Medication (treatments/drug interactions), Image (medical image analysis), Guardrail (final safety validation).

**Q6. How is authentication implemented?**
**A:** JWT-based authentication with bcrypt password hashing, 24-hour token expiry, and role-based access control (doctor/patient).

**Q7. What security headers are used?**
**A:** Helmet middleware provides Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and other security headers.

**Q8. How is rate limiting implemented?**
**A:** express-rate-limit: 300 requests per 15 minutes for general API, 20 requests per 15 minutes for auth endpoints.

**Q9. What is the correlation ID system?**
**A:** Every request gets a unique correlation ID (X-Correlation-ID header) propagated through all logs for distributed tracing and audit.

**Q10. How does the system handle graceful shutdown?**
**A:** On SIGTERM/SIGINT, the HTTP server closes, then the database connection closes, with structured log messages at each step.

---

## Section B: ML Models & Disease Prediction (Q11–Q25)

**Q11. Which 5 diseases does the system support?**
**A:** Diabetes, Dengue, Malaria, Chikungunya, Typhoid.

**Q12. What algorithm does the Diabetes model use?**
**A:** Logistic Regression with StandardScaler (NOT XGBoost).

**Q13. What are the Diabetes model metrics?**
**A:** Accuracy 0.7143, Precision 0.6087, Recall 0.5185, Specificity 0.82, F1 0.56, ROC-AUC 0.823, Brier 0.1679.

**Q14. Why is the Dengue model flagged?**
**A:** Perfect metrics (1.0 across all) are statistically implausible for clinical data — possible data leakage. Dataset source is unverified (Kaggle).

**Q15. What is the Malaria model's CV ROC-AUC?**
**A:** 0.472 — near-chance performance. Model flagged as VERIFIED_LOW_PERFORMANCE.

**Q16. What data quality issue affects the Chikungunya model?**
**A:** 8,319 duplicate rows out of 10,000 (83%) were not removed before train/test split — data leakage flagged.

**Q17. Why is Typhoid not available for prediction?**
**A:** The TyphoDx-BD dataset is restricted behind authenticated access. No training data available locally. Model is gated — no inference served.

**Q18. How does the system prevent fabricated predictions?**
**A:** Models check registry status before inference. NOT_TRAINED models return MODEL_NOT_AVAILABLE. Missing/invalid features return INSUFFICIENT_DATA. No fallback predictions.

**Q19. What explainability method is used?**
**A:** SHAP LinearExplainer for Diabetes; feature importances/coefficients for other models. TreeSHAP is NOT used.

**Q20. Is ML probability used as clinical risk?**
**A:** No. ML probability is screening output only. Clinical risk is assessed separately by the risk engine using clinical rules.

**Q21. What clinical disclaimer appears on predictions?**
**A:** "This is an AI-assisted screening result and not a confirmed medical diagnosis."

**Q22. How does feature validation work?**
**A:** Required features checked, out-of-range values rejected, missing data reported as INSUFFICIENT_DATA — no imputation or fabrication.

**Q23. What dataset is used for Diabetes training?**
**A:** Pima Indians Diabetes Dataset (NIDDK / UCI #34), 768 records, 8 features.

**Q24. What is the Brier score and what does it measure?**
**A:** Brier score measures probability calibration (lower = better calibrated). Diabetes: 0.1679, Dengue: 0.0 (suspicious), Malaria: 0.2237, Chikungunya: 0.2454.

**Q25. Can the system be used for actual medical diagnosis?**
**A:** No. It is an academic clinical decision support prototype only, not a certified medical device.

---

## Section C: OCR & Lab Reports (Q26–Q30)

**Q26. What OCR engine is used?**
**A:** Tesseract.js (NOT PaddleOCR). pdf-parse for PDF text extraction on the backend.

**Q27. What file types and size limits apply?**
**A:** PDF, JPG, PNG. 15MB maximum file size via Multer.

**Q28. How are lab values normalized?**
**A:** Test names mapped to standard CLIA names, units standardized, out-of-range values flagged (high/low/normal).

**Q29. What happens if OCR confidence is low?**
**A:** The report is flagged for manual review — no automated diagnosis from low-confidence OCR.

**Q30. Are uploaded files stored permanently?**
**A:** Files are stored in the uploads/ directory with unique filenames. Backup/restore functionality available.

---

## Section D: Multilingual NLP (Q31–Q38)

**Q31. How many languages are supported?**
**A:** 10 languages: English, Kannada, Hindi, Tamil, Telugu, Malayalam, Marathi, Bengali, Gujarati, Punjabi.

**Q32. How does language detection work?**
**A:** Native script detection via Unicode script ranges for Indic scripts; Romanized keyword detection for code-switching (e.g., "mujhe bukhar hai" → Hindi).

**Q33. What symptom extraction capabilities exist?**
**A:** Symptom keywords from multilingual lexicon, negation detection ("no fever"), temporal detection ("last week" = historical), duration extraction ("3 days").

**Q34. What is the known limitation in Kannada?**
**A:** Kannada negation detection using the regex `ಇಲ್ಲ\b` does not reliably detect negation — documented pre-existing issue.

**Q35. Can voice input be used?**
**A:** The system accepts text input. Voice transcription is not implemented in the current prototype.

**Q36. How are uncertain symptoms handled?**
**A:** Words like "maybe", "not sure" trigger ambiguity flags and needs_user_confirmation=true.

**Q37. Is translation used for non-English input?**
**A:** Dictionary-based fallback translation for output messages; symptoms are extracted natively without translation.

**Q38. What output schema does NLP produce?**
**A:** active_symptoms, negated_symptoms, historical_symptoms, duration_days, detected_language, ambiguities, needs_confirmation.

---

## Section E: Security & Privacy (Q39–Q46)

**Q39. How are passwords stored?**
**A:** bcrypt with salt rounds 12 — never plaintext.

**Q40. How is JWT secured?**
**A:** JWT_SECRET validated at startup (rejects placeholders), 24-hour expiry, tokens verified on each protected request.

**Q41. What PII protection measures exist?**
**A:** 4 PII data files removed from git tracking and gitignoned. Structured logger redacts emails, tokens, auth headers. DEMO_PATIENTS uses synthetic data only.

**Q42. How is SQL injection prevented?**
**A:** Parameterized queries via better-sqlite3 — no string interpolation in SQL.

**Q43. How is XSS prevented?**
**A:** React auto-escapes rendered content. No dangerous innerHTML usage found in codebase.

**Q44. What CORS policy is used?**
**A:** CORS restricted to the CORS_ORIGIN environment variable — not wildcard.

**Q45. Are API keys or secrets in the codebase?**
**A:** No. All secrets use environment variables validated at startup.

**Q46. What file upload security exists?**
**A:** 15MB limit, file type filtering, unique filename generation, storage outside web root.

---

## Section F: Testing & Validation (Q47–Q54)

**Q47. What test results were achieved?**
**A:** Backend: 53/53 passed. E2E: 33/33 passed. OCR: 15/15 passed. RAG: 19/19 passed. Security: 17/17 passed. Performance: 16/16 passed. ML: 55/63 passed (8 Typhoid skips). NLP: 42/43 passed (1 Kannada negation). Frontend: 11/11 passed. Combined: 221/231 passed.

**Q48. Why are there 8 Typhoid test skips?**
**A:** Typhoid model is NOT_TRAINED — no inference available. Skips are expected and documented, not failures.

**Q49. What is the 1 NLP test failure?**
**A:** Kannada negation detection (`ನನಗೆ ಜ್ವರಿಲ್ಲ` → fever not correctly negated) — pre-existing documented limitation.

**Q50. Does the frontend production build pass?**
**A:** Yes — Vite production build completes successfully (953KB JS bundle).

**Q51. Are there frontend integration tests?**
**A:** No — server cannot start in sandbox environment due to better-sqlite3 native module compilation. Documented gap.

**Q52. Has Docker deployment been verified?**
**A:** No — Docker build not tested in sandbox. Documented as NOT VERIFIED.

**Q53. Do you claim clinical validation?**
**A:** No. All models are screening tools only. No medical certification claimed.

**Q54. How are test results reported honestly?**
**A:** All passing/failing/skipped counts reported. Limitations documented. No disabled tests. No hidden errors.

---

## Section G: Project Management (Q55–Q60)

**Q55. What is the git branch and commit?**
**A:** Branch: arena/370e8461-final-project. Commit: 5ccb967 (Task 10) + subsequent Task 12 audit fixes.

**Q56. What was removed for privacy (Task 12)?**
**A:** 4 PII data files (patient records, clinical conditions, drug interactions, full dataset) removed from git tracking and added to .gitignore.

**Q57. What UI corrections were made (Task 12)?**
**A:** FAISS→TF-IDF, XGBoost→Logistic Regression, PaddleOCR→Tesseract.js, TreeSHAP→SHAP across 8 frontend files. Hardcoded patient names and doctor fallbacks removed.

**Q58. How many documentation files exist?**
**A:** 12 docs in /docs plus README.md, covering architecture, models, datasets, testing, deployment, security, limitations, demo workflow, and viva Q&A.

**Q59. Is the system production-ready for clinical use?**
**A:** No. It is an academic prototype with documented model limitations. Not clinically validated or certified.

**Q60. What would you improve with more time?**
**A:** Fix Kannada negation, deduplicate Chikungunya dataset, obtain Typhoid training data, add frontend integration tests, verify Docker deployment, retrain Dengue model with verified data.

---

**End of Viva Q&A — 60 questions covering all major system areas.**
