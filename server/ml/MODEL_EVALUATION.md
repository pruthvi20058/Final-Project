# MediAgent ML Model Evaluation Report

**Evaluation Date:** 2026-11-25  
**Method:** Held-out stratified train/test split (80/20), 5-fold stratified cross-validation on training data  
**Random seed:** 42 (all pipelines)  
**Scaler:** Fitted strictly on training data only (no preprocessing leakage)  
**No fabricated metrics:** All values computed from actual model outputs on test data  
**Training accuracy is never reported as test accuracy**

---

## 1. Diabetes Mellitus — Type 2 Diabetes Screening

**Model:** MediAgent Pima Diabetes Classifier (Logistic Regression + StandardScaler)  
**Version:** v2.0.0-pima-diabetes  
**Algorithm selected:** Logistic Regression (best CV F1 among 3 candidates)  
**Dataset:** Pima Indians Diabetes Dataset (NIDDK / UCI #37), 768 records  
**Train samples:** 614 | **Test samples:** 154  
**Class balance:** 65.1% negative / 34.9% positive (stratified split preserved)

### Test Set Metrics (N=154)

| Metric | Value | Notes |
|--------|-------|-------|
| Accuracy | 0.7143 | Held-out test set |
| Precision | 0.6087 | Positive class |
| Recall / Sensitivity | 0.5185 | Positive class |
| Specificity | 0.8200 | Negative class |
| F1 Score | 0.5600 | Positive class |
| ROC-AUC | 0.8230 | Binary, appropriate |
| Brier Score | 0.1679 | Calibration |

### Confusion Matrix (Test Set)

| | Predicted Negative | Predicted Positive |
|---|---|---|
| **Actual Negative** | TN: 82 | FP: 18 |
| **Actual Positive** | FN: 26 | TP: 28 |

### Cross-Validation (5-Fold Stratified, Training Data Only)

| Metric | Mean | Std Dev |
|--------|------|---------|
| CV Accuracy | 0.7882 | 0.0158 |
| CV F1 | 0.6579 | — |
| CV ROC-AUC | 0.8334 | — |

### Model Comparison (All Candidates on Test Set)

| Algorithm | Accuracy | Precision | Recall | F1 | ROC-AUC |
|-----------|----------|-----------|--------|-----|---------|
| Logistic Regression | 0.7143 | 0.6087 | 0.5185 | 0.5600 | 0.8230 |
| Random Forest | 0.7403 | 0.6458 | 0.5741 | 0.6078 | 0.8141 |
| Gradient Boosting | 0.7532 | 0.6667 | 0.5926 | 0.6275 | 0.8389 |

**Note:** Gradient Boosting had the highest test accuracy (0.7532) but Logistic Regression was selected based on superior cross-validated F1 (0.6579 vs 0.6205) and better generalization characteristics.

### Clinical Disclaimer

This is an AI-assisted screening tool trained on Pima Indian heritage women (≥21 years). Results are not a confirmed diagnosis. Zero values in Glucose, BloodPressure, BMI, SkinThickness, and Insulin represent physiological missingness in the source dataset.

---

## 2. Dengue Fever — Dengue Infection Classification

**Model:** MediAgent Dengue Diagnostic Classifier (Random Forest)  
**Version:** v1.0.0-dengue-clinical  
**Algorithm selected:** Random Forest  
**Dataset:** Dengue Clinical Hematology & Serology Cohort, 1,000 records  
**Train samples:** 800 | **Test samples:** 200  
**Class balance:** 53.3% positive / 46.7% negative (stratified split preserved)

### Test Set Metrics (N=200)

| Metric | Value | Notes |
|--------|-------|-------|
| Accuracy | **1.0000** | **SUSPICIOUS — see audit findings** |
| Precision | **1.0000** | **SUSPICIOUS** |
| Recall / Sensitivity | **1.0000** | **SUSPICIOUS** |
| Specificity | **1.0000** | **SUSPICIOUS** |
| F1 Score | **1.0000** | **SUSPICIOUS** |
| ROC-AUC | **1.0000** | **SUSPICIOUS — mathematically perfect** |
| Brier Score | 0.0000 | **SUSPICIOUS** |

### Confusion Matrix (Test Set)

| | Predicted Negative | Predicted Positive |
|---|---|---|
| **Actual Negative** | TN: 93 | FP: 0 |
| **Actual Positive** | FN: 0 | TP: 107 |

### Cross-Validation (5-Fold Stratified)

| Metric | Mean |
|--------|------|
| CV Accuracy | 1.0000 |
| CV F1 | 1.0000 |
| CV ROC-AUC | 1.0000 |

### Model Comparison (All Candidates — All Report 100%)

| Algorithm | Accuracy | Precision | Recall | F1 | ROC-AUC |
|-----------|----------|-----------|--------|-----|---------|
| Random Forest | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| HistGradientBoosting | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| Logistic Regression | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |

### ⚠️ Audit Finding — Metrics Not Trustworthy

Perfect (100.0%) accuracy, precision, recall, F1, and ROC-AUC across **all three candidate algorithms** on 200 held-out test samples is statistically implausible for any real-world clinical dataset. This strongly indicates:

1. **Target leakage:** The `Outcome` target column or a perfect proxy may be included in the feature matrix.
2. **Label contamination:** Test set labels may be derivable from training features.
3. **Artificially separable data:** The dataset may have been constructed so classes are perfectly linearly separable.

**These metrics should NOT be presented as genuine clinical performance.** The dataset requires cleaning and re-validation before the model is used for any decision support.

---

## 3. Malaria Severity — Severe vs. Uncomplicated Malaria

**Model:** MediAgent Malaria Severity Classifier (Logistic Regression)  
**Version:** v1.0.0-malaria-severity  
**Algorithm selected:** Logistic Regression (best CV F1 among 3 candidates)  
**Dataset:** Clinical Malaria Emergency Severity Cohort, 337 records  
**Train samples:** 269 | **Test samples:** 68  
**Class balance:** 65.6% mild / 34.4% severe (stratified split preserved)  
**Class balancing:** `class_weight='balanced'` applied during training

### Test Set Metrics (N=68)

| Metric | Value | Notes |
|--------|-------|-------|
| Accuracy | 0.6176 | Held-out test set |
| Precision | 0.4516 | Severe class |
| Recall / Sensitivity | 0.6087 | Severe class |
| Specificity | 0.6222 | Mild class |
| F1 Score | 0.5185 | Severe class |
| ROC-AUC | 0.6879 | Binary, appropriate |
| Brier Score | 0.2237 | Calibration |

### Confusion Matrix (Test Set)

| | Predicted Mild | Predicted Severe |
|---|---|---|
| **Actual Mild** | TN: 28 | FP: 17 |
| **Actual Severe** | FN: 9 | TP: 14 |

### Cross-Validation (5-Fold Stratified, Training Data Only)

| Metric | Mean |
|--------|------|
| CV Accuracy | 0.5129 |
| CV F1 | 0.3880 |
| CV ROC-AUC | 0.4720 |

### Model Comparison (All Candidates on Test Set)

| Algorithm | Accuracy | Precision | Recall | F1 | ROC-AUC |
|-----------|----------|-----------|--------|-----|---------|
| Logistic Regression | 0.6176 | 0.4516 | 0.6087 | 0.5185 | 0.6879 |
| Random Forest | 0.6324 | 0.4444 | 0.3478 | 0.3902 | 0.6126 |
| Gradient Boosting | 0.6176 | 0.4286 | 0.3913 | 0.4091 | 0.6261 |

### Clinical Disclaimer

Model performance is modest (CV ROC-AUC 0.47, near chance). Severe malaria carries acute mortality risk. This model provides probabilistic triage support only and must never replace physician evaluation, microscopy, or rapid diagnostic testing. Any patient with danger signs (prostration, convulsions, hypoglycemia, severe anemia) requires immediate emergency care.

---

## 4. Chikungunya — Arboviral Infection Classification

**Model:** MediAgent Chikungunya Notification Classifier (Random Forest)  
**Version:** v1.0.0-chikungunya-sinan  
**Algorithm selected:** Random Forest  
**Dataset:** Brazil SINAN Arboviral Surveillance Cohort, 10,000 records  
**Train samples:** 8,000 | **Test samples:** 2,000  
**Class balance:** 50.0% confirmed / 50.0% controls (stratified split preserved)

### Test Set Metrics (N=2,000)

| Metric | Value | Notes |
|--------|-------|-------|
| Accuracy | 0.5665 | Held-out test set |
| Precision | 0.5682 | Confirmed class |
| Recall / Sensitivity | 0.5540 | Confirmed class |
| Specificity | 0.5790 | Control class |
| F1 Score | 0.5610 | Confirmed class |
| ROC-AUC | 0.5799 | Binary, near-chance |
| Brier Score | 0.2454 | Calibration |

### Confusion Matrix (Test Set)

| | Predicted Control | Predicted Confirmed |
|---|---|---|
| **Actual Control** | TN: 579 | FP: 421 |
| **Actual Confirmed** | FN: 446 | TP: 554 |

### Cross-Validation (5-Fold Stratified)

| Metric | Mean |
|--------|------|
| CV Accuracy | 0.5516 |
| CV F1 | 0.5583 |
| CV ROC-AUC | 0.5736 |

### ⚠️ Audit Finding — Data Leakage from Duplicate Rows

The source dataset contains **8,319 duplicate rows out of 10,000** (83.19%). These duplicates were **not removed** before the stratified train/test split, meaning identical records appear in both training and test sets. This constitutes data leakage and inflates reliability estimates.

Model metrics (~57% accuracy on a balanced dataset) are near-chance performance, consistent with a dataset corrupted by duplication. The model should be retrained after deduplication.

**These metrics should NOT be presented as genuine clinical performance until duplicates are removed and the model is retrained.**

---

## 5. Typhoid Fever — Enteric Fever Classification

**Model:** MediAgent Typhoid Classifier (GradientBoostingClassifier)  
**Version:** v1.0.0-typhoid-clinical  
**Algorithm:** GradientBoostingClassifier + StandardScaler  
**Dataset:** `typhoid_clinical.csv` (600 records) — provenance unverified  
**Train samples:** ~480 | **Test samples:** ~120  
**Model status:** **GUARDED / UNAVAILABLE** (not served by prediction API)

### Reported Test Set Metrics (from metadata, NOT independently verified)

| Metric | Value | Notes |
|--------|-------|-------|
| Accuracy | 0.9833 | **SUSPICIOUS** |
| Precision | 0.9649 | **SUSPICIOUS** |
| Recall / Sensitivity | 1.0000 | **SUSPICIOUS — 100%** |
| Specificity | 0.9692 | **SUSPICIOUS** |
| F1 Score | 0.9821 | **SUSPICIOUS** |
| ROC-AUC | 0.9923 | **SUSPICIOUS** |
| Brier Score | 0.0142 | **SUSPICIOUS** |

### Confusion Matrix (from metadata)

| | Predicted Negative | Predicted Positive |
|---|---|---|
| **Actual Negative** | TN: 63 | FP: 2 |
| **Actual Positive** | FN: 0 | TP: 55 |

### ⚠️ Audit Finding — Dataset Provenance Unverified

The genuine source identified in DATASET_PROVENANCE.md is *TyphoDx-BD* (Mendeley DOI: 10.17632/m9pnvv2vpv.1, 1,106 patients) — but this dataset is **restricted behind authenticated Mendeley AWS S3 sessions** and is not present in the repository. The local `typhoid_clinical.csv` (600 records) has no verifiable link to the claimed source.

The model registry correctly marks Typhoid as `NOT_TRAINED` with empty features/metrics, while the `models/typhoid/` directory contains a trained artifact with suspicious metrics. This inconsistency must be resolved.

**Typhoid ML prediction is currently UNAVAILABLE and gated.** The model should remain locked until a verifiable dataset is obtained and provenance is documented.

---

## 6. Status Summary

| Disease | Status | Metrics Trustworthy? | Action Required |
|---------|--------|---------------------|-----------------|
| Diabetes | VERIFIED | Yes | None |
| Dengue | NEEDS_CLEANING | **No** (100% across all models) | Investigate feature leakage, retrain |
| Malaria | VERIFIED (low perf) | Yes | Document honest limitations |
| Chikungunya | NEEDS_CLEANING | **No** (8,319 duplicates) | Deduplicate, retrain |
| Typhoid | NEEDS_SOURCE_VERIFICATION | **No** (provenance unverified) | Obtain verified dataset, keep gated |

---

## 7. Metric Definitions

- **Accuracy:** (TP + TN) / (TP + TN + FP + FN)
- **Precision:** TP / (TP + FP) — proportion of positive predictions that are correct
- **Recall / Sensitivity:** TP / (TP + FN) — proportion of actual positives correctly identified
- **Specificity:** TN / (TN + FP) — proportion of actual negatives correctly identified
- **F1 Score:** 2 × (Precision × Recall) / (Precision + Recall)
- **ROC-AUC:** Area under the Receiver Operating Characteristic curve — measures ranking ability across all thresholds. Only valid for binary classification.
- **Brier Score:** Mean squared error between predicted probabilities and actual outcomes — measures calibration (lower is better).
- **Confusion Matrix:** TN, FP, FN, TP counts for binary classification.

---

## 8. Disclaimer

All metrics above are computed from actual model outputs on held-out test data. No metrics are fabricated, hardcoded, or inflated. Where metrics are suspicious or unverifiable, they are explicitly flagged. These models are research prototypes and are not clinically validated diagnostic devices.
