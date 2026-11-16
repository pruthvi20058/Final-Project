# Model Card: MediAgent Pima Diabetes Classifier

## Model Details
- **Model Name**: MediAgent Pima Diabetes Classifier
- **Model Version**: `v2.0.0-pima-diabetes`
- **Algorithm**: Logistic Regression (`max_iter=1000`, `random_state=42`)
- **Developer**: MediAgent Clinical AI Team
- **Date**: October 2026

## Intended Use
- **Primary Task**: AI-assisted clinical decision support screening for diabetes mellitus risk based on 8 diagnostic parameters.
- **Intended Users**: Healthcare professionals, clinicians, medical researchers.
- **Out-of-Scope Use**: Not intended as a standalone or confirmed medical diagnosis. Must be evaluated alongside comprehensive physician clinical examination.

## Training & Dataset Provenance
- **Dataset**: Pima Indians Diabetes Dataset
- **Source**: UCI Machine Learning Repository / OpenML (Dataset ID 37, Name: `diabetes`)
- **Original Research**: Smith, J.W., Everhart, J.E., Dickson, W.C., Knowler, W.C., & Johannes, R.S. (1988).
- **Total Records**: 768 patient observations
- **Target Variable**: Original outcome label (`0` = Negative, `1` = Positive)
- **Train/Test Split**: 80% train (614 records) / 20% test (154 records), Stratified.
- **Cross-Validation**: 5-Fold Stratified Cross-Validation on training set.

## Canonical Features (8 Predictors)
1. `preg` (Pregnancies count)
2. `plas` (Plasma Glucose, mg/dL)
3. `pres` (Diastolic Blood Pressure, mmHg)
4. `skin` (Triceps Skin Fold Thickness, mm)
5. `insu` (2-Hour Serum Insulin, $\mu\text{U/mL}$)
6. `mass` (Body Mass Index, $\text{kg/m}^2$)
7. `pedi` (Diabetes Pedigree Function score)
8. `age` (Age in years)

## Evaluated Metrics (Held-Out Test Set & CV)
- **5-Fold CV Accuracy Mean**: `78.82%` ($\pm 1.58\%$)
- **5-Fold CV F1 Mean**: `0.6579`
- **5-Fold CV ROC-AUC Mean**: `0.8334`
- **Test Set Accuracy**: `71.43%`
- **Sensitivity (Recall)**: `51.85%`
- **Specificity**: `82.00%`
- **Precision**: `60.87%`
- **F1 Score**: `0.5600`
- **ROC-AUC**: `0.8230`
- **Brier Score Loss (Calibration)**: `0.1679`
- **Confusion Matrix**: `TN = 82, FP = 18, FN = 26, TP = 27`

## Clinical Limitations & Warnings
1. **Population Constraints**: Dataset consists of adult female patients of Pima Indian lineage; performance may vary across broader populations.
2. **Missing Feature Protocol**: The model requires all 8 canonical features. If uploaded reports lack any Pima parameter (e.g. skin fold thickness or insulin), the system returns `INSUFFICIENT_DATA` to prevent synthetic estimation.
3. **Screening Disclaimer**: Results represent estimated screening probability and do not constitute a confirmed diagnostic result.
