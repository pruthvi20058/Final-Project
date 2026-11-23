"""
MediAgent — Standardized Clinical Evaluation Metrics Engine
Computes accuracy, precision, recall (sensitivity), specificity, F1 score,
ROC-AUC, Brier score, and confusion matrix with clinical provenance.
"""

import numpy as np
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, brier_score_loss
)

def evaluate_classifier(y_true, y_pred, y_proba=None, class_labels=None):
    """
    Computes rigorous clinical metrics for binary or multiclass classifications.
    Handles division-by-zero safely and computes true clinical specificity.
    """
    y_true_arr = np.array(y_true)
    y_pred_arr = np.array(y_pred)
    classes = np.unique(y_true_arr)
    num_classes = len(classes)

    acc = float(accuracy_score(y_true_arr, y_pred_arr))

    if num_classes == 2:
        # Binary Classification
        prec = float(precision_score(y_true_arr, y_pred_arr, zero_division=0))
        rec = float(recall_score(y_true_arr, y_pred_arr, zero_division=0))
        f1 = float(f1_score(y_true_arr, y_pred_arr, zero_division=0))

        cm = confusion_matrix(y_true_arr, y_pred_arr)
        if cm.shape == (2, 2):
            tn, fp, fn, tp = cm.ravel()
            specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
            cm_dict = {
                "tn": int(tn),
                "fp": int(fp),
                "fn": int(fn),
                "tp": int(tp)
            }
        else:
            specificity = 0.0
            cm_dict = {"raw_matrix": cm.tolist()}

        roc_auc = None
        brier = None
        if y_proba is not None:
            try:
                # If y_proba is 2D (samples, 2), extract positive column
                if len(y_proba.shape) == 2 and y_proba.shape[1] == 2:
                    p_pos = y_proba[:, 1]
                else:
                    p_pos = y_proba
                roc_auc = float(roc_auc_score(y_true_arr, p_pos))
                brier = float(brier_score_loss(y_true_arr, p_pos))
            except Exception:
                pass

        return {
            "is_multiclass": False,
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall_sensitivity": round(rec, 4),
            "specificity": round(specificity, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(roc_auc, 4) if roc_auc is not None else None,
            "brier_score": round(brier, 4) if brier is not None else None,
            "confusion_matrix": cm_dict,
            "classes": [str(c) for c in classes],
            "class_labels": class_labels or {str(c): f"Class {c}" for c in classes}
        }
    else:
        # Multiclass Classification
        prec_macro = float(precision_score(y_true_arr, y_pred_arr, average='macro', zero_division=0))
        rec_macro = float(recall_score(y_true_arr, y_pred_arr, average='macro', zero_division=0))
        f1_macro = float(f1_score(y_true_arr, y_pred_arr, average='macro', zero_division=0))

        cm = confusion_matrix(y_true_arr, y_pred_arr)
        
        # Per-class specificity macro-average
        specificities = []
        for i in range(num_classes):
            mask_true_other = (y_true_arr != classes[i])
            mask_pred_other = (y_pred_arr != classes[i])
            tn = np.sum(mask_true_other & mask_pred_other)
            fp = np.sum(mask_true_other & (y_pred_arr == classes[i]))
            spec_i = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
            specificities.append(spec_i)
        specificity = float(np.mean(specificities))

        roc_auc = None
        if y_proba is not None:
            try:
                roc_auc = float(roc_auc_score(y_true_arr, y_proba, multi_class='ovr'))
            except Exception:
                pass

        return {
            "is_multiclass": True,
            "accuracy": round(acc, 4),
            "precision": round(prec_macro, 4),
            "recall_sensitivity": round(rec_macro, 4),
            "specificity": round(specificity, 4),
            "f1_score": round(f1_macro, 4),
            "roc_auc": round(roc_auc, 4) if roc_auc is not None else None,
            "brier_score": None,
            "confusion_matrix": {
                "classes": [str(c) for c in classes],
                "matrix": cm.tolist()
            },
            "classes": [str(c) for c in classes],
            "class_labels": class_labels or {str(c): f"Class {c}" for c in classes}
        }
