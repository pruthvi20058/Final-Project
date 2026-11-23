"""
MediAgent — Universal Dataset Inspector
Inspects tabular (CSV, XLSX, JSON) and image (ZIP) clinical datasets.
Extracts schema, column types, missing values, duplicates, class distributions, candidate targets,
and evaluates disease suitability without ever forcing Diabetes features onto non-diabetes datasets.
"""

import os
import sys
import json
import zipfile
import numpy as np
import pandas as pd
from collections import Counter

# Ensure UTF-8 output encoding for cross-platform compatibility
sys.stdout.reconfigure(encoding='utf-8')

# Disease Clinical Keyword Profiles for Suitability Matching
DISEASE_KEYWORD_PROFILES = {
    "diabetes": {
        "keywords": ['glucose', 'insulin', 'bmi', 'hba1c', 'diabetes', 'sugar', 'glycated', 'blood_pressure', 'skin_thickness', 'pregnancies', 'pedigree', 'mass', 'plas', 'pres', 'insu', 'skin', 'preg', 'pedi'],
        "description": "Metabolic disorder characterized by hyperglycemia, insulin resistance/deficiency, and elevated BMI."
    },
    "dengue": {
        "keywords": ['ns1', 'platelet', 'thrombocyte', 'dengue', 'hematocrit', 'wbc', 'retro_orbital', 'joint_pain', 'fever', 'myalgia', 'rash', 'body_temperature', 'igg', 'igm', 'fever_duration', 'breakbone'],
        "description": "Flavivirus infection presenting with high fever, thrombocytopenia, retro-orbital pain, leukopenia, and NS1/IgM serology."
    },
    "malaria": {
        "keywords": ['malaria', 'parasite', 'smear', 'plasmodium', 'chills', 'rigor', 'jaundice', 'anemia', 'cocacola_urine', 'fever', 'uninfected', 'parasitized', 'rbc', 'erythrocyte', 'prostraction', 'hyperpyrexia', 'falciparum', 'vivax'],
        "description": "Protozoan parasitic infection transmitted by Anopheles mosquitoes, characterized by cyclical paroxysms, rigors, anemia, and microscopic parasitemia."
    },
    "chikungunya": {
        "keywords": ['chikungunya', 'chikv', 'arthralgia', 'joint_pain', 'joint_swelling', 'arthritis', 'petechiae', 'fever', 'rash', 'myalgia', 'rt_pcr', 'igm', 'sinan', 'polyarthralgia'],
        "description": "Alphavirus infection distinguished by sudden high fever, rash, and severe bilateral polyarthralgia/joint swelling with preserved platelets."
    },
    "typhoid": {
        "keywords": ['typhoid', 'salmonella', 'enteric', 'widal', 'blood_culture', 'abdominal_pain', 'constipation', 'diarrhea', 'fever_duration', 'hepatomegaly', 'splenomegaly', 'typhoid_fever', 'widal_to', 'widal_th', 'rose_spots', 'typhodx'],
        "description": "Systemic infection caused by Salmonella enterica serovar Typhi, presenting with step-ladder fever, abdominal symptoms, and confirmed via blood culture or serology."
    }
}

TARGET_CANDIDATE_NAMES = [
    'outcome', 'diagnosis', 'disease', 'label', 'class', 'infection_status',
    'result', 'target', 'status', 'severe_maleria', 'chikungunya', 'dengue',
    'typhoid', 'diabetes', 'positive', 'category', 'type', 'condition'
]

def detect_column_type(series, col_name):
    """Detects clean functional clinical type: numeric, categorical, boolean, id, or text."""
    col_lower = col_name.lower().strip()
    if col_lower in ['id', 'patient_id', 'patientid', 'case_id', 'record_id', 'uuid', 'subject_id']:
        return 'id'
    
    unique_count = series.nunique(dropna=True)
    total_count = len(series)

    # Boolean check
    if unique_count <= 2:
        vals = set(series.dropna().unique())
        if vals.issubset({0, 1, 0.0, 1.0, True, False, '0', '1', 'True', 'False', 'true', 'false', 'Y', 'N', 'Yes', 'No', 'yes', 'no', 'Positive', 'Negative'}):
            return 'boolean'

    # Numeric check
    if pd.api.types.is_numeric_dtype(series):
        # Small unique integers may be categorical/ordinal
        if unique_count <= 10 and series.dtype in [np.int64, np.int32, int]:
            return 'categorical'
        return 'numeric'

    # Check if object can be safely parsed to numeric
    try:
        converted = pd.to_numeric(series.dropna(), errors='coerce')
        if converted.notnull().mean() > 0.8:
            return 'numeric'
    except Exception:
        pass

    if unique_count <= 25 and unique_count < total_count * 0.5:
        return 'categorical'

    return 'text'

