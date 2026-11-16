import os
import sys
import json
import numpy as np
import pandas as pd
import joblib

# Ensure UTF-8 output encoding for Windows environment compatibility
sys.stdout.reconfigure(encoding='utf-8')

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, brier_score_loss
)

print("----------------------------------------------------------------------")
print("🤖 MediAgent — Training Legitimate Clinical ML Diabetes Classifier")
print("----------------------------------------------------------------------")

# 1. Load Legitimate Pima Indians Diabetes Dataset
script_dir = os.path.dirname(os.path.abspath(__file__))
data_path = os.path.join(script_dir, "data", "pima_diabetes.csv")

if not os.path.exists(data_path):
    raise FileNotFoundError(f"Legitimate dataset not found at {data_path}. Please run dataset setup first.")

df = pd.read_csv(data_path)
print(f"📦 Loaded {len(df)} authentic clinical records from Pima Indians Diabetes Dataset.")

FEATURE_COLS = ['preg', 'plas', 'pres', 'skin', 'insu', 'mass', 'pedi', 'age']
TARGET_COL = 'outcome'

# 2. Leakage & Integrity Audit
duplicate_rows = int(df.duplicated().sum())
print(f"🔍 Data Integrity Audit: Duplicate rows detected = {duplicate_rows}")

X = df[FEATURE_COLS]
y = df[TARGET_COL]

print(f"📊 Class Distribution: Negative (0) = {int((y == 0).sum())}, Positive (1) = {int((y == 1).sum())}")

# 3. Stratified 80/20 Train/Test Split (Prevent Leakage)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42, stratify=y
)

print(f"✂️ Split: {len(X_train)} train samples (80%), {len(X_test)} test samples (20%).")

# 4. Standard Scaler (Fitted STRICTLY on X_train only to prevent Preprocessing Leakage)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# 5. Define Candidate Models for Comparison
candidate_models = {
    "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
    "Random Forest": RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42),
    "Gradient Boosting": GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, max_depth=3, random_state=42)
}

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
model_results = {}

print("\n--- 🔬 5-FOLD STRATIFIED CROSS-VALIDATION & MODEL COMPARISON ---")

best_model_name = None
best_model_obj = None
best_cv_f1 = -1.0

