"""
MediAgent — Typhoid Model Trainer
Trains an empirical Typhoid fever classification model using blood culture and clinical serology.
Registers artifacts and feature schema in the Model Registry.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(os.path.dirname(SCRIPT_DIR))
sys.path.insert(0, os.path.join(ML_DIR, "common"))

from evaluation import evaluate_classifier
from model_registry import register_disease_model

def train_typhoid(data_path=None, target_col="typhoid_diagnosis", feature_cols=None, algorithm="Auto"):
    if not data_path:
        data_path = os.path.join(ML_DIR, "data", "typhoid_clinical.csv")

    if not os.path.exists(data_path):
        return {"status": "ERROR", "message": f"Typhoid clinical dataset not found at {data_path}"}

    df = pd.read_csv(data_path)

    if not feature_cols:
        feature_cols = [
            'fever_duration', 'body_temperature', 'headache', 'abdominal_pain',
            'weakness', 'diarrhea', 'constipation', 'widal_to', 'widal_th',
            'blood_culture', 'wbc_count', 'platelet_count', 'hepatomegaly', 'splenomegaly'
        ]

    actual_features = [c for c in feature_cols if c in df.columns and c != target_col]
    if len(actual_features) == 0:
        actual_features = [c for c in df.columns if c != target_col]

    if target_col not in df.columns:
        for candidate in ['typhoid_diagnosis', 'typhoid_status', 'typhoid', 'Outcome', 'outcome', 'diagnosis', 'target']:
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
        class_labels = {"0": "Typhoid Negative / Non-Enteric Febrile Illness", "1": "Typhoid Enteric Fever Confirmed"}

    X = X.loc[y.index]
    for col in X.columns:
        if pd.api.types.is_numeric_dtype(X[col]):
            X[col] = X[col].fillna(X[col].median())
        else:
            X[col] = pd.factorize(X[col].fillna("Unknown"))[0]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    cont_candidates = ['fever_duration', 'body_temperature', 'temperature', 'temp', 'wbc_count', 'wbc', 'platelet_count', 'platelets', 'widal_to', 'widal_th']
    cont_cols = [c for c in actual_features if c in cont_candidates or (X[c].nunique() > 10 and pd.api.types.is_numeric_dtype(X[c]))]

    scaler = StandardScaler()
    if cont_cols:
        scaler.fit(X_train[cont_cols])

    X_train_scaled = X_train.copy()
    X_test_scaled = X_test.copy()
    if cont_cols:
        X_train_scaled[cont_cols] = scaler.transform(X_train[cont_cols])
        X_test_scaled[cont_cols] = scaler.transform(X_test[cont_cols])

    clf = GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, max_depth=4, random_state=42)
    clf.fit(X_train_scaled, y_train)

    y_pred = clf.predict(X_test_scaled)
    y_proba = clf.predict_proba(X_test_scaled)

    eval_metrics = evaluate_classifier(y_test, y_pred, y_proba, class_labels)

    save_dirs = [SCRIPT_DIR, os.path.join(ML_DIR, "models", "typhoid")]
    for s_dir in save_dirs:
        os.makedirs(s_dir, exist_ok=True)
        joblib.dump(clf, os.path.join(s_dir, "model.joblib"))
        joblib.dump({
            "scaler": scaler,
            "cont_cols": cont_cols,
            "feature_cols": actual_features
        }, os.path.join(s_dir, "preprocessor.joblib"))

        canonical_features = []
        for col in actual_features:
            is_cont = col in cont_cols
            canonical_features.append({
                "name": col,
                "clinical_label": col.replace("_", " "),
                "data_type": "float" if is_cont else "int",
                "unit": "days" if "duration" in col.lower() else ("°C" if "temp" in col.lower() else ("cells/mcL" if "count" in col.lower() else "score")),
                "required": False,
                "report_synonyms": [col.lower(), col.lower().replace("_", " ")]
            })

        schema_payload = {
            "disease": "typhoid",
            "model_version": "v1.0.0-typhoid-clinical",
            "canonical_features": canonical_features
        }
        with open(os.path.join(s_dir, "feature_schema.json"), "w", encoding="utf-8") as f:
            json.dump(schema_payload, f, indent=2)

        metadata = {
            "model_name": "MediAgent Typhoid Classifier",
            "model_version": "v1.0.0-typhoid-clinical",
            "algorithm": "GradientBoostingClassifier + StandardScaler",
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

    register_disease_model("typhoid", {
        "status": "TRAINED",
        "model_type": "tabular",
        "algorithm": "GradientBoostingClassifier + StandardScaler",
        "feature_count": len(actual_features),
        "features": actual_features,
        "target_column": target_col,
        "classes": [str(c) for c in eval_metrics["classes"]],
        "class_labels": class_labels,
        "metrics": eval_metrics,
        "model_version": "v1.0.0-typhoid-clinical"
    })

    return {
        "status": "SUCCESS",
        "disease": "typhoid",
        "metrics": eval_metrics,
        "feature_count": len(actual_features),
        "sample_size": len(df)
    }

if __name__ == "__main__":
    data_arg = sys.argv[1] if len(sys.argv) > 1 else None
    res = train_typhoid(data_arg)
    print(json.dumps(res, indent=2))
