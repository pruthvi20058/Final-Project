"""
MediAgent — Universal Prediction Interface
Routes clinical inference strictly to the selected disease's model, preprocessor, and schema.
NEVER sends non-diabetes data to the diabetes model or forces Pima features on other diseases.
Strict feature validation is applied before any inference.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, SCRIPT_DIR)
if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)

from model_registry import get_model_info, load_registry
from feature_validator import validate_features


def predict_disease_case(disease_name, feature_data, image_path=None):
    disease_key = str(disease_name).lower().strip()
    model_info = get_model_info(disease_key)

    # 1. Check model readiness from registry
    if not model_info:
        return {
            "status": "MODEL_NOT_AVAILABLE",
            "disease": disease_key,
            "modelName": f"MediAgent {disease_key.title()} Classifier",
            "modelVersion": "N/A - Offline",
            "message": f"No model registry entry for disease '{disease_key}'. ML prediction is unavailable.",
            "readiness": "UNAVAILABLE",
            "readiness_reason": "No model registry entry found.",
            "disclaimer": "Diagnostic ML prediction is guarded until an authenticated training dataset is provided."
        }

    readiness = model_info.get("readiness", "UNKNOWN")
    readiness_reason = model_info.get("readiness_reason", "No readiness reason documented.")
    model_status = model_info.get("status", "").upper()

    # Readiness levels that BLOCK inference entirely
    BLOCKED_READINESS = {
        "NOT_TRAINED", "TRAINING", "DATA_LEAKAGE_SUSPECTED",
        "NEEDS_VALIDATION", "FAILED", "UNAVAILABLE", "MODEL_NOT_VALIDATED",
    }

    # Readiness levels that ALLOW inference but with strong warnings
    LOW_PERF_READINESS = {"LOW_PERFORMANCE", "VERIFIED_LOW_PERFORMANCE"}

    # Block inference for diseases that are not verified/available
    if model_status not in ["TRAINED", "AVAILABLE"]:
        return {
            "status": "MODEL_NOT_AVAILABLE",
            "disease": disease_key,
            "modelName": model_info.get("display_name", disease_key.title()),
            "modelVersion": model_info.get("model_version", "N/A"),
            "message": f"ML prediction for {disease_key.title()} is currently unavailable. Model status: {model_status}.",
            "readiness": readiness,
            "readiness_reason": readiness_reason,
            "blocked": True,
            "disclaimer": "Diagnostic ML prediction is guarded until an authenticated training dataset is provided."
        }

    # Block inference when readiness has failed checks (data leakage suspected, not validated, etc.)
    if readiness.upper() in BLOCKED_READINESS:
        return {
            "status": "MODEL_NOT_AVAILABLE",
            "disease": disease_key,
            "modelName": model_info.get("display_name", disease_key.title()),
            "modelVersion": model_info.get("model_version", "N/A"),
            "message": f"ML prediction for {disease_key.title()} is blocked. Readiness: {readiness}. {readiness_reason}",
            "readiness": readiness,
            "readiness_reason": readiness_reason,
            "blocked": True,
            "disclaimer": "Diagnostic ML prediction is blocked because the model has not passed readiness checks."
        }

    # Low-performance models: allow inference with a strong warning
    low_performance_warning = None
    if readiness.upper() in LOW_PERF_READINESS:
        low_performance_warning = (
            f"WARNING: {disease_key.title()} model has low performance ({readiness}). "
            f"{readiness_reason} Results should be treated as unreliable and "
            f"confirmed by appropriate laboratory testing."
        )

    # Block inference if model has not been evaluated (no metrics)
    metrics = model_info.get("metrics", {})
    if not metrics or len(metrics) == 0:
        return {
            "status": "MODEL_NOT_VALIDATED",
            "disease": disease_key,
            "modelName": model_info.get("display_name", disease_key.title()),
            "modelVersion": model_info.get("model_version", "N/A"),
            "message": f"Model for {disease_key.title()} has no evaluation metrics. Model not validated.",
            "readiness": readiness,
            "readiness_reason": readiness_reason,
            "blocked": True,
            "disclaimer": "Diagnostic ML prediction is guarded until model evaluation is complete."
        }

    # 2. Strict feature validation before inference
    validation = validate_features(disease_key, feature_data)
    if not validation["valid"]:
        return {
            "status": validation["status"],
            "disease": disease_key,
            "modelName": model_info.get("display_name", disease_key.title()),
            "modelVersion": model_info.get("model_version", "N/A"),
            "message": validation["errors"][0] if validation["errors"] else "Feature validation failed.",
            "errors": validation["errors"],
            "warnings": validation["warnings"],
            "missing_required": validation["missing_required"],
            "invalid_features": validation["invalid_features"],
            "readiness": readiness,
            "readiness_reason": readiness_reason,
            "disclaimer": "No prediction generated because input features did not pass validation."
        }

    normalized_input = validation["normalized_input"]

    # 3. Resolve Artifact Paths
    model_path = os.path.join(ML_DIR, model_info["model_path"])
    prep_path = os.path.join(ML_DIR, model_info["preprocessor_path"])
    schema_path = os.path.join(ML_DIR, model_info["schema_path"])
    meta_path = os.path.join(ML_DIR, model_info.get("metadata_path", ""))

    if not os.path.exists(model_path) or not os.path.exists(prep_path):
        return {
            "status": "MODEL_NOT_AVAILABLE",
            "disease": disease_key,
            "message": f"Trained artifacts for {disease_key.title()} not found at {model_path}.",
            "readiness": readiness,
            "readiness_reason": readiness_reason,
            "disclaimer": "Diagnostic ML prediction is guarded until model artifacts are available."
        }

    # Diabetes Specialization: 100% preservation of authoritative Pima model + SHAP
    if disease_key == "diabetes":
        import predict as legacy_predict
        res = legacy_predict.predict_diabetes(normalized_input, ML_DIR)
        if "predicted_label" not in res and "predictedOutcome" in res:
            res["predicted_label"] = res["predictedOutcome"]
        if "probability" not in res and "estimatedProbability" in res:
            res["probability"] = res["estimatedProbability"]
        # Attach readiness info
        res["readiness"] = readiness
        res["readiness_reason"] = readiness_reason
        res["validation"] = validation
        return res

    # General Disease Prediction Pipeline
    model = joblib.load(model_path)
    prep = joblib.load(prep_path)

    schema = {}
    if os.path.exists(schema_path):
        with open(schema_path, "r", encoding="utf-8") as f:
            schema = json.load(f)

    canonical_features = schema.get("canonical_features", [])
    expected_cols = prep.get("feature_cols", model_info.get("features", []))
    cont_cols = prep.get("cont_cols", [])
    scaler = prep.get("scaler", None)
    cat_cols = prep.get("cat_cols", [])
    label_encoders = prep.get("label_encoders", {})

    # Build input DataFrame from validated normalized_input
    row_data = {}
    for col in expected_cols:
        val = normalized_input.get(col, 0.0)
        # Apply categorical encoding if needed
        if col in cat_cols and col in label_encoders:
            le = label_encoders[col]
            try:
                val = le.transform([str(val)])[0]
            except Exception:
                val = 0
        row_data[col] = val

    df_single = pd.DataFrame([row_data], columns=expected_cols)

    # Scale continuous columns
    if scaler and cont_cols:
        valid_cont = [c for c in cont_cols if c in df_single.columns]
        if valid_cont:
            df_single[valid_cont] = scaler.transform(df_single[valid_cont])

    # Run inference
    raw_pred = int(model.predict(df_single)[0])
    prob_pos = 0.5
    prob_neg = 0.5

    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(df_single)[0]
        if len(proba) == 2:
            prob_neg = float(proba[0])
            prob_pos = float(proba[1])
        else:
            prob_pos = float(proba[raw_pred])
            prob_neg = 1.0 - prob_pos

    # Map class label
    class_labels = model_info.get("class_labels", {})
    predicted_outcome = class_labels.get(str(raw_pred), f"Class {raw_pred}")

    # Top contributing features
    top_features = []
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
        sorted_idx = np.argsort(importances)[::-1]
        for idx in sorted_idx[:5]:
            if idx < len(expected_cols):
                col_name = expected_cols[idx]
                top_features.append(f"{col_name} (val: {normalized_input.get(col_name, 0)})")
    elif hasattr(model, "coef_"):
        coefs = np.abs(model.coef_[0])
        sorted_idx = np.argsort(coefs)[::-1]
        for idx in sorted_idx[:5]:
            if idx < len(expected_cols):
                col_name = expected_cols[idx]
                top_features.append(f"{col_name} (weight: {round(float(coefs[idx]), 3)})")

    user_display_pct = round(prob_pos * 100.0, 1) if raw_pred == 1 else round(prob_neg * 100.0, 1)

    return {
        "status": "SUCCESS",
        "disease": disease_key,
        "modelName": model_info.get("display_name", disease_key.title()),
        "modelVersion": model_info.get("model_version", "v1.0.0"),
        "datasetProvenance": model_info.get("dataset_provenance", {}).get("name", "Custom Dataset"),
        "predictedOutcome": predicted_outcome,
        "predicted_label": predicted_outcome,
        "rawTargetClass": raw_pred,
        "predicted_class": raw_pred,
        "probability": round(prob_pos if raw_pred == 1 else prob_neg, 4),
        "estimatedProbability": round(prob_pos if raw_pred == 1 else prob_neg, 4),
        "displayProbabilityPct": user_display_pct,
        "probabilityVector": {"negative": round(prob_neg, 4), "positive": round(prob_pos, 4)},
        "topContributingFeatures": top_features,
        "testMetrics": model_info.get("metrics", {}),
        "readiness": readiness,
        "readiness_reason": readiness_reason,
        "validation": validation,
        "low_performance_warning": low_performance_warning,
        "disclaimer": "AI-assisted clinical decision support screening tool. Not a confirmed diagnosis. All results should be evaluated by a qualified healthcare professional. Model probability is not a clinical risk score."
    }

def main():
    if len(sys.argv) > 1 and sys.argv[1].startswith('{'):
        input_str = sys.argv[1]
    else:
        input_str = sys.stdin.read()

    if not input_str or not input_str.strip():
        print(json.dumps({"status": "ERROR", "message": "No JSON payload provided."}))
        sys.exit(1)

    try:
        data = json.loads(input_str)
    except Exception as e:
        print(json.dumps({"status": "ERROR", "message": f"Invalid JSON format: {str(e)}"}))
        sys.exit(1)

    disease = data.get("disease", "diabetes")
    features = data.get("features", data)
    image_path = data.get("image_path", None)

    res = predict_disease_case(disease, features, image_path)
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    main()