def analyze_disease_suitability(columns, detected_type, selected_disease=None, image_classes=None):
    """Analyzes whether the dataset is suitable for the selected disease."""
    if not selected_disease:
        return {
            "disease": None,
            "suitability_score": 50,
            "matched_indicators": [],
            "verdict": "No disease selected for validation.",
            "recommendations": ["Select a specific disease module to evaluate suitability."]
        }

    disease_key = selected_disease.lower().strip()
    profile = DISEASE_KEYWORD_PROFILES.get(disease_key, {})
    keywords = profile.get("keywords", [])

    matched_indicators = []
    
    if detected_type == "image":
        if disease_key == "malaria":
            # Image datasets are authentic for malaria microscopy
            matched_indicators.append("Microscopy Cell Image Dataset")
            if image_classes:
                for cls in image_classes:
                    if any(k in cls.lower() for k in ['parasite', 'infected', 'uninfected', 'malaria', 'cell']):
                        matched_indicators.append(f"Class '{cls}' matches malaria histology")
            suitability_score = 95
            verdict = "Excellent match: Microscopy image dataset is authentic for Malaria cell classification."
        else:
            suitability_score = 15
            verdict = f"Image dataset uploaded, but {selected_disease.title()} primarily requires clinical tabular/laboratory data."
            return {
                "disease": selected_disease,
                "suitability_score": suitability_score,
                "matched_indicators": matched_indicators,
                "verdict": verdict,
                "recommendations": [f"Upload a tabular CSV/XLSX dataset with clinical biomarkers for {selected_disease.title()}."]
            }
    else:
        # Tabular evaluation
        col_names_lower = [str(c).lower().replace(" ", "_") for c in columns]
        for kw in keywords:
            for c in col_names_lower:
                if kw in c and c not in matched_indicators:
                    matched_indicators.append(c)

        match_count = len(matched_indicators)
        total_cols = len(columns)

        if match_count >= 5 or (total_cols > 0 and match_count / total_cols >= 0.4):
            suitability_score = 90
            verdict = f"High clinical suitability: Identified {match_count} disease-specific biomarkers for {selected_disease.title()}."
        elif match_count >= 2:
            suitability_score = 75
            verdict = f"Moderate clinical suitability: Found {match_count} indicators matching {selected_disease.title()} clinical profile."
        elif match_count == 1:
            suitability_score = 50
            verdict = f"Low-to-moderate match: Only 1 parameter explicitly matched {selected_disease.title()} keywords. Verify column mapping."
        else:
            suitability_score = 30
            verdict = f"Low keyword overlap with {selected_disease.title()} clinical profile. Ensure columns represent valid clinical measurements."

    # Strict Anti-Leakage / Cross-Contamination Guard
    other_diseases = [d for d in DISEASE_KEYWORD_PROFILES if d != disease_key]
    contamination_warnings = []
    if detected_type == "tabular":
        for other in other_diseases:
            other_kw = DISEASE_KEYWORD_PROFILES[other]["keywords"]
            other_matches = [c for c in columns if any(k in str(c).lower() for k in other_kw[:4])]
            if len(other_matches) >= 3 and len(matched_indicators) < len(other_matches):
                contamination_warnings.append(
                    f"Notice: Dataset contains indicators ({', '.join(other_matches[:3])}) strongly characteristic of {other.title()}. Confirm this is intended for {selected_disease.title()}."
                )

    recommendations = []
    if suitability_score < 60:
        recommendations.append(f"Review target and feature column mappings to ensure valid {selected_disease.title()} clinical provenance.")
    if contamination_warnings:
        recommendations.extend(contamination_warnings)

    return {
        "disease": selected_disease,
        "suitability_score": suitability_score,
        "matched_indicators": matched_indicators,
        "verdict": verdict,
        "recommendations": recommendations,
        "profile_description": profile.get("description", "")
    }

