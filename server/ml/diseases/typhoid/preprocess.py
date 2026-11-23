"""
MediAgent — Typhoid Preprocessor
Handles enteric fever clinical biomarkers (fever_duration, temperature, widal titers, blood culture, hematology).
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

class TyphoidPreprocessor:
    def __init__(self, cont_cols=None, feature_cols=None):
        self.cont_cols = cont_cols or ['fever_duration', 'body_temperature', 'wbc_count', 'platelet_count']
        self.feature_cols = feature_cols or [
            'fever_duration', 'body_temperature', 'headache', 'abdominal_pain',
            'weakness', 'diarrhea', 'constipation', 'widal_to', 'widal_th',
            'blood_culture', 'wbc_count', 'platelet_count', 'hepatomegaly', 'splenomegaly'
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
