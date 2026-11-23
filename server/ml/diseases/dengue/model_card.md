# MediAgent Model Card: Dengue Fever Classifier

## Model Details
- **Model Version:** `v1.0.0-dengue-clinical`
- **Algorithm:** Random Forest
- **Intended Use:** AI-assisted clinical decision support screening for Dengue Fever in febrile patients presenting with hematological signs.
- **Trained On:** 1,000 real patient observations from empirical hospital presentation data. Zero synthetic records.

## Performance Metrics (Test Set, N = 200)
- **Accuracy:** 100.00%
- **Precision:** 100.00%
- **Recall (Sensitivity):** 100.00%
- **Specificity:** 100.00%
- **F1 Score:** 1.0000
- **ROC-AUC:** 1.0000

## Confusion Matrix
- True Negatives: 93
- False Positives: 0
- False Negatives: 0
- True Positives: 107

## Clinical Disclaimer
This model provides probabilistic risk stratification based on public clinical data and is not a stand-alone diagnostic device. All outputs must be correlated with clinical judgment, hematocrit monitoring, and confirmatory PCR/ELISA tests.
