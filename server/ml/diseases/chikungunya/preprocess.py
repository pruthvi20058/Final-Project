"""
MediAgent — Chikungunya Preprocessor
Dedicated to clinical chikungunya indicators: severe joint pain, arthritis, fever, rash, leukopenia, etc.
"""

import numpy as np
import pandas as pd

class ChikungunyaPreprocessor:
    def __init__(self, feature_cols=None):
        self.feature_cols = feature_cols or [
            'fever', 'myalgia', 'headache', 'rash', 'vomiting',
            'nausea', 'back_pain', 'conjunctivitis', 'arthritis',
            'arthralgia', 'petechiae', 'leukopenia'
        ]

    def fit(self, X_train):
        return self

    def transform(self, X):
        df = pd.DataFrame(X, columns=self.feature_cols).copy()
        # Binary flag clipping
        return df.fillna(0).astype(int)
