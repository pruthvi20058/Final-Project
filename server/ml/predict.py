import os
import sys
import json
import numpy as np
import pandas as pd
import joblib

# Ensure UTF-8 output encoding for Windows compatibility
sys.stdout.reconfigure(encoding='utf-8')

def predict_diabetes(data, script_dir):
    import shap
    model_dir = os.path.join(script_dir, "models", "diabetes")
    model_path = os.path.join(model_dir, "model.joblib")
    prep_path = os.path.join(model_dir, "preprocessor.joblib")
    schema_path = os.path.join(model_dir, "feature_schema.json")
    meta_path = os.path.join(model_dir, "model_metadata.json")

    if not os.path.exists(model_path) or not os.path.exists(prep_path):
        return {
            "status": "ERROR",
            "message": f"Trained diabetes model artifacts not found at {model_dir}."
        }

    model = joblib.load(model_path)
    prep = joblib.load(prep_path)
    scaler = prep["scaler"]

    with open(schema_path, "r", encoding="utf-8") as f:
        schema = json.load(f)

    with open(meta_path, "r", encoding="utf-8") as f:
        metadata = json.load(f)

    canonical_features = schema.get("canonical_features", [])

    normalized_input = {}
    invalid_features = []
    suspicious_features = []

    for f_info in canonical_features:
        canon_name = f_info["name"]
        synonyms = f_info["report_synonyms"]

        matched_val = None
        for k, v in data.items():
            k_clean = k.lower().replace(" ", "_")
            if k_clean == canon_name or k_clean in synonyms:
                matched_val = v
                break

        if matched_val is not None and matched_val != "":
            try:
                val = float(matched_val)
                val_range = f_info.get("valid_range", {})
                susp_range = f_info.get("suspicious_range", {})

                if val < val_range.get("min", -999) or val > val_range.get("max", 9999):
                    invalid_features.append({
                        "feature": canon_name,
                        "value": val,
                        "reason": f"Value {val} is out of valid clinical range [{val_range.get('min')}, {val_range.get('max')}]"
                    })
                elif val >= susp_range.get("min", 9999) and val <= susp_range.get("max", -999):
                    suspicious_features.append({
                        "feature": canon_name,
                        "value": val,
                        "reason": f"Value {val} is in extreme/suspicious range"
                    })

                normalized_input[canon_name] = val
            except (ValueError, TypeError):
                pass

    if invalid_features:
        return {
            "status": "INVALID_DATA",
            "model": "pima_diabetes",
            "invalidFeatures": invalid_features,
            "message": f"Report contains invalid clinical measurements: {invalid_features[0]['reason']}"
        }

    required_features = [f["name"] for f in canonical_features if f.get("required", True)]
    missing_features = [req for req in required_features if req not in normalized_input]

    if missing_features:
        return {
            "status": "INSUFFICIENT_DATA",
            "model": "pima_diabetes",
            "missingFeatures": missing_features,
            "message": f"Required Pima screening measurements ({', '.join(missing_features)}) are missing from the report."
        }

    feature_cols = ['preg', 'plas', 'pres', 'skin', 'insu', 'mass', 'pedi', 'age']
    vector = [normalized_input[col] for col in feature_cols]

    X_raw = np.array([vector])
    X_scaled = scaler.transform(X_raw)

    raw_pred = int(model.predict(X_scaled)[0])
    proba_dist = model.predict_proba(X_scaled)[0]

    prob_neg = float(proba_dist[0])
    prob_pos = float(proba_dist[1])

    estimated_probability = prob_pos if raw_pred == 1 else prob_neg
    user_display_pct = round(estimated_probability * 100.0, 1)
    screening_outcome = "Positive" if raw_pred == 1 else "Negative"

    explainer = shap.LinearExplainer(model, masker=np.zeros((1, len(feature_cols))))
    shap_explanation = explainer(X_scaled)

    base_value = float(explainer.expected_value)
    if isinstance(base_value, np.ndarray):
        base_value = float(base_value[0])

    shap_values_raw = shap_explanation.values[0]

    shap_feature_list = []
    positive_factors = []
    negative_factors = []

    for idx, col in enumerate(feature_cols):
        f_info = next(f for f in canonical_features if f["name"] == col)
        raw_val = normalized_input[col]
        shap_val = float(shap_values_raw[idx])
        shap_val_rounded = round(shap_val, 4)

        direction = "toward_positive" if shap_val > 0 else "toward_negative" if shap_val < 0 else "neutral"

        feature_obj = {
          "feature": col,
          "clinicalName": f_info["clinical_label"],
          "value": raw_val,
          "unit": f_info["unit"],
          "shapValue": shap_val_rounded,
          "direction": direction
        }
        shap_feature_list.append(feature_obj)

        if shap_val > 0:
            positive_factors.append((f_info["clinical_label"], abs(shap_val)))
        elif shap_val < 0:
            negative_factors.append((f_info["clinical_label"], abs(shap_val)))

    positive_factors.sort(key=lambda x: x[1], reverse=True)
    negative_factors.sort(key=lambda x: x[1], reverse=True)

    top_positive = [item[0] for item in positive_factors]
    top_negative = [item[0] for item in negative_factors]

    calculated_log_odds = base_value + float(np.sum(shap_values_raw))
    model_log_odds = float(model.decision_function(X_scaled)[0])
    additive_reconstruction_diff = abs(calculated_log_odds - model_log_odds)

    explanation_payload = {
        "method": "SHAP LinearExplainer",
        "model": metadata.get("algorithm", "Logistic Regression"),
        "modelVersion": metadata.get("model_version", "v2.0.0-pima-diabetes"),
        "targetClass": 1,
        "baseValue": round(base_value, 4),
        "outputExplained": "log-odds",
        "additiveReconstructionDiff": round(additive_reconstruction_diff, 8),
        "features": shap_feature_list,
        "topPositiveFactors": top_positive,
        "topNegativeFactors": top_negative
    }

    return {
        "status": "SUCCESS",
        "disease": "diabetes",
        "modelName": metadata.get("model_name", "MediAgent Pima Diabetes Classifier"),
        "modelVersion": metadata.get("model_version", "v2.0.0-pima-diabetes"),
        "datasetProvenance": metadata.get("dataset_provenance", {}).get("name", "Pima Indians Diabetes Dataset"),
        "predictedOutcome": screening_outcome,
        "rawTargetClass": raw_pred,
        "estimatedProbability": round(estimated_probability, 4),
        "displayProbabilityPct": user_display_pct,
        "probabilityVector": {
            "negative": round(prob_neg, 4),
            "positive": round(prob_pos, 4)
        },
        "explanation": explanation_payload,
        "suspiciousFeatures": suspicious_features,
        "testMetrics": metadata.get("selected_model_test_metrics", {}),
        "cvMetrics": metadata.get("selected_model_cv_metrics", {}),
        "clinicalInterpretation": "AI-assisted screening result; not a confirmed diagnosis.",
        "disclaimer": "This is an AI-assisted screening result and not a confirmed medical diagnosis. SHAP explains how the model arrived at its prediction; it does not establish medical causation. Results should be reviewed by a qualified healthcare professional."
    }

