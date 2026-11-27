# MediAgent — Dataset Documentation

This document describes all datasets used in the MediAgent project.
All datasets are for academic/prototype use only. No real patient data is used.

---

## 1. ML Training Datasets

### 1.1 Diabetes — Pima Indians Diabetes Dataset

| Attribute | Value |
|-----------|-------|
| Source | NIDDK / UCI Machine Learning Repository #34 |
| Citation | Smith et al. (1988), IEEE Computer Society Press |
| Records | 768 |
| Features | 8 (preg, plas, pres, skin, insu, mass, pedi, age) |
| Target | outcome (0=Non-Diabetic, 1=Diabetic) |
| Type | Tabular |
| Provenance | Verified — documented public dataset |

**File:** `server/ml/models/diabetes/`

---

### 1.2 Dengue — Dengue Clinical Hematology & Serology Cohort

| Attribute | Value |
|-----------|-------|
| Source | Kaggle — Dengue Clinical Detection (wahiduzzaman1511-ai) |
| Status | Unverified |
| Records | 1,000 |
| Features | 14 (Gender, Age, NS1, IgG, IgM, Fever_Duration, Body_Temperature, Platelet_Count, WBC_Count, Joint_Pain, Headache, Retro_Orbital_Pain, Myalgia, Rash) |
| Target | Outcome (0=Negative, 1=Confirmed) |
| Type | Tabular |
| Provenance | **UNVERIFIED** — source cannot be independently confirmed |

**File:** `server/ml/models/dengue/`

**Audit Flag:** SOURCE_UNVERIFIED — dataset provenance cannot be verified

---

### 1.3 Malaria — Clinical Malaria Emergency Severity Cohort

| Attribute | Value |
|-----------|-------|
| Source | Clinical Malaria Study (abiolalawal14) |
| Records | 337 |
| Features | 17 (age, sex, fever, cold, rigor, fatigue, headace, bitter_tongue, vomitting, diarrhea, Convulsion, Anemia, jundice, cocacola_urine, hypoglycemia, prostraction, hyperpyrexia) |
| Target | severe_maleria (0=Mild, 1=Severe) |
| Type | Tabular |
| Provenance | Verified — documented clinical study |

**File:** `server/ml/models/malaria/`

**Note:** Feature names contain typos (headace, vomitting, jundice, prostraction) from source data.

---

### 1.4 Chikungunya — Brazil Ministry of Health SINAN Arboviral Cohort

| Attribute | Value |
|-----------|-------|
| Source | Brazil Ministry of Health / SINAN Arboviral Cohort |
| Records | 10,000 |
| Features | 12 (fever, myalgia, headache, rash, vomiting, nausea, back_pain, conjunctivitis, arthritis, arthralgia, petechiae, leukopenia) |
| Target | target (0=Discarded, 1=Confirmed) |
| Type | Tabular |
| Provenance | Verified — public health dataset |

**File:** `server/ml/models/chikungunya/`

**Audit Flag:** DUPLICATE_ROWS_NOT_REMOVED — 8,319 duplicate rows (83%) not removed before train/test split

---

### 1.5 Typhoid — TyphoDx-BD Clinical Dataset

| Attribute | Value |
|-----------|-------|
| Source | TyphoDx-BD (Mendeley DOI: 10.17632/m9pnvv2vpv.1) |
| Status | RESTRICTED — not in repository |
| Records | 0 (not available locally) |
| Features | 0 |
| Target | typhoid_diagnosis |
| Provenance | NOT_ACCESSIBLE — behind authenticated access |

**File:** `server/ml/models/typhoid/`

**Audit Flag:** DATASET_NOT_VERIFIED, MODEL_GATED — no inference served

---

## 2. Knowledge Base Datasets

### 2.1 Medical Knowledge Base (`server/knowledge/`)

| Disease | Sources File | Documents File |
|---------|-------------|----------------|
| Diabetes | sources.json | documents.json |
| Dengue | sources.json | documents.json |
| Malaria | sources.json | documents.json |
| Chikungunya | sources.json | documents.json |
| Typhoid | sources.json | documents.json |

**Source Organizations:** WHO, CDC, NHS, MoHFW India, NCDC India, ICMR, ADA

**Retrieval Date:** 2026-11-25

**PII Verification:** 10 knowledge base files checked — no emails, phone numbers, or patient names found.

---

## 3. Removed Datasets (PII/Privacy)

The following files were removed from git tracking due to containing patient names
and fabricated clinical data:

| File | Reason |
|------|--------|
| `mediagent_patient_records.csv` | Contains patient names, diagnoses, medications — PII |
| `mediagent_clinical_conditions.csv` | Fabricated clinical conditions with treatments |
| `mediagent_drug_interactions.csv` | Fabricated drug interaction data |
| `mediagent_full_dataset.json` | Fabricated clinical dataset |

These files are referenced only by deprecated training scripts
(`server/ml/train_model.py`, `server/ml/train_dl_model.py`) which are not part
of the active prediction pipeline.

---

## 4. Synthetic Fixtures (For Testing Only)

### 4.1 DEMO_PATIENTS (`client/src/services/api.js`)

| Attribute | Value |
|-----------|-------|
| Count | 2 records |
| ID Prefix | PAT-DEMO- (isolated from real PAT- IDs) |
| Patient Names | "Demo Patient One", "Demo Patient Two" — clearly synthetic |
| Purpose | Frontend testing and demonstration |

**Constraint:** These are synthetic fixtures for software testing only.
No real patient data. Not used for model training.

---

## 5. Data Provenance Statement

| Dataset | Provenance Verified | Clinical Validation | Use Case |
|---------|--------------------|-------------------|----------|
| Diabetes (Pima) | ✅ Yes | No — screening only | ML training |
| Dengue | ❌ No — unverified source | No | ML training (flagged) |
| Malaria | ✅ Yes | No — low performance | ML training (caution) |
| Chikungunya | ✅ Yes | No — data leakage | ML training (flagged) |
| Typhoid | ❌ No — restricted access | N/A | Gated — no inference |
| Knowledge Base | ✅ Yes — org websites | N/A | RAG retrieval |

**No dataset is clinically validated.** All models are screening tools only.
