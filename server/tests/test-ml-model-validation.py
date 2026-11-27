"""
MediAgent Task 9 — ML Model Validation (per disease)

Validates all 5 disease ML models:
- Diabetes (Logistic Regression, Pima dataset)
- Dengue (Random Forest, clinical hematology)
- Malaria (Gradient Boosting, severity)
- Chikungunya (Random Forest, SINAN arboviral)
- Typhoid (NOT_TRAINED — model unavailable)

Checks per disease:
  1. Model registry entry exists and has status TRAINED
  2. Model artifacts (.joblib model + preprocessor) exist on disk
  3. Model has evaluation metrics (validated, not just trained)
  4. Feature schema exists with required features
  5. Strict feature validation accepts valid inputs
  6. Strict feature validation rejects missing/invalid inputs
  7. Inference runs successfully with complete valid features
  8. Inference returns INSUFFICIENT_DATA / MISSING_REQUIRED_FEATURES with incomplete inputs
  9. No fabricated predictions when model unavailable (typhoid)
  10. Metrics match between metadata.json and model_registry.json
  11. Clinical disclaimer present in prediction output
  12. ML probability NOT used as clinical risk score (disclaimer present)

Outputs PASS/FAIL per check with detail. States each result as actually executed.
"""

import sys
import os
import json
import joblib
import numpy as np

# Add ML directory to path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))          # server/tests
SERVER_DIR = os.path.dirname(SCRIPT_DIR)                          # server
ML_DIR = os.path.join(SERVER_DIR, 'ml')                           # server/ml
ML_COMMON_DIR = os.path.join(ML_DIR, 'common')                    # server/ml/common
ML_MODELS_DIR = os.path.join(ML_DIR, 'models')                    # server/ml/models

sys.path.insert(0, ML_COMMON_DIR)
sys.path.insert(0, ML_MODELS_DIR)

from model_registry import load_registry, get_model_info, DEFAULT_REGISTRY
from feature_validator import validate_features
from prediction_interface import predict_disease_case

passed = 0
total = 0
skipped = 0

def record(disease, title, condition, detail='', is_skip=False):
    global passed, total, skipped
    total += 1
    if is_skip:
        skipped += 1
        status = 'SKIP'
    elif condition:
        passed += 1
        status = 'PASS'
    else:
        status = 'FAIL'
    print(f"  [{status}] {disease.upper()}: {title}")
    if detail:
        print(f"         ↳ {detail}")

DISEASES = ['diabetes', 'dengue', 'malaria', 'chikungunya', 'typhoid']

print("\n==============================================================================")
print("🧪 MediAgent Task 9 — ML Model Validation (per disease)")
print("==============================================================================")

registry = load_registry()

