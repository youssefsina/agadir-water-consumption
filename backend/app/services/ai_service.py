"""
AI service — wraps the RNN / LSTM template models for inference.
"""
from __future__ import annotations

import os
import numpy as np
import torch
from typing import Optional, List

from app.config import MODEL_DIR, FEATURE_COLS, SEQUENCE_LENGTH, NUM_FEATURES, BASE_DIR
from app.models.rnn_model import IrrigationRNN, create_rnn_model
from app.models.lstm_model import IrrigationLSTM, AttentionLSTM, create_lstm_model
from app.models.rf_model import RandomForestModel


class AIService:
    """
    Manages loading, inference, and (template) training of RNN/LSTM models.
    """

    def __init__(self):
        self.models = {}           # name → nn.Module
        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.rf_model = RandomForestModel()
        print(f"🤖 AI device: {self._device}")

    # ── Model lifecycle ───────────────────────────────

    def init_default_models(self):
        """Create default template models (untrained)."""
        self.models["rnn_anomaly"] = create_rnn_model(
            num_features=NUM_FEATURES,
            mode="anomaly",
            hidden_size=64,
            num_layers=2,
        ).to(self._device)

        self.models["lstm_anomaly"] = create_lstm_model(
            num_features=NUM_FEATURES,
            mode="anomaly",
            hidden_size=128,
            num_layers=2,
        ).to(self._device)

        self.models["lstm_classify"] = create_lstm_model(
            num_features=NUM_FEATURES,
            mode="classify",
            hidden_size=128,
            num_layers=2,
        ).to(self._device)

        self.models["lstm_forecast"] = create_lstm_model(
            num_features=NUM_FEATURES,
            mode="forecast",
            hidden_size=128,
            num_layers=2,
            forecast_horizon=1,
        ).to(self._device)

        self.models["lstm_attention"] = create_lstm_model(
            num_features=NUM_FEATURES,
            mode="classify",
            use_attention=True,
            hidden_size=128,
            num_layers=2,
        ).to(self._device)

        self.models["lstm_autoencoder"] = IrrigationLSTM(
            num_features=NUM_FEATURES,
            mode="autoencoder",
            hidden_size=64,
            num_layers=1,
        ).to(self._device)

        print(f"🤖 Initialized {len(self.models)} template models: {list(self.models.keys())}")

        # ── Load Random Forest if model.pkl exists
        pkl_path = BASE_DIR / "model.pkl"
        if pkl_path.exists():
            self.rf_model.load(pkl_path)
        else:
            print(f"⚠ model.pkl not found at {pkl_path} — run train_model.py to enable RF predictions")

    def list_models(self) -> List[dict]:
        """List all loaded models with metadata."""
        result = []
        for name, model in self.models.items():
            param_count = sum(p.numel() for p in model.parameters())
            result.append({
                "name": name,
                "type": model.__class__.__name__,
                "parameters": param_count,
                "device": str(self._device),
                "trained": False,   # template models are untrained
            })

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

    @torch.no_grad()
    def predict(
        self,
        model_name: str,
        sequence: np.ndarray,
    ) -> dict:
        """
        Run inference on a sequence.

        Args:
            model_name: key in self.models
            sequence:   numpy array of shape (seq_len, num_features)
                        or (batch, seq_len, num_features)

        Returns:
            dict with prediction results
        """
        if model_name not in self.models:
            return {"error": f"Model '{model_name}' not found. Available: {list(self.models.keys())}"}

        model = self.models[model_name]
        model.eval()

        # Ensure 3D: (batch, seq_len, features)
        if sequence.ndim == 2:
            sequence = sequence[np.newaxis, :]

        tensor = torch.tensor(sequence, dtype=torch.float32, device=self._device)
        output = model(tensor)
        result = output.cpu().numpy()

        # Interpret based on model type / mode
        mode = getattr(model, "mode", "unknown")

        if mode == "anomaly":
            score = float(result[0, 0])
            return {
                "model": model_name,
                "mode": mode,
                "anomaly_score": score,
                "is_anomaly": score > 0.5,
                "confidence": abs(score - 0.5) * 2,
            }

        elif mode == "classify":
            logits = result[0]
            probs = torch.softmax(torch.tensor(logits), dim=0).numpy()
            pred_class = int(np.argmax(probs))
            label_map = {
                0: "Normal", 1: "Night_Leak", 2: "Pipe_Burst",
                3: "Over_Irrigation", 4: "Under_Irrigation", 5: "Rain_Event",
            }
            return {
                "model": model_name,
                "mode": mode,
                "predicted_class": pred_class,
                "predicted_label": label_map.get(pred_class, "Unknown"),
                "probabilities": {label_map[i]: float(p) for i, p in enumerate(probs)},
                "confidence": float(probs[pred_class]),
            }

        elif mode == "forecast":
            return {
                "model": model_name,
                "mode": mode,
                "predicted_values": result[0].tolist(),
            }

        elif mode == "autoencoder":
            reconstruction = result[0]   # (seq_len, features)
            input_arr = sequence[0]      # (seq_len, features)
            mse = float(np.mean((reconstruction - input_arr) ** 2))
            threshold = 0.1   # tune this with real data
            return {
                "model": model_name,
                "mode": mode,
                "reconstruction_error": mse,
                "is_anomaly": mse > threshold,
                "threshold": threshold,
            }

        return {"model": model_name, "raw_output": result.tolist()}

    def predict_sensor(self, values: dict) -> dict:
        """Run Random Forest prediction on a single sensor reading."""
        return self.rf_model.predict(values)

    # ── Save / Load ───────────────────────────────────

    def save_model(self, model_name: str) -> str:
        """Save model weights to disk."""
        if model_name not in self.models:
            raise ValueError(f"Model '{model_name}' not found")

        os.makedirs(MODEL_DIR, exist_ok=True)
        path = MODEL_DIR / f"{model_name}.pt"
        torch.save(self.models[model_name].state_dict(), path)
        print(f"💾 Saved: {path}")
        return str(path)

    def load_model(self, model_name: str) -> bool:
        """Load saved weights into an existing model."""
        path = MODEL_DIR / f"{model_name}.pt"
        if not path.exists():
            print(f"⚠ No saved weights at: {path}")
            return False

        if model_name not in self.models:
            print(f"⚠ Model '{model_name}' not initialized")
            return False

        self.models[model_name].load_state_dict(
            torch.load(path, map_location=self._device, weights_only=True)
        )
        print(f"📦 Loaded weights: {path}")
        return True


# Module-level singleton
ai_service = AIService()
