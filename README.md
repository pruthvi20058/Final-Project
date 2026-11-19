<div align="center">

# 🏥 MediAgent — Intelligent Public Health Clinical Decision Support System

**Multi-Modal AI · Retrieval-Augmented Generation · Explainable ML · Multilingual NLP**

[![Live Demo](https://img.shields.io/badge/Live%20Frontend-Vercel-black?style=for-the-badge&logo=vercel)](https://final-project1-nine-sigma.vercel.app/)
[![Backend Live](https://img.shields.io/badge/Backend%20API-Render-46E3B7?style=for-the-badge&logo=render)](https://mediagent-backend-nht2.onrender.com)
[![GitHub](https://img.shields.io/badge/GitHub-pruthvi20058-181717?style=for-the-badge&logo=github)](https://github.com/pruthvi20058/Final-Project)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

## 📌 Overview

**MediAgent** is an end-to-end, full-stack intelligent health decision support platform built for public service use. It combines **machine learning disease prediction**, **OCR-powered lab report analysis**, **multilingual voice NLP**, **RAG-grounded medical chatbot**, and **XAI explainability** into a single unified clinical dashboard.

> ⚠️ **Clinical Disclaimer**: This system is a research prototype. All ML predictions are based on publicly available datasets and must NOT be used as a substitute for professional medical diagnosis. Independent clinical validation is required.

---

## 🚀 Live Deployment & 1-Click Launch

| Service | Platform | Live URL / 1-Click Launch | Status |
|---------|----------|---------------------------|--------|
| 🌐 **Frontend (React/Vite)** | Vercel | [**final-project1-nine-sigma.vercel.app**](https://final-project1-nine-sigma.vercel.app/) | 🟢 **LIVE** |
| ⚙️ **Backend (Express + ML)** | Render | [**mediagent-backend-nht2.onrender.com**](https://mediagent-backend-nht2.onrender.com) | 🟢 **LIVE** |
| 🌐 **Frontend (Backup)** | GitHub Pages | [pruthvi20058.github.io/Final-Project](https://pruthvi20058.github.io/Final-Project/) | 🟢 Active |
| 📦 **Source Code** | GitHub | [pruthvi20058/Final-Project](https://github.com/pruthvi20058/Final-Project) | 🟢 Up-to-date |

### ⚡ 1-Click Deployment Buttons

- **Deploy Frontend to Vercel**:
  [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpruthvi20058%2FFinal-Project&root-directory=client&env=VITE_API_URL&envDescription=Backend+URL&envDefault=https%3A%2F%2Fmediagent-backend-nht2.onrender.com)

- **Deploy Backend to Render**:
  [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/pruthvi20058/Final-Project)

> 💡 **Auto-Configuration**: The frontend automatically routes API calls to `https://mediagent-backend-nht2.onrender.com` in production environments — zero manual configuration needed!

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
│  • SHAP (TreeSHAP / LinearExplainer XAI)                      │
│  • FAISS Vector Store (RAG evidence retrieval)                │
│  • Tesseract.js OCR (lab report extraction)                   │
│  • Web Speech API + ElevenLabs TTS (multilingual voice)       │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔬 Features

### 🤖 Machine Learning Disease Prediction
| Disease | Dataset Source | Model | Status |
|---------|---------------|-------|--------|
| Diabetes | Pima Indians (UCI) — 768 records | LR + RF Soft-Voting Ensemble | ✅ Active |
| Dengue | Dengue Clinical Dataset — 1,000 records | Random Forest | ✅ Active |
| Malaria | Malaria Clinical (WHO-aligned) — 337 records | Logistic Regression | ✅ Active |
| Chikungunya | SINAN Brazil — 259,619 notifications | Random Forest | ✅ Active |
| Typhoid | — | Guarded (no authenticated dataset found) | 🔒 Guarded |

- **No synthetic patient data** used at any stage — strictly real, public datasets only
- Soft-voting probability calibration, confusion matrix, ROC-AUC evaluation
- Dataset provenance documented in `server/ml/data/DATASET_PROVENANCE.md`

### 📊 Explainable AI (XAI) — SHAP
- Real TreeSHAP / LinearExplainer integration (not approximations)
- Feature attribution waterfall charts per prediction
- Additive consistency verification (Σ SHAP = prediction - base value)
- 13/13 SHAP test suite passes verified

### 📄 Multimodal OCR Lab Report Intake
- PDF and image lab report upload
- Tesseract.js OCR extraction → structured biomarker table
- Canonical feature mapping to Pima schema for ML readiness check
- Human-in-the-loop physician sign-off workflow

### 🤖 RAG-Powered Health Companion Chatbot
- FAISS vector store with WHO, MoHFW, NCDC, CDC, NHS knowledge base
- 6 disease topics: Dengue, Malaria, Typhoid, Chikungunya, Jaundice, Viral Fever
- Emergency warning sign detection with urgent alert escalation
- Mandatory medical safety disclaimer on every response

### 🌐 Multilingual Voice NLP Assistant
- 10 Indian languages: Kannada, Hindi, Telugu, Tamil, Malayalam, Marathi, Gujarati, Bengali, Punjabi, Odia
- Browser Web Speech API + ElevenLabs neural TTS synthesis
- Native script detection (Devanagari, Kannada, Tamil, etc.)

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
4. Deploy and copy the service URL (e.g. `https://mediagent-backend.onrender.com`)

### Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import GitHub repo: `pruthvi20058/Final-Project`
3. Set:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
4. Add environment variable:
   - `VITE_API_URL` = `https://mediagent-backend.onrender.com`
5. Deploy → get your live URL

---

## 📂 Project Structure

```
Final-Project/
├── client/                      # React frontend (Vite)
│   ├── src/
│   │   ├── pages/               # 15 application pages
│   │   ├── components/          # Reusable UI components
│   │   └── services/api.js      # Centralised API client
│   ├── vercel.json              # Vercel deployment config
│   └── vite.config.js
│
├── server/                      # Node.js / Express backend
│   ├── agents/                  # Agent orchestration pipeline
│   ├── db/                      # SQLite database & migrations
│   ├── knowledge/               # FAISS RAG medical knowledge base
│   ├── ml/                      # ML models & Python inference scripts
│   │   ├── data/                # Authentic clinical datasets (CSV)
│   │   ├── models/              # Trained .joblib model artifacts
│   │   ├── predict.py           # Unified ML inference entry point
│   │   └── data/DATASET_PROVENANCE.md
│   └── routes/                  # Express API route handlers
│
├── render.yaml                  # Render backend deployment config
├── package.json                 # Monorepo root scripts
└── README.md
```

---

## ✅ Test Results

| Test Suite | Result |
|-----------|--------|
| Master Integration Suite (38 tests) | **38 / 38 PASSED** (100%) |
| SHAP Explainability Suite (13 tests) | **13 / 13 PASSED** (100%) |
| Multi-Disease ML Suite (10 tests) | **10 / 10 PASSED** (100%) |
| Frontend Pages (15 pages) | **15 / 15 CLEAN** |

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
