# MediAgent — System Architecture

This document describes the actual implemented system architecture based on source code.
All diagrams represent implemented components, not hypothetical features.

---

## 1. Overall System Architecture

```mermaid
graph TB
    subgraph Client [Frontend - React/Vite]
        UI[React UI Components]
        API[API Service Layer - api.js]
        Vite[Vite Dev Server / Nginx]
    end

    subgraph Backend [Backend - Express/Node.js]
        Server[Express Server - index.js]
        Auth[Auth Middleware - JWT]
        Cors[CORS Middleware]
        RateLimit[Rate Limiting]
        CorrID[Correlation ID Middleware]
        Logger[Structured JSON Logger]
    end

    subgraph APIRoutes [API Routes]
        AuthR[/api/auth]
        ReportsR[/api/reports]
        PatientsR[/api/patients]
        ML[/api/ml]
        Risk[/api/risk]
        RAG[/api/rag]
        Knowledge[/api/knowledge]
        Backup[/api/backup]
        Health[/api/health]
        HealthReady[/api/health/ready]
        HealthModels[/api/health/models]
        SystemStatus[/api/system/status]
        Orchestrator[/api/orchestrator]
        HealthComp[/api/health-companion]
        NLP[/api/nlp]
    end

    subgraph Services [Backend Services]
        DB[SQLite Database - better-sqlite3]
        PredSvc[Prediction Service]
        RAGSvc[RAG Service]
        VectorSvc[Vector Store - TF-IDF]
        ReportParser[Report Parser / OCR]
        Multilingual[Multilingual NLP - Python]
        HealthCompSvc[Health Information Agent]
    end

    subgraph ML [Python ML Layer]
        PredInterface[prediction_interface.py]
        ModelRegistry[model_registry.json]
        FeatureValidator[feature_validator.py]
        Models[5 Disease Models - .joblib]
    end

    subgraph Agents [Agentic AI - Server/agents]
        Orchestrator[orchestrator.js]
        Triage[Triage Agent]
        Diagnostic[Diagnostic Agent]
        RAGAgent[RAG Agent]
        Medication[Medication Agent]
        Image[Image Agent]
        Guardrail[Guardrail Agent]
    end

    UI --> API
    API --> Vite
    Vite -->|proxy /api| Server
    Server --> Auth
    Server --> Cors
    Server --> RateLimit
    Server --> CorrID
    Server --> Logger
    Server --> APIRoutes
    APIRoutes --> Services
    Services --> DB
    PredSvc --> ML
    Agents --> Orchestrator
    Orchestrator --> Triage
    Orchestrator --> Diagnostic
    Orchestrator --> RAGAgent
    Orchestrator --> Medication
    Orchestrator --> Image
    Orchestrator --> Guardrail
    ML --> Models
    ML --> ModelRegistry
```

---

## 2. Agentic AI Workflow

```mermaid
flowchart TD
    Start([Patient Input]) --> Step1[Symptom Analysis Tool]
    Step1 --> Step2[Data Verification Tool - GATE]
    Step2 -->|Verified| Step3[Disease Readiness Tool]
    Step3 -->|Model Available| Step4[Disease Prediction Tool]
    Step3 -->|Model Unavailable| Step4b[Return MODEL_NOT_AVAILABLE]
    Step4 --> Step5[SHAP Explanation Tool]
    Step5 --> Step6[Medical Evidence Tool - RAG]
    Step6 --> Step7[Risk Assessment Tool]
    Step7 --> Step8[Report Generation Tool]
    Step8 --> Final[Final Clinical Report]

    Step2 -->|Not Verified| Step2b[Awaiting Patient Verification]
    Step2b -->|Verified| Step3
    Step2b -->|Not Verified| Step2c[Return VERIFICATION_REQUIRED]

    Step4 -->|Insufficient Data| Step4b
    Step4 -->|Invalid Data| Step4b

    style Step2 fill:#f96,stroke:#333
    style Step4 fill:#f96,stroke:#333
    style Step4b fill:#e74c3c,stroke:#333,color:#fff
    style Step2c fill:#e74c3c,stroke:#333,color:#fff
```