def predict_dengue(data, script_dir):
    model_dir = os.path.join(script_dir, "models", "dengue")
    model_path = os.path.join(model_dir, "model.joblib")
    prep_path = os.path.join(model_dir, "preprocessor.joblib")
    schema_path = os.path.join(model_dir, "feature_schema.json")
    meta_path = os.path.join(model_dir, "model_metadata.json")

    if not os.path.exists(model_path) or not os.path.exists(prep_path):
        return {"status": "ERROR", "message": "Trained Dengue model artifacts not found."}

    model = joblib.load(model_path)
    prep = joblib.load(prep_path)
    scaler = prep["scaler"]
    cont_cols = prep["cont_cols"]
    feature_cols = prep["feature_cols"]

    with open(schema_path, "r", encoding="utf-8") as f:
        schema = json.load(f)
    with open(meta_path, "r", encoding="utf-8") as f:
        metadata = json.load(f)

    # Normalize input
    normalized_input = {}
    for f_info in schema["canonical_features"]:
        canon_name = f_info["name"]
        synonyms = f_info.get("report_synonyms", [])
        matched_val = None
        for k, v in data.items():
            k_clean = k.lower().replace(" ", "_")
            if k_clean == canon_name.lower() or k_clean in synonyms:
                matched_val = v
                break
        if matched_val is not None and matched_val != "":
            try:
                normalized_input[canon_name] = float(matched_val)
            except:
                normalized_input[canon_name] = 0.0
        else:
            # Default zero for clinical flags
            normalized_input[canon_name] = 0.0

    # Build vector
    vector = [normalized_input.get(c, 0.0) for c in feature_cols]
    df_single = pd.DataFrame([vector], columns=feature_cols)
    df_single[cont_cols] = scaler.transform(df_single[cont_cols])

    raw_pred = int(model.predict(df_single)[0])
    proba = model.predict_proba(df_single)[0]
    prob_pos = float(proba[1])
    prob_neg = float(proba[0])

    top_features = []
    if hasattr(model, 'feature_importances_'):
        importances = model.feature_importances_
        sorted_idx = np.argsort(importances)[::-1]
        for idx in sorted_idx[:4]:
            col_name = feature_cols[idx]
            top_features.append(f"{col_name} (val: {normalized_input.get(col_name, 0)})")

    return {
        "status": "SUCCESS",
        "disease": "dengue",
        "modelName": metadata.get("model_name"),
        "modelVersion": metadata.get("model_version"),
        "datasetProvenance": metadata.get("dataset_provenance", {}).get("name"),
        "predictedOutcome": "Dengue Positive" if raw_pred == 1 else "Negative / Other Febrile Illness",
        "rawTargetClass": raw_pred,
        "estimatedProbability": round(prob_pos, 4),
        "displayProbabilityPct": round(prob_pos * 100.0, 1),
        "probabilityVector": {"negative": round(prob_neg, 4), "positive": round(prob_pos, 4)},
        "topContributingFeatures": top_features,
        "testMetrics": metadata.get("selected_model_test_metrics", {}),
        "disclaimer": "AI-assisted screening based on empirical hospital clinical presentation. Requires independent clinical validation and confirmatory serology."
    }

