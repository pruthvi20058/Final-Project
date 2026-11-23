"""
MediAgent — Dengue Model Trainer
Trains an empirical Dengue classification model using cross-validation and evaluation metrics.
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
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(os.path.dirname(SCRIPT_DIR))
sys.path.insert(0, os.path.join(ML_DIR, "common"))

from evaluation import evaluate_classifier
from model_registry import register_disease_model

def train_dengue(data_path=None, target_col="Outcome", feature_cols=None, algorithm="Auto"):
    if not data_path:
        data_path = os.path.join(ML_DIR, "data", "dengue_clinical.csv")

    if not os.path.exists(data_path):
        return {"status": "ERROR", "message": f"Dengue dataset not found at {data_path}"}

    df = pd.read_csv(data_path)

    # Encode categorical fields if string
    if 'Gender' in df.columns and df['Gender'].dtype == object:
        df['Gender'] = df['Gender'].map({'Female': 0, 'Male': 1, 'F': 0, 'M': 1}).fillna(0).astype(int)

    if 'Joint_Pain' in df.columns and df['Joint_Pain'].dtype == object:
        df['Joint_Pain'] = df['Joint_Pain'].map({'None': 0, 'Moderate': 1, 'Severe': 2}).fillna(0).astype(int)

    # Determine features
    if not feature_cols:
        feature_cols = [
            'Gender', 'Age', 'NS1', 'IgG', 'IgM', 'Fever_Duration',
            'Body_Temperature', 'Platelet_Count', 'WBC_Count',
            'Joint_Pain', 'Headache', 'Retro_Orbital_Pain', 'Myalgia', 'Rash'
        ]

    actual_features = [c for c in feature_cols if c in df.columns and c != target_col]
    if len(actual_features) == 0:
        actual_features = [c for c in df.columns if c != target_col]

    if target_col not in df.columns:
        # Auto-detect target
        for candidate in ['Outcome', 'outcome', 'Diagnosis', 'diagnosis', 'dengue', 'Dengue', 'label', 'target']:
            if candidate in df.columns:
                target_col = candidate
                break

    X = df[actual_features].copy()
    y_raw = df[target_col].dropna()
    
    # Handle non-integer targets
    if y_raw.dtype == object or str(y_raw.dtype) == 'category':
        labels, unique_classes = pd.factorize(y_raw)
        y = pd.Series(labels, index=y_raw.index)
        class_labels = {str(i): str(c) for i, c in enumerate(unique_classes)}
    else:
        y = y_raw.astype(int)
        class_labels = {"0": "Dengue Negative / Other Febrile Illness", "1": "Dengue Confirmed"}

    # Align X and y indices
    X = X.loc[y.index]

    # Impute missing values with median for numeric columns
    for col in X.columns:
        if pd.api.types.is_numeric_dtype(X[col]):
            X[col] = X[col].fillna(X[col].median())
        else:
            X[col] = pd.factorize(X[col].fillna("Unknown"))[0]

    # Stratified Split 80/20
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # Identify continuous columns for scaling
    cont_candidates = ['Age', 'age', 'Fever_Duration', 'fever_duration', 'Body_Temperature', 'temperature', 'temp', 'Platelet_Count', 'platelets', 'WBC_Count', 'wbc']
    cont_cols = [c for c in actual_features if c in cont_candidates or (X[c].nunique() > 10 and pd.api.types.is_numeric_dtype(X[c]))]

    scaler = StandardScaler()
    if cont_cols:
        scaler.fit(X_train[cont_cols])

    X_train_scaled = X_train.copy()
    X_test_scaled = X_test.copy()
    if cont_cols:
        X_train_scaled[cont_cols] = scaler.transform(X_train[cont_cols])
        X_test_scaled[cont_cols] = scaler.transform(X_test[cont_cols])

    # Select Algorithm
    candidate_clfs = {
        "Random Forest": RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42),
        "HistGradientBoosting": HistGradientBoostingClassifier(max_iter=100, max_depth=4, random_state=42),
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42)
    }

    if algorithm in candidate_clfs:
        best_clf = candidate_clfs[algorithm]
        best_name = algorithm
    else:
        # Auto-selection based on 5-fold CV F1
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        best_f1 = -1
        best_clf = candidate_clfs["Random Forest"]
        best_name = "Random Forest"

        for name, clf in candidate_clfs.items():
            try:
                cv_res = cross_validate(clf, X_train_scaled, y_train, cv=cv, scoring=['f1_macro'])
                mean_f1 = float(cv_res['test_f1_macro'].mean())
                if mean_f1 > best_f1:
                    best_f1 = mean_f1
                    best_clf = clf
                    best_name = name
            except Exception:
                pass

    best_clf.fit(X_train_scaled, y_train)

    y_pred = best_clf.predict(X_test_scaled)
    y_proba = best_clf.predict_proba(X_test_scaled) if hasattr(best_clf, "predict_proba") else None

    eval_metrics = evaluate_classifier(y_test, y_pred, y_proba, class_labels)

    # Save artifacts
    save_dirs = [SCRIPT_DIR, os.path.join(ML_DIR, "models", "dengue")]
    for s_dir in save_dirs:
        os.makedirs(s_dir, exist_ok=True)
        joblib.dump(best_clf, os.path.join(s_dir, "model.joblib"))
        joblib.dump({
            "scaler": scaler,
            "cont_cols": cont_cols,
            "feature_cols": actual_features
        }, os.path.join(s_dir, "preprocessor.joblib"))

        # Generate Canonical Feature Schema
        canonical_features = []
        for col in actual_features:
            is_cont = col in cont_cols
            canonical_features.append({
                "name": col,
                "clinical_label": col.replace("_", " "),
                "data_type": "float" if is_cont else "int",
                "unit": "cells/mcL" if "platelet" in col.lower() or "wbc" in col.lower() else ("°C" if "temp" in col.lower() else "score"),
                "required": False,
                "report_synonyms": [col.lower(), col.lower().replace("_", " ")]
            })

        schema_payload = {
            "disease": "dengue",
            "model_version": "v1.0.0-dengue-clinical",
            "canonical_features": canonical_features
        }
        with open(os.path.join(s_dir, "feature_schema.json"), "w", encoding="utf-8") as f:
            json.dump(schema_payload, f, indent=2)

        metadata = {
            "model_name": f"MediAgent Dengue Classifier ({best_name})",
            "model_version": "v1.0.0-dengue-clinical",
            "algorithm": best_name,
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

    register_disease_model("dengue", {
        "status": "TRAINED",
        "algorithm": best_name,
        "feature_count": len(actual_features),
        "features": actual_features,
        "target_column": target_col,
        "classes": [str(c) for c in eval_metrics["classes"]],
        "class_labels": class_labels,
        "metrics": eval_metrics,
        "model_version": "v1.0.0-dengue-clinical"
    })

    return {
        "status": "SUCCESS",
        "disease": "dengue",
        "algorithm": best_name,
        "metrics": eval_metrics,
        "feature_count": len(actual_features),
        "sample_size": len(df)
    }

if __name__ == "__main__":
    data_arg = sys.argv[1] if len(sys.argv) > 1 else None
    res = train_dengue(data_arg)
    print(json.dumps(res, indent=2))
