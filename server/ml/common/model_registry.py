"""
MediAgent — Disease-Specific Model Registry
Maintains independent model registries, paths, feature schemas, preprocessors, and metrics
for each of the 5 diseases (Diabetes, Malaria, Dengue, Typhoid, Chikungunya).
"""

import os
import sys
import json
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(SCRIPT_DIR)
REGISTRY_PATH = os.path.join(ML_DIR, "models", "model_registry.json")

DEFAULT_REGISTRY = {
    "diabetes": {
        "disease": "diabetes",
        "display_name": "Type 2 Diabetes Mellitus",
        "status": "TRAINED",
        "model_type": "tabular",
        "algorithm": "Logistic Regression + StandardScaler",
        "model_version": "v2.0.0-pima-diabetes",
        "model_path": "models/diabetes/model.joblib",
        "preprocessor_path": "models/diabetes/preprocessor.joblib",
        "schema_path": "models/diabetes/feature_schema.json",
        "metadata_path": "models/diabetes/model_metadata.json",
        "feature_count": 8,
        "features": ["preg", "plas", "pres", "skin", "insu", "mass", "pedi", "age"],
        "target_column": "outcome",
        "classes": ["0", "1"],
        "class_labels": {"0": "Non-Diabetic", "1": "Diabetic"},
        "metrics": {
            "accuracy": 0.7143,
            "precision": 0.6087,
            "recall_sensitivity": 0.5185,
            "specificity": 0.82,
            "f1_score": 0.56,
            "roc_auc": 0.823
        },
        "dataset_provenance": {
            "name": "Pima Indians Diabetes Dataset (NIDDK / UCI #34)",
            "sample_size": 768,
            "type": "tabular",
            "citation": "Smith et al. (1988), IEEE Computer Society Press"
        },
        "explanation_method": "SHAP LinearExplainer",
        "updated_at": "2026-10-04T11:13:00Z"
    },
    "dengue": {
        "disease": "dengue",
        "display_name": "Dengue Fever Infection",
        "status": "TRAINED",
        "model_type": "tabular",
        "algorithm": "HistGradientBoostingClassifier / Random Forest",
        "model_version": "v1.0.0-dengue-clinical",
        "model_path": "models/dengue/model.joblib",
        "preprocessor_path": "models/dengue/preprocessor.joblib",
        "schema_path": "models/dengue/feature_schema.json",
        "metadata_path": "models/dengue/model_metadata.json",
        "feature_count": 14,
        "features": [
            "Gender", "Age", "NS1", "IgG", "IgM", "Fever_Duration",
            "Body_Temperature", "Platelet_Count", "WBC_Count",
            "Joint_Pain", "Headache", "Retro_Orbital_Pain", "Myalgia", "Rash"
        ],
        "target_column": "Outcome",
        "classes": ["0", "1"],
        "class_labels": {"0": "Dengue Negative / Other Febrile Illness", "1": "Dengue Confirmed"},
        "metrics": {
            "accuracy": 0.965,
            "precision": 0.953,
            "recall_sensitivity": 0.981,
            "specificity": 0.947,
            "f1_score": 0.967,
            "roc_auc": 0.993
        },
        "dataset_provenance": {
            "name": "Dengue Clinical Hematology & Serology Cohort",
            "sample_size": 1000,
            "type": "tabular"
        },
        "explanation_method": "Feature Importances / Risk Coefficients",
        "updated_at": "2026-11-08T20:44:00Z"
    },
    "malaria": {
        "disease": "malaria",
        "display_name": "Malaria Clinical Severity & Histology",
        "status": "TRAINED",
        "model_type": "tabular_and_image",
        "algorithm": "GradientBoostingClassifier (Clinical) + Histology Support",
        "model_version": "v1.0.0-malaria-severity",
        "model_path": "models/malaria/model.joblib",
        "preprocessor_path": "models/malaria/preprocessor.joblib",
        "schema_path": "models/malaria/feature_schema.json",
        "metadata_path": "models/malaria/model_metadata.json",
        "feature_count": 17,
        "features": [
            "age", "sex", "fever", "cold", "rigor", "fatigue",
            "headace", "bitter_tongue", "vomitting", "diarrhea",
            "Convulsion", "Anemia", "jundice", "cocacola_urine",
            "hypoglycemia", "prostraction", "hyperpyrexia"
        ],
        "target_column": "severe_maleria",
        "classes": ["0", "1"],
        "class_labels": {"0": "Mild / Uncomplicated Malaria", "1": "Severe / Complicated Malaria"},
        "metrics": {
            "accuracy": 0.8676,
            "precision": 0.8182,
            "recall_sensitivity": 0.7826,
            "specificity": 0.9111,
            "f1_score": 0.80,
            "roc_auc": 0.906
        },
        "dataset_provenance": {
            "name": "Clinical Malaria Emergency Severity Cohort",
            "sample_size": 337,
            "type": "tabular"
        },
        "explanation_method": "Feature Weight Impact Attribution",
        "updated_at": "2026-11-08T20:44:00Z"
    },
    "chikungunya": {
        "disease": "chikungunya",
        "display_name": "Chikungunya Arboviral Disease",
        "status": "TRAINED",
        "model_type": "tabular",
        "algorithm": "RandomForestClassifier (Calibrated)",
        "model_version": "v1.0.0-chikungunya-sinan",
        "model_path": "models/chikungunya/model.joblib",
        "preprocessor_path": "models/chikungunya/preprocessor.joblib",
        "schema_path": "models/chikungunya/feature_schema.json",
        "metadata_path": "models/chikungunya/model_metadata.json",
        "feature_count": 12,
        "features": [
            "fever", "myalgia", "headache", "rash", "vomiting",
            "nausea", "back_pain", "conjunctivitis", "arthritis",
            "arthralgia", "petechiae", "leukopenia"
        ],
        "target_column": "target",
        "classes": ["0", "1"],
        "class_labels": {"0": "Discarded / Febrile Negative Control", "1": "Chikungunya Confirmed"},
        "metrics": {
            "accuracy": 0.6975,
            "precision": 0.7024,
            "recall_sensitivity": 0.685,
            "specificity": 0.71,
            "f1_score": 0.6935,
            "roc_auc": 0.7635
        },
        "dataset_provenance": {
            "name": "Brazil Ministry of Health SINAN Arboviral Cohort",
            "sample_size": 10000,
            "type": "tabular"
        },
        "explanation_method": "Feature Gini Importance Ranking",
        "updated_at": "2026-11-08T20:45:00Z"
    },
    "typhoid": {
        "disease": "typhoid",
        "display_name": "Typhoid Enteric Fever",
        "status": "NOT_TRAINED",
        "model_type": "tabular",
        "algorithm": "Pending Dataset Training",
        "model_version": "v1.0.0-typhoid",
        "model_path": "models/typhoid/model.joblib",
        "preprocessor_path": "models/typhoid/preprocessor.joblib",
        "schema_path": "models/typhoid/feature_schema.json",
        "metadata_path": "models/typhoid/model_metadata.json",
        "feature_count": 0,
        "features": [],
        "target_column": "typhoid_status",
        "classes": [],
        "class_labels": {},
        "metrics": {},
        "dataset_provenance": {
            "name": "TyphoDx-BD Clinical Dataset / Custom Upload",
            "sample_size": 0,
            "type": "tabular"
        },
        "explanation_method": "Clinical Feature Attribution",
        "updated_at": None
    }
}

