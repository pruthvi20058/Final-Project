"""
MediAgent — Dengue Model Trainer (E4 — Leakage-Corrected)

Trains an empirical Dengue classification model using cross-validation and
evaluation metrics. Target-leakage features are excluded before training.
All metrics are computed on held-out test data only; training accuracy is
never reported as test accuracy.

DATA LEAKAGE CORRECTION (E4):
  - The original pipeline included 'IgG' (Dengue IgG Antibody) as a feature.
    Audit found IgG=0 always maps to Outcome=0 and IgG=1 always maps to
    Outcome=1 (perfect target leakage), producing 100.0% metrics across
    all algorithms.
  - RATIONALE FOR EXCLUDING IgG: IgG antibodies indicate PAST dengue
    exposure, not current acute infection. Using IgG to diagnose current
    dengue is a temporal leakage — the feature encodes information about
    a prior infection that is not available at the point of acute
    diagnosis. It is EXCLUDED from training and inference.
  - NS1 (acute-phase antigen) is RETAINED: it is a legitimate, clinically
    recommended marker for early dengue diagnosis (WHO/TDR guidance).
  - Even after IgG exclusion, this dataset shows near-perfect separation
    (serology/hematology markers strongly determine outcome). Metrics are
    reported honestly and the model is flagged DATA_LEAKAGE_SUSPECTED /
    NEEDS_VALIDATION — NOT ready for clinical screening until independently
    validated on a dataset without serology-derived target leakage.
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

from evaluation_framework import (
    compute_binary_metrics,
    cross_validate_model,
    flag_suspicious_metrics,
    dataset_quality_report,
    check_target_leakage,
)
from model_registry import register_disease_model

# Features excluded due to target leakage — never used for training/inference
# IgG = past infection marker (temporal leakage); excluded per E4 audit
LEAKAGE_EXCLUDED_FEATURES = ["IgG"]


def train_dengue(data_path=None, target_col="Outcome", feature_cols=None, algorithm="Auto"):
    if not data_path:
        data_path = os.path.join(ML_DIR, "data", "dengue_clinical.csv")

    if not os.path.exists(data_path):
        return {"status": "ERROR", "message": f"Dengue dataset not found at {data_path}"}

    df = pd.read_csv(data_path)

    # ---- Dataset quality report (for audit / Dataset Studio) ----
    quality = dataset_quality_report(df, target_col)

    # ---- Encode categorical fields if string ----
    if "Gender" in df.columns and df["Gender"].dtype == object:
        df["Gender"] = df["Gender"].map({"Female": 0, "Male": 1, "F": 0, "M": 1}).fillna(0).astype(int)

    if "Joint_Pain" in df.columns and df["Joint_Pain"].dtype == object:
        df["Joint_Pain"] = df["Joint_Pain"].map({"None": 0, "Moderate": 1, "Severe": 2}).fillna(0).astype(int)

    # ---- Define candidate features (all columns except target) ----
    if feature_cols:
        candidate_features = [c for c in feature_cols if c in df.columns and c != target_col]
    else:
        candidate_features = [
            "Gender", "Age", "NS1", "IgG", "IgM", "Fever_Duration",
            "Body_Temperature", "Platelet_Count", "WBC_Count",
            "Joint_Pain", "Headache", "Retro_Orbital_Pain", "Myalgia", "Rash"
        ]
        candidate_features = [c for c in candidate_features if c in df.columns and c != target_col]

    # ---- Target leakage detection (audit only; exclusion list is explicit) ----
    leakage_evidence = check_target_leakage(df, target_col, candidate_features)

    # Explicit exclusion: only IgG is removed for temporal leakage.
    # Other flagged features (NS1, Fever_Duration, etc.) are legitimate clinical
    # markers and are retained; their presence is noted in audit flags.
    excluded_features = [f for f in LEAKAGE_EXCLUDED_FEATURES if f in candidate_features]
    actual_features = [c for c in candidate_features if c not in excluded_features]

    if len(actual_features) == 0:
        actual_features = [c for c in df.columns if c != target_col]
        excluded_features = []

    if target_col not in df.columns:
        for candidate in ["Outcome", "outcome", "Diagnosis", "diagnosis", "dengue", "Dengue", "label", "target"]:
            if candidate in df.columns:
                target_col = candidate
                break

    X = df[actual_features].copy()
    y_raw = df[target_col].dropna()

    if y_raw.dtype == object or str(y_raw.dtype) == "category":
        labels, unique_classes = pd.factorize(y_raw)
        y = pd.Series(labels, index=y_raw.index)
        class_labels = {str(i): str(c) for i, c in enumerate(unique_classes)}
    else:
        y = y_raw.astype(int)
        class_labels = {"0": "Dengue Negative / Other Febrile Illness", "1": "Dengue Confirmed"}

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
    cont_candidates = [
        "Age", "age", "Fever_Duration", "fever_duration",
        "Body_Temperature", "temperature", "temp",
        "Platelet_Count", "platelets", "WBC_Count", "wbc"
    ]
    cont_cols = [
        c for c in actual_features
        if c in cont_candidates or (X[c].nunique() > 10 and pd.api.types.is_numeric_dtype(X[c]))
    ]

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
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
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
                cv_res = cross_validate(clf, X_train_scaled, y_train, cv=cv, scoring=["f1_macro"])
                mean_f1 = float(cv_res["test_f1_macro"].mean())
                if mean_f1 > best_f1:
                    best_f1 = mean_f1
                    best_clf = clf
                    best_name = name
            except Exception:
                pass

    best_clf.fit(X_train_scaled, y_train)

    y_pred = best_clf.predict(X_test_scaled)
    y_proba = best_clf.predict_proba(X_test_scaled) if hasattr(best_clf, "predict_proba") else None

    y_proba_pos = None
    if y_proba is not None and len(y_proba.shape) == 2 and y_proba.shape[1] == 2:
        y_proba_pos = y_proba[:, 1]

    eval_metrics = compute_binary_metrics(y_test, y_pred, y_proba_pos, class_labels)

    # Cross-validation on training data only
    cv_metrics = cross_validate_model(best_clf, X_train_scaled, y_train, cv_folds=5)

    # Suspicious-metric flags
    audit_flags = flag_suspicious_metrics(eval_metrics, dataset_name="dengue")
    if excluded_features:
        audit_flags.append(
            f"TARGET_LEAKAGE_REMOVED: {', '.join(excluded_features)} excluded "
            f"(IgG = past-infection marker, temporal leakage — see DATASET_AUDIT.md)"
        )
    # Note remaining leakage-risk features that were retained
    retained_leakage_risk = [
        ev["feature"] for ev in leakage_evidence
        if ev["feature"] not in excluded_features
    ]
    if retained_leakage_risk:
        audit_flags.append(
            f"LEAKAGE_RISK_RETAINED: {', '.join(retained_leakage_risk)} — legitimate "
            f"clinical markers but strong target association; metrics may be optimistic"
        )
    if quality["duplicate_rows_excluding_target"] > 0:
        audit_flags.append(
            f"DUPLICATE_ROWS: {quality['duplicate_rows_excluding_target']} duplicate "
            f"rows detected (excluding target)"
        )
    if quality["conflicting_duplicate_labels"] > 0:
        audit_flags.append(
            f"CONFLICTING_LABELS: {quality['conflicting_duplicate_labels']} duplicate "
            f"feature-rows have conflicting target labels"
        )

    # Determine readiness: if metrics are suspiciously perfect, NOT ready
    is_suspicious = any("PERFECT_METRICS_SUSPICIOUS" in f for f in audit_flags)
    readiness = "DATA_LEAKAGE_SUSPECTED" if is_suspicious else "NEEDS_VALIDATION"
    readiness_reason = (
        "E4 leakage-corrected: IgG (past-infection marker) removed. "
        "Metrics re-computed on held-out test set. "
        + ("Suspicious near-perfect metrics persist — dataset may have residual "
           "serology-derived target separation. NOT ready for clinical screening."
           if is_suspicious else
           "Requires independent clinical validation before diagnostic use.")
    )

    # Save artifacts
    save_dirs = [SCRIPT_DIR, os.path.join(ML_DIR, "models", "dengue")]
    for s_dir in save_dirs:
        os.makedirs(s_dir, exist_ok=True)
        joblib.dump(best_clf, os.path.join(s_dir, "model.joblib"))
        joblib.dump({
            "scaler": scaler,
            "cont_cols": cont_cols,
            "feature_cols": actual_features,
            "excluded_features": excluded_features,
        }, os.path.join(s_dir, "preprocessor.joblib"))

        # Canonical feature schema (leaked features marked as excluded)
        canonical_features = []
        for col in actual_features:
            is_cont = col in cont_cols
            canonical_features.append({
                "name": col,
                "clinical_label": col.replace("_", " "),
                "data_type": "float" if is_cont else "int",
                "unit": "cells/mcL" if "platelet" in col.lower() or "wbc" in col.lower() else ("°C" if "temp" in col.lower() else "score"),
                "required": False,
                "report_synonyms": [col.lower(), col.lower().replace("_", " ")],
            })
        for col in excluded_features:
            canonical_features.append({
                "name": col,
                "clinical_label": col.replace("_", " "),
                "data_type": "int",
                "unit": "score",
                "required": False,
                "report_synonyms": [col.lower(), col.lower().replace("_", " ")],
                "excluded_due_to_leakage": True,
            })

        schema_payload = {
            "disease": "dengue",
            "model_version": "v1.0.0-dengue-clinical-e4",
            "canonical_features": canonical_features,
            "leakage_excluded_features": excluded_features,
        }
        with open(os.path.join(s_dir, "feature_schema.json"), "w", encoding="utf-8") as f:
            json.dump(schema_payload, f, indent=2)

        metadata = {
            "model_name": f"MediAgent Dengue Classifier ({best_name}) — E4 Leakage-Corrected",
            "model_version": "v1.0.0-dengue-clinical-e4",
            "algorithm": best_name,
            "feature_count": len(actual_features),
            "features": actual_features,
            "excluded_features": excluded_features,
            "target_column": target_col,
            "classes": [str(c) for c in eval_metrics["classes"]],
            "class_labels": class_labels,
            "sample_size": len(df),
            "train_samples": int(len(X_train)),
            "test_samples": int(len(X_test)),
            "selected_model_test_metrics": eval_metrics,
            "selected_model_cv_metrics": cv_metrics,
            "dataset_quality": quality,
            "leakage_evidence": leakage_evidence,
            "audit_flags": audit_flags,
        }
        with open(os.path.join(s_dir, "metadata.json"), "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
        with open(os.path.join(s_dir, "model_metadata.json"), "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

    register_disease_model("dengue", {
        "status": "TRAINED",
        "readiness": readiness,
        "readiness_reason": readiness_reason,
        "model_type": "tabular",
        "algorithm": best_name,
        "model_version": "v1.0.0-dengue-clinical-e4",
        "model_path": "models/dengue/model.joblib",
        "preprocessor_path": "models/dengue/preprocessor.joblib",
        "schema_path": "models/dengue/feature_schema.json",
        "metadata_path": "models/dengue/model_metadata.json",
        "feature_count": len(actual_features),
        "features": actual_features,
        "excluded_features": excluded_features,
        "target_column": target_col,
        "classes": [str(c) for c in eval_metrics["classes"]],
        "class_labels": class_labels,
        "metrics": eval_metrics,
        "cv_metrics": cv_metrics,
        "dataset_provenance": {
            "name": "Dengue Clinical Hematology & Serology Cohort",
            "sample_size": len(df),
            "type": "tabular",
            "source": "Kaggle Clinical Dengue Detection / wahiduzzaman1511-ai (unverified)",
        },
        "explanation_method": "Feature Importances / Risk Coefficients",
        "updated_at": None,
        "audit_flags": audit_flags,
    })

    return {
        "status": "SUCCESS",
        "disease": "dengue",
        "algorithm": best_name,
        "metrics": eval_metrics,
        "cv_metrics": cv_metrics,
        "feature_count": len(actual_features),
        "excluded_features": excluded_features,
        "leakage_evidence": leakage_evidence,
        "sample_size": len(df),
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "audit_flags": audit_flags,
    }


if __name__ == "__main__":
    data_arg = sys.argv[1] if len(sys.argv) > 1 else None
    res = train_dengue(data_arg)
    print(json.dumps(res, indent=2))
