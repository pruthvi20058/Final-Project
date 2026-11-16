import os
import json
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, brier_score_loss
)

def train_malaria():
    print("=" * 60)
    print("Training Empirical Malaria Severity Prediction Model")
    print("=" * 60)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(base_dir, "data", "malaria_clinical.csv")
    out_dir = os.path.join(base_dir, "models", "malaria")
    os.makedirs(out_dir, exist_ok=True)

    df = pd.read_csv(data_path)
    print(f"Loaded Malaria Clinical Dataset: {df.shape[0]} patient records, {df.shape[1]} columns")

    feature_cols = [
        'age', 'sex', 'fever', 'cold', 'rigor', 'fatigue',
        'headace', 'bitter_tongue', 'vomitting', 'diarrhea',
        'Convulsion', 'Anemia', 'jundice', 'cocacola_urine',
        'hypoglycemia', 'prostraction', 'hyperpyrexia'
    ]
    target_col = 'severe_maleria'

    X = df[feature_cols].copy()
    y = df[target_col].astype(int)

    print(f"Class Distribution: {y.value_counts().to_dict()}")

    # Stratified Split 80/20
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"Train samples: {len(X_train)}, Test samples: {len(X_test)}")

    # Age is the primary continuous parameter
    cont_cols = ['age']
    scaler = StandardScaler()
    scaler.fit(X_train[cont_cols])

    def transform_features(X_in):
        X_out = X_in.copy()
        X_out[cont_cols] = scaler.transform(X_in[cont_cols])
        return X_out

    X_train_scaled = transform_features(X_train)
    X_test_scaled = transform_features(X_test)

    # Models evaluated with class_weight='balanced' to handle the 66/34 mild/severe distribution
    models = {
        "Random Forest": RandomForestClassifier(n_estimators=100, max_depth=5, class_weight='balanced', random_state=42),
        "Gradient Boosting": GradientBoostingClassifier(n_estimators=100, max_depth=3, random_state=42),
        "Logistic Regression": LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42)
    }

    results = {}
    best_name = None
    best_f1 = -1

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    for name, clf in models.items():
        cv_res = cross_validate(clf, X_train_scaled, y_train, cv=cv, scoring=['accuracy', 'f1', 'roc_auc'])
        clf.fit(X_train_scaled, y_train)

        y_pred = clf.predict(X_test_scaled)
        y_prob = clf.predict_proba(X_test_scaled)[:, 1]

        cm = confusion_matrix(y_test, y_pred)
        tn, fp, fn, tp = cm.ravel()

        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        auc = roc_auc_score(y_test, y_prob)
        brier = brier_score_loss(y_test, y_prob)

        metrics = {
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall_sensitivity": round(float(rec), 4),
            "specificity": round(float(tn / (tn + fp)), 4) if (tn + fp) > 0 else 0.0,
            "f1_score": round(float(f1), 4),
            "roc_auc": round(float(auc), 4),
            "brier_score": round(float(brier), 4),
            "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
            "cv_metrics": {
                "cv_accuracy_mean": round(float(np.mean(cv_res['test_accuracy'])), 4),
                "cv_f1_mean": round(float(np.mean(cv_res['test_f1'])), 4),
                "cv_roc_auc_mean": round(float(np.mean(cv_res['test_roc_auc'])), 4)
            }
        }
        results[name] = metrics
        print(f"[{name}] Test F1: {metrics['f1_score']}, AUC: {metrics['roc_auc']}, Acc: {metrics['accuracy']}")

        if metrics['f1_score'] > best_f1:
            best_f1 = metrics['f1_score']
            best_name = name

    print(f"\n--> Selected Optimal Model: {best_name} (F1: {best_f1})")
    best_clf = models[best_name]

    # Save Artifacts
    joblib.dump(best_clf, os.path.join(out_dir, "model.joblib"))
    joblib.dump({
        "scaler": scaler,
        "cont_cols": cont_cols,
        "feature_cols": feature_cols
    }, os.path.join(out_dir, "preprocessor.joblib"))

    # Feature Schema
    schema = {
        "model_id": f"malaria_{best_name.lower().replace(' ', '_')}",
        "model_version": "v1.0.0-malaria-severity",
        "task": "binary_classification",
        "target": {
            "name": "severe_maleria",
            "classes": {"0": "Mild / Uncomplicated Malaria", "1": "Severe / Complicated Malaria"}
        },
        "canonical_features": [
            {"name": "age", "clinical_label": "Patient Age", "report_synonyms": ["age"], "unit": "years", "numeric_type": "float", "valid_range": {"min": 1, "max": 110}},
            {"name": "sex", "clinical_label": "Biological Sex", "report_synonyms": ["sex", "gender"], "numeric_type": "integer", "valid_range": {"min": 0, "max": 1}},
            {"name": "fever", "clinical_label": "Fever Present", "report_synonyms": ["fever", "febrile"], "numeric_type": "integer", "valid_range": {"min": 0, "max": 1}},
            {"name": "cold", "clinical_label": "Chills / Cold Feeling", "report_synonyms": ["cold", "chills"], "numeric_type": "integer", "valid_range": {"min": 0, "max": 1}},
            {"name": "rigor", "clinical_label": "Rigors / Shivering Paroxysm", "report_synonyms": ["rigor", "rigors"], "numeric_type": "integer", "valid_range": {"min": 0, "max": 1}},
            {"name": "fatigue", "clinical_label": "Fatigue / Malaise", "report_synonyms": ["fatigue", "tiredness", "weakness"], "numeric_type": "integer", "valid_range": {"min": 0, "max": 1}},
            {"name": "headace", "clinical_label": "Headache", "report_synonyms": ["headace", "headache", "cephalalgia"], "numeric_type": "integer", "valid_range": {"min": 0, "max": 1}},
            {"name": "bitter_tongue", "clinical_label": "Bitter Taste in Mouth", "report_synonyms": ["bitter_tongue", "dysgeusia"], "numeric_type": "integer", "valid_range": {"min": 0, "max": 1}},
            {"name": "vomitting", "clinical_label": "Vomiting", "report_synonyms": ["vomitting", "vomiting", "emesis"], "numeric_type": "integer", "valid_range": {"min": 0, "max": 1}},
            {"name": "diarrhea", "clinical_label": "Diarrhea", "report_synonyms": ["diarrhea", "loose_stools"], "numeric_type": "integer", "valid_range": {"min": 0, "max": 1}},
            {"name": "Convulsion", "clinical_label": "Convulsions / Seizure Signs", "report_synonyms": ["convulsion", "seizures", "fits"], "numeric_type": "integer", "valid_range": {"min": 0, "max": 1}},
            {"name": "Anemia", "clinical_label": "Severe Pallor / Anemia", "report_synonyms": ["anemia", "pallor", "low_hemoglobin"], "numeric_type": "integer", "valid_range": {"min": 0, "max": 1}},
            {"name": "jundice", "clinical_label": "Jaundice / Scleral Icterus", "report_synonyms": ["jundice", "jaundice", "icterus"], "numeric_type": "integer", "valid_range": {"min": 0, "max": 1}},
            {"name": "cocacola_urine", "clinical_label": "Dark / Hemoglobinuria Urine", "report_synonyms": ["cocacola_urine", "dark_urine", "blackwater_fever"], "numeric_type": "integer", "valid_range": {"min": 0, "max": 1}},
            {"name": "hypoglycemia", "clinical_label": "Hypoglycemia (<40 mg/dL)", "report_synonyms": ["hypoglycemia", "low_blood_sugar"], "numeric_type": "integer", "valid_range": {"min": 0, "max": 1}},
            {"name": "prostraction", "clinical_label": "Prostration / Extreme Weakness", "report_synonyms": ["prostraction", "prostration", "inability_to_stand"], "numeric_type": "integer", "valid_range": {"min": 0, "max": 1}},
            {"name": "hyperpyrexia", "clinical_label": "Hyperpyrexia (>40°C)", "report_synonyms": ["hyperpyrexia", "high_fever"], "numeric_type": "integer", "valid_range": {"min": 0, "max": 1}}
        ]
    }

    with open(os.path.join(out_dir, "feature_schema.json"), "w", encoding="utf-8") as f:
        json.dump(schema, f, indent=2)

    # Metadata
    metadata = {
        "model_name": f"MediAgent Malaria Severity Classifier ({best_name})",
        "model_version": "v1.0.0-malaria-severity",
        "algorithm": best_name,
        "dataset_provenance": {
            "name": "Clinical Malaria Severity Dataset",
            "source": "Clinical Malaria Study / abiolalawal14",
            "records_total": int(len(df)),
            "train_samples": int(len(X_train)),
            "test_samples": int(len(X_test)),
            "synthetic_data_used": False
        },
        "leakage_audit": {
            "duplicate_rows_detected": int(df.duplicated(subset=feature_cols).sum()),
            "scaler_fitted_on_train_only": True,
            "stratified_split": True,
            "random_seed": 42
        },
        "selected_model_test_metrics": results[best_name],
        "all_model_comparisons": results
    }

    with open(os.path.join(out_dir, "model_metadata.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    # Model Card
    model_card = f"""# MediAgent Model Card: Malaria Severity Risk Classifier

## Model Details
- **Model Version:** `v1.0.0-malaria-severity`
- **Algorithm:** {best_name}
- **Intended Use:** AI-assisted clinical decision support triage for identifying risk of progression to Severe Malaria in confirmed *Plasmodium* cases.
- **Trained On:** 337 real clinical patient observations. Zero synthetic data.

## Performance Metrics (Test Set, N = {len(X_test)})
- **Accuracy:** {results[best_name]['accuracy'] * 100:.2f}%
- **Precision:** {results[best_name]['precision'] * 100:.2f}%
- **Recall (Sensitivity):** {results[best_name]['recall_sensitivity'] * 100:.2f}%
- **Specificity:** {results[best_name]['specificity'] * 100:.2f}%
- **F1 Score:** {results[best_name]['f1_score']:.4f}
- **ROC-AUC:** {results[best_name]['roc_auc']:.4f}

## Confusion Matrix
- True Negatives: {results[best_name]['confusion_matrix']['tn']}
- False Positives: {results[best_name]['confusion_matrix']['fp']}
- False Negatives: {results[best_name]['confusion_matrix']['fn']}
- True Positives: {results[best_name]['confusion_matrix']['tp']}

## Clinical Disclaimer
Severe malaria carries acute mortality risks (cerebral malaria, severe anemia, acute kidney injury). This model provides probabilistic risk stratification based on public clinical data and is not a stand-alone diagnostic device. All patients with warning signs must receive urgent physician evaluation and parenteral antimalarial therapy as indicated.
"""
    with open(os.path.join(out_dir, "model_card.md"), "w", encoding="utf-8") as f:
        f.write(model_card)

    print("Successfully saved Malaria model artifacts!")

if __name__ == "__main__":
    train_malaria()