for disease in DISEASES:
    print(f"\n--- {disease.upper()} ---")

    model_info = get_model_info(disease)

    # Check 1: Model registry entry exists
    record(disease, 'Model registry entry exists',
           model_info is not None,
           f"found: {model_info is not None}")

    if model_info is None:
        continue

    # Check 2: Model status is TRAINED (not NOT_TRAINED)
    model_status = model_info.get('status', '').upper()
    if disease == 'typhoid':
        record(disease, 'Model status is TRAINED (not NOT_TRAINED)',
               True, f"status: {model_status} (Typhoid is intentionally NOT_TRAINED — gated)", is_skip=True)
    else:
        record(disease, 'Model status is TRAINED (not NOT_TRAINED)',
               model_status == 'TRAINED',
               f"status: {model_status}")

    # Check 3: Model has evaluation metrics (validated)
    metrics = model_info.get('metrics', {})
    if disease == 'typhoid':
        record(disease, 'Model has evaluation metrics (validated)',
               True, "metrics: {} (Typhoid has no metrics — NOT_TRAINED)", is_skip=True)
    else:
        record(disease, 'Model has evaluation metrics (validated)',
               bool(metrics) and len(metrics) > 0,
           f"metrics keys: {list(metrics.keys()) if metrics else 'none'}")

    # Check 4: Model artifacts exist on disk
    model_path = os.path.join(ML_DIR, model_info.get('model_path', ''))
    prep_path = os.path.join(ML_DIR, model_info.get('preprocessor_path', ''))
    artifacts_exist = os.path.exists(model_path) and os.path.exists(prep_path)
    record(disease, 'Model artifacts exist on disk (.joblib model + preprocessor)',
           artifacts_exist,
           f"model: {os.path.exists(model_path)}, preprocessor: {os.path.exists(prep_path)}")

    # Check 5: Feature schema exists
    schema_path = os.path.join(ML_DIR, model_info.get('schema_path', ''))
    schema_exists = os.path.exists(schema_path)
    record(disease, 'Feature schema exists on disk',
           schema_exists,
           f"path: {schema_path}, exists: {schema_exists}")

    # Check 6: Strict feature validation accepts valid inputs
    if model_status == 'TRAINED' and metrics and artifacts_exist:
        schema = {}
        if os.path.exists(schema_path):
            with open(schema_path, 'r') as f:
                schema = json.load(f)
        canonical = schema.get('canonical_features', [])
        # Build valid input from schema
        valid_input = {}
        for f in canonical:
            name = f['name']
            vr = f.get('valid_range', {})
            vmin = vr.get('min', 0)
            vmax = vr.get('max', 100)
            # Pick a mid-range valid value
            valid_input[name] = (float(vmin) + float(vmax)) / 2.0
        val_result = validate_features(disease, valid_input)
        record(disease, 'Strict feature validation accepts valid inputs',
               val_result.get('valid') is True,
               f"status: {val_result.get('status')}, errors: {val_result.get('errors')}")
    else:
        record(disease, 'Strict feature validation accepts valid inputs',
               True, "skipped — model not available or missing artifacts/metrics", is_skip=True)
        valid_input = {}

    # Check 7: Strict feature validation rejects missing required features
    if model_status == 'TRAINED' and metrics:
        missing_result = validate_features(disease, {})
        record(disease, 'Strict feature validation rejects missing required features',
               missing_result.get('valid') is False and
               missing_result.get('status') in ('MISSING_REQUIRED_FEATURES', 'INSUFFICIENT_DATA'),
               f"status: {missing_result.get('status')}, missing: {missing_result.get('missing_required')}")
    else:
        record(disease, 'Strict feature validation rejects missing required features',
               True, "skipped — model not available or missing metrics", is_skip=True)

    # Check 8: Strict feature validation rejects invalid (out-of-range) values
    if model_status == 'TRAINED' and metrics and schema:
        canonical = schema.get('canonical_features', [])
        bad_input = {}
        for f in canonical:
            name = f['name']
            vr = f.get('valid_range', {})
            vmax = vr.get('max', 100)
            bad_input[name] = float(vmax) * 10  # way out of range
        bad_result = validate_features(disease, bad_input)
        record(disease, 'Strict feature validation rejects out-of-range values',
               bad_result.get('valid') is False and
               bad_result.get('status') == 'INVALID_FEATURES',
               f"status: {bad_result.get('status')}, invalid count: {len(bad_result.get('invalid_features', []))}")
    else:
        record(disease, 'Strict feature validation rejects out-of-range values',
               True, "skipped — model not available", is_skip=True)

    # Check 9: Inference runs successfully with complete valid features
    if model_status == 'TRAINED' and metrics and artifacts_exist and valid_input:
        pred_result = predict_disease_case(disease, valid_input)
        record(disease, 'Inference runs successfully with complete valid features',
               pred_result.get('status') == 'SUCCESS',
               f"status: {pred_result.get('status')}, outcome: {pred_result.get('predictedOutcome')}")
    else:
        record(disease, 'Inference runs successfully with complete valid features',
               True, "skipped — model not available or missing artifacts/metrics", is_skip=True)
        pred_result = {}

    # Check 10: Inference returns MISSING_REQUIRED_FEATURES with incomplete inputs
    if model_status == 'TRAINED' and metrics:
        incomplete_pred = predict_disease_case(disease, {})
        record(disease, 'Inference reports missing data with empty input (no fabrication)',
               incomplete_pred.get('status') in ('MODEL_NOT_VALIDATED', 'MISSING_REQUIRED_FEATURES', 'INSUFFICIENT_DATA', 'MODEL_NOT_AVAILABLE'),
               f"status: {incomplete_pred.get('status')}")
    else:
        record(disease, 'Inference reports missing data with empty input (no fabrication)',
               True, "skipped — model not available", is_skip=True)

    # Check 11: Typhoid (NOT_TRAINED) returns MODEL_NOT_AVAILABLE — no fabricated prediction
    if disease == 'typhoid':
        typh_pred = predict_disease_case('typhoid', {})
        record(disease, 'NOT_TRAINED model returns unavailable — no fabricated prediction',
               typh_pred.get('status') == 'MODEL_NOT_AVAILABLE',
               f"status: {typh_pred.get('status')}")
        record(disease, 'Typhoid has no test metrics (not validated)',
               len(model_info.get('metrics', {})) == 0,
               f"metrics: {model_info.get('metrics', {})}")
        record(disease, 'Typhoid inference is gated by registry status (artifact may exist but model NOT_TRAINED)',
               model_status == 'NOT_TRAINED',
               f"registry status: {model_status} — inference blocked despite artifact presence")

    # Check 12: Clinical disclaimer present in prediction output
    if pred_result and pred_result.get('status') == 'SUCCESS':
        record(disease, 'Prediction output includes clinical disclaimer',
               'disclaimer' in pred_result and len(pred_result['disclaimer']) > 0,
               f"disclaimer: {pred_result.get('disclaimer', '')[:80]}...")
    else:
        record(disease, 'Prediction output includes clinical disclaimer',
               True, "skipped — no successful prediction", is_skip=True)

    # Check 13: Metadata metrics match registry metrics
    meta_path = os.path.join(ML_DIR, model_info.get('metadata_path', ''))
    if os.path.exists(meta_path):
        with open(meta_path, 'r') as f:
            metadata = json.load(f)
        meta_metrics = metadata.get('selected_model_test_metrics', {})
        reg_metrics = model_info.get('metrics', {})
        match = True
        for key in ['accuracy', 'precision', 'recall_sensitivity', 'specificity', 'f1_score', 'roc_auc']:
            if key in meta_metrics and key in reg_metrics:
                if abs(meta_metrics[key] - reg_metrics[key]) > 0.001:
                    match = False
                    break
        record(disease, 'Metadata metrics match registry metrics',
               match,
               f"meta: {meta_metrics}, registry: {reg_metrics}")
    else:
        record(disease, 'Metadata metrics match registry metrics',
               False,
               "metadata file not found")

print("\n==============================================================================")
print(f"📊 ML MODEL VALIDATION RESULTS: {passed} / {total} PASSED, {skipped} SKIPPED")
print("==============================================================================\n")

sys.exit(0 if passed + skipped == total else 1)
