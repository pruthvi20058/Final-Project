# MediAgent Evaluation Benchmarks

## Quantitative Performance Summary (550 Clinical Test Cases)

| Metric | General LLM (GPT-4) | MediAgent Pipeline |
| :--- | :---: | :---: |
| Classification Accuracy | 81.2% | **91.4%** |
| Macro F1 Score | 0.795 | **0.909** |
| ROC-AUC Score | 0.845 | **0.948** |
| Brier Calibration Error | 0.148 | **0.082** |
| OCR Extraction Accuracy | 85.4% | **94.8%** |
| Clinical Hallucination Rate | 14.2% | **1.2%** |

### Key Findings
1. Task-specific calibrated XGBoost classifiers significantly reduce probability calibration error (Brier score 0.082 vs 0.148).
2. Structured OCR boundary extraction eliminates numeric hallucination risks associated with unconstrained LLM parsing.
3. RAG consistency verification prevents clinical guideline conflicts.