for name, clf in candidate_models.items():
    # Evaluate with 5-fold CV on training split
    cv_scores = cross_validate(
        clf, X_train_scaled, y_train, cv=cv,
        scoring=['accuracy', 'precision', 'recall', 'f1', 'roc_auc']
    )
    
    cv_acc_mean = float(cv_scores['test_accuracy'].mean())
    cv_acc_std = float(cv_scores['test_accuracy'].std())
    cv_f1_mean = float(cv_scores['test_f1'].mean())
    cv_roc_mean = float(cv_scores['test_roc_auc'].mean())
    
    # Train model on full X_train_scaled
    clf.fit(X_train_scaled, y_train)
    
    # Evaluate on Held-Out Test Set
    y_pred = clf.predict(X_test_scaled)
    y_proba = clf.predict_proba(X_test_scaled)[:, 1]
    
    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0)) # Sensitivity
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    roc_auc = float(roc_auc_score(y_test, y_proba))
    brier = float(brier_score_loss(y_test, y_proba))
    
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()
    spec = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0 # Specificity
    
    model_results[name] = {
        "cv_metrics": {
            "cv_accuracy_mean": round(cv_acc_mean, 4),
            "cv_accuracy_std": round(cv_acc_std, 4),
            "cv_f1_mean": round(cv_f1_mean, 4),
            "cv_roc_auc_mean": round(cv_roc_mean, 4)
        },
        "test_metrics": {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall_sensitivity": round(rec, 4),
            "specificity": round(spec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(roc_auc, 4),
            "brier_score": round(brier, 4)
        },
        "confusion_matrix": {
            "tn": int(tn),
            "fp": int(fp),
            "fn": int(fn),
            "tp": int(tp)
        }
    }
    
    print(f"\n🔹 Model: {name}")
    print(f"   CV Acc Mean: {cv_acc_mean*100:.2f}% (+/- {cv_acc_std*100:.2f}%) | CV F1: {cv_f1_mean:.4f}")
    print(f"   Test Acc: {acc*100:.2f}% | Sensitivity: {rec*100:.2f}% | Specificity: {spec*100:.2f}% | F1: {f1:.4f} | ROC-AUC: {roc_auc:.4f}")
    
    if cv_f1_mean > best_cv_f1:
        best_cv_f1 = cv_f1_mean
        best_model_name = name
        best_model_obj = clf

print(f"\n🏆 Selected Top Model based on Cross-Validation: {best_model_name}")

# 6. Save Versioned Artifacts
output_dir = os.path.join(script_dir, "models", "diabetes")
os.makedirs(output_dir, exist_ok=True)

model_path = os.path.join(output_dir, "model.joblib")
preprocessor_path = os.path.join(output_dir, "preprocessor.joblib")
schema_path = os.path.join(output_dir, "feature_schema.json")
metadata_path = os.path.join(output_dir, "model_metadata.json")

# Export model & scaler
joblib.dump(best_model_obj, model_path)
joblib.dump({"scaler": scaler, "feature_cols": FEATURE_COLS}, preprocessor_path)

# Feature Schema definition
schema_data = {
    "model_type": "binary_classification",
    "target_name": "diabetes_screening_risk",
    "required_features": ["plas", "mass", "age"],
    "optional_features": ["preg", "pres", "skin", "insu", "pedi"],
    "feature_units": {
        "preg": "count",
        "plas": "mg/dL",
        "pres": "mmHg",
        "skin": "mm",
        "insu": "uU/mL",
        "mass": "kg/m2",
        "pedi": "score",
        "age": "years"
    },
    "feature_bounds": {
        "preg": {"min": 0, "max": 20, "default": 1},
        "plas": {"min": 40, "max": 500, "default": 120},
        "pres": {"min": 40, "max": 200, "default": 70},
        "skin": {"min": 0, "max": 99, "default": 20},
        "insu": {"min": 0, "max": 900, "default": 80},
        "mass": {"min": 10.0, "max": 80.0, "default": 32.0},
        "pedi": {"min": 0.05, "max": 3.0, "default": 0.47},
        "age": {"min": 18, "max": 120, "default": 33}
    }
}

with open(schema_path, "w", encoding="utf-8") as f:
    json.dump(schema_data, f, indent=2)

# Model Metadata export
metadata_data = {
    "model_name": f"MediAgent Pima Diabetes Classifier ({best_model_name})",
    "model_version": "v2.0.0-pima-diabetes",
    "algorithm": best_model_name,
    "dataset_provenance": {
        "name": "Pima Indians Diabetes Dataset",
        "source": "UCI Machine Learning Repository / OpenML (Dataset ID 37)",
        "publication": "Smith et al. (1988), ADAP learning algorithm study",
        "records_total": len(df),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "synthetic_data_used": False
    },
    "leakage_audit": {
        "duplicate_rows_detected": duplicate_rows,
        "scaler_fitted_on_train_only": True,
        "stratified_split": True,
        "random_seed": 42
    },
    "selected_model_test_metrics": model_results[best_model_name]["test_metrics"],
    "selected_model_cv_metrics": model_results[best_model_name]["cv_metrics"],
    "confusion_matrix": model_results[best_model_name]["confusion_matrix"],
    "all_model_comparisons": model_results,
    "clinical_disclaimer": "AI-assisted clinical decision support screening tool. Not a confirmed diagnosis."
}

with open(metadata_path, "w", encoding="utf-8") as f:
    json.dump(metadata_data, f, indent=2)

print("\n======================================================================")
print("✅ LEGITIMATE CLINICAL DIABETES ML MODEL TRAINED & ARTIFACTS SAVED")
print("======================================================================")
print(f"💾 Model Artifact : {model_path}")
print(f"📄 Schema Artifact: {schema_path}")
print(f"📋 Metadata      : {metadata_path}")
print("======================================================================\n")
