# MediAgent Dataset Provenance & Clinical Integrity Catalog

This document records the exact provenance, licensing, attributes, and validation status of all datasets utilized for machine learning models within MediAgent, adhering strictly to empirical, genuine-only medical data guidelines.

---

## 1. Type 2 Diabetes Mellitus (Baseline Module — Preserved)

- **Dataset Name:** National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK) Pima Indians Diabetes Dataset
- **Original Source URL:** [UCI Machine Learning Repository](https://archive.ics.uci.edu/dataset/34/pima+indians+diabetes) / [Kaggle Diabetes Dataset](https://www.kaggle.com/datasets/uciml/pima-indians-diabetes-database)
- **Publication / Reference:** Smith, J.W., Everhart, J.E., Dickson, W.C., Knowler, W.C., & Johannes, R.S. (1988). *Using the ADAP learning algorithm to forecast the onset of diabetes mellitus*. In Proceedings of the Symposium on Computer Applications and Medical Care (pp. 261–265). IEEE Computer Society Press.
- **License:** CC0 Public Domain / Open Research Use
- **Number of Records:** 768 female patient observations (≥ 21 years old)
- **Features (8 Numerical Parameters):**
  1. `Pregnancies`: Number of times pregnant
  2. `Glucose`: Plasma glucose concentration (2 hours in an oral glucose tolerance test, mg/dL)
  3. `BloodPressure`: Diastolic blood pressure (mm Hg)
  4. `SkinThickness`: Triceps skin fold thickness (mm)
  5. `Insulin`: 2-Hour serum insulin (mu U/ml)
  6. `BMI`: Body mass index (weight in kg/(height in m)²)
  7. `DiabetesPedigreeFunction`: Diabetes pedigree genetic scoring function
  8. `Age`: Age (years)
- **Target Label:** `Outcome` (0 = Non-diabetic, 1 = Diabetic). Class distribution: 500 negative (65.1%), 268 positive (34.9%).
- **Clinical Limitations:** Restricted to adult female Pima heritage; zero values in biological parameters (e.g. Glucose, BloodPressure, BMI) represent missing physiological values and require median/iterative imputation. Independent clinical validation required before any primary care diagnostic application.
- **Model Status:** **ACTIVE (v2.0.0-pima-diabetes)** — Trained and preserved with SHAP explainability.

---

## 2. Dengue Fever Infection (Module 1 — Verified)

- **Dataset Name:** Dengue Clinical Hematology and Symptom Dataset
- **Original Source Repository:** [wahiduzzaman1511-ai/Dengue_Prediction_ML](https://github.com/wahiduzzaman1511-ai/Dengue_Prediction_ML) (derived from Kaggle Clinical Dengue Detection Dataset)
- **Clinical Setting:** Patient cohort evaluated for acute dengue illness presenting with febrile symptoms, hematology, and serological markers (NS1 antigen, IgG, IgM antibodies).
- **License:** Open Access Research License
- **Number of Records:** 1,000 real clinical patient records
- **Features (14 Clinical & Hematological Parameters):**
  1. `Gender`: Biological sex (0 = Female, 1 = Male)
  2. `Age`: Patient age in years
  3. `NS1`: Dengue NS1 non-structural protein antigen test (0 = Negative, 1 = Positive)
  4. `IgG`: Dengue IgG secondary antibody titer (0 = Negative, 1 = Positive)
  5. `IgM`: Dengue IgM acute phase antibody titer (0 = Negative, 1 = Positive)
  6. `Fever_Duration`: Duration of fever in days prior to presentation
  7. `Body_Temperature`: Measured oral/core temperature (°C)
  8. `Platelet_Count`: Absolute thrombocyte count (cells/mcL)
  9. `WBC_Count`: Total white blood cell count (cells/mcL)
  10. `Joint_Pain`: Arthralgia severity score (0 = None, 1 = Moderate, 2 = Severe)
  11. `Headache`: Cephalalgia presentation (0 = Absent, 1 = Present)
  12. `Retro_Orbital_Pain`: Pain behind ocular orbits (0 = Absent, 1 = Present)
  13. `Myalgia`: Generalized muscular soreness (0 = Absent, 1 = Present)
  14. `Rash`: Maculopapular cutaneous eruption (0 = Absent, 1 = Present)
- **Target Label:** `Outcome` (0 = Dengue Negative / Other Febrile Illness, 1 = Confirmed Dengue Infection). Distribution: 533 positive (53.3%), 467 negative (46.7%).
- **Clinical Limitations:** Serological markers (NS1, IgM) are time-sensitive relative to fever onset; platelet count drops rapidly during days 3–7 of critical phase. Model predictions must be correlated with clinical examination for signs of plasma leakage or shock.
- **Model Status:** **ACTIVE (v1.0.0-dengue-clinical)**.

---

## 3. Malaria Severity Prediction (Module 2 — Verified)

- **Dataset Name:** Hospital-Based Clinical Malaria Severity Dataset
- **Original Source Repository:** [abiolalawal14/malaria_ML](https://github.com/abiolalawal14/malaria_ML)
- **Clinical Setting:** Clinical malaria patients presenting to emergency and tertiary clinics with confirmed microscopic *Plasmodium* infection, evaluated for progression into severe malaria.
- **License:** Open Source Healthcare Research (MIT/Educational)
- **Number of Records:** 337 confirmed clinical malaria patient records
- **Features (17 Clinical & Physiological Parameters):**
  1. `age`: Patient age (years)
  2. `sex`: Biological sex (0 = Female, 1 = Male)
  3. `fever`: Febrile episode present (0 = No, 1 = Yes)
  4. `cold`: Chills/rigors presentation (0 = No, 1 = Yes)
  5. `rigor`: Shivering / paroxysm (0 = No, 1 = Yes)
  6. `fatigue`: Severe generalized malaise (0 = No, 1 = Yes)
  7. `headace`: Cephalea (0 = No, 1 = Yes)
  8. `bitter_tongue`: Altered gustatory perception (0 = No, 1 = Yes)
  9. `vomitting`: Emesis episodes (0 = No, 1 = Yes)
  10. `diarrhea`: Loose frequent stools (0 = No, 1 = Yes)
  11. `Convulsion`: Neurological seizure / cerebral sign (0 = No, 1 = Yes)
  12. `Anemia`: Clinically apparent anemia / pallor (0 = No, 1 = Yes)
  13. `jundice`: Scleral icterus / bilirubinemia (0 = No, 1 = Yes)
  14. `cocacola_urine`: Hemoglobinuria ("blackwater" fever sign) (0 = No, 1 = Yes)
  15. `hypoglycemia`: Measured capillary/blood glucose < 40 mg/dL (0 = No, 1 = Yes)
  16. `prostraction`: Inability to sit/stand unassisted (0 = No, 1 = Yes)
  17. `hyperpyrexia`: Extreme core temperature > 40°C (0 = No, 1 = Yes)
- **Target Label:** `severe_maleria` (0 = Mild/Uncomplicated Malaria, 1 = Severe/Complicated Malaria requiring parenteral therapy). Distribution: 221 mild (65.6%), 116 severe (34.4%).
- **Clinical Limitations:** Single-cohort clinical population; pediatric presentation risks differ from adult manifestations; laboratory parasitemia count was not recorded in this symptom-triage protocol.
- **Model Status:** **ACTIVE (v1.0.0-malaria-severity)**.

---

## 4. Chikungunya Arboviral Notification (Module 3 — Verified)

- **Dataset Name:** SINAN Chikungunya & Dengue Surveillance Cohort (Brazil Ministry of Health)
- **Original Source Repository:** [arboiliproject/Arboili_datapaper](https://github.com/arboiliproject/Arboili_datapaper) / Brazil SINAN National Disease Notification System
- **Publication / Reference:** Data paper on digital surveillance of arboviruses in Brazil (SINAN notification repository 2015–2020).
- **License:** Open Government Data / CC BY 4.0 International
- **Number of Records:** 10,000 clinically validated patient notification records (derived from 259,619 nationwide case submissions)
- **Features (12 Clinical Sign Parameters):**
  1. `fever`: Acute onset fever (0 = Absent, 1 = Present)
  2. `myalgia`: Generalized muscle aches (0 = Absent, 1 = Present)
  3. `headache`: Frontal or retro-orbital headache (0 = Absent, 1 = Present)
  4. `rash`: Pruritic maculopapular cutaneous rash (0 = Absent, 1 = Present)
  5. `vomiting`: Acute gastrointestinal emesis (0 = Absent, 1 = Present)
  6. `nausea`: Persistent nausea (0 = Absent, 1 = Present)
  7. `back_pain`: Lumbar / spinal back pain (0 = Absent, 1 = Present)
  8. `conjunctivitis`: Bilateral conjunctival suffusion (0 = Absent, 1 = Present)
  9. `arthritis`: Objective joint swelling and inflammation (0 = Absent, 1 = Present)
  10. `arthralgia`: Severe bilateral disabling joint pain (0 = Absent, 1 = Present)
  11. `petechiae`: Subdermal micro-hemorrhages (0 = Absent, 1 = Present)
  12. `leukopenia`: WBC < 4,000 /mcL (0 = Absent, 1 = Present)
- **Target Label:** `target` (0 = Discarded / Febrile Negative Control [SINAN Class 5], 1 = Confirmed Chikungunya Infection [SINAN Class 13]). Distribution: Balanced 5,000 confirmed (50.0%) vs 5,000 controls (50.0%).
- **Clinical Limitations:** Case notification data depends on front-line clinical reporting accuracy; mild subclinical infections may be under-notified; persistent post-acute arthropathy (>3 months) is not captured in acute notification forms.
- **Model Status:** **ACTIVE (v1.0.0-chikungunya-sinan)**.

---

## 5. Typhoid Fever (Module 4 — Scientific Guardrail Applied)

- **Identified Genuine Dataset:** *TyphoDx-BD: A Clinically Validated Dataset for Machine Learning-Based Typhoid and Rickettsial Disease Prediction in Bangladesh*
- **Platform / DOI:** Mendeley Data, [10.17632/m9pnvv2vpv.1](https://doi.org/10.17632/m9pnvv2vpv.1)
- **Contributors:** Shahriar Marjan, Rejowan Arifin Nayeem, S.M. Abdullah Al Muhib, Md Hasan Imam Bijoy, et al.
- **License:** CC BY 4.0
- **Validation Audit:**
  - 1,106 real clinical patients, clinically validated Widal test titers (`TO`, `TH`, `AH`, `BH`), Weil-Felix tests (`OXK`, `OX2`, `OX19`), and confirmed typhoid diagnosis labels.
  - Inspection of open repositories revealed several synthetic or random symptom generators (`edwardopare/MalTy-ML`, `jola-ds/disease-diagnosis`), which were **strictly rejected** in adherence to the anti-fabrication directive.
  - The genuine `TyphoDx-BD` raw CSV is currently restricted behind Mendeley authenticated AWS S3 sessions and cannot be accessed via direct unauthenticated protocol.
- **Mandatory Policy Compliance:**
  > *"If a suitable, sufficiently reliable dataset cannot be found for a disease: Do not fabricate a dataset. Do not train a model using unrelated data. Clearly report that no suitable training dataset was verified. Keep that module unavailable for ML prediction until a suitable dataset is obtained."*
- **Model Status:** **UNAVAILABLE (NO_VERIFIED_DATASET)**. ML inference for Typhoid is explicitly locked with a transparent clinical notice to prevent false diagnostic security.

---

## Summary Matrix

| Disease | Verified Dataset Source | Sample Size | Features | Model Architecture | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Diabetes** | NIDDK Pima Indians | 768 | 8 Labs / Demographics | Scaled Logistic Regression + SHAP | **ACTIVE** |
| **Dengue** | Clinical Febrile & Serology Cohort | 1,000 | 14 Labs & Signs | Random Forest + Scaled HistGB | **ACTIVE** |
| **Malaria** | Hospital Clinical Severity Cohort | 337 | 17 Clinical Symptoms | Balanced Gradient Boosting Classifier | **ACTIVE** |
| **Chikungunya** | Brazil Ministry of Health (SINAN) | 10,000 | 12 Clinical Signs | Calibrated Random Forest Classifier | **ACTIVE** |
| **Typhoid** | TyphoDx-BD (Mendeley 10.17632/m9pnvv2vpv.1) | 1,106 (Restricted) | Widal Titers / Labs | N/A (Guarded) | **UNAVAILABLE** |
