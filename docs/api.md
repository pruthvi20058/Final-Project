# MediAgent API Documentation

## Centralized REST Endpoints

### 1. Reports Endpoint
- `POST /api/reports/upload`: Multipart file upload (JPG/PNG/PDF).
- `GET /api/reports`: Returns list of processed patient reports.
- `GET /api/reports/:id`: Returns single report details.
- `POST /api/reports/:id/extract`: Runs OCR extraction on uploaded document.
- `POST /api/reports/:id/validate`: Executes clinical boundary checks.

### 2. Predictions & Explainability
- `GET /api/predictions/:reportId`: Returns top disease predictions and differentials.
- `GET /api/predictions/:predictionId/xai`: Returns SHAP feature attribution weights.

### 3. Medical RAG Evidence
- `GET /api/evidence/:predictionId`: Returns relevant ADA/ESC guidelines and consistency score.

### 4. Risk & Uncertainty
- `GET /api/risk/:reportId`: Returns calculated risk score, contributing parameters, and uncertainty metrics.

### 5. Doctor Review
- `POST /api/reviews`: Submits doctor sign-off decision (`accepted`, `modified`, `rejected`, `info_requested`).
