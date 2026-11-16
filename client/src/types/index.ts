// MediAgent Central TypeScript Definitions

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'doctor' | 'patient' | 'researcher';
  specialty?: string;
  licenseNumber?: string;
  avatar?: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodType: string;
  weight: number;
  height: number;
  allergies: string[];
  medicalHistory: Array<{ condition: string; diagnosed: string; status: string }>;
  currentMedications: string[];
  emergencyContact: string;
  createdAt: string;
}

export interface LabResultItem {
  id: string;
  testName: string;
  value: number;
  units: string;
  referenceRange: string;
  status: 'normal' | 'high' | 'low' | 'critical';
  confidence: number; // 0 - 100
  validatedByUser?: boolean;
}

export interface Report {
  id: string;
  patientId: string;
  patientName: string;
  filename: string;
  filePath: string;
  fileType: 'image' | 'pdf';
  uploadDate: string;
  status: 'uploaded' | 'processing' | 'extracted' | 'analyzed' | 'reviewed';
  ocrConfidence: number;
  labResults: LabResultItem[];
  chiefComplaint?: string;
  symptoms?: string[];
}

export interface DiseasePrediction {
  disease: string;
  icd10: string;
  probability: number; // 0 - 100
  confidenceInterval: [number, number];
  category: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  reasoning: string;
  supportingFeatures: string[];
  mitigatingFeatures: string[];
}

export interface PredictionResult {
  id: string;
  reportId: string;
  topPrediction: DiseasePrediction;
  differentials: DiseasePrediction[];
  modelInfo: {
    name: string;
    version: string;
    trainingDate: string;
    calibrationStatus: string;
  };
  analysisStatus: 'success' | 'abstain';
  abstainReason?: string;
  createdAt: string;
}

export interface XAIResult {
  id: string;
  predictionId: string;
  featureImportance: Array<{ feature: string; importance: number; impact: 'positive' | 'negative' }>;
  topContributingFactors: string[];
  supportingFactors: string[];
  factorsReducingConfidence: string[];
  shapSummaryText: string;
}

export interface EvidenceSource {
  id: string;
  title: string;
  type: 'Clinical Guideline' | 'Research Paper' | 'Medical Reference';
  section: string;
  summary: string;
  link: string;
  relevanceScore: number; // 0 - 100
}

export interface EvidenceResult {
  id: string;
  predictionId: string;
  sources: EvidenceSource[];
  consistencyScore: number; // 0 - 100
  consistencyStatus: 'high' | 'moderate' | 'low' | 'conflict_detected';
  conflictDetails?: string;
}

export interface RiskAssessment {
  id: string;
  reportId: string;
  overallRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  riskScore: number; // 0 - 100
  contributingParameters: string[];
  methodology: string;
  recommendations: string[];
}

export interface UncertaintyMetrics {
  id: string;
  reportId: string;
  extractionConfidence: number; // 0 - 100
  predictionConfidence: number; // 0 - 100
  evidenceConsistency: 'High' | 'Moderate' | 'Low';
  dataCompleteness: number; // 0 - 100
  decisionSupportStatus: 'Suitable for Review' | 'High Uncertainty' | 'Review Required' | 'Abstain';
  criticalWarning?: string;
}

export interface TrendDataPoint {
  date: string;
  [key: string]: string | number;
}

export interface ReportComparison {
  testName: string;
  previousValue: number;
  currentValue: number;
  unit: string;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  isAbnormal: boolean;
}

export interface DoctorReview {
  id: string;
  reportId: string;
  doctorId: string;
  doctorName: string;
  decision: 'accepted' | 'modified' | 'rejected' | 'info_requested';
  comments: string;
  modifiedPrediction?: string;
  timestamp: string;
}

export interface EvaluationMetrics {
  datasetName: string;
  totalSamples: number;
  modelAccuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  rocAuc: number;
  brierScore: number;
  calibrationError: number;
  top3Accuracy: number;
  ocrMetrics: {
    ocrAccuracy: number;
    valueExtractionAccuracy: number;
    unitExtractionAccuracy: number;
    referenceRangeAccuracy: number;
  };
  gptComparison: {
    gpt4Accuracy: number;
    mediagentAccuracy: number;
    gpt4F1: number;
    mediagentF1: number;
    gpt4HallucinationRate: number;
    mediagentHallucinationRate: number;
  };
}

export interface SystemServiceStatus {
  backend: 'Online' | 'Offline' | 'Degraded';
  mlModel: 'Loaded' | 'Offline';
  ocrEngine: 'Ready' | 'Offline';
  ragEngine: 'Ready' | 'Offline';
  database: 'Connected' | 'Error';
  llmProvider: 'Connected' | 'Quota Exceeded' | 'Offline';
  lastChecked: string;
}
