"""
MediAgent — Diabetes Predictor
Dedicated strictly to the Pima Indians Diabetes Dataset model with SHAP explainability.
"""

import os
import sys
import json
import joblib
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(os.path.dirname(SCRIPT_DIR))
sys.path.insert(0, ML_DIR)

import predict as global_predict

def predict(data):
    return global_predict.predict_diabetes(data, ML_DIR)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1].startswith('{'):
        input_data = json.loads(sys.argv[1])
    else:
        input_data = json.loads(sys.stdin.read())
    res = predict(input_data)
    print(json.dumps(res, indent=2))