def inspect_zip_dataset(zip_path, selected_disease=None):
    """Inspects ZIP archives to detect microscopy image datasets or compressed tabular data."""
    if not zipfile.is_zipfile(zip_path):
        return {"status": "ERROR", "message": f"File at {zip_path} is not a valid ZIP archive."}

    with zipfile.ZipFile(zip_path, 'r') as zf:
        namelist = zf.namelist()

        # Check for image files
        image_extensions = ('.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp')
        image_files = [f for f in namelist if f.lower().endswith(image_extensions) and not f.startswith('__MACOSX/')]

        # Check for tabular files inside ZIP
        tabular_extensions = ('.csv', '.xlsx', '.json')
        tabular_files = [f for f in namelist if f.lower().endswith(tabular_extensions) and not f.startswith('__MACOSX/')]

        if image_files:
            # Parse directory structure to detect classes
            class_counts = Counter()
            sample_paths = []

            for img in image_files:
                parts = os.path.normpath(img).split(os.sep)
                if len(parts) >= 2:
                    class_name = parts[-2]
                else:
                    class_name = "unclassified"
                class_counts[class_name] += 1
                if len(sample_paths) < 5:
                    sample_paths.append(img)

            classes = sorted(list(class_counts.keys()))
            suitability = analyze_disease_suitability([], "image", selected_disease, image_classes=classes)

            return {
                "status": "SUCCESS",
                "file_type": "zip",
                "dataset_type": "image",
                "total_images": len(image_files),
                "classes": classes,
                "class_distribution": dict(class_counts),
                "num_classes": len(classes),
                "sample_images": sample_paths,
                "candidate_targets": ["directory_label"],
                "target_column": "directory_label",
                "columns": ["image_path", "image_width", "image_height", "channels", "directory_label"],
                "disease_suitability": suitability,
                "summary": f"Microscopy image dataset with {len(image_files)} images across {len(classes)} classes ({', '.join(classes)})."
            }

        elif tabular_files:
            # Extract first tabular file for inspection
            first_tabular = tabular_files[0]
            temp_extract = os.path.join(os.path.dirname(zip_path), f"extracted_{os.path.basename(first_tabular)}")
            with open(temp_extract, 'wb') as f_out:
                f_out.write(zf.read(first_tabular))
            res = inspect_tabular_file(temp_extract, selected_disease)
            res["source_archive"] = os.path.basename(zip_path)
            res["extracted_file"] = first_tabular
            try:
                os.remove(temp_extract)
            except Exception:
                pass
            return res
        else:
            return {
                "status": "ERROR",
                "message": "ZIP archive does not contain supported images (.png, .jpg, .jpeg) or tabular datasets (.csv, .xlsx, .json)."
            }

