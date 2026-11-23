"""
MediAgent — Chikungunya Model Trainer
Trains calibrated Random Forest / Gradient Boosting on Brazil SINAN or custom clinical cohort.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(os.path.dirname(SCRIPT_DIR))
sys.path.insert(0, os.path.join(ML_DIR, "common"))

from evaluation import evaluate_classifier
from model_registry import register_disease_model

def train_chikungunya(data_path=None, target_col="target", feature_cols=None, algorithm="Auto"):
    if not data_path:
        data_path = os.path.join(ML_DIR, "data", "chikungunya_clinical.csv")

    if not os.path.exists(data_path):
        return {"status": "ERROR", "message": f"Chikungunya dataset not found at {data_path}"}

    df = pd.read_csv(data_path)

    if not feature_cols:
        feature_cols = [
            'fever', 'myalgia', 'headache', 'rash', 'vomiting',
            'nausea', 'back_pain', 'conjunctivitis', 'arthritis',
            'arthralgia', 'petechiae', 'leukopenia'
        ]

    actual_features = [c for c in feature_cols if c in df.columns and c != target_col]
    if len(actual_features) == 0:
        actual_features = [c for c in df.columns if c != target_col]

    if target_col not in df.columns:
        for candidate in ['target', 'outcome', 'Outcome', 'diagnosis', 'chikungunya', 'label']:
            if candidate in df.columns:
                target_col = candidate
                break

    X = df[actual_features].copy()
    y_raw = df[target_col].dropna()

    if y_raw.dtype == object:
        labels, unique_classes = pd.factorize(y_raw)
        y = pd.Series(labels, index=y_raw.index)
        class_labels = {str(i): str(c) for i, c in enumerate(unique_classes)}
    else:
        y = y_raw.astype(int)
        class_labels = {"0": "Discarded / Febrile Negative Control", "1": "Chikungunya Confirmed"}

    X = X.loc[y.index]
    for col in X.columns:
        if pd.api.types.is_numeric_dtype(X[col]):
            X[col] = X[col].fillna(0).astype(int)
        else:
            X[col] = pd.factorize(X[col].fillna("0"))[0]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    clf = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42, n_jobs=-1)
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    y_proba = clf.predict_proba(X_test)

    eval_metrics = evaluate_classifier(y_test, y_pred, y_proba, class_labels)

    save_dirs = [SCRIPT_DIR, os.path.join(ML_DIR, "models", "chikungunya")]
    for s_dir in save_dirs:
        os.makedirs(s_dir, exist_ok=True)
        joblib.dump(clf, os.path.join(s_dir, "model.joblib"))
        joblib.dump({"feature_cols": actual_features}, os.path.join(s_dir, "preprocessor.joblib"))

        canonical_features = []
        for col in actual_features:
            canonical_features.append({
                "name": col,
                "clinical_label": col.replace("_", " "),
                "data_type": "int",
                "unit": "symptom_flag",
                "required": False,
                "report_synonyms": [col.lower(), col.lower().replace("_", " ")]
            })

        schema_payload = {
            "disease": "chikungunya",
            "model_version": "v1.0.0-chikungunya-sinan",
            "canonical_features": canonical_features
        }
        with open(os.path.join(s_dir, "feature_schema.json"), "w", encoding="utf-8") as f:
            json.dump(schema_payload, f, indent=2)

        metadata = {
            "model_name": "MediAgent Chikungunya Classifier",
            "model_version": "v1.0.0-chikungunya-sinan",
            "algorithm": "Random Forest Classifier",
            "feature_count": len(actual_features),
            "features": actual_features,
            "target_column": target_col,
            "classes": [str(c) for c in eval_metrics["classes"]],
            "class_labels": class_labels,
            "sample_size": len(df),
            "selected_model_test_metrics": eval_metrics
        }
        with open(os.path.join(s_dir, "metadata.json"), "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
        with open(os.path.join(s_dir, "model_metadata.json"), "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

    register_disease_model("chikungunya", {
        "status": "TRAINED",
        "model_type": "tabular",
        "algorithm": "Random Forest Classifier",
        "feature_count": len(actual_features),
        "features": actual_features,
        "target_column": target_col,
        "classes": [str(c) for c in eval_metrics["classes"]],
        "class_labels": class_labels,
        "metrics": eval_metrics,
        "model_version": "v1.0.0-chikungunya-sinan"
    })

    return {
        "status": "SUCCESS",
        "disease": "chikungunya",
        "metrics": eval_metrics,
        "feature_count": len(actual_features),
        "sample_size": len(df)
    }

if __name__ == "__main__":
    data_arg = sys.argv[1] if len(sys.argv) > 1 else None
    res = train_chikungunya(data_arg)
    print(json.dumps(res, indent=2))
