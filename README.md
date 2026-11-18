<div align="center">

# 🏥 MediAgent — Intelligent Public Health Clinical Decision Support System

**Multi-Modal AI · Retrieval-Augmented Generation · Explainable ML · Multilingual NLP**

[![Backend Live](https://img.shields.io/badge/Backend-LIVE%20on%20Render-46E3B7?style=for-the-badge&logo=render)](https://mediagent-backend-nht2.onrender.com)
[![GitHub](https://img.shields.io/badge/GitHub-pruthvi20058-181717?style=for-the-badge&logo=github)](https://github.com/pruthvi20058/Final-Project)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

## 📌 Overview

**MediAgent** is an end-to-end, full-stack intelligent health decision support platform built for public service use. It combines **machine learning disease prediction**, **OCR-powered lab report analysis**, **multilingual voice NLP**, **RAG-grounded medical chatbot**, and **XAI explainability** into a single unified clinical dashboard.

> ⚠️ **Clinical Disclaimer**: This system is a research prototype. All ML predictions are based on publicly available datasets and must NOT be used as a substitute for professional medical diagnosis. Independent clinical validation is required.

---

## 🚀 Live Deployment

| Service | Platform | URL |
|---------|----------|-----|
| ⚙️ Backend (Node.js/Express + Python ML) | Render | [mediagent-backend-nht2.onrender.com](https://mediagent-backend-nht2.onrender.com) |
| 🌐 Frontend (React/Vite) | Vercel | [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpruthvi20058%2FFinal-Project&root-directory=client&env=VITE_API_URL&envDescription=Your%20Render%20backend%20URL&envLink=https%3A%2F%2Fmediagent-backend-nht2.onrender.com) |
| 📦 Source Code | GitHub | [pruthvi20058/Final-Project](https://github.com/pruthvi20058/Final-Project) |

> **Note**: The Render free tier spins down after 15 min of inactivity — the first API call may take ~30 seconds to wake up.

### 🔗 Backend API Endpoints (Live)

| Endpoint | Description |
|----------|-------------|
| `GET /api/stats` | Dashboard statistics |
| `GET /api/patients` | Patient list |
| `POST /api/reports/upload` | Lab report upload & OCR |
| `GET /api/reports/:id/prediction` | ML disease prediction |
| `GET /api/reports/:id/xai` | SHAP explainability |
| `POST /api/chat` | RAG-powered medical chatbot |
| `POST /api/nlp/consultation` | Multilingual voice consultation |

### 🌐 Deploy Your Own Frontend

Click below to instantly deploy the frontend on Vercel (pre-configured with your backend URL):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpruthvi20058%2FFinal-Project&root-directory=client&env=VITE_API_URL&envDescription=Render%20backend%20URL%20%E2%80%94%20set%20to%20https%3A%2F%2Fmediagent-backend-nht2.onrender.com&envLink=https%3A%2F%2Fmediagent-backend-nht2.onrender.com)

**Vercel Configuration:**
- Root Directory: `client`
- Environment Variable: `VITE_API_URL` = `https://mediagent-backend-nht2.onrender.com`
- Build Command: `npm install && npm run build` (auto-detected)
- Output Directory: `dist`

---

## 🧩 System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     MediAgent Platform                         │
├─────────────────────────┬──────────────────────────────────────┤
│      Frontend           │          Backend                     │
│   React 18 + Vite       │   Node.js / Express API             │
│   Vanilla CSS           │   SQLite (better-sqlite3)           │
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
- Multi-class disease support with **soft-voting ensemble** for improved accuracy
- Full **SHAP explainability** (TreeSHAP, LinearExplainer) for every prediction

### 📄 OCR Lab Report Analysis
- Supports **PDF** and **image** (PNG, JPEG) lab reports
- Dual OCR pipeline: **Tesseract.js** + **PDF-parse**
- Automatically maps extracted values to ML model features
- Clinical reference range comparison for every biomarker

### 🗣️ Multilingual Voice NLP
- Voice input (via Web Speech API) + text input
- Supports **12+ languages** (English, Hindi, Kannada, Tamil, Spanish, French, etc.)
- Clinical entity extraction: symptoms, duration, severity
- Text-to-speech response synthesis

### 💬 RAG Medical Chatbot
- Retrieval-Augmented Generation grounded in medical knowledge base
- Sources: ADA 2024, WHO, ESC, Cochrane systematic reviews
- Evidence-linked, citation-backed responses with ICD-10 codes

### 📊 XAI Dashboard
- SHAP waterfall + feature importance charts
- Calibrated risk scoring (Brier Score, confidence intervals)
- Clinical action recommendations per prediction outcome

---

## 🛠️ Local Development

### Prerequisites
- Node.js ≥ 18
- Python ≥ 3.9 (for ML inference)
- pip packages: `scikit-learn shap pandas numpy joblib`

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/pruthvi20058/Final-Project.git
cd Final-Project

# 2. Install backend
cd server
npm install
pip install scikit-learn shap pandas numpy joblib

# 3. Start backend (runs on port 3001)
node index.js

# 4. In a new terminal — install frontend
cd ../client
npm install

# 5. Create .env.local
echo "VITE_API_URL=http://localhost:3001" > .env.local

# 6. Start frontend dev server (runs on port 5173)
npm run dev
```

Open: **http://localhost:5173**

---

## 🌐 Production Deployment Guide

### Backend (Render)
1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect GitHub → Select `pruthvi20058/Final-Project`
3. Set **Root Directory**: `server`
4. Build Command: `npm install && npm rebuild better-sqlite3 && npm rebuild sharp && pip install scikit-learn shap pandas numpy joblib`
5. Start Command: `node index.js`
6. **Free plan** is sufficient for demo/testing
7. Your backend URL: `https://mediagent-backend-nht2.onrender.com`

### Frontend (Vercel)
1. Go to [vercel.com](https://vercel.com) → **Import Project**
2. Select `pruthvi20058/Final-Project`
3. **Root Directory**: `client`
4. **Environment Variables**: Add `VITE_API_URL` = `https://mediagent-backend-nht2.onrender.com`
5. Click **Deploy** — Vercel runs `npm run build` automatically
6. Your site will be live at a `*.vercel.app` URL

---

## 📁 Project Structure

```
Final-Project/
├── client/                      # React 18 + Vite SPA
│   ├── src/
│   │   ├── components/          # 15+ UI components (Dashboard, Prediction, XAI, Chat...)
│   │   ├── services/api.js      # Centralized API service layer
│   │   └── App.jsx              # Routing + layout
│   ├── vercel.json              # SPA routing config
│   └── vite.config.js           # Vite + proxy config
│
├── server/                      # Node.js + Express API
│   ├── agents/                  # Multi-agent pipeline (Triage, Diagnostic, RAG...)
│   ├── db/database.js           # SQLite database layer
│   ├── knowledge/medicalKB.js   # RAG medical knowledge base
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
