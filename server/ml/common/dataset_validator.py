"""
MediAgent — Universal Dataset Validator
Ensures dataset integrity, prevents target leakage, validates class balance and sample sizes
before training any disease model.
"""

import os
import sys
import json
import pandas as pd
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

def validate_dataset(file_path, target_col, feature_cols=None, disease=None):
    errors = []
    warnings = []
    recommendations = []

    if not os.path.exists(file_path):
        return {
            "is_valid": False,
            "errors": [f"Dataset file not found at: {file_path}"],
            "warnings": [],
            "recommendations": []
        }

    ext = os.path.splitext(file_path)[1].lower()
    
    # Handle ZIP / Image archive validation
    if ext == '.zip':
        import zipfile
        if not zipfile.is_zipfile(file_path):
            return {"is_valid": False, "errors": ["File is not a valid ZIP archive."], "warnings": [], "recommendations": []}
        with zipfile.ZipFile(file_path, 'r') as zf:
            imgs = [f for f in zf.namelist() if f.lower().endswith(('.png', '.jpg', '.jpeg')) and not f.startswith('__MACOSX/')]
            if len(imgs) < 20:
                errors.append(f"Image dataset must contain at least 20 images for training and validation (found {len(imgs)}).")
            # Check classes
            classes = set()
            for img in imgs:
                parts = os.path.normpath(img).split(os.sep)
                if len(parts) >= 2:
                    classes.add(parts[-2])
            if len(classes) < 2:
                errors.append(f"Image dataset must have at least 2 subfolder class directories (e.g. Parasitized/Uninfected, found: {list(classes)}).")
            return {
                "is_valid": len(errors) == 0,
                "errors": errors,
                "warnings": warnings,
                "recommendations": recommendations,
                "dataset_type": "image",
                "sample_count": len(imgs),
                "class_count": len(classes)
            }

    # Handle Tabular Validation
    try:
        if ext == '.csv':
            for enc in ['utf-8', 'latin1', 'iso-8859-1']:
                try:
                    df = pd.read_csv(file_path, encoding=enc, low_memory=False)
                    break
                except UnicodeDecodeError:
                    continue
            else:
                return {"is_valid": False, "errors": ["Could not decode CSV with supported encodings."], "warnings": [], "recommendations": []}
        elif ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
        elif ext == '.json':
            df = pd.read_json(file_path)
        else:
            return {"is_valid": False, "errors": [f"Unsupported file format '{ext}'."], "warnings": [], "recommendations": []}
    except Exception as e:
        return {"is_valid": False, "errors": [f"Failed to load dataset: {str(e)}"], "warnings": [], "recommendations": []}

    row_count = len(df)
    col_names = [str(c).strip() for c in df.columns]
    df.columns = col_names

    # 1. Sample Size Check
    if row_count < 20:
        errors.append(f"Dataset has only {row_count} records. At least 20 records are required to perform a stratified 80/20 train/test split without statistical collapse.")
    elif row_count < 50:
        warnings.append(f"Dataset has only {row_count} records; larger cohorts (≥ 100) are recommended for clinical statistical generalizability.")

    # 2. Target Column Check
    if not target_col:
        errors.append("Target column was not specified. A clinical ground truth label is required to train a supervised classifier.")
    elif target_col not in col_names:
        errors.append(f"Target column '{target_col}' not found in dataset columns ({', '.join(col_names[:10])}...).")
    else:
        target_series = df[target_col].dropna()
        if len(target_series) == 0:
            errors.append(f"Target column '{target_col}' contains 100% missing/null values.")
        else:
            unique_targets = target_series.unique()
            if len(unique_targets) < 2:
                errors.append(f"Target column '{target_col}' contains only 1 distinct class ({unique_targets[0]}). Classification requires at least 2 distinct classes.")
            elif len(unique_targets) > 20:
                warnings.append(f"Target column has {len(unique_targets)} distinct values. Confirm whether this is a multiclass label or continuous regression target.")
            
            # Check class balance
            val_counts = target_series.value_counts(normalize=True)
            min_class_pct = float(val_counts.min() * 100.0)
            if min_class_pct < 5.0:
                warnings.append(f"Severe class imbalance: minority class represents only {round(min_class_pct, 1)}% of total samples. Stratified splitting and class weighting will be applied.")

    # 3. Feature Columns & Data Leakage Check
    if feature_cols:
        clean_features = [str(f).strip() for f in feature_cols]
        # Data Leakage Guard: Target must NEVER be inside feature columns
        if target_col in clean_features:
            errors.append(f"Critical Data Leakage Detected: Target column '{target_col}' was included in feature columns. It must be excluded from inputs.")
            clean_features = [f for f in clean_features if f != target_col]

        missing_features = [f for f in clean_features if f not in col_names]
        if missing_features:
            errors.append(f"Selected feature columns not found in dataset: {', '.join(missing_features)}.")

        if len(clean_features) == 0:
            errors.append("No valid feature columns provided for model training.")
    else:
        # Default all columns except target
        clean_features = [c for c in col_names if c != target_col]
        if len(clean_features) == 0:
            errors.append("No feature columns available after excluding the target.")

    # 4. Check for 100% null feature columns
    for f in clean_features:
        if f in df.columns:
            if df[f].isnull().all():
                errors.append(f"Feature column '{f}' is 100% empty/null.")
            elif df[f].isnull().mean() > 0.5:
                warnings.append(f"Feature column '{f}' has {round(df[f].isnull().mean() * 100, 1)}% missing values. Median/mode imputation will be applied.")

    # Recommendations
    if warnings and not errors:
        recommendations.append("Dataset passed clinical validation with advisories. Data preprocessing pipeline will automatically handle scaling and imputation.")

    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "recommendations": recommendations,
        "dataset_type": "tabular",
        "sample_count": row_count,
        "feature_count": len(clean_features),
        "target_column": target_col,
        "validated_features": clean_features
    }

def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            "is_valid": False,
            "errors": ["Usage: python dataset_validator.py <file_path> <target_column> [feature_columns_json] [--disease <disease>]"]
        }))
        sys.exit(1)

    file_path = sys.argv[1]
    target_col = sys.argv[2]
    feature_cols = None
    disease = None

    if len(sys.argv) > 3 and not sys.argv[3].startswith('--'):
        try:
            feature_cols = json.loads(sys.argv[3])
        except Exception:
            feature_cols = [f.strip() for f in sys.argv[3].split(',')]

    if "--disease" in sys.argv:
        idx = sys.argv.index("--disease")
        if idx + 1 < len(sys.argv):
            disease = sys.argv[idx + 1]

    res = validate_dataset(file_path, target_col, feature_cols, disease)
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    main()
