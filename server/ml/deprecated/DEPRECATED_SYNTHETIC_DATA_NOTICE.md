# DEPRECATED SYNTHETIC TRAINING DATA NOTICE

The files in this directory (synthetic_clinical_lab_dataset.csv and deprecated_synthetic_train_model.py) are DEPRECATED synthetic datasets and training scripts.

### Reason for Deprecation:
- Lab values were generated using 
p.random.normal() around hardcoded mean values for each target class.
- This created non-overlapping, artificially separable clusters resulting in non-credible 100% metrics.
- They MUST NOT be used for clinical ML evaluation or production inference.

### Replacement:
All ML training and inference pipelines in MediAgent now use legitimate public clinical datasets (such as the UCI/OpenML Pima Indians Diabetes Dataset in server/ml/data/pima_diabetes.csv).