**Agent Responsibilities:**
- **Triage Agent:** Analyzes vitals and symptom urgency
- **Diagnostic Agent:** Generates differential diagnoses from symptom matching
- **RAG Agent:** Retrieves medical evidence from knowledge base
- **Medication Agent:** Checks treatments and drug interactions
- **Image Agent:** Analyzes uploaded medical images
- **Guardrail Agent:** Final safety and compliance validation

---

## 3. Laboratory Report Processing Pipeline

```mermaid
flowchart LR
    Upload[Upload Report - PDF/JPG/PNG] --> Multer[Multer - 15MB limit]
    Multer --> FileStore[Save to uploads/]
    FileStore --> Parser[Report Parser]
    Parser --> OCR[OCR - Tesseract.js / pdf-parse]
    OCR --> Extract[Extract Lab Values]
    Extract --> Normalize[Normalize Test Names/Units]
    Normalize --> Validate[Range Validation]
    Validate --> Map[Feature Mapping to Disease Schema]
    Map --> Readiness[Model Readiness Check]
    Readiness -->|Ready| Predict[Disease Prediction]
    Readiness -->|Not Ready| Ineligible[Prediction Ineligible]
    Predict --> SHAP[SHAP Explainability]
    SHAP --> RAG[RAG Medical Evidence]
    RAG --> Report[Clinical Report Generation]
    
    style Upload fill:#e1f5fe
    style Report fill:#e8f5e9
    style Ineligible fill:#ffebee
```

---

## 4. Disease Prediction Pipeline

```mermaid
flowchart TD
    Input[Feature Payload + Disease] --> Registry[Model Registry Lookup]
    Registry -->|Not Found| Unavailable[Return MODEL_NOT_AVAILABLE]
    Registry -->|Found| StatusCheck[Check Model Status]
    StatusCheck -->|NOT_TRAINED| Unavailable
    StatusCheck -->|TRAINED| MetricsCheck[Check Evaluation Metrics]
    MetricsCheck -->|No Metrics| NotValidated[Return MODEL_NOT_VALIDATED]
    MetricsCheck -->|Has Metrics| Validate[Feature Validation]
    Validate -->|Invalid| InvalidData[Return INSUFFICIENT/INVALID_DATA]
    Validate -->|Valid| Inference[Run Model Inference]
    Inference --> Format[Format Prediction Output]
    Format --> Disclaimer[Add Clinical Disclaimer]
    Disclaimer --> Output[Return Prediction Result]

    style Unavailable fill:#e74c3c,stroke:#333,color:#fff
    style NotValidated fill:#e74c3c,stroke:#333,color:#fff
    style InvalidData fill:#f39c12,stroke:#333,color:#fff
    style Output fill:#2ecc71,stroke:#333,color:#fff
```

**Supported Diseases:** Diabetes, Dengue, Malaria, Chikungunya, Typhoid (gated)

---

## 5. RAG Architecture

```mermaid
flowchart TD
    Query[User Query] --> Sanitize[PII Sanitization]
    Sanitize --> Tokenize[TF-IDF Tokenization]
    Tokenize --> VectorStore[Vector Store - TF-IDF]
    VectorStore --> HybridScore[Hybrid Scoring: TF-IDF + Keyword]
    HybridScore --> Diversity[Source Diversity Enforcement]
    Diversity --> Rank[Rank Top-K Results]
    Rank --> QualityCheck[Evidence Quality Check]
    QualityCheck -->|Low Relevance| Insufficient[Return INSUFFICIENT_EVIDENCE]
    QualityCheck -->|Relevant| Citations[Return with Citations]
    Citations --> Grounded[Grounded Explanation]

    style Insufficient fill:#f39c12,stroke:#333,color:#fff
    style Citations fill:#2ecc71,stroke:#333,color:#fff
```

**Knowledge Base:** 5 diseases, curated sources (WHO, CDC, NHS, MoHFW, ICMR, ADA)

---

## 6. Multilingual NLP Workflow

```mermaid
flowchart TD
    Input[Text/Voice Input] --> Detect[Language Detection]
    Detect -->|Native Script| Script[Unicode Script Range Detection]
    Detect -->|Romanized| Romanized[Romanized Keyword Detection]
    Script --> Lexicon[Symptom Lexicon Lookup]
    Romanized --> Lexicon
    Lexicon --> Negate[Negation Detection]
    Negate --> Temporal[Temporal/Historical Detection]
    Temporal --> Duration[Duration Extraction]
    Duration --> Extract[Extract Clinical Entities]
    Extract --> Output[Structured Output Schema]

    SupportedLanguages[10 Languages: en, kn, hi, ta, te, ml, mr, bn, gu, pa]
    
    style Output fill:#2ecc71,stroke:#333,color:#fff
```

