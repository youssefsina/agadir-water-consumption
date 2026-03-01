"""
AI service — wraps the Random Forest model for inference.
"""
from __future__ import annotations

from typing import List

from app.config import BASE_DIR
from app.models.rf_model import RandomForestModel


class AIService:
    """
    Manages loading and inference for the Random Forest model.
    """

    def __init__(self):
        self.rf_model = RandomForestModel()

    # ── Model lifecycle ───────────────────────────────

    def init_default_models(self):
        """Load Random Forest if model.pkl exists."""
        pkl_path = BASE_DIR / "model.pkl"
        if pkl_path.exists():
            self.rf_model.load(pkl_path)
        else:
            print(f"⚠ model.pkl not found at {pkl_path} — run train_model.py to enable RF predictions")

    def list_models(self) -> List[dict]:
        """List all loaded models with metadata."""
        result = []

        # Include Random Forest if loaded
        if self.rf_model.is_loaded:
            result.append({
                "name": "random_forest",
                "type": "RandomForestClassifier",
                "parameters": self.rf_model.model.n_estimators,
                "device": "cpu",
                "trained": True,
            })

        return result

    # ── Inference ─────────────────────────────────────

    def predict_sensor(self, values: dict) -> dict:
        """Run Random Forest prediction on a single sensor reading."""
        return self.rf_model.predict(values)


# Module-level singleton
ai_service = AIService()
