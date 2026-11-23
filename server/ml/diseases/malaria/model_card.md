# MediAgent Model Card: Malaria Severity Risk Classifier

## Model Details
- **Model Version:** `v1.0.0-malaria-severity`
- **Algorithm:** Logistic Regression
- **Intended Use:** AI-assisted clinical decision support triage for identifying risk of progression to Severe Malaria in confirmed *Plasmodium* cases.
- **Trained On:** 337 real clinical patient observations. Zero synthetic data.

## Performance Metrics (Test Set, N = 68)
- **Accuracy:** 61.76%
- **Precision:** 45.16%
- **Recall (Sensitivity):** 60.87%
- **Specificity:** 62.22%
- **F1 Score:** 0.5185
- **ROC-AUC:** 0.6879

## Confusion Matrix
- True Negatives: 28
- False Positives: 17
- False Negatives: 9
- True Positives: 14

## Clinical Disclaimer
Severe malaria carries acute mortality risks (cerebral malaria, severe anemia, acute kidney injury). This model provides probabilistic risk stratification based on public clinical data and is not a stand-alone diagnostic device. All patients with warning signs must receive urgent physician evaluation and parenteral antimalarial therapy as indicated.
