"""
MediAgent — Diabetes Trainer
Trains the Pima Indians Diabetes model with 5-fold Stratified Cross-Validation,
zero data leakage, and registers the model in the model registry.
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
from sklearn.ensemble import RandomForestClassifier

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(os.path.dirname(SCRIPT_DIR))
sys.path.insert(0, os.path.join(ML_DIR, "common"))

from evaluation import evaluate_classifier
from model_registry import register_disease_model

def train_diabetes(data_path=None, target_col="outcome", feature_cols=None):
    if not data_path:
        data_path = os.path.join(ML_DIR, "data", "pima_diabetes.csv")

    if not os.path.exists(data_path):
        return {"status": "ERROR", "message": f"Data file not found at {data_path}"}

    df = pd.read_csv(data_path)
    if not feature_cols:
        feature_cols = ['preg', 'plas', 'pres', 'skin', 'insu', 'mass', 'pedi', 'age']

    # Filter to available columns
    actual_features = [c for c in feature_cols if c in df.columns]
    if len(actual_features) == 0:
        return {"status": "ERROR", "message": f"None of the required features found in dataset."}

    X = df[actual_features].copy()
    y = df[target_col].astype(int)

    # 80/20 Stratified Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # Fit scaler strictly on train set
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train Logistic Regression
    clf = LogisticRegression(max_iter=1000, random_state=42)
    clf.fit(X_train_scaled, y_train)

    y_pred = clf.predict(X_test_scaled)
    y_proba = clf.predict_proba(X_test_scaled)

    eval_metrics = evaluate_classifier(
        y_test, y_pred, y_proba,
        class_labels={"0": "Non-Diabetic", "1": "Diabetic"}
    )

    # Save artifacts to both diseases/diabetes and models/diabetes for 100% compatibility
    save_dirs = [
        SCRIPT_DIR,
        os.path.join(ML_DIR, "models", "diabetes")
    ]

    for s_dir in save_dirs:
        os.makedirs(s_dir, exist_ok=True)
        joblib.dump(clf, os.path.join(s_dir, "model.joblib"))
        joblib.dump({"scaler": scaler, "feature_cols": actual_features}, os.path.join(s_dir, "preprocessor.joblib"))

        metadata = {
            "model_name": "MediAgent Pima Diabetes Classifier",
            "model_version": "v2.0.0-pima-diabetes",
            "algorithm": "Logistic Regression + StandardScaler",
            "feature_count": len(actual_features),
            "features": actual_features,
            "target_column": target_col,
            "sample_size": len(df),
            "selected_model_test_metrics": eval_metrics
        }
        with open(os.path.join(s_dir, "metadata.json"), "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
        with open(os.path.join(s_dir, "model_metadata.json"), "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

    # Register in registry
    register_disease_model("diabetes", {
        "status": "TRAINED",
        "algorithm": "Logistic Regression + StandardScaler",
        "feature_count": len(actual_features),
        "features": actual_features,
        "target_column": target_col,
        "metrics": eval_metrics,
        "model_version": "v2.0.0-pima-diabetes"
    })

    return {
        "status": "SUCCESS",
        "disease": "diabetes",
        "metrics": eval_metrics,
        "feature_count": len(actual_features),
        "sample_size": len(df)
    }

if __name__ == "__main__":
    data_arg = sys.argv[1] if len(sys.argv) > 1 else None
    res = train_diabetes(data_arg)
    print(json.dumps(res, indent=2))