---

## 7. Database ER Diagram

```mermaid
erDiagram
    DOCTORS ||--o{ PATIENTS : creates
    DOCTORS ||--o{ CONSULTATIONS : conducts
    PATIENTS ||--o{ REPORTS : owns
    REPORTS ||--o{ PREDICTIONS : generates
    REPORTS ||--o{ LAB_RESULTS : contains
    CONSULTATIONS ||--o{ RISK_ASSESSMENTS : produces
    DOCTORS ||--o{ RISK_ASSESSMENTS : creates

    DOCTORS {
        string id PK
        string name
        string email UK
        string password_hash
        string specialty
        string license_number
        string role
        datetime created_at
    }

    PATIENTS {
        string id PK
        string name
        int age
        string gender
        string blood_type
        string created_by FK
        datetime created_at
    }

    REPORTS {
        string id PK
        string patient_id FK
        string filename
        string file_type
        float ocr_confidence
        string status
        string created_by FK
        datetime created_at
    }

    LAB_RESULTS {
        string id PK
        string report_id FK
        string test_name
        string normalized_name
        float value
        string units
        string status
        string validation_flags
    }

    PREDICTIONS {
        string id PK
        string report_id FK
        string disease
        string model_version
        float probability
        string predicted_outcome
        datetime created_at
    }

    CONSULTATIONS {
        string id PK
        string patient_id FK
        string chief_complaint
        string status
        string triage_result
        datetime created_at
    }

    RISK_ASSESSMENTS {
        string id PK
        string user_id FK
        string patient_id FK
        string disease
        string risk_category
        string emergency_alert
        datetime created_at
    }
```

---

## 8. Data Flow Diagram

```mermaid
dfd
    User((User/Doctor)) -->|1. Upload Report| Frontend[React Frontend]
    Frontend -->|2. API Request| Backend[Express Backend]
    Backend -->|3. Store File| Uploads[(uploads/)]
    Backend -->|4. OCR Extraction| OCR[Tesseract.js / pdf-parse]
    OCR -->|5. Lab Values| DB[(SQLite Database)]
    DB -->|6. Feature Mapping| ML[Python ML Service]
    ML -->|7. Prediction| Backend
    Backend -->|8. RAG Evidence| RAG[RAG Knowledge Base]
    RAG -->|9. Citations| Backend
    Backend -->|10. Response| Frontend
    Frontend -->|11. Display| User
```

---

## 9. Use Case Diagram

```mermaid
useCaseDiagram
    actor Doctor
    actor Patient

    Doctor --> (Upload Lab Report)
    Doctor --> (View Predictions)
    Doctor --> (Review & Sign-off)
    Doctor --> (Manage Patients)
    Doctor --> (View System Status)
    Doctor --> (Backup/Restore)
    Patient --> (View Reports)
    Patient --> (Health Companion Chat)
    Patient --> (Multilingual Voice Input)
```

---

## 10. Deployment Architecture

```mermaid
graph TB
    subgraph Docker [Docker Compose]
        Frontend[Frontend Container - Nginx]
        Backend[Backend Container - Node + Python]
        Volume[(mediagent_data Volume)]
    end

    subgraph External [External Services]
        Render[Render - Backend Hosting]
        Vercel[Vercel - Frontend Hosting]
    end

    Frontend -->|API Calls| Backend
    Backend -->|Read/Write| Volume
    Frontend -->|Deploy| Vercel
    Backend -->|Deploy| Render

    style Volume fill:#e1f5fe
```

---

## Implementation Notes

- **Backend:** Express.js with SQLite (better-sqlite3, WAL mode)
- **Frontend:** React 18 with Vite, served by Nginx in production
- **ML:** Python 3 with scikit-learn, joblib, SHAP
- **OCR:** Tesseract.js (frontend), pdf-parse (backend)
- **RAG:** TF-IDF hybrid vector search (no FAISS/embeddings)
- **Authentication:** JWT with bcrypt password hashing
- **Logging:** Structured JSON with correlation IDs and PII redaction
