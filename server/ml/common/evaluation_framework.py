"""
MediAgent — Reusable ML Evaluation Framework (E4)

Computes rigorous, reproducible clinical evaluation metrics for binary
classification models. All metrics are computed on held-out test data only;
training accuracy is never reported as test accuracy.

Metrics reported:
  - Accuracy, Precision, Recall/Sensitivity, Specificity, F1-score
  - ROC-AUC, PR-AUC (where applicable)
  - Confusion matrix (TN, FP, FN, TP)
  - Cross-validation mean and standard deviation
  - Training and testing sample counts
  - Class distribution
  - Missing-data statistics
  - Duplicate-data statistics
  - Brier score (calibration)

Design principles:
  - Preprocessing is fit strictly on training data (no leakage).
  - Stratified splitting preserves class balance.
  - Reproducible random seeds (default 42).
  - No metrics are fabricated, hardcoded, or inflated.
  - Suspicious/perfect metrics are flagged for review.
"""

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, confusion_matrix,
    brier_score_loss
)
from sklearn.model_selection import StratifiedKFold, cross_validate

RANDOM_SEED = 42


def compute_binary_metrics(y_true, y_pred, y_proba_pos=None, class_labels=None):
    """
    Compute comprehensive binary classification metrics.

    Parameters
    ----------
    y_true : array-like
        Ground truth labels.
    y_pred : array-like
        Predicted labels.
    y_proba_pos : array-like, optional
        Predicted probabilities for the positive class (for ROC-AUC, PR-AUC, Brier).
    class_labels : dict, optional
        Mapping from class index to human-readable label.

    Returns
    -------
    dict with keys: accuracy, precision, recall_sensitivity, specificity,
    f1_score, roc_auc, pr_auc, brier_score, confusion_matrix, classes,
    class_labels, is_multiclass
    """
    y_true_arr = np.array(y_true)
    y_pred_arr = np.array(y_pred)
    classes = np.unique(y_true_arr)

    result = {
        "is_multiclass": False,
        "classes": [str(c) for c in classes],
        "class_labels": class_labels or {str(c): f"Class {c}" for c in classes},
    }

    if len(classes) != 2:
        # Fall back to macro-averaged multiclass metrics
        result["is_multiclass"] = True
        result["accuracy"] = float(accuracy_score(y_true_arr, y_pred_arr))
        result["precision"] = float(
            precision_score(y_true_arr, y_pred_arr, average="macro", zero_division=0)
        )
        result["recall_sensitivity"] = float(
            recall_score(y_true_arr, y_pred_arr, average="macro", zero_division=0)
        )
        result["f1_score"] = float(
            f1_score(y_true_arr, y_pred_arr, average="macro", zero_division=0)
        )
        cm = confusion_matrix(y_true_arr, y_pred_arr)
        specificities = []
        for i in range(len(classes)):
            tn = np.sum((y_true_arr != classes[i]) & (y_pred_arr != classes[i]))
            fp = np.sum((y_true_arr != classes[i]) & (y_pred_arr == classes[i]))
            specificities.append(
                float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
            )
        result["specificity"] = float(np.mean(specificities))
        result["confusion_matrix"] = {
            "classes": [str(c) for c in classes],
            "matrix": cm.tolist(),
        }
        try:
            result["roc_auc"] = float(
                roc_auc_score(y_true_arr, y_proba_pos, multi_class="ovr")
                if y_proba_pos is not None else None
            )
        except Exception:
            result["roc_auc"] = None
        result["pr_auc"] = None
        result["brier_score"] = None
        return result

    # Binary classification
    result["accuracy"] = float(accuracy_score(y_true_arr, y_pred_arr))
    result["precision"] = float(
        precision_score(y_true_arr, y_pred_arr, zero_division=0)
    )
    result["recall_sensitivity"] = float(
        recall_score(y_true_arr, y_pred_arr, zero_division=0)
    )
    result["f1_score"] = float(f1_score(y_true_arr, y_pred_arr, zero_division=0))

    cm = confusion_matrix(y_true_arr, y_pred_arr)
    if cm.shape == (2, 2):
        tn, fp, fn, tp = cm.ravel()
        result["specificity"] = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
        result["confusion_matrix"] = {
            "tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)
        }
    else:
        result["specificity"] = 0.0
        result["confusion_matrix"] = {"raw_matrix": cm.tolist()}

    result["roc_auc"] = None
    result["pr_auc"] = None
    result["brier_score"] = None
    if y_proba_pos is not None:
        try:
            proba = np.array(y_proba_pos)
            result["roc_auc"] = float(roc_auc_score(y_true_arr, proba))
            result["pr_auc"] = float(average_precision_score(y_true_arr, proba))
            result["brier_score"] = float(brier_score_loss(y_true_arr, proba))
        except Exception:
            pass

    # Round all float metrics
    for key in ["accuracy", "precision", "recall_sensitivity", "specificity",
                "f1_score", "brier_score"]:
        if result[key] is not None:
            result[key] = round(result[key], 4)
    if result["roc_auc"] is not None:
        result["roc_auc"] = round(result["roc_auc"], 4)
    if result["pr_auc"] is not None:
        result["pr_auc"] = round(result["pr_auc"], 4)

    return result


