"""
MediAgent — Malaria Preprocessor
Supports both clinical tabular features (symptoms, temperature, rigors)
and microscopy cell image datasets (resizing, grayscale/RGB normalization, feature flattening).
"""

import os
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from PIL import Image

class MalariaTabularPreprocessor:
    def __init__(self, cont_cols=None, feature_cols=None):
        self.cont_cols = cont_cols or ['age']
        self.feature_cols = feature_cols or [
            'age', 'sex', 'fever', 'cold', 'rigor', 'fatigue',
            'headace', 'bitter_tongue', 'vomitting', 'diarrhea',
            'Convulsion', 'Anemia', 'jundice', 'cocacola_urine',
            'hypoglycemia', 'prostraction', 'hyperpyrexia'
        ]
        self.scaler = StandardScaler()

    def fit(self, X_train):
        df = pd.DataFrame(X_train, columns=self.feature_cols)
        valid_cont = [c for c in self.cont_cols if c in df.columns]
        if valid_cont:
            self.scaler.fit(df[valid_cont])
        return self

    def transform(self, X):
        df = pd.DataFrame(X, columns=self.feature_cols).copy()
        valid_cont = [c for c in self.cont_cols if c in df.columns]
        if valid_cont:
            df[valid_cont] = self.scaler.transform(df[valid_cont])
        return df

class MalariaImagePreprocessor:
    def __init__(self, target_size=(64, 64)):
        self.target_size = target_size

    def preprocess_image(self, img_path_or_buf):
        img = Image.open(img_path_or_buf).convert('RGB')
        img = img.resize(self.target_size)
        arr = np.array(img, dtype=np.float32) / 255.0
        return arr.flatten()

    def batch_preprocess(self, image_paths):
        features = []
        for p in image_paths:
            try:
                feat = self.preprocess_image(p)
                features.append(feat)
            except Exception:
                pass
        return np.array(features)
