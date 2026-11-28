# MediAgent — Model Evaluation

This document contains actual evaluation metrics for all 5 disease models.
Metrics are extracted from model_metadata.json and model_registry.json.
No metrics are fabricated or estimated.

---

## 1. Diabetes — Type 2 Diabetes Mellitus

| Metric | Value |
|--------|-------|
| Model | Logistic Regression + StandardScaler |
| Version | v2.0.0-pima-diabetes |
| Algorithm | Logistic Regression |
| Dataset | Pima Indians Diabetes Dataset (NIDDK / UCI #34) |
| Sample Size | 768 records |
| Feature Count | 8 |
| Accuracy | 0.7143 |
| Precision | 0.6087 |
| Recall / Sensitivity | 0.5185 |
| Specificity | 0.82 |
| F1-Score | 0.56 |
| ROC-AUC | 0.823 |
| Brier Score | 0.1679 |
| Explanation Method | SHAP LinearExplainer |
| Status | TRAINED, VERIFIED |
| Audit Flags | None |

**Confusion Matrix:** Not available in metadata

**Clinical Limitation:** Moderate performance. Screening tool only — not a confirmed diagnosis.
Recall of 0.52 means ~48% of diabetic cases may be missed.

---

## 2. Dengue — Dengue Fever Infection

| Metric | Value |
|--------|-------|
| Model | Random Forest |
| Version | v1.0.0-dengue-clinical |
| Dataset | Dengue Clinical Hematology & Serology Cohort |
| Sample Size | 1000 records |
| Feature Count | 14 |
| Accuracy | 1.0 |
| Precision | 1.0 |
| Recall / Sensitivity | 1.0 |
| Specificity | 1.0 |
| F1-Score | 1.0 |
| ROC-AUC | 1.0 |
| Brier Score | 0.0 |
| Explanation Method | Feature Importances / Risk Coefficients |
| Status | TRAINED, NEEDS_CLEANING |
| Audit Flags | PERFECT_METRICS_SUSPICIOUS, SOURCE_UNVERIFIED |

**Confusion Matrix:** TN=93, FP=0, FN=0, TP=107

**Clinical Limitation:** Perfect metrics (1.0 across all) are statistically implausible for
clinical data. Possible target leakage or label contamination. Dataset source is unverified
(Kaggle). Model flagged for re-validation before clinical use.

---

## 3. Malaria — Malaria Clinical Severity

| Metric | Value |
|--------|-------|
| Model | Logistic Regression + StandardScaler (class_weight='balanced') |
| Version | v1.0.0-malaria-severity |
| Dataset | Clinical Malaria Emergency Severity Cohort |
| Sample Size | 337 records |
| Feature Count | 17 |
| Accuracy | 0.6176 |
| Precision | 0.4516 |
| Recall / Sensitivity | 0.6087 |
| Specificity | 0.6222 |
| F1-Score | 0.5185 |
| ROC-AUC | 0.6879 |
| Brier Score | 0.2237 |
| CV ROC-AUC Mean | 0.472 |
| CV Accuracy Mean | 0.5129 |
| CV F1 Mean | 0.388 |
| Explanation Method | Feature Weight Impact Attribution |
| Status | TRAINED, VERIFIED_LOW_PERFORMANCE |
| Audit Flags | LOW_PERFORMANCE, CV_ROC_AUC_NEAR_CHANCE |

**Confusion Matrix:** TN=28, FP=17, FN=9, TP=14

**Clinical Limitation:** CV ROC-AUC of 0.472 indicates near-chance performance.
Model should be used with extreme clinical caution. Precision of 0.45 means
>50% of positive predictions may be false positives.

---

## 4. Chikungunya — Chikungunya Arboviral Disease

| Metric | Value |
|--------|-------|
| Model | RandomForestClassifier (Calibrated) |
| Version | v1.0.0-chikungunya-sinan |
| Dataset | Brazil Ministry of Health SINAN Arboviral Cohort |
| Sample Size | 10,000 records |
| Feature Count | 12 |
| Accuracy | 0.5665 |
| Precision | 0.5682 |
| Recall / Sensitivity | 0.554 |
| Specificity | 0.579 |
| F1-Score | 0.561 |
| ROC-AUC | 0.5799 |
| Brier Score | 0.2454 |
| CV Accuracy Mean | 0.5516 |
| CV F1 Mean | 0.5583 |
| CV ROC-AUC Mean | 0.5736 |
| Duplicate Rows | 8,319 out of 10,000 |
| Explanation Method | Feature Gini Importance Ranking |
| Status | TRAINED, NEEDS_CLEANING |
| Audit Flags | DUPLICATE_ROWS_NOT_REMOVED, NEAR_CHANCE_PERFORMANCE |

**Confusion Matrix:** TN=579, FP=421, FN=446, TP=554

**Clinical Limitation:** 8,319 duplicate rows (83% of dataset) were not removed before
train/test split — data leakage. Metrics are near-chance (~57% accuracy). Dataset
requires deduplication and retraining before clinical use.

---

## 5. Typhoid — Typhoid Enteric Fever

| Metric | Value |
|--------|-------|
| Model | Pending Verified Dataset Training |
| Version | v1.0.0-typhoid |
| Dataset | TyphoDx-BD (Mendeley DOI: 10.17632/m9pnvv2vpv.1) — RESTRICTED |
| Sample Size | 0 (not available) |
| Feature Count | 0 |
| Status | NOT_TRAINED, UNAVAILABLE |
| Audit Flags | DATASET_NOT_VERIFIED, MODEL_GATED |

**Clinical Limitation:** No training dataset available locally. The TyphoDx-BD dataset is
restricted behind authenticated access. Model is gated — no inference is served for typhoid.
No predictions, no probabilities, no fabricated outputs.

---

## 6. Model Comparison Summary

| Disease | Accuracy | Precision | Recall | F1 | ROC-AUC | Status | Clinical Readiness |
|---------|----------|-----------|--------|----|---------|--------|-------------------|
| Diabetes | 0.7143 | 0.6087 | 0.5185 | 0.56 | 0.823 | TRAINED | Verified — Screening only |
| Dengue | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | TRAINED | Flagged — Possible data leakage |
| Malaria | 0.6176 | 0.4516 | 0.6087 | 0.5185 | 0.6879 | TRAINED | Low performance — Extreme caution |
| Chikungunya | 0.5665 | 0.5682 | 0.554 | 0.561 | 0.5799 | TRAINED | Flagged — Data leakage |
| Typhoid | N/A | N/A | N/A | N/A | N/A | NOT_TRAINED | Gated — No inference |

---

## 7. Probability Calibration

All models output probabilities with Brier scores:
- Diabetes: 0.1679 (well-calibrated)
- Dengue: 0.0 (perfect — suspicious)
- Malaria: 0.2237
- Chikungunya: 0.2454
- Typhoid: N/A

**Important:** ML probability is **never** used as a clinical risk score. Clinical risk
is assessed separately by the risk engine using clinical rules.

---

## 8. Explainability

| Disease | Explanation Method |
|---------|-------------------|
| Diabetes | SHAP LinearExplainer (feature-level attribution) |
| Dengue | Feature Importances / Risk Coefficients |
| Malaria | Feature Weight Impact Attribution |
| Chikungunya | Feature Gini Importance Ranking |
| Typhoid | N/A (no model) |

All prediction outputs include a clinical disclaimer:
> "This is an AI-assisted screening result and not a confirmed medical diagnosis."

---

## 9. Validation Methodology

- Train/test split with stratification (diabetes)
- Class weight balancing for imbalanced data (malaria)
- Cross-validation metrics reported where available
- Feature validation before inference (missing/invalid/out-of-range)
- No inference for NOT_TRAINED models (typhoid)
- No fabricated predictions when model unavailable
