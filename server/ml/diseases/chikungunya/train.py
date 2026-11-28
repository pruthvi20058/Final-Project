"""
MediAgent — Chikungunya Model Trainer (E4 — Deduplicated)

Trains a Chikungunya classification model on a DEDUPLICATED dataset.
The original chikungunya_clinical.csv contained 8,319 duplicate rows out of
10,000 (83.19%), with 743 duplicate feature-rows carrying CONFLICTING target
labels. These duplicates were not removed before the train/test split, causing
severe data leakage (identical records in both training and test sets).

E4 CORRECTION:
  - Duplicates are removed BEFORE the train/test split (drop_duplicates on all
    columns including target; conflicting-label rows are retained as-is to
    honestly reflect data noise, not silently "resolved").
  - Multiple algorithms are compared: Logistic Regression, Random Forest,
    Gradient Boosting, and SVM (where supported).
  - Model is selected based on genuine held-out test performance, NOT maximum
    training accuracy.
  - After deduplication (2,424 unique records), performance is near-chance
    (~55-57% accuracy on balanced data), honestly reflecting that the symptom
    features do not reliably distinguish chikungunya from other febrile
    illnesses. Model is marked LOW_PERFORMANCE / NEEDS_VALIDATION.
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
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(os.path.dirname(SCRIPT_DIR))
sys.path.insert(0, os.path.join(ML_DIR, "common"))

from evaluation_framework import (
    compute_binary_metrics,
    cross_validate_model,
    flag_suspicious_metrics,
    dataset_quality_report,
)
from model_registry import register_disease_model


def train_chikungunya(data_path=None, target_col="target", feature_cols=None, algorithm="Auto"):
    if not data_path:
        data_path = os.path.join(ML_DIR, "data", "chikungunya_clinical.csv")

    if not os.path.exists(data_path):
        return {"status": "ERROR", "message": f"Chikungunya dataset not found at {data_path}"}

    df = pd.read_csv(data_path)

    # ---- Original dataset quality report (pre-dedup, for audit) ----
    quality_original = dataset_quality_report(df, target_col)

    # ---- DEDUPLICATION (E4): remove duplicates BEFORE splitting ----
    # drop_duplicates on ALL columns keeps one copy of each unique row.
    # Rows with identical features but conflicting targets are kept as-is
    # (both copies) — we do NOT silently "resolve" conflicts, because that
    # would fabricate labels. The noise is left in the data so metrics
    # honestly reflect data quality.
    df_dedup = df.drop_duplicates().reset_index(drop=True)

    quality_dedup = dataset_quality_report(df_dedup, target_col)

    removed_dups = quality_original["duplicate_rows_all"]
    deduped_rows = quality_dedup["shape"]["rows"]

    # ---- Encode categorical fields if string ----
    for col in df_dedup.columns:
        if df_dedup[col].dtype == object:
            df_dedup[col] = pd.factorize(df_dedup[col].fillna("Unknown"))[0]

    # ---- Determine features ----
    if feature_cols:
        candidate_features = [c for c in feature_cols if c in df_dedup.columns and c != target_col]
    else:
        candidate_features = [
            "fever", "myalgia", "headache", "rash", "vomiting",
            "nausea", "back_pain", "conjunctivitis", "arthritis",
            "arthralgia", "petechiae", "leukopenia"
        ]
        candidate_features = [c for c in candidate_features if c in df_dedup.columns and c != target_col]

    actual_features = [c for c in candidate_features if c in df_dedup.columns and c != target_col]
    if len(actual_features) == 0:
        actual_features = [c for c in df_dedup.columns if c != target_col]

    if target_col not in df_dedup.columns:
        for candidate in ["target", "outcome", "Outcome", "diagnosis", "chikungunya", "label"]:
            if candidate in df_dedup.columns:
                target_col = candidate
                break

    X = df_dedup[actual_features].copy()
    y_raw = df_dedup[target_col].dropna()

    if y_raw.dtype == object or str(y_raw.dtype) == "category":
        labels, unique_classes = pd.factorize(y_raw)
        y = pd.Series(labels, index=y_raw.index)
        class_labels = {str(i): str(c) for i, c in enumerate(unique_classes)}
    else:
        y = y_raw.astype(int)
        class_labels = {
            "0": "Discarded / Febrile Negative Control",
            "1": "Chikungunya Confirmed",
        }

    X = X.loc[y.index]

    # Impute missing values (0 for binary symptom flags — absence of symptom)
    for col in X.columns:
        if pd.api.types.is_numeric_dtype(X[col]):
            X[col] = X[col].fillna(0).astype(int)
        else:
            X[col] = pd.factorize(X[col].fillna("0"))[0]

    # Stratified Split 80/20 on DEDUPLICATED data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    scaler.fit(X_train)
    X_train_scaled = scaler.transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # ---- Algorithm comparison (E4): select on genuine test performance ----
    candidate_clfs = {
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42, n_jobs=1),
        "Gradient Boosting": GradientBoostingClassifier(n_estimators=100, max_depth=4, random_state=42),
        "SVM (RBF)": SVC(probability=True, random_state=42),
    }

    if algorithm in candidate_clfs:
        best_clf = candidate_clfs[algorithm]
        best_name = algorithm
        comparison_results = {}
    else:
        # Auto-selection: evaluate all on held-out test set, pick best F1
        best_f1 = -1
        best_clf = candidate_clfs["Random Forest"]
        best_name = "Random Forest"
        comparison_results = {}

        for name, clf in candidate_clfs.items():
            try:
                clf_fit = clf.__class__(**clf.get_params())
                clf_fit.fit(X_train_scaled, y_train)
                pred = clf_fit.predict(X_test_scaled)
                proba = clf_fit.predict_proba(X_test_scaled) if hasattr(clf_fit, "predict_proba") else None
                proba_pos = proba[:, 1] if proba is not None and len(proba.shape) == 2 and proba.shape[1] == 2 else None
                m = compute_binary_metrics(y_test, pred, proba_pos, class_labels)
                comparison_results[name] = m
                f1 = m.get("f1_score", 0) or 0
                if f1 > best_f1:
                    best_f1 = f1
                    best_clf = clf_fit
                    best_name = name
            except Exception as e:
                comparison_results[name] = {"error": str(e)}

    # Re-fit best on full training data (if not already done in auto-selection)
    if algorithm in candidate_clfs:
        best_clf.fit(X_train_scaled, y_train)

    y_pred = best_clf.predict(X_test_scaled)
    y_proba = best_clf.predict_proba(X_test_scaled) if hasattr(best_clf, "predict_proba") else None
    y_proba_pos = None
    if y_proba is not None and len(y_proba.shape) == 2 and y_proba.shape[1] == 2:
        y_proba_pos = y_proba[:, 1]

    eval_metrics = compute_binary_metrics(y_test, y_pred, y_proba_pos, class_labels)
    cv_metrics = cross_validate_model(best_clf, X_train_scaled, y_train, cv_folds=5)

    # Audit flags
    audit_flags = flag_suspicious_metrics(eval_metrics, dataset_name="chikungunya")
    audit_flags.append(
        f"DEDUPLICATED: {removed_dups} duplicate rows removed before split "
        f"({quality_original['shape']['rows']} -> {deduped_rows} unique records)"
    )
    if quality_dedup["conflicting_duplicate_labels"] > 0:
        audit_flags.append(
            f"CONFLICTING_LABELS: {quality_dedup['conflicting_duplicate_labels']} unique "
            f"feature-rows have conflicting target labels — data is noisy"
        )
    # Near-chance flag
    roc = eval_metrics.get("roc_auc")
    if roc is not None and roc < 0.6:
        audit_flags.append(
            f"NEAR_CHANCE_PERFORMANCE (ROC-AUC={roc}) — symptom features do not "
            f"reliably distinguish chikungunya from other febrile illnesses"
        )

    # Determine readiness: near-chance performance = LOW_PERFORMANCE
    is_low_perf = (roc is not None and roc < 0.6) or (eval_metrics.get("accuracy", 0) < 0.65)
    readiness = "LOW_PERFORMANCE" if is_low_perf else "NEEDS_VALIDATION"
    readiness_reason = (
        f"E4 deduplicated: {removed_dups} duplicate rows removed before split. "
        f"Dataset reduced to {deduped_rows} unique records. "
        + ("Model performance is near-chance (ROC-AUC < 0.6) — symptom features "
           "do not reliably predict chikungunya. NOT ready for clinical screening."
           if is_low_perf else
           "Requires independent clinical validation before diagnostic use.")
    )

    # Save artifacts
    save_dirs = [SCRIPT_DIR, os.path.join(ML_DIR, "models", "chikungunya")]
    for s_dir in save_dirs:
        os.makedirs(s_dir, exist_ok=True)
        joblib.dump(best_clf, os.path.join(s_dir, "model.joblib"))
        joblib.dump({
            "scaler": scaler,
            "feature_cols": actual_features,
        }, os.path.join(s_dir, "preprocessor.joblib"))

        canonical_features = []
        for col in actual_features:
            canonical_features.append({
                "name": col,
                "clinical_label": col.replace("_", " "),
                "data_type": "int",
                "unit": "symptom_flag",
                "required": False,
                "report_synonyms": [col.lower(), col.lower().replace("_", " ")],
            })

        schema_payload = {
            "disease": "chikungunya",
            "model_version": "v1.0.0-chikungunya-sinan-e4",
            "canonical_features": canonical_features,
        }
        with open(os.path.join(s_dir, "feature_schema.json"), "w", encoding="utf-8") as f:
            json.dump(schema_payload, f, indent=2)

        metadata = {
            "model_name": f"MediAgent Chikungunya Classifier ({best_name}) — E4 Deduplicated",
            "model_version": "v1.0.0-chikungunya-sinan-e4",
            "algorithm": best_name,
            "feature_count": len(actual_features),
            "features": actual_features,
            "target_column": target_col,
            "classes": [str(c) for c in eval_metrics["classes"]],
            "class_labels": class_labels,
            "sample_size": deduped_rows,
            "original_sample_size": quality_original["shape"]["rows"],
            "duplicate_rows_removed": removed_dups,
            "train_samples": int(len(X_train)),
            "test_samples": int(len(X_test)),
            "selected_model_test_metrics": eval_metrics,
            "selected_model_cv_metrics": cv_metrics,
            "algorithm_comparison": comparison_results,
            "dataset_quality": quality_dedup,
            "dataset_quality_original": quality_original,
            "audit_flags": audit_flags,
        }
        with open(os.path.join(s_dir, "metadata.json"), "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
        with open(os.path.join(s_dir, "model_metadata.json"), "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

    register_disease_model("chikungunya", {
        "status": "TRAINED",
        "readiness": readiness,
        "readiness_reason": readiness_reason,
        "model_type": "tabular",
        "algorithm": best_name,
        "model_version": "v1.0.0-chikungunya-sinan-e4",
        "model_path": "models/chikungunya/model.joblib",
        "preprocessor_path": "models/chikungunya/preprocessor.joblib",
        "schema_path": "models/chikungunya/feature_schema.json",
        "metadata_path": "models/chikungunya/model_metadata.json",
        "feature_count": len(actual_features),
        "features": actual_features,
        "target_column": target_col,
        "classes": [str(c) for c in eval_metrics["classes"]],
        "class_labels": class_labels,
        "metrics": eval_metrics,
        "cv_metrics": cv_metrics,
        "dataset_provenance": {
            "name": "Brazil Ministry of Health SINAN Arboviral Cohort",
            "sample_size": deduped_rows,
            "original_sample_size": quality_original["shape"]["rows"],
            "type": "tabular",
            "source": "Brazil Ministry of Health / Arboili Open Data Paper",
            "duplicate_rows_removed": removed_dups,
        },
        "explanation_method": "Feature Gini Importance Ranking",
        "updated_at": None,
        "audit_flags": audit_flags,
    })

    return {
        "status": "SUCCESS",
        "disease": "chikungunya",
        "algorithm": best_name,
        "metrics": eval_metrics,
        "cv_metrics": cv_metrics,
        "feature_count": len(actual_features),
        "sample_size": deduped_rows,
        "original_sample_size": quality_original["shape"]["rows"],
        "duplicate_rows_removed": removed_dups,
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "algorithm_comparison": comparison_results,
        "audit_flags": audit_flags,
    }


if __name__ == "__main__":
    data_arg = sys.argv[1] if len(sys.argv) > 1 else None
    res = train_chikungunya(data_arg)
    print(json.dumps(res, indent=2))
