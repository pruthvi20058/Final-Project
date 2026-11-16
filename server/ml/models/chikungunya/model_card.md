# MediAgent Model Card: Chikungunya Arboviral Classifier

## Model Details
- **Model Version:** `v1.0.0-chikungunya-sinan`
- **Algorithm:** Random Forest
- **Intended Use:** Clinical decision support differentiation of Chikungunya infection from other acute febrile illnesses based on classic hallmark arthropathic signs.
- **Trained On:** 10,000 real-world epidemiological case notifications from Brazil Ministry of Health (SINAN). Zero synthetic data.

## Performance Metrics (Test Set, N = 2000)
- **Accuracy:** 56.65%
- **Precision:** 56.82%
- **Recall (Sensitivity):** 55.40%
- **Specificity:** 57.90%
- **F1 Score:** 0.5610
- **ROC-AUC:** 0.5799

## Confusion Matrix
- True Negatives: 579
- False Positives: 421
- False Negatives: 446
- True Positives: 554

## Clinical Disclaimer
Bilateral joint pain, severe arthralgia, and cutaneous rash are characteristic features of Chikungunya. However, definitive confirmation requires RT-PCR (during the first 8 days) or anti-CHIKV IgM serology. This model provides probabilistic risk stratification based on public epidemiological surveillance data and must never replace clinical or serological confirmation.
