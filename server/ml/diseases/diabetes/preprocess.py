"""
MediAgent — Diabetes Preprocessor
Dedicated strictly to the Pima Indians Diabetes Dataset 8 canonical features.
NEVER applied to other diseases.
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

FEATURE_COLS = ['preg', 'plas', 'pres', 'skin', 'insu', 'mass', 'pedi', 'age']

class DiabetesPreprocessor:
    def __init__(self):
        self.scaler = StandardScaler()
        self.feature_cols = FEATURE_COLS

    def fit(self, X_train):
        X = pd.DataFrame(X_train, columns=self.feature_cols)
        self.scaler.fit(X)
        return self

    def transform(self, X):
        X_df = pd.DataFrame(X, columns=self.feature_cols)
        return self.scaler.transform(X_df)

    def fit_transform(self, X_train):
        return self.fit(X_train).transform(X_train)
