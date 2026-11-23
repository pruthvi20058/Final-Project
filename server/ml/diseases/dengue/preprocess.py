"""
MediAgent — Dengue Preprocessor
Handles continuous clinical biomarkers (Age, Fever_Duration, Body_Temperature, Platelet_Count, WBC_Count)
and categorical/binary flags (Gender, NS1, IgG, IgM, Joint_Pain, etc.).
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

class DenguePreprocessor:
    def __init__(self, cont_cols=None, feature_cols=None):
        self.cont_cols = cont_cols or ['Age', 'Fever_Duration', 'Body_Temperature', 'Platelet_Count', 'WBC_Count']
        self.feature_cols = feature_cols or [
            'Gender', 'Age', 'NS1', 'IgG', 'IgM', 'Fever_Duration',
            'Body_Temperature', 'Platelet_Count', 'WBC_Count',
            'Joint_Pain', 'Headache', 'Retro_Orbital_Pain', 'Myalgia', 'Rash'
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