def load_registry():
    """Loads the model registry from disk or initializes defaults."""
    if os.path.exists(REGISTRY_PATH):
        try:
            with open(REGISTRY_PATH, 'r', encoding='utf-8') as f:
                registry = json.load(f)
            # Ensure all 5 diseases are present
            for d, default_info in DEFAULT_REGISTRY.items():
                if d not in registry:
                    registry[d] = default_info
            return registry
        except Exception:
            pass

    # Ensure parent dir exists
    os.makedirs(os.path.dirname(REGISTRY_PATH), exist_ok=True)
    with open(REGISTRY_PATH, 'w', encoding='utf-8') as f:
        json.dump(DEFAULT_REGISTRY, f, indent=2)
    return DEFAULT_REGISTRY

def save_registry(registry):
    """Saves the registry safely to disk."""
    os.makedirs(os.path.dirname(REGISTRY_PATH), exist_ok=True)
    with open(REGISTRY_PATH, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)

def register_disease_model(disease_id, model_info):
    """Registers or updates a trained model for a specific disease."""
    reg = load_registry()
    disease_key = disease_id.lower().strip()
    
    current = reg.get(disease_key, {})
    current.update(model_info)
    current["disease"] = disease_key
    current["updated_at"] = datetime.utcnow().isoformat() + "Z"
    current["status"] = "TRAINED"
    
    reg[disease_key] = current
    save_registry(reg)
    return current

def get_model_info(disease_id):
    """Returns model info for a specific disease."""
    reg = load_registry()
    disease_key = disease_id.lower().strip()
    return reg.get(disease_key)

def main():
    reg = load_registry()
    if len(sys.argv) > 1:
        disease_query = sys.argv[1].lower().strip()
        info = reg.get(disease_query)
        if info:
            print(json.dumps(info, indent=2))
        else:
            print(json.dumps({"status": "ERROR", "message": f"Disease '{disease_query}' not found in registry."}))
    else:
        print(json.dumps(reg, indent=2))

if __name__ == "__main__":
    main()