def predict_malaria(data, script_dir):
    model_dir = os.path.join(script_dir, "models", "malaria")
    model_path = os.path.join(model_dir, "model.joblib")
    prep_path = os.path.join(model_dir, "preprocessor.joblib")
    schema_path = os.path.join(model_dir, "feature_schema.json")
    meta_path = os.path.join(model_dir, "model_metadata.json")

    if not os.path.exists(model_path) or not os.path.exists(prep_path):
        return {"status": "ERROR", "message": "Trained Malaria model artifacts not found."}

    model = joblib.load(model_path)
    prep = joblib.load(prep_path)
    scaler = prep["scaler"]
    cont_cols = prep["cont_cols"]
    feature_cols = prep["feature_cols"]

    with open(schema_path, "r", encoding="utf-8") as f:
        schema = json.load(f)
    with open(meta_path, "r", encoding="utf-8") as f:
        metadata = json.load(f)

    normalized_input = {}
    for f_info in schema["canonical_features"]:
        canon_name = f_info["name"]
        synonyms = f_info.get("report_synonyms", [])
        matched_val = None
        for k, v in data.items():
            k_clean = k.lower().replace(" ", "_")
            if k_clean == canon_name.lower() or k_clean in synonyms:
                matched_val = v
                break
        if matched_val is not None and matched_val != "":
            try:
                normalized_input[canon_name] = float(matched_val)
            except:
                normalized_input[canon_name] = 0.0
        else:
            normalized_input[canon_name] = 0.0

    vector = [normalized_input.get(c, 0.0) for c in feature_cols]
    df_single = pd.DataFrame([vector], columns=feature_cols)
    df_single[cont_cols] = scaler.transform(df_single[cont_cols])

    raw_pred = int(model.predict(df_single)[0])
    proba = model.predict_proba(df_single)[0]
    prob_pos = float(proba[1])
    prob_neg = float(proba[0])

    top_features = []
    if hasattr(model, 'coef_'):
        coefs = model.coef_[0]
        sorted_idx = np.argsort(np.abs(coefs))[::-1]
        for idx in sorted_idx[:4]:
            col_name = feature_cols[idx]
            top_features.append(f"{col_name} (weight: {round(float(coefs[idx]), 3)})")

    return {
        "status": "SUCCESS",
        "disease": "malaria",
        "modelName": metadata.get("model_name"),
        "modelVersion": metadata.get("model_version"),
        "datasetProvenance": metadata.get("dataset_provenance", {}).get("name"),
        "predictedOutcome": "Severe / Complicated Malaria" if raw_pred == 1 else "Mild / Uncomplicated Malaria",
        "rawTargetClass": raw_pred,
        "estimatedProbability": round(prob_pos, 4),
        "displayProbabilityPct": round(prob_pos * 100.0, 1),
        "probabilityVector": {"negative": round(prob_neg, 4), "positive": round(prob_pos, 4)},
        "topContributingFeatures": top_features,
        "testMetrics": metadata.get("selected_model_test_metrics", {}),
        "disclaimer": "AI-assisted malaria triage based on empirical clinical severity data. Any patient exhibiting cerebral or severe signs requires immediate emergency medical evaluation."
    }

