"""
MediAgent — Strict Feature Validation for Disease ML Inference

Validates input features against each disease's canonical schema before inference.
Never silently replaces missing values with invented values. Never assumes a missing
laboratory parameter is normal.

Returns explicit status codes:
  - INVALID_FEATURES: feature name or type mismatch
  - MISSING_REQUIRED_FEATURES: required features absent
  - INSUFFICIENT_DATA: not enough valid features to run inference
  - MODEL_NOT_AVAILABLE: no trained model artifact for this disease
  - MODEL_NOT_VALIDATED: model exists but has not been evaluated
"""

import os
import sys
import json
import math

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(SCRIPT_DIR)


def _is_nan_or_inf(val):
    """Check if a numeric value is NaN or Infinity."""
    try:
        f = float(val)
        return math.isnan(f) or math.isinf(f)
    except (TypeError, ValueError):
        return False


def load_schema(disease_key):
    """Load the feature schema for a disease from its diseases/<disease>/ directory."""
    schema_path = os.path.join(ML_DIR, "diseases", disease_key, "feature_schema.json")
    if not os.path.exists(schema_path):
        # Fallback to models/<disease>/feature_schema.json
        fallback = os.path.join(ML_DIR, "models", disease_key, "feature_schema.json")
        if os.path.exists(fallback):
            schema_path = fallback
        else:
            return None
    try:
        with open(schema_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def load_model_info(disease_key):
    """Load model info from the model registry."""
    from model_registry import get_model_info
    return get_model_info(disease_key)


def validate_features(disease_key, feature_data):
    """
    Strictly validate input features against a disease's canonical schema.

    Returns a dict:
      {
        "valid": bool,
        "status": "OK" | "INVALID_FEATURES" | "MISSING_REQUIRED_FEATURES" |
                  "INSUFFICIENT_DATA" | "MODEL_NOT_AVAILABLE" | "MODEL_NOT_VALIDATED",
        "errors": [str],
        "warnings": [str],
        "normalized_input": {feature_name: value},  # only valid features
        "missing_required": [feature_name],
        "invalid_features": [{feature, value, reason}],
        "schema": {...}
      }
    """
    result = {
        "valid": False,
        "status": "MODEL_NOT_AVAILABLE",
        "errors": [],
        "warnings": [],
        "normalized_input": {},
        "missing_required": [],
        "invalid_features": [],
        "schema": None,
    }

    disease_key = str(disease_key).lower().strip()

    # 1. Check model availability and validation status
    model_info = load_model_info(disease_key)
    if not model_info:
        result["errors"].append(f"No model registry entry for disease '{disease_key}'.")
        result["status"] = "MODEL_NOT_AVAILABLE"
        return result

    model_status = model_info.get("status", "").upper()
    if model_status not in ["TRAINED", "AVAILABLE"]:
        result["errors"].append(
            f"Model for '{disease_key}' is not available for inference (status: {model_status})."
        )
        result["status"] = "MODEL_NOT_AVAILABLE"
        return result

    # Check that model has been evaluated (metrics present)
    metrics = model_info.get("metrics", {})
    if not metrics or len(metrics) == 0:
        result["errors"].append(
            f"Model for '{disease_key}' has no evaluation metrics. Model not validated."
        )
        result["status"] = "MODEL_NOT_VALIDATED"
        return result

    # 2. Load feature schema
    schema = load_schema(disease_key)
    if schema is None:
        result["errors"].append(f"No feature schema found for disease '{disease_key}'.")
        result["status"] = "INVALID_FEATURES"
        return result
    result["schema"] = schema

    # 3. Extract canonical features from schema
    canonical_features = schema.get("canonical_features", [])
    if not canonical_features:
        # Fallback: try top-level features list
        fallback_features = schema.get("features", [])
        if fallback_features:
            canonical_features = [
                {"name": f, "required": True, "clinical_label": f, "unit": "", "numeric_type": "float"}
                for f in fallback_features
            ]
        else:
            result["errors"].append(f"Schema for '{disease_key}' defines no canonical features.")
            result["status"] = "INVALID_FEATURES"
            return result

    # 4. Normalize and validate each feature
    normalized_input = {}
    missing_required = []
    invalid_features = []

    for f_info in canonical_features:
        canon_name = f_info["name"]
        clinical_label = f_info.get("clinical_label", canon_name)
        required = f_info.get("required", False)
        numeric_type = f_info.get("numeric_type", "float")
        valid_range = f_info.get("valid_range", {})
        report_synonyms = f_info.get("report_synonyms", [])

        # Find matching value in input
        matched_val = None
        matched_key = None
        for k, v in feature_data.items():
            k_clean = str(k).lower().replace(" ", "_").replace("-", "_")
            canon_clean = canon_name.lower().replace(" ", "_").replace("-", "_")
            if k_clean == canon_clean or k_clean in [s.lower().replace(" ", "_") for s in report_synonyms]:
                matched_val = v
                matched_key = k
                break

        if matched_val is None or matched_val == "" or matched_val is None:
            if required:
                missing_required.append(clinial_label if (clinial_label := clinical_label) else canon_name)
            else:
                # Optional feature missing — do NOT invent a value. Record as absent.
                result["warnings"].append(
                    f"Optional feature '{clinical_label}' ({canon_name}) not provided; will be excluded from inference."
                )
            continue

        # Type validation — attempt numeric conversion
        try:
            numeric_val = float(matched_val)
        except (TypeError, ValueError):
            invalid_features.append({
                "feature": canon_name,
                "clinical_label": clinical_label,
                "value": matched_val,
                "reason": f"Value '{matched_val}' cannot be converted to a number (expected {numeric_type})."
            })
            continue

        # NaN / Infinity rejection
        if _is_nan_or_inf(numeric_val):
            invalid_features.append({
                "feature": canon_name,
                "clinical_label": clinical_label,
                "value": matched_val,
                "reason": f"Value is NaN or Infinity — not a valid clinical measurement."
            })
            continue

        # Range validation (where documented)
        range_min = valid_range.get("min") if valid_range else None
        range_max = valid_range.get("max") if valid_range else None
        if range_min is not None and numeric_val < range_min:
            invalid_features.append({
                "feature": canon_name,
                "clinical_label": clinical_label,
                "value": numeric_val,
                "reason": f"Value {numeric_val} is below valid clinical minimum {range_min}."
            })
            continue
        if range_max is not None and numeric_val > range_max:
            invalid_features.append({
                "feature": canon_name,
                "clinical_label": clinical_label,
                "value": numeric_val,
                "reason": f"Value {numeric_val} exceeds valid clinical maximum {range_max}."
            })
            continue

        normalized_input[canon_name] = numeric_val

    # 5. Determine overall status
    if invalid_features:
        result["errors"].append(f"{len(invalid_features)} feature(s) failed validation.")
        result["invalid_features"] = invalid_features
        result["status"] = "INVALID_FEATURES"
        result["valid"] = False
        return result

    if missing_required:
        result["errors"].append(
            f"{len(missing_required)} required feature(s) missing: {', '.join(missing_required)}."
        )
        result["missing_required"] = missing_required
        result["status"] = "MISSING_REQUIRED_FEATURES"
        result["valid"] = False
        return result

    if len(normalized_input) == 0:
        result["errors"].append("No valid features provided for inference.")
        result["status"] = "INSUFFICIENT_DATA"
        result["valid"] = False
        return result

    # All validations passed
    result["valid"] = True
    result["status"] = "OK"
    result["normalized_input"] = normalized_input
    result["warnings"].append(
        f"All {len(normalized_input)} feature(s) validated successfully for {disease_key}."
    )
    return result


def main():
    """CLI entry point for testing."""
    if len(sys.argv) < 2:
        print(json.dumps({
            "status": "ERROR",
            "message": "Usage: python feature_validator.py <disease> '<json_features>'"
        }))
        sys.exit(1)

    disease = sys.argv[1]
    try:
        features = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    except Exception:
        features = {}

    res = validate_features(disease, features)
    print(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
