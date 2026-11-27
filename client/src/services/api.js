// MediAgent Central API Service connected to Express Backend & Trained ML Pipeline

// In production, VITE_API_URL is set to the Render backend URL.
// No hardcoded production URLs — only VITE_API_URL or relative /api for dev proxy.
const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) {
    const raw = import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '');
    return raw.endsWith('/api') ? raw : `${raw}/api`;
  }
  // Development: use relative /api (Vite dev server proxies to localhost:3001)
  return '/api';
};

const API_BASE = getApiBase();

// Clinical fallback data has been removed. The backend is the sole source of truth for
// predictions, reports, XAI, evidence, and risk assessments. API failures now propagate
// as errors instead of being silently substituted with fabricated clinical data.
//
// DEMO_* constants below are strictly isolated preview/seeded data. They are NEVER
// mixed with real patient data and are explicitly labelled as demo content.

// Helper for HTTP requests — never substitutes fabricated clinical data on failure
function getAuthToken() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('mediagent_token') : null;
  } catch {
    return null;
  }
}

async function request(endpoint, options = {}) {
  try {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    });

    // Safely parse response body; handle empty or malformed responses
    let data;
    const text = await res.text().catch(() => '');
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    if (!res.ok) {
      const errorMsg = data && data.error && data.error.message
        ? data.error.message
        : `API Error ${res.status}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.code = data && data.error ? data.error.code : 'UNKNOWN_ERROR';
      err.endpoint = endpoint;
      throw err;
    }
    return data;
  } catch (err) {
    // Network-level failures (fetch throws, DNS, CORS, etc.) have no .status
    if (!err.status) {
      err.message = 'Unable to connect to the MediAgent server. Please try again after the service becomes available.';
      err.code = 'SERVICE_UNAVAILABLE';
    }
    throw err;
  }
}

export const IS_DEMO = false;

// --- DEMO SEED DATA (ISOLATED FOR PREVIEW ONLY) ---
// Synthetic fixtures for software testing — NO patient names or real PII.
// All values are placeholder/synthetic and clearly labelled as demo content.
// Uses PAT- prefix IDs for isolation from real patient records.
export const DEMO_PATIENTS = [
  {
    id: 'PAT-DEMO-001',
    name: 'Demo Patient One',
    age: 45,
    gender: 'Female',
    bloodType: 'A+',
    weight: 68,
    height: 165,
    allergies: ['Penicillin', 'Sulfonamides'],
    medicalHistory: [
      { condition: 'Type 2 Diabetes', diagnosed: '2019', status: 'Ongoing' },
      { condition: 'Hypertension', diagnosed: '2020', status: 'Managed' }
    ],
    currentMedications: ['Metformin 500mg BID', 'Lisinopril 10mg Daily'],
    emergencyContact: 'Demo Contact One — 555-0101',
    createdAt: '2026-08-10'
  },
  {
    id: 'PAT-DEMO-002',
    name: 'Demo Patient Two',
    age: 62,
    gender: 'Male',
    bloodType: 'O-',
    weight: 82,
    height: 175,
    allergies: ['Aspirin'],
    medicalHistory: [
      { condition: 'Coronary Artery Disease', diagnosed: '2017', status: 'Ongoing' },
      { condition: 'Hyperlipidemia', diagnosed: '2016', status: 'Managed' }
    ],
    currentMedications: ['Atorvastatin 40mg Daily', 'Clopidogrel 75mg Daily'],
    emergencyContact: 'Demo Contact Two — 555-0202',
    createdAt: '2026-08-12'
  }
];

export const CLINICAL_ONTOLOGY = [
  { testName: 'Age', defaultUnits: 'years', defaultRange: '18–120', low: 18, high: 120, normalizedName: 'age' },
  { testName: 'Patient Age', defaultUnits: 'years', defaultRange: '18–120', low: 18, high: 120, normalizedName: 'age' },
  { testName: 'Glucose (Fasting)', defaultUnits: 'mg/dL', defaultRange: '70–99', low: 70, high: 99, criticalHigh: 200, normalizedName: 'glucose' },
  { testName: 'HbA1c', defaultUnits: '%', defaultRange: '4.0–5.6', low: 4.0, high: 5.6, criticalHigh: 9.0, normalizedName: 'hba1c' },
  { testName: 'Diastolic Blood Pressure', defaultUnits: 'mmHg', defaultRange: '60–80', low: 60, high: 80, criticalHigh: 120, normalizedName: 'diastolic_bp' },
  { testName: 'Body Mass Index (BMI)', defaultUnits: 'kg/m²', defaultRange: '18.5–24.9', low: 18.5, high: 24.9, criticalHigh: 40, normalizedName: 'bmi' },
  { testName: '2-Hour Serum Insulin', defaultUnits: 'μU/mL', defaultRange: '16–166', low: 16, high: 166, criticalHigh: 300, normalizedName: 'insulin' },
  { testName: 'Triceps Skinfold Thickness', defaultUnits: 'mm', defaultRange: '10–30', low: 10, high: 30, criticalHigh: 60, normalizedName: 'skin_fold' },
  { testName: 'Diabetes Pedigree Function', defaultUnits: 'score', defaultRange: '< 0.5', low: 0.05, high: 2.5, normalizedName: 'pedigree' },
  { testName: 'Pregnancies', defaultUnits: 'count', defaultRange: '0–10', low: 0, high: 20, normalizedName: 'pregnancies' },
  { testName: 'Troponin I', defaultUnits: 'ng/mL', defaultRange: '< 0.04', low: 0, high: 0.04, criticalHigh: 1.0 },
  { testName: 'CK-MB', defaultUnits: 'ng/mL', defaultRange: '0–5', low: 0, high: 5, criticalHigh: 25 },
  { testName: 'BNP', defaultUnits: 'pg/mL', defaultRange: '< 100', low: 0, high: 100, criticalHigh: 400 },
  { testName: 'Hemoglobin', defaultUnits: 'g/dL', defaultRange: '13.0–17.0', low: 13.0, high: 17.0, criticalLow: 8.0 },
  { testName: 'WBC Count', defaultUnits: 'cells/µL', defaultRange: '4000–11000', low: 4000, high: 11000, criticalHigh: 15000 },
  { testName: 'Serum Creatinine', defaultUnits: 'mg/dL', defaultRange: '0.6–1.2', low: 0.6, high: 1.2, criticalHigh: 3.0 },
  { testName: 'eGFR', defaultUnits: 'mL/min/1.73m²', defaultRange: '> 90', low: 90, high: 200, criticalLow: 30 },
  { testName: 'ALT (SGPT)', defaultUnits: 'U/L', defaultRange: '7–56', low: 7, high: 56, criticalHigh: 120 },
  { testName: 'AST (SGOT)', defaultUnits: 'U/L', defaultRange: '10–40', low: 10, high: 40, criticalHigh: 120 },
  { testName: 'Total Cholesterol', defaultUnits: 'mg/dL', defaultRange: '< 200', low: 0, high: 200, criticalHigh: 280 }
];

// --- CENTRALIZED AUTHORITATIVE BACKEND REPORT SERVICE ---
export const reportService = {
  async upload(uploadPayload) {
    const file = uploadPayload instanceof File ? uploadPayload : uploadPayload.file;
    if (!file) {
      throw new Error('Please select a valid laboratory report file to upload.');
    }

    const formData = new FormData();
    formData.append('file', file);
    if (uploadPayload.patientId) formData.append('patientId', uploadPayload.patientId);
    if (uploadPayload.symptoms) formData.append('symptoms', uploadPayload.symptoms);
    if (uploadPayload.history) formData.append('history', uploadPayload.history);
    if (uploadPayload.disease) formData.append('disease', uploadPayload.disease);

    const res = await fetch(`${API_BASE}/reports/upload`, {
      method: 'POST',
      body: formData
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errorMsg = data && data.error && data.error.message ? data.error.message : 'Upload failed';
      throw new Error(errorMsg);
    }

    return {
      id: data.report.id,
      status: 'uploaded',
      report: {
        ...data.report,
        modelReadiness: data.modelReadiness || (data.report && data.report.modelReadiness)
      },
      modelReadiness: data.modelReadiness || (data.report && data.report.modelReadiness),
      reportExtraction: data.reportExtraction,
      prediction: data.prediction
    };
  },

  async list() {
    const data = await request('/reports');
    return data.reports || [];
  },

  async getById(id, disease = null) {
    if (!id) throw new Error('Report ID is required');
    const query = disease ? `?disease=${encodeURIComponent(disease)}` : '';
    const data = await request(`/reports/${id}${query}`);
    if (!data.report) {
      throw new Error(`Report ${id} not found.`);
    }
    const readiness = data.modelReadiness || (data.report && data.report.modelReadiness) || null;
    return {
      ...data.report,
      modelReadiness: readiness
    };
  },

  async extract(id, disease = null) {
    const report = await this.getById(id, disease);
    return {
      reportId: report.id,
      labResults: report.labResults,
      ocrConfidence: report.ocrConfidence,
      rawOcrText: report.rawOcrText,
      modelReadiness: report.modelReadiness
    };
  },

  async updateLabResults(id, newLabResults, disease = 'diabetes') {
    const data = await request(`/reports/${id}/lab-results`, {
      method: 'PUT',
      body: JSON.stringify({ labResults: newLabResults, disease })
    });
    return {
      success: true,
      report: {
        ...data.report,
        modelReadiness: data.modelReadiness || (data.report && data.report.modelReadiness)
      },
      modelReadiness: data.modelReadiness || (data.report && data.report.modelReadiness),
      prediction: data.prediction
    };
  }
};

export const patientService = {
  async list() {
    const data = await request('/patients');
    return Array.isArray(data) ? data : (data && data.patients) || [];
  },
  async getById(id) {
    if (!id) throw new Error('Patient ID is required');
    return await request(`/patients/${id}`);
  }
};

export const predictionService = {
  async getPrediction(reportId, disease = 'diabetes') {
    if (!reportId) throw new Error('Report ID is required');
    const query = disease ? `?disease=${encodeURIComponent(disease)}` : '';
    const data = await request(`/reports/${reportId}/prediction${query}`);
    // Pass through VERIFICATION_REQUIRED status so frontend can show verification gate
    if (data.status === 'VERIFICATION_REQUIRED') {
      return {
        status: 'VERIFICATION_REQUIRED',
        report: data.report,
        modelReadiness: data.modelReadiness,
        message: data.message,
        prediction: null
      };
    }
    if (data.prediction) {
      return {
        ...data.prediction,
        status: data.status || 'SUCCESS',
        report: data.report,
        modelReadiness: data.modelReadiness,
        topPrediction: data.prediction.topPrediction
      };
    }
    return {
      id: `PRED-${reportId}`,
      reportId: reportId,
      status: data.status || 'PREDICTION_NOT_AVAILABLE',
      report: data.report,
      modelReadiness: data.modelReadiness,
      missingFeatures: data.missingFeatures,
      symptomDifferentials: data.symptomDifferentials || [],
      message: data.message,
      prediction: null
    };
  },

  async predict(reportId, disease = 'diabetes') {
    if (!reportId) throw new Error('Report ID is required');
    return await request(`/reports/${reportId}/predict`, {
      method: 'POST',
      body: JSON.stringify({ disease })
    });
  },

  async getXAI(predictionIdOrReportId, disease = null) {
    const reportId = (predictionIdOrReportId || '').replace('PRED-', '').replace('XAI-', '');
    const query = disease ? `?disease=${encodeURIComponent(disease)}` : '';
    try {
      const data = await request(`/reports/${reportId}/xai${query}`);
      return data.xai;
    } catch {
      return {
        features: [],
        shapSummaryText: 'SHAP attribution is unavailable or awaiting completed prediction.',
        baseValue: 0
      };
    }
  }
};

export const evidenceService = {
  async getEvidence(predictionIdOrReportId) {
    const reportId = (predictionIdOrReportId || '').replace('PRED-', '').replace('EVI-', '');
    try {
      const data = await request(`/reports/${reportId}/evidence`);
      return data.evidence;
    } catch {
      return { sources: [] };
    }
  }
};

export const riskService = {
  async assessRisk(data) {
    const result = await request('/risk/assess', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return result;
  },
  async getRiskAssessment(assessmentId) {
    const result = await request(`/risk/assessments/${assessmentId}`);
    return result.assessment || result;
  },
  async listRiskAssessments() {
    const result = await request('/risk/assessments');
    return result.assessments || [];
  },
  async getRiskCategories() {
    const result = await request('/risk/categories');
    return result.categories || {};
  },
  async getClinicalSources() {
    const result = await request('/risk/sources');
    return result.sources || [];
  },
  async getReferenceRanges(param) {
    const url = param ? `/risk/reference-ranges?param=${encodeURIComponent(param)}` : '/risk/reference-ranges';
    const result = await request(url);
    return result;
  },
  async getEmergencyRules(disease) {
    const url = disease ? `/risk/rules/${disease}` : '/risk/rules';
    const result = await request(url);
    return result.rules || [];
  }
};

export const trendService = {
  async getTrends(patientId) {
    const data = await request(`/trends?patientId=${patientId}`);
    return data.trends || data;
  }
};

export const reviewService = {
  async submitReview(data) {
    const result = await request('/reviews', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return { success: true, message: 'Doctor review saved successfully', ...result };
  }
};

export const evaluationService = {
  async getMetrics() {
    const data = await request("/evaluation/metrics");
    return data.metrics || data;
  },
  async getSystemStatus() {
    const data = await request("/system/status");
    return data.status || data;
  }
};

// --- MULTILINGUAL VOICE & CLINICAL NLP SERVICE ---
export const nlpService = {
  async getLanguages() {
    return request('/nlp/languages');
  },

  async detectLanguage(text) {
    return request('/nlp/detect-language', {
      method: 'POST',
      body: JSON.stringify({ text })
    });
  },

  async transcribeAudio(file, language = 'auto') {
    const formData = new FormData();
    formData.append('audio', file);
    if (language && language !== 'auto') {
      formData.append('language', language);
    }
    const res = await fetch(`${API_BASE}/nlp/transcribe`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || data.error || `Voice transcription failed with status ${res.status}`);
    }
    return data;
  },

  async processText(text, preferredLanguage = 'auto') {
    return request('/nlp/process-text', {
      method: 'POST',
      body: JSON.stringify({ text, preferredLanguage })
    });
  },

  async processVoice(file, language = 'auto') {
    const formData = new FormData();
    formData.append('audio', file);
    if (language && language !== 'auto') {
      formData.append('language', language);
    }
    const res = await fetch(`${API_BASE}/nlp/process-voice`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || data.error || `Voice processing failed with status ${res.status}`);
    }
    return data;
  },

  async synthesizeSpeech(text, language = 'en') {
    return request('/nlp/synthesize-speech', {
      method: 'POST',
      body: JSON.stringify({ text, language })
    });
  },

  async runConsultation(payload) {
    if (payload.audioFile) {
      const formData = new FormData();
      formData.append('audio', payload.audioFile);
      formData.append('inputType', 'voice');
      if (payload.text) formData.append('text', payload.text);
      if (payload.preferredLanguage) formData.append('preferredLanguage', payload.preferredLanguage);
      if (payload.patientId) formData.append('patientId', payload.patientId);
      if (payload.patientName) formData.append('patientName', payload.patientName);
      if (payload.patientAge) formData.append('patientAge', payload.patientAge);
      if (payload.patientGender) formData.append('patientGender', payload.patientGender);
      formData.append('userConfirmed', payload.userConfirmed ? 'true' : 'false');
      formData.append('synthesizeAudio', payload.synthesizeAudio !== false ? 'true' : 'false');

      const res = await fetch(`${API_BASE}/nlp/consultation`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || `Consultation failed with status ${res.status}`);
      }
      return data;
    } else {
      return request('/nlp/consultation', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
  },

  async getConsultations() {
    return request('/nlp/consultations');
  },

  async getConsultationById(id) {
    return request(`/nlp/consultations/${id}`);
  },

  async verifySymptoms(payload) {
    return request('/nlp/verify-symptoms', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getModelReadiness(disease) {
    return request(`/nlp/model-readiness/${disease}`);
  }
};

export const orchestratorService = {
  async startAssessment(payload) {
    return request('/orchestrator/assessments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  async getAssessment(assessmentId) {
    if (!assessmentId) throw new Error('Assessment ID is required');
    return request(`/orchestrator/assessments/${encodeURIComponent(assessmentId)}`);
  },
  async listAssessments() {
    const data = await request('/orchestrator/assessments');
    return data.assessments || [];
  },
  async verifyAssessment(assessmentId, payload) {
    if (!assessmentId) throw new Error('Assessment ID is required');
    return request(`/orchestrator/assessments/${encodeURIComponent(assessmentId)}/verify`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  async listTools() {
    return request('/orchestrator/tools');
  }
};

export const mlService = {
  async getModels() {
    return request('/ml/models');
  },
  async getModelDetails(disease) {
    return request(`/ml/models/${disease}`);
  },
  async getSampleDatasets() {
    return request('/ml/datasets/samples');
  },
  async inspectDataset(filePath, disease) {
    return request('/ml/datasets/inspect', {
      method: 'POST',
      body: JSON.stringify({ filePath, disease })
    });
  },
  async getReadiness() {
    return request('/ml/readiness');
  },
  async uploadDataset(formData) {
    const res = await fetch(`${API_BASE}/ml/datasets/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error?.message || data.message || `Upload failed with status ${res.status}`);
    }
    return data;
  },
  async trainModel(params) {
    return request('/ml/train', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },
  async predictDisease(disease, features) {
    return request(`/ml/predict/${disease}`, {
      method: 'POST',
      body: JSON.stringify({ disease, features })
    });
  }
};

// --- HEALTH COMPANION SERVICE ---
export const healthCompanionService = {
  async getChatSessions() {
    const data = await request('/health-companion/chat/sessions');
    return data.sessions || [];
  },
  async getChatHistory(sessionId) {
    const data = await request(`/health-companion/chat/sessions/${sessionId}`);
    return data.messages || [];
  },
  async deleteChatSession(sessionId) {
    return request(`/health-companion/chat/sessions/${sessionId}`, {
      method: 'DELETE'
    });
  },
  async getMedicines(query, category) {
    let url = '/health-companion/medicines?limit=100';
    if (query && query.trim()) url += `&query=${encodeURIComponent(query.trim())}`;
    if (category && category !== 'All') url += `&category=${encodeURIComponent(category)}`;
    const data = await request(url);
    return data.medicines || [];
  },
  async identifyMedicineFromImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${API_BASE}/health-companion/medicines/identify-image`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || data.message || 'Failed to analyze medicine packaging image.');
    }
    return data;
  }
};


