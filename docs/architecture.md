# MediAgent Architecture Overview

## Multimodal AI Clinical Decision Support System

MediAgent is an agentic, multimodal clinical decision-support system designed for automated laboratory report understanding, OCR/computer vision data extraction, explainable disease prediction, medical evidence retrieval, and uncertainty-aware risk assessment.

### System Diagram

```
[ Lab Report (PDF/Image) ]
           │
           ▼
  Computer Vision & OCR Engine
           │
           ▼
 Clinical Extraction & Boundary Validation
           │
           ▼
 Calibrated ML Risk Prediction (XGBoost)
           │
           ▼
 Explainable AI (SHAP Feature Importance)
           │
           ▼
 Medical RAG Engine (FAISS Guidelines Index)
           │
           ▼
 Evidence Consistency & Uncertainty Quantification
           │
           ▼
 13-Section Clinical Decision-Support Report
           │
           ▼
 Doctor Review Panel & HIPAA Audit Log
```

### Core Components
1. **Frontend Application**: React 18, Vite, TypeScript, Recharts, Clinical Dark Theme system (`#0f172a`, `#00d4aa`, `#0284c7`).
2. **Orchestrator Backend**: Node.js/Express & FastAPI hybrid service.
3. **ML Prediction Engine**: Calibrated XGBoost & scikit-learn models.
4. **Explainability Engine**: SHAP tree explainer feature attribution.
5. **RAG Vector Engine**: FAISS vector search with `sentence-transformers` index.
6. **Database Persistence**: SQLAlchemy / SQLite with HIPAA audit tracking.
