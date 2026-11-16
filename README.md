# MEDIAGENT

**Tagline**: Multimodal AI-Powered Clinical Decision Support

**Project Title**: MediAgent: An Agentic Multimodal Clinical Decision-Support System for Automated Laboratory Report Understanding, Explainable Disease Prediction and Uncertainty-Aware Risk Assessment

---

## 🌟 Architecture & Key Highlights

MediAgent is built on a **single backend-authoritative, report-specific pipeline**:

1. **User Upload**: React frontend uploads PDF or image lab reports via `FormData`.
2. **Backend Storage & OCR**: Express backend saves collision-safe UUID files to `server/uploads/` and runs server-side `pdf-parse` or `tesseract.js` OCR.
3. **Clinical Ontology Parsing**: Structured lab parameters are normalized and stored in SQLite `mediagent.db`.
4. **Scikit-Learn ML Inference**: Feature values are normalized via `StandardScaler` and passed to a trained `RandomForestClassifier` (`server/ml/models/model.joblib`).
5. **SHAP & RAG Evidence**: Calculates SHAP feature importance drivers and maps ADA, ESC, and KDIGO clinical guideline evidence.
6. **Report-Specific Result**: Database records and API endpoints (`/api/reports/:id`) guarantee isolated report retrieval.

---

## 🚀 Installation & Local Setup

### 1. Prerequisites
- Node.js (v18+) & npm
- Python (3.9+) with `pandas`, `numpy`, `scikit-learn`, `joblib`

### 2. Backend Dependencies & Setup
```bash
cd server
npm install
```

### 3. ML Model Training
```bash
python server/ml/train_model.py
```
*Outputs `model.joblib`, `preprocessor.joblib`, `feature_schema.json`, and `model_metadata.json` into `server/ml/models/`.*

### 4. Running Backend Server
```bash
cd server
node index.js
# Backend running on http://localhost:3001/
```

### 5. Running Integration Test Suite
```bash
node server/tests/test-pipeline.js
# Executes 13 automated integration tests (Upload, Extraction, ML Inference, Report Isolation, Error Handling)
```

### 6. Running Frontend Client
```bash
cd client
npm install
npm run dev
# Frontend client running on http://localhost:5173/
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/reports/upload` | Upload PDF/image report, extract lab parameters, run ML model, save to DB |
| `GET` | `/api/reports` | List all uploaded reports |
| `GET` | `/api/reports/:id` | Get report and lab results by ID |
| `GET` | `/api/reports/:id/prediction` | Get ML disease risk prediction for report ID |
| `GET` | `/api/reports/:id/xai` | Get SHAP feature importance for report ID |
| `GET` | `/api/reports/:id/evidence` | Get RAG clinical practice guideline evidence for report ID |
| `GET` | `/api/reports/:id/risk` | Get overall risk score & uncertainty bounds for report ID |
| `PUT` | `/api/reports/:id/lab-results` | Update lab results, re-run ML model, and update prediction |

---

## 📁 Repository Structure

```text
├── client/                     # Vite + React 18 Frontend
│   ├── src/
│   │   ├── components/         # Clinical UI & 3D Interactive Canvas Components
│   │   ├── pages/              # Upload, Extraction, Predictions, XAI, History, Review
│   │   └── services/api.js     # Central API client connected to Express backend
├── server/                     # Express Backend & ML Pipeline
│   ├── routes/reports.js       # Reports API router
│   ├── services/               # reportParser.js, predictionService.js
│   ├── ml/                     # train_model.py, predict.py, models/
│   ├── db/database.js          # SQLite database storage module
│   ├── uploads/                # Saved upload files
│   └── tests/test-pipeline.js  # Automated integration test suite
└── README.md
```

---

## 🛡️ Medical Safety & Disclaimer

MediAgent is an **AI-assisted clinical decision-support research prototype**. It provides screening probabilities and explainable feature contributions for educational and decision-support purposes. It does **not** provide a confirmed medical diagnosis and must **not** replace evaluation by a qualified healthcare professional.