def cross_validate_model(model, X, y, cv_folds=5, random_seed=RANDOM_SEED):
    """
    Run stratified cross-validation on training data only.

    Returns dict with mean and std for accuracy, f1, roc_auc.
    """
    cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=random_seed)
    scoring = ["accuracy", "f1", "roc_auc"]
    try:
        cv_res = cross_validate(
            model, X, y, cv=cv, scoring=scoring,
            return_train_score=False, n_jobs=1
        )
        return {
            "cv_accuracy_mean": round(float(cv_res["test_accuracy"].mean()), 4),
            "cv_accuracy_std": round(float(cv_res["test_accuracy"].std()), 4),
            "cv_f1_mean": round(float(cv_res["test_f1"].mean()), 4),
            "cv_f1_std": round(float(cv_res["test_f1"].std()), 4),
            "cv_roc_auc_mean": round(float(cv_res["test_roc_auc"].mean()), 4),
            "cv_roc_auc_std": round(float(cv_res["test_roc_auc"].std()), 4),
            "cv_folds": cv_folds,
        }
    except Exception as e:
        return {
            "cv_error": str(e),
            "cv_folds": cv_folds,
        }


def evaluate_classifier(y_true, y_pred, y_proba=None, class_labels=None):
    """
    Backward-compatible wrapper around compute_binary_metrics.
    """
    return compute_binary_metrics(y_true, y_pred, y_proba, class_labels)


def flag_suspicious_metrics(metrics, dataset_name="dataset"):
    """
    Heuristically flag statistically implausible metrics for review.

    Returns list of audit_flag strings.
    """
    flags = []
    if not metrics or not isinstance(metrics, dict):
        return ["METRICS_MISSING"]

    acc = metrics.get("accuracy")
    prec = metrics.get("precision")
    rec = metrics.get("recall_sensitivity")
    f1 = metrics.get("f1_score")
    roc = metrics.get("roc_auc")

    # Perfect metrics across the board — strong leakage signal
    perfect_keys = [
        k for k, v in {
            "accuracy": acc, "precision": prec, "recall": rec,
            "f1": f1, "roc_auc": roc
        }.items() if v == 1.0 or v == 1
    ]
    if len(perfect_keys) >= 3:
        flags.append(
            f"PERFECT_METRICS_SUSPICIOUS ({', '.join(perfect_keys)}=1.0) — "
            f"possible target leakage or label contamination in {dataset_name}"
        )

    # Accuracy near 1.0 but other metrics imperfect — still suspicious
    if acc == 1.0 and (prec is None or rec is None or prec < 1.0 or rec < 1.0):
        flags.append(
            f"PERFECT_ACCURACY_WITH_IMPERFIT_SUBMETRICS — inconsistent with "
            f"genuine clinical performance in {dataset_name}"
        )

    # Near-chance ROC-AUC
    if roc is not None and roc < 0.6:
        flags.append(
            f"NEAR_CHANCE_PERFORMANCE (ROC-AUC={roc}) — model has little "
            f"discriminative ability on {dataset_name}"
        )

    # Sensitivity 1.0 with low specificity — possible trivial positive bias
    if rec == 1.0 and prec is not None and prec < 0.7:
        flags.append(
            f"PERFECT_RECALL_LOW_PRECISION (recall=1.0, precision={prec}) — "
            f"possible trivial positive-bias classifier on {dataset_name}"
        )

    return flags


def dataset_quality_report(df, target_col):
    """
    Produce a dataset quality report: shape, duplicates, missing values,
    class distribution, and feature list.

    Returns dict suitable for display in Dataset Studio and audit logs.
    """
    report = {
        "shape": {"rows": int(df.shape[0]), "cols": int(df.shape[1])},
        "columns": list(df.columns),
        "feature_columns": [c for c in df.columns if c != target_col],
        "target_column": target_col,
        "duplicate_rows_all": int(df.duplicated().sum()),
        "duplicate_rows_excluding_target": int(
            df.duplicated(subset=[c for c in df.columns if c != target_col]).sum()
        ),
        "missing_values": {
            c: int(df[c].isna().sum()) for c in df.columns if df[c].isna().sum() > 0
        },
        "missing_total": int(df.isna().sum().sum()),
        "class_distribution": {},
        "conflicting_duplicate_labels": 0,
    }

    if target_col in df.columns:
        vc = df[target_col].value_counts(dropna=False)
        report["class_distribution"] = {
            str(k): int(v) for k, v in vc.items()
        }

        # Conflicting labels: same feature values, different target
        feat_cols = [c for c in df.columns if c != target_col]
        dup_mask = df.duplicated(subset=feat_cols, keep=False)
        if dup_mask.any():
            conflicts = (
                df[dup_mask]
                .groupby(feat_cols)[target_col]
                .nunique()
            )
            report["conflicting_duplicate_labels"] = int((conflicts > 1).sum())

    return report


def check_target_leakage(df, target_col, feature_cols):
    """
    Heuristic check for target leakage: any single feature that perfectly
    determines the target (one feature value maps to only one class).

    Returns list of {feature, description} dicts for leaked features.
    """
    leaked = []
    if target_col not in df.columns:
        return leaked

    for col in feature_cols:
        if col not in df.columns:
            continue
        try:
            ct = pd.crosstab(df[col], df[target_col])
            # A feature value is a "perfect predictor" if it appears with only
            # one target class AND covers a meaningful share of rows.
            for val in ct.index:
                row = ct.loc[val]
                nonzero = (row > 0).sum()
                if nonzero == 1:
                    # Only one class for this feature value
                    total_for_val = int(row.sum())
                    if total_for_val >= max(2, int(0.01 * len(df))):
                        leaked.append({
                            "feature": col,
                            "feature_value": str(val),
                            "target_class": str(row.idxmax()),
                            "rows_affected": total_for_val,
                            "description": (
                                f"Feature '{col}'={val} always maps to "
                                f"target={row.idxmax()} ({total_for_val} rows) "
                                f"— possible target leakage"
                            ),
                        })
                        break  # one evidence per feature is enough to flag
        except Exception:
            continue

    return leaked
