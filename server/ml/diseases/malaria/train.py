"""
MediAgent — Malaria Model Trainer
Trains clinical triage or microscopy cell classification models independently.
Supports both clinical tabular data and histology image ZIP datasets.
"""

import os
import sys
import json
import joblib
import zipfile
import numpy as np
import pandas as pd
from PIL import Image
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression, SGDClassifier

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(os.path.dirname(SCRIPT_DIR))
sys.path.insert(0, os.path.join(ML_DIR, "common"))

from evaluation import evaluate_classifier
from model_registry import register_disease_model

def train_malaria_images(zip_path, algorithm="Random Forest"):
    """Trains a microscopy cell image classifier from a ZIP archive."""
    extract_dir = os.path.join(SCRIPT_DIR, "temp_extracted_images")
    os.makedirs(extract_dir, exist_ok=True)

    with zipfile.ZipFile(zip_path, 'r') as zf:
        zf.extractall(extract_dir)

    # Gather images per class
    image_paths = []
    labels = []
    classes = set()

    for root, _, files in os.walk(extract_dir):
        for f in files:
            if f.lower().endswith(('.png', '.jpg', '.jpeg')) and not f.startswith('.'):
                full_p = os.path.join(root, f)
                rel_parts = os.path.relpath(full_p, extract_dir).split(os.sep)
                if len(rel_parts) >= 2:
                    cls_name = rel_parts[0]
                else:
                    cls_name = "unclassified"
                image_paths.append(full_p)
                labels.append(cls_name)
                classes.add(cls_name)

    classes = sorted(list(classes))
    if len(classes) < 2 or len(image_paths) < 10:
        return {"status": "ERROR", "message": f"Found insufficient classes ({len(classes)}) or images ({len(image_paths)}) in ZIP archive."}

    class_to_idx = {c: i for i, c in enumerate(classes)}
    y = np.array([class_to_idx[l] for l in labels])

    # Extract pixel features (resized to 48x48 to optimize memory and CPU training latency)
    X = []
    valid_y = []
    for p, label_idx in zip(image_paths, y):
        try:
            with Image.open(p) as img:
                img_rgb = img.convert('RGB').resize((48, 48))
                arr = (np.array(img_rgb, dtype=np.float32) / 255.0).flatten()
                X.append(arr)
                valid_y.append(label_idx)
        except Exception:
            pass

    X = np.array(X)
    y = np.array(valid_y)

    # Clean extracted images
    import shutil
    try:
        shutil.rmtree(extract_dir)
    except Exception:
        pass

    # 80/20 Stratified Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    clf = RandomForestClassifier(n_estimators=60, max_depth=12, random_state=42, n_jobs=-1)
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    y_proba = clf.predict_proba(X_test)

    class_labels = {str(i): c for i, c in enumerate(classes)}
    eval_metrics = evaluate_classifier(y_test, y_pred, y_proba, class_labels)

    # Save artifacts
    save_dirs = [SCRIPT_DIR, os.path.join(ML_DIR, "models", "malaria")]
    for s_dir in save_dirs:
        os.makedirs(s_dir, exist_ok=True)
        joblib.dump(clf, os.path.join(s_dir, "model.joblib"))
        joblib.dump({
            "is_image_model": True,
            "target_size": [48, 48],
            "classes": classes,
            "class_to_idx": class_to_idx,
            "feature_cols": [f"pixel_{i}" for i in range(X.shape[1])]
        }, os.path.join(s_dir, "preprocessor.joblib"))

        schema_payload = {
            "disease": "malaria",
            "model_version": "v1.0.0-malaria-histology",
            "model_type": "image",
            "input_shape": [48, 48, 3],
            "classes": classes
        }
        with open(os.path.join(s_dir, "feature_schema.json"), "w", encoding="utf-8") as f:
            json.dump(schema_payload, f, indent=2)

        metadata = {
            "model_name": "MediAgent Malaria Microscopy Cell Classifier",
            "model_version": "v1.0.0-malaria-histology",
            "algorithm": "Random Forest Image Classifier (48x48 RGB)",
            "model_type": "image",
            "feature_count": X.shape[1],
            "classes": classes,
            "sample_size": len(image_paths),
            "selected_model_test_metrics": eval_metrics
        }
        with open(os.path.join(s_dir, "metadata.json"), "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
        with open(os.path.join(s_dir, "model_metadata.json"), "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

    register_disease_model("malaria", {
        "status": "TRAINED",
        "model_type": "image",
        "algorithm": "Random Forest Image Classifier (48x48 RGB)",
        "classes": classes,
        "class_labels": class_labels,
        "metrics": eval_metrics,
        "model_version": "v1.0.0-malaria-histology"
    })

    return {
        "status": "SUCCESS",
        "disease": "malaria",
        "model_type": "image",
        "metrics": eval_metrics,
        "sample_size": len(image_paths),
        "classes": classes
    }

def train_malaria_tabular(data_path=None, target_col="severe_maleria", feature_cols=None, algorithm="Auto"):
    """Trains a clinical symptom triage model from a tabular dataset."""
    if not data_path:
        data_path = os.path.join(ML_DIR, "data", "malaria_clinical.csv")

    if not os.path.exists(data_path):
        return {"status": "ERROR", "message": f"Malaria tabular dataset not found at {data_path}"}

    df = pd.read_csv(data_path)

    if not feature_cols:
        feature_cols = [
            'age', 'sex', 'fever', 'cold', 'rigor', 'fatigue',
            'headace', 'bitter_tongue', 'vomitting', 'diarrhea',
            'Convulsion', 'Anemia', 'jundice', 'cocacola_urine',
            'hypoglycemia', 'prostraction', 'hyperpyrexia'
        ]

    actual_features = [c for c in feature_cols if c in df.columns and c != target_col]
    if len(actual_features) == 0:
        actual_features = [c for c in df.columns if c != target_col]

    if target_col not in df.columns:
        for candidate in ['severe_maleria', 'severe_malaria', 'malaria', 'outcome', 'Outcome', 'diagnosis', 'target']:
            if candidate in df.columns:
                target_col = candidate
                break

    X = df[actual_features].copy()
    y_raw = df[target_col].dropna()

    if y_raw.dtype == object:
        labels, unique_classes = pd.factorize(y_raw)
        y = pd.Series(labels, index=y_raw.index)
        class_labels = {str(i): str(c) for i, c in enumerate(unique_classes)}
    else:
        y = y_raw.astype(int)
        class_labels = {"0": "Mild / Uncomplicated Malaria", "1": "Severe / Complicated Malaria"}

    X = X.loc[y.index]

    for col in X.columns:
        if pd.api.types.is_numeric_dtype(X[col]):
            X[col] = X[col].fillna(X[col].median())
        else:
            X[col] = pd.factorize(X[col].fillna("Unknown"))[0]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    cont_candidates = ['age', 'Age', 'temperature', 'fever_duration', 'parasite_density']
    cont_cols = [c for c in actual_features if c in cont_candidates or (X[c].nunique() > 10 and pd.api.types.is_numeric_dtype(X[c]))]

    scaler = StandardScaler()
    if cont_cols:
        scaler.fit(X_train[cont_cols])

    X_train_scaled = X_train.copy()
    X_test_scaled = X_test.copy()
    if cont_cols:
        X_train_scaled[cont_cols] = scaler.transform(X_train[cont_cols])
        X_test_scaled[cont_cols] = scaler.transform(X_test[cont_cols])

    clf = GradientBoostingClassifier(n_estimators=100, learning_rate=0.08, max_depth=3, random_state=42)
    clf.fit(X_train_scaled, y_train)

    y_pred = clf.predict(X_test_scaled)
    y_proba = clf.predict_proba(X_test_scaled)

    eval_metrics = evaluate_classifier(y_test, y_pred, y_proba, class_labels)

    save_dirs = [SCRIPT_DIR, os.path.join(ML_DIR, "models", "malaria")]
    for s_dir in save_dirs:
        os.makedirs(s_dir, exist_ok=True)
        joblib.dump(clf, os.path.join(s_dir, "model.joblib"))
        joblib.dump({
            "scaler": scaler,
            "cont_cols": cont_cols,
            "feature_cols": actual_features
        }, os.path.join(s_dir, "preprocessor.joblib"))

        canonical_features = []
        for col in actual_features:
            is_cont = col in cont_cols
            canonical_features.append({
                "name": col,
                "clinical_label": col.replace("_", " "),
                "data_type": "float" if is_cont else "int",
                "unit": "years" if "age" in col.lower() else "score",
                "required": False,
                "report_synonyms": [col.lower(), col.lower().replace("_", " ")]
            })

        schema_payload = {
            "disease": "malaria",
            "model_version": "v1.0.0-malaria-severity",
            "canonical_features": canonical_features
        }
        with open(os.path.join(s_dir, "feature_schema.json"), "w", encoding="utf-8") as f:
            json.dump(schema_payload, f, indent=2)

        metadata = {
            "model_name": "MediAgent Malaria Clinical Classifier",
            "model_version": "v1.0.0-malaria-severity",
            "algorithm": "GradientBoostingClassifier",
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

    register_disease_model("malaria", {
        "status": "TRAINED",
        "model_type": "tabular",
        "algorithm": "GradientBoostingClassifier",
        "feature_count": len(actual_features),
        "features": actual_features,
        "target_column": target_col,
        "classes": [str(c) for c in eval_metrics["classes"]],
        "class_labels": class_labels,
        "metrics": eval_metrics,
        "model_version": "v1.0.0-malaria-severity"
    })

    return {
        "status": "SUCCESS",
        "disease": "malaria",
        "model_type": "tabular",
        "metrics": eval_metrics,
        "feature_count": len(actual_features),
        "sample_size": len(df)
    }

def train_malaria(data_path=None, target_col="severe_maleria", feature_cols=None, algorithm="Auto"):
    if data_path and data_path.lower().endswith('.zip'):
        return train_malaria_images(data_path, algorithm)
    return train_malaria_tabular(data_path, target_col, feature_cols, algorithm)

if __name__ == "__main__":
    data_arg = sys.argv[1] if len(sys.argv) > 1 else None
    res = train_malaria(data_arg)
    print(json.dumps(res, indent=2))
