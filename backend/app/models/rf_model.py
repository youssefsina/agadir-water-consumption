"""
Random Forest model wrapper — loads model.pkl and exposes predict().
"""
from __future__ import annotations

import pickle
import numpy as np
from pathlib import Path
from typing import Optional, Dict


class RandomForestModel:
    """
    Wraps the trained Random Forest classifier stored in model.pkl.
    """

    def __init__(self):
        self.model = None
        self.features: list[str] = []
        self.labels: Dict[int, str] = {}
        self._loaded = False

    def load(self, path: Path) -> bool:
        """Load model bundle from pickle file."""
        if not path.exists():
            print(f"⚠ RF model not found at: {path}")
            return False

        try:
            with open(path, "rb") as f:
                bundle = pickle.load(f)
            self.model = bundle["model"]
            self.features = bundle["features"]
            self.labels = bundle["labels"]
            self._loaded = True
            print(f"✓ Random Forest model loaded from {path}")
            return True
        except Exception as e:
            print(f"⚠ Failed to load RF model: {e}")
            return False

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def predict(self, values: dict) -> dict:
        """
        Predict anomaly from a dict of sensor values.

        Args:
            values: dict mapping feature name → float value

        Returns:
            dict with anomaly_id, anomaly_type, is_anomaly, confidence, probabilities
        """
        if not self._loaded:
            return {"error": "Random Forest model not loaded — run train_model.py first"}

        # Build feature vector in the correct order
        feature_vector = np.array([[values[f] for f in self.features]])

        anomaly_id = int(self.model.predict(feature_vector)[0])
        proba = self.model.predict_proba(feature_vector)[0]
        confidence = float(round(proba[anomaly_id], 4))

        probabilities = {
            self.labels[i]: round(float(p), 4)
            for i, p in enumerate(proba)
        }

        return {
            "anomaly_id": anomaly_id,
            "anomaly_type": self.labels[anomaly_id],
            "is_anomaly": anomaly_id != 0,
            "confidence": confidence,
            "probabilities": probabilities,
        }