def inspect_tabular_file(file_path, selected_disease=None):
    """Inspects CSV, XLSX, and JSON datasets with complete clinical audit."""
    ext = os.path.splitext(file_path)[1].lower()

    try:
        if ext == '.csv':
            # Try multiple encodings
            for enc in ['utf-8', 'latin1', 'iso-8859-1', 'cp1252']:
                try:
                    df = pd.read_csv(file_path, encoding=enc, low_memory=False)
                    break
                except UnicodeDecodeError:
                    continue
            else:
                return {"status": "ERROR", "message": f"Unable to decode CSV file with standard encodings."}
        elif ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
        elif ext == '.json':
            df = pd.read_json(file_path)
        else:
            return {"status": "ERROR", "message": f"Unsupported file extension '{ext}'. Supported formats: CSV, XLSX, JSON, and ZIP."}
    except Exception as e:
        return {"status": "ERROR", "message": f"Failed to parse dataset: {str(e)}"}

    if df.empty or len(df.columns) == 0:
        return {"status": "ERROR", "message": "Uploaded dataset is empty or contains zero columns."}

    row_count = int(df.shape[0])
    col_count = int(df.shape[1])
    col_names = [str(c).strip() for c in df.columns]
    df.columns = col_names

    duplicate_rows = int(df.duplicated().sum())
    total_missing_cells = int(df.isnull().sum().sum())
    total_cells = row_count * col_count
    missing_pct = round((total_missing_cells / total_cells * 100.0), 2) if total_cells > 0 else 0.0

    column_details = {}
    candidate_targets = []
    class_distributions = {}

    for col in col_names:
        series = df[col]
        null_count = int(series.isnull().sum())
        null_pct = round((null_count / row_count * 100.0), 2) if row_count > 0 else 0.0
        unique_count = int(series.nunique(dropna=True))
        detected_type = detect_column_type(series, col)

        sample_vals = [str(v) for v in series.dropna().unique()[:4]]

        column_details[col] = {
            "name": col,
            "detected_type": detected_type,
            "dtype": str(series.dtype),
            "non_null_count": int(series.notnull().sum()),
            "null_count": null_count,
            "null_percentage": null_pct,
            "unique_count": unique_count,
            "sample_values": sample_vals
        }

        # Target candidate detection
        col_lower = col.lower().replace(" ", "_").replace("-", "_")
        is_target_name = any(col_lower == c or col_lower.startswith(c) or col_lower.endswith(c) for c in TARGET_CANDIDATE_NAMES)
        is_reasonable_cardinality = (2 <= unique_count <= 10)

        confidence_score = 0
        if is_target_name:
            confidence_score += 60
        if is_reasonable_cardinality and detected_type in ['categorical', 'boolean', 'numeric']:
            confidence_score += 30
        if detected_type == 'boolean':
            confidence_score += 20
        if detected_type == 'id':
            confidence_score = 0

        if confidence_score >= 40:
            candidate_targets.append({
                "column": col,
                "confidence": confidence_score,
                "unique_count": unique_count,
                "type": detected_type
            })

            # Calculate class distribution
            val_counts = series.value_counts(dropna=True).head(10).to_dict()
            class_distributions[col] = {str(k): int(v) for k, v in val_counts.items()}

    candidate_targets.sort(key=lambda x: x["confidence"], reverse=True)
    suggested_target = candidate_targets[0]["column"] if candidate_targets else None

    # Suitability Analysis
    suitability = analyze_disease_suitability(col_names, "tabular", selected_disease)

    summary_text = (
        f"Tabular clinical dataset containing {row_count} patient records across {col_count} parameters. "
        f"Missing values: {missing_pct}% ({total_missing_cells} cells). Duplicate rows: {duplicate_rows}. "
        f"Detected {len(candidate_targets)} candidate target column(s); suggested primary target: '{suggested_target or 'None'}'. "
        f"{suitability['verdict']}"
    )

    return {
        "status": "SUCCESS",
        "file_type": ext.replace('.', ''),
        "dataset_type": "tabular",
        "row_count": row_count,
        "column_count": col_count,
        "columns": col_names,
        "column_details": column_details,
        "missing_values": {
            "total_cells": total_cells,
            "missing_cells": total_missing_cells,
            "missing_percentage": missing_pct
        },
        "duplicate_rows": duplicate_rows,
        "candidate_targets": candidate_targets,
        "suggested_target": suggested_target,
        "class_distributions": class_distributions,
        "disease_suitability": suitability,
        "summary": summary_text
    }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "status": "ERROR",
            "message": "Usage: python dataset_inspector.py <path_to_file> [--disease <disease_name>]"
        }))
        sys.exit(1)

    file_path = sys.argv[1]
    selected_disease = None

    if "--disease" in sys.argv:
        idx = sys.argv.index("--disease")
        if idx + 1 < len(sys.argv):
            selected_disease = sys.argv[idx + 1]

    if not os.path.exists(file_path):
        print(json.dumps({"status": "ERROR", "message": f"File not found: {file_path}"}))
        sys.exit(1)

    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.zip':
        result = inspect_zip_dataset(file_path, selected_disease)
    else:
        result = inspect_tabular_file(file_path, selected_disease)

    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