def predict_chikungunya(data, script_dir):
    model_dir = os.path.join(script_dir, "models", "chikungunya")
    model_path = os.path.join(model_dir, "model.joblib")
    prep_path = os.path.join(model_dir, "preprocessor.joblib")
    schema_path = os.path.join(model_dir, "feature_schema.json")
    meta_path = os.path.join(model_dir, "model_metadata.json")

    if not os.path.exists(model_path) or not os.path.exists(prep_path):
        return {"status": "ERROR", "message": "Trained Chikungunya model artifacts not found."}

    model = joblib.load(model_path)
    prep = joblib.load(prep_path)
    feature_cols = prep["feature_cols"]

    with open(schema_path, "r", encoding="utf-8") as f:
        schema = json.load(f)
    with open(meta_path, "r", encoding="utf-8") as f:
        metadata = json.load(f)

    normalized_input = {}
    for f_info in schema["canonical_features"]:
        canon_name = f_info["name"]
        synonyms = f_info.get("report_synonyms", [])
        matched_val = None
        for k, v in data.items():
            k_clean = k.lower().replace(" ", "_")
            if k_clean == canon_name.lower() or k_clean in synonyms:
                matched_val = v
                break
        if matched_val is not None and matched_val != "":
            try:
                normalized_input[canon_name] = int(float(matched_val) > 0)
            except:
                normalized_input[canon_name] = 0
        else:
            normalized_input[canon_name] = 0

    vector = [normalized_input.get(c, 0) for c in feature_cols]
    df_single = pd.DataFrame([vector], columns=feature_cols)

    raw_pred = int(model.predict(df_single)[0])
    proba = model.predict_proba(df_single)[0]
    prob_pos = float(proba[1])
    prob_neg = float(proba[0])

    top_features = []
    if hasattr(model, 'feature_importances_'):
        importances = model.feature_importances_
        sorted_idx = np.argsort(importances)[::-1]
        for idx in sorted_idx[:4]:
            col_name = feature_cols[idx]
            top_features.append(f"{col_name} (val: {normalized_input.get(col_name, 0)})")

    return {
        "status": "SUCCESS",
        "disease": "chikungunya",
        "modelName": metadata.get("model_name"),
        "modelVersion": metadata.get("model_version"),
        "datasetProvenance": metadata.get("dataset_provenance", {}).get("name"),
        "predictedOutcome": "Chikungunya Confirmed" if raw_pred == 1 else "Discarded / Febrile Negative Control",
        "rawTargetClass": raw_pred,
        "estimatedProbability": round(prob_pos, 4),
        "displayProbabilityPct": round(prob_pos * 100.0, 1),
        "probabilityVector": {"negative": round(prob_neg, 4), "positive": round(prob_pos, 4)},
        "topContributingFeatures": top_features,
        "testMetrics": metadata.get("selected_model_test_metrics", {}),
        "disclaimer": "AI-assisted screening based on Brazil Ministry of Health (SINAN) epidemiological case notifications. All results must be confirmed by laboratory RT-PCR or IgM serology."
    }

def main():
    if len(sys.argv) > 1 and sys.argv[1].startswith('{'):
        input_str = sys.argv[1]
    else:
        input_str = sys.stdin.read()

    if not input_str or not input_str.strip():
        print(json.dumps({"status": "ERROR", "message": "No JSON feature payload provided for inference."}))
        sys.exit(1)

    try:
        data = json.loads(input_str)
    except Exception as e:
        print(json.dumps({"status": "ERROR", "message": f"Invalid JSON payload format: {str(e)}"}))
        sys.exit(1)

    disease = str(data.get("disease", "diabetes")).lower().strip()
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Typhoid Strict Anti-Fabrication Guardrail
    if disease == "typhoid":
        res = {
            "status": "UNAVAILABLE",
            "disease": "typhoid",
            "modelName": "MediAgent Typhoid Classifier (Guarded)",
            "modelVersion": "N/A - Offline",
            "message": "Typhoid machine learning prediction is currently unavailable. No non-synthetic, clinically validated public dataset could be authenticated. In strict adherence to medical safety protocols, synthetic or simulated records are not used.",
            "datasetProvenance": "TyphoDx-BD (Mendeley 10.17632/m9pnvv2vpv.1) identified but restricted by data repository authentication.",
            "disclaimer": "Diagnostic ML prediction is guarded until authenticated clinical trial data is provided."
        }
        print(json.dumps(res))
        sys.exit(0)

    if disease == "dengue":
        res = predict_dengue(data, script_dir)
    elif disease == "malaria":
        res = predict_malaria(data, script_dir)
    elif disease == "chikungunya":
        res = predict_chikungunya(data, script_dir)
    else:
        # Default diabetes (preserves 100% backward compatibility)
        res = predict_diabetes(data, script_dir)

    print(json.dumps(res))

if __name__ == "__main__":
    main()
