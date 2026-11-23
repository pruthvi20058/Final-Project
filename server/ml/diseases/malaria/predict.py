"""
MediAgent — Malaria Predictor
Routes prediction to clinical symptom model or histology image model.
"""

import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(os.path.dirname(SCRIPT_DIR))
sys.path.insert(0, os.path.join(ML_DIR, "common"))

from prediction_interface import predict_disease_case

def predict(data):
    image_path = data.get("image_path") if isinstance(data, dict) else None
    return predict_disease_case("malaria", data, image_path=image_path)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1].startswith('{'):
        input_data = json.loads(sys.argv[1])
    else:
        input_data = json.loads(sys.stdin.read())
    res = predict(input_data)
    print(json.dumps(res, indent=2))
