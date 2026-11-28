<div align="center">

# 🏥 MediAgent — Intelligent Public Health Clinical Decision Support System

**Multi-Modal AI · Retrieval-Augmented Generation · Explainable ML · Multilingual NLP**

[![Live Demo](https://img.shields.io/badge/Live%20Frontend-Vercel-black?style=for-the-badge&logo=vercel)](https://final-project1-nine-sigma.vercel.app/)
[![Backend Live](https://img.shields.io/badge/Backend%20API-Render-46E3B7?style=for-the-badge&logo=render)](https://mediagent-backend-px17.onrender.com)
[![GitHub](https://img.shields.io/badge/GitHub-pruthvi20058-181717?style=for-the-badge&logo=github)](https://github.com/pruthvi20058/Final-Project)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

## 📌 Overview

**MediAgent** is an end-to-end, full-stack intelligent health decision support platform built for public service use. It combines **machine learning disease prediction**, **OCR-powered lab report analysis**, **multilingual NLP**, **RAG-grounded medical chatbot**, and **XAI explainability** into a single unified clinical dashboard.

> 📚 **Documentation**: 12 technical documents in `/docs/` — including system architecture (10 Mermaid diagrams), model evaluation, dataset documentation, final audit report, demo workflow, and 60+ viva Q&A.

> ⚠️ **Clinical Disclaimer**: This system is a research prototype. All ML predictions are based on publicly available datasets and must NOT be used as a substitute for professional medical diagnosis. Independent clinical validation is required.

---

## 🚀 Live Deployment & 1-Click Launch

| Service | Platform | Live URL / 1-Click Launch | Status |
|---------|----------|---------------------------|--------|
| 🌐 **Frontend (React/Vite)** | Vercel | [**final-project1-nine-sigma.vercel.app**](https://final-project1-nine-sigma.vercel.app/) | 🟢 **LIVE** |
| ⚙️ **Backend (Express + ML)** | Render | [**mediagent-backend-px17.onrender.com**](https://mediagent-backend-px17.onrender.com) | 🟢 **LIVE** |
| 🌐 **Frontend (Backup)** | GitHub Pages | [pruthvi20058.github.io/Final-Project](https://pruthvi20058.github.io/Final-Project/) | 🟢 Active |
| 📦 **Source Code** | GitHub | [pruthvi20058/Final-Project](https://github.com/pruthvi20058/Final-Project) | 🟢 Up-to-date |

### ⚡ 1-Click Deployment Buttons

- **Deploy Frontend to Vercel**:
  [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpruthvi20058%2FFinal-Project&root-directory=client&env=VITE_API_URL&envDescription=Backend+URL&envDefault=https%3A%2F%2Fmediagent-backend-px17.onrender.com)

- **Deploy Backend to Render**:
  [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/pruthvi20058/Final-Project)

> 💡 **Auto-Configuration**: The frontend automatically routes API calls to `https://mediagent-backend-px17.onrender.com` in production environments — zero manual configuration needed!

---

### 🔗 Live Backend API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | `GET` | API Information and health summary |
| `/api/health` | `GET` | Service status, uptime, and timestamp |
| `/api/stats` | `GET` | Clinical dashboard statistics & metrics |
| `/api/patients` | `GET` | Patient registry and demographics |
| `/api/reports` | `GET` | Analyzed diagnostic and lab reports |
| `/api/reports/upload` | `POST` | PDF / Image lab report OCR & analysis |
| `/api/reports/:id/prediction` | `GET` | Disease ML soft-voting ensemble prediction |
| `/api/reports/:id/xai` | `GET` | SHAP explainability feature attribution |
| `/api/knowledge` | `GET` | Evidence-based medical knowledge base summary |
| `/api/chat` | `POST` | RAG-grounded clinical chatbot assistant |
| `/api/assessments` | `GET/POST` | Multilingual NLP voice/text consultations |

---

## 🧩 System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     MediAgent Platform                         │
├─────────────────────────┬──────────────────────────────────────┤
│      Frontend           │          Backend                     │
│   React 18 + Vite       │   Node.js / Express API             │
│   Tailwind CSS          │   SQLite (better-sqlite3)           │
│   Vercel CDN            │   Python ML subprocesses            │
│                         │   Render.com hosting                │
├─────────────────────────┴──────────────────────────────────────┤
│                   ML / AI Pipeline                             │
│  • Scikit-Learn (Logistic Regression, Random Forest)          │
│  • SHAP (LinearExplainer / Feature Importances XAI)                      │
│  • TF-IDF Hybrid Vector Store (RAG evidence retrieval)                │
│  • Tesseract.js OCR (lab report extraction)                   │
│  • Web Speech API (multilingual voice)       │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔬 Features

### 🤖 Machine Learning Disease Prediction
| Disease | Dataset Source | Model | Status |
|---------|---------------|-------|--------|
| Diabetes | Pima Indians (UCI) — 768 records | Logistic Regression | ✅ Active |
| Dengue | Dengue Clinical Dataset — 1,000 records | Random Forest | ✅ Active |
| Malaria | Malaria Clinical (WHO-aligned) — 337 records | Logistic Regression | ✅ Active |
| Chikungunya | SINAN Brazil — 259,619 notifications | Random Forest | ✅ Active |
| Typhoid | — | Guarded (no authenticated dataset found) | 🔒 Guarded |

- **No real patient data** used at any stage — synthetic fixtures for testing only; real public datasets for ML training
- Soft-voting probability calibration, confusion matrix, ROC-AUC evaluation
- Dataset provenance documented in `server/ml/data/DATASET_PROVENANCE.md`

### 📊 Explainable AI (XAI) — SHAP
- SHAP LinearExplainer integration (not approximations)
- Feature attribution waterfall charts per prediction
- Additive consistency verification (Σ SHAP = prediction - base value)
- 13/13 SHAP test suite passes verified

### 📄 Multimodal OCR Lab Report Intake
- PDF and image lab report upload
- Tesseract.js OCR extraction → structured biomarker table
- Canonical feature mapping to Pima schema for ML readiness check
- Human-in-the-loop physician sign-off workflow

### 🤖 RAG-Powered Health Companion Chatbot
- TF-IDF hybrid vector store with WHO, MoHFW, NCDC, CDC, NHS knowledge base
- 6 disease topics: Dengue, Malaria, Typhoid, Chikungunya, Jaundice, Viral Fever
- Emergency warning sign detection with urgent alert escalation
- Mandatory medical safety disclaimer on every response

### 🌐 Multilingual Voice NLP Assistant (Task 5)
- 10 languages: English, Kannada, Hindi, Tamil, Telugu, Malayalam, Marathi, Bengali, Gujarati, Punjabi
- Browser Web Speech API (voice input/output)
- Native script detection (Devanagari, Kannada, Tamil, Telugu, Malayalam, Bengali, Gurmukhi)
- **7-step clinical workflow** with mandatory patient verification (Step 4)
- Symptom extraction: name, duration, severity, negation, temporal context
- Translation via environment-variable credentials (no hardcoded keys)
- Symptom→disease feature mapping gated by Task 4 model readiness

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/nlp/languages` | `GET` | List supported languages |
| `/api/nlp/detect-language` | `POST` | Detect input text language |
| `/api/nlp/transcribe` | `POST` | Upload + transcribe voice audio |
| `/api/nlp/process-text` | `POST` | Multilingual NLP entity extraction |
| `/api/nlp/process-voice` | `POST` | Audio upload + transcribe + NLP |
| `/api/nlp/synthesize-speech` | `POST` | Text-to-speech voice generation |
| `/api/nlp/consultation` | `POST` | Agentic clinical assessment (gated on `userConfirmed`) |
| `/api/nlp/verify-symptoms` | `POST` | **Task 5**: Submit verified symptoms + run assessment |
| `/api/nlp/consultations` | `GET` | Retrieve consultations |
| `/api/nlp/consultations/:id` | `GET` | Retrieve single consultation |
| `/api/nlp/model-readiness/:disease` | `GET` | **Task 5**: Check Task 4 model readiness for a disease |

### 📚 Clinical RAG & Evidence-Grounded Explanations (Task 6)
- Curated medical knowledge base for 5 diseases: Diabetes, Dengue, Malaria, Chikungunya, Typhoid
- Authoritative sources only: WHO, CDC, NHS (UK), NCDC India, ADA, NIDDK
- Document ingestion pipeline (text + PDF) with duplicate detection, empty/corrupted detection, sentence-boundary chunking, per-chunk source metadata
- Enhanced TF-IDF + keyword hybrid vector store with disease-aware retrieval, top-k ranking, source diversity, and relevance scoring
- Evidence-grounded explanations with full citations (organization, title, section, page, URL, publication date)
- Evidence quality & conflict handling: outdated sources, missing dates, low relevance, conflicting guidance
- ML probability, outcome, and SHAP values kept invariant (never altered by RAG/LLM)
- No fabricated evidence or citations; explicit `INSUFFICIENT_EVIDENCE` when nothing matches
- Retrieval queries PII-sanitized; no patient-uploaded reports trusted as knowledge-base documents

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rag/retrieve` | `POST` | **Task 6**: Disease-aware hybrid evidence retrieval |
| `/api/rag/sources` | `GET` | **Task 6**: List all knowledge-base sources |
| `/api/rag/sources/:disease` | `GET` | **Task 6**: Sources + documents for a disease |
| `/api/rag/stats` | `GET` | **Task 6**: Knowledge base statistics |
| `/api/rag/diseases` | `GET` | **Task 6**: Supported diseases |
| `/api/reports/:id/evidence` | `GET` | Per-report evidence retrieval (ownership enforced) |

Details: `server/rag/README.md`, `server/rag/RAG_EVALUATION.md`

### 🤖 Agentic AI Orchestration & Autonomous Clinical Workflow (Task 7)

The Agentic AI Orchestration Layer coordinates all Task 1–6 components into a unified, traceable clinical workflow with allowlisted tool execution, mandatory patient verification, ML-invariant protection, and execution trace persistence.

- **9 allowlisted tools** with input/output schemas, validation, error handling, execution status, and traceable metadata: symptom_analysis_tool, lab_report_analysis_tool, data_verification_tool, disease_readiness_tool, disease_prediction_tool, shap_explanation_tool, medical_evidence_tool, risk_assessment_tool, report_generation_tool
- **Workflow state machine**: CREATED → INPUT_RECEIVED → PROCESSING → AWAITING_VERIFICATION → VERIFIED → ANALYZING → EVIDENCE_RETRIEVAL → COMPLETED / PARTIALLY_COMPLETED / FAILED
- **Mandatory verification gate** — no disease prediction runs until the patient confirms extracted symptoms
- **ML invariants protected** — ML probability, outcome, and SHAP values are never modified by RAG/LLM output
- **No unvalidated disease models** — gated models (e.g. dengue) never run without readiness clearance; RISK_ASSESSMENT_UNAVAILABLE when risk cannot be computed
- **Execution trace persistence** — all tool executions persisted to SQLite (`assessments` + `assessment_tool_executions` tables)
- **Frontend agent workflow visualization** — `AgentWorkflowPage.jsx` with status pills, progress bar, verification gate UI, skipped/failed handling
- **Authenticated API** with ownership enforced — `POST/GET /api/orchestrator/assessments`, `POST /verify`, `GET /tools`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/orchestrator/assessments` | `POST` | **Task 7**: Start a new agentic assessment |
| `/api/orchestrator/assessments` | `GET` | **Task 7**: List assessments for the authenticated user |
| `/api/orchestrator/assessments/:id` | `GET` | **Task 7**: Get a single assessment with tool executions |
| `/api/orchestrator/assessments/:id/verify` | `POST` | **Task 7**: Submit patient verification to resume a paused assessment |
| `/api/orchestrator/tools` | `GET` | **Task 7**: List all registered orchestrator tools with schemas |

Details: `server/agents/README.md`

### 🛡️ Clinical Risk Stratification, Emergency Alerts & Patient Safety (Task 8)

The Clinical Risk Stratification Engine provides safe, transparent, evidence-based clinical risk assessment that is **separate from disease prediction**:

- **Emergency warning detection** — 10 general + 7 disease-specific rules from WHO, ADA, CDC sources (dengue, malaria, chikungunya, diabetes)
- **Independent of ML predictions** — ML probability never used as clinical risk score (`mlProbabilityUsedForRisk: false`)
- **Low ML probability does NOT override emergency warnings** — emergency alerts fire independently
- **Missing information never results in low risk** — Returns `RISK_ASSESSMENT_UNAVAILABLE` when data is insufficient
- **Only reviewed and verified rules** — All rules carry `reviewStatus`, `ruleVersion`, and source citations
- **Laboratory interpretation** — Documented reference ranges, verified values only, no invented values
- **Risk categories**: EMERGENCY, HIGH_RISK, MODERATE_RISK, LOW_RISK, UNAVAILABLE
- **Authenticated API with ownership enforcement** — `POST/GET /api/risk/assessments`, `GET /api/risk/categories`, `GET /api/risk/sources`, `GET /api/risk/rules`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/risk/assess` | `POST` | **Task 8**: Perform clinical risk assessment |
| `/api/risk/assessments` | `GET` | **Task 8**: List user's risk assessments |
| `/api/risk/assessments/:id` | `GET` | **Task 8**: Get a single risk assessment |
| `/api/risk/categories` | `GET` | **Task 8**: Get available risk categories |
| `/api/risk/sources` | `GET` | **Task 8**: Get clinical sources used |
| `/api/risk/reference-ranges` | `GET` | **Task 8**: Get documented lab reference ranges |
| `/api/risk/rules` | `GET` | **Task 8**: Get active emergency/clinical rules |
| `/api/risk/rules/:disease` | `GET` | **Task 8**: Get rules for a specific disease |

Details: `server/risk/README.md`

### 💊 Medicine Information Guide
- 17-field clinical monograph per drug (composition, dosage, contraindications, interactions)
- OCR medicine strip scanner for packaging recognition
- Ibuprofen ↔ Dengue contraindication guardrail enforced

---

## 🛠️ Tech Stack

**Frontend**
- React 18, Vite, Tailwind CSS
- Recharts (data visualisation)
- Web Speech API (voice input/output)

**Backend**
- Node.js 18+, Express 4
- better-sqlite3 (embedded database)
- Multer (file uploads), PDF-parse, Tesseract.js OCR, Sharp

**ML / Python**
- Scikit-learn (Logistic Regression, Random Forest)
- SHAP (explainability)
- Pandas, NumPy, Joblib

---

## 💻 Local Development

### Prerequisites
- Node.js ≥ 18
- Python ≥ 3.9 with pip
- Git

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/pruthvi20058/Final-Project.git
cd Final-Project

# 2. Install all dependencies
npm run install:all

# 3. Install Python ML dependencies
pip install scikit-learn shap pandas numpy joblib

# 4. Start dev servers (backend + frontend concurrently)
npm run dev
```

The app will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

---

## ☁️ Deployment Guide

### Deploy Backend to Render

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect your GitHub repo: `pruthvi20058/Final-Project`
3. Set the following:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && pip install scikit-learn shap pandas numpy joblib`
   - **Start Command**: `node index.js`
   - **Plan**: Free
4. Deploy and copy the service URL (e.g. `https://mediagent-backend-px17.onrender.com`)

### Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import GitHub repo: `pruthvi20058/Final-Project`
3. Set:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
4. Add environment variable:
   - `VITE_API_URL` = `https://mediagent-backend-px17.onrender.com`
5. Deploy → get your live URL

---

## 🐳 Docker Deployment (Task 10)

MediAgent supports full containerized deployment via Docker Compose:

```bash
# Copy environment file
cp .env.example .env
# Edit .env with production values (JWT_SECRET, CORS_ORIGIN)

# Build and start all services
docker compose up --build

# Run detached
docker compose up -d

# Stop
docker compose down
```

**Services:**
- `backend` (port 3001): Express API + SQLite + Python ML
- `frontend` (port 80): React app served by nginx

**Volume:** `mediagent_data` persists SQLite DB, uploads, and backups.

**Health checks:** Backend exposes `GET /api/health/ready` for orchestrators.

See `docs/DEPLOYMENT_GUIDE.md` for full deployment documentation.

---

## 📋 Production Readiness (Task 10)

| Area | Status | Details |
|------|--------|---------|
| Environment config | ✅ Complete | `.env.example` + startup validation |
| Structured logging | ✅ Complete | JSON logs with correlation IDs |
| Request timeouts | ✅ Complete | Configurable via `ML_INFERENCE_TIMEOUT_MS` |
| Graceful shutdown | ✅ Complete | SIGTERM/SIGINT handling |
| Health endpoints | ✅ Complete | `/api/health`, `/api/health/ready`, `/api/health/models` |
| Docker containerization | ✅ Complete | Frontend + Backend + compose |
| Backup & restore | ✅ Complete | SQLite backup/restore + retention |
| Correlation IDs | ✅ Complete | `X-Correlation-ID` header on all requests |
| Secure JWT secrets | ✅ Complete | Validation rejects placeholder secrets |
| CORS from env | ✅ Complete | `CORS_ORIGIN` restricts origins |

See `docs/PRODUCTION_READINESS.md` for full details.

---

## 📂 Project Structure

```
Final-Project/
├── client/                      # React frontend (Vite)
│   ├── src/
│   │   ├── pages/               # 16 application pages (incl. AgentWorkflowPage, RiskUncertaintyPage)
│   │   ├── components/          # Reusable UI components
│   │   └── services/api.js      # Centralised API client
│   ├── vercel.json              # Vercel deployment config
│   └── vite.config.js
│
├── server/                      # Node.js / Express backend
│   ├── agents/                  # Agent orchestration pipeline (Task 7)\n│   │   ├── orchestratorService.js   # Tool registry, planning, execution engine\n│   │   ├── workflowStore.js         # Persistence bridge to SQLite\n│   │   └── tools/                   # 9 allowlisted tool wrappers\n│   │       ├── symptom_analysis_tool.js\n│   │       ├── lab_report_analysis_tool.js\n│   │       ├── data_verification_tool.js\n│   │       ├── disease_readiness_tool.js\n│   │       ├── disease_prediction_tool.js\n│   │       ├── shap_explanation_tool.js\n│   │       ├── medical_evidence_tool.js\n│   │       ├── risk_assessment_tool.js\n│   │       └── report_generation_tool.js\n│   ├── risk/                    # Clinical risk stratification (Task 8)\n│   │   ├── riskEngine.js            # Central risk assessment engine\n│   │   ├── emergencyWarnings.js     # Emergency warning detection layer\n│   │   ├── clinicalRules.js         # Disease-specific clinical rules with sources\n│   │   └── labInterpretation.js     # Laboratory result interpretation\n│   ├── db/                      # SQLite database & migrations
│   ├── knowledge/               # Curated medical knowledge base (5 diseases)
│   │   ├── index.js             # Knowledge base registry/loader
│   │   ├── diabetes/            # sources.json, documents.json
│   │   ├── dengue/              # sources.json, documents.json
│   │   ├── malaria/             # sources.json, documents.json
│   │   ├── chikungunya/         # sources.json, documents.json
│   │   └── typhoid/             # sources.json, documents.json
│   ├── ml/                      # ML models & Python inference scripts
│   │   ├── data/                # Authentic clinical datasets (CSV)
│   │   ├── models/              # Trained .joblib model artifacts
│   │   ├── predict.py           # Unified ML inference entry point
│   │   └── data/DATASET_PROVENANCE.md
│   ├── rag/                     # Task 6 RAG documentation (README.md, RAG_EVALUATION.md)
│   ├── routes/                  # Express API route handlers (incl. rag.js, orchestrator.js, risk.js)
│   └── services/                # Backend services
│       ├── ingestionService.js  # Task 6: PDF + text ingestion pipeline
│       ├── vectorStoreService.js # Task 6: enhanced TF-IDF + hybrid retrieval
│       ├── ragService.js        # Task 6: evidence retrieval + quality/conflict checks
│       └── groundedLlmService.js # Task 6: evidence-grounded explanations + citations
│
├── render.yaml                  # Render backend deployment config
├── package.json                 # Monorepo root scripts
└── README.md
```

---

## ✅ Test Results

| Test Suite | Result |
|-----------|--------|
| Backend Comprehensive | **53 / 53 PASSED** |
| Security (E5) | **17 / 17 PASSED** |
| E4 ML Reliability | **48 / 48 PASSED** |
| OCR / Lab Extraction | **15 / 15 PASSED** |
| RAG Evaluation | **19 / 19 PASSED** |
| Agent Orchestrator (Task 7) | **50 / 50 PASSED** |
| Performance | **16 / 16 PASSED** |
| Clinical Risk Engine (Task 8) | **20 / 20 PASSED** |
| Security — SQL Injection (E5) | **10 / 10 PASSED** |
| Security — Prompt Injection (E5) | **10 / 10 PASSED** |
| Security — File Upload (E5) | **12 / 12 PASSED** |
| Security — RBAC (E5) | **14 / 14 PASSED** |
| Security — Authentication (E5) | **12 / 12 PASSED** |
| ML Model Validation | **56 / 77 PASSED**, 21 skipped |
| NLP / Multilingual | **43 / 43 PASSED** |
| Frontend Unit Tests | **11 / 11 PASSED** |

---

## 🔒 Security & Privacy (E5)

MediAgent implements comprehensive security controls for a research prototype:

- **Authentication**: bcryptjs password hashing (salt rounds: 12), JWT with JTI, password complexity, account lockout (5 failures/15min)
- **Authorization**: RBAC with role hierarchy (patient/doctor/administrator), deny-all permission matrix, ownership enforcement on all data routes
- **Token Revocation**: SQLite-backed JWT blacklist with automatic expiry cleanup
- **File Upload Security**: Extension allowlist, MIME validation, magic-byte signature checking, 15MB size limit, safe filenames
- **File Serving**: Uploads NOT publicly served — authorized download endpoint with ownership verification
- **XSS Prevention**: HTML output sanitization for all rendered content
- **SSRF Protection**: Private IP range blocking, metadata endpoint protection
- **Audit Logging**: Structured JSON logs with PII redaction and correlation IDs
- **No Default Production Account**: Doctor account seeded only in DEMO_MODE/test

> ⚠️ **Clinical Disclaimer**: This system is a research prototype. All ML predictions are based on publicly available datasets and must NOT be used as a substitute for professional medical diagnosis. Independent clinical validation is required. Do not claim HIPAA/GDPR/DPDP compliance without qualified assessment.

---

## 👨‍💻 Author

**Pruthvi S Nadig**
- GitHub: [@pruthvi20058](https://github.com/pruthvi20058)
- Email: pruthvisnadig@gmail.com

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">
<sub>Built with ❤️ for public health — MediAgent © 2026</sub>
</div>
