"""
🧠 RNN Model Template — Vanilla Recurrent Neural Network
=========================================================
Template architecture for time-series anomaly detection / forecasting
on irrigation sensor data.

Usage:
    model = IrrigationRNN(num_features=13, hidden_size=64, num_layers=2)
    output = model(input_sequence)   # (batch, seq_len, features)

This is a TEMPLATE — train with your own data pipeline.
"""
import torch
import torch.nn as nn
from typing import Optional


class IrrigationRNN(nn.Module):
    """
    Vanilla RNN for irrigation time-series.

    Architecture:
        Input → RNN layers → Dropout → FC → Output

    Modes:
        - 'forecast'  : predict next N sensor values
        - 'anomaly'   : output anomaly score (single neuron + sigmoid)
        - 'classify'  : classify anomaly type (6-class softmax)
    """

    def __init__(
        self,
        num_features: int = 13,
        hidden_size: int = 64,
        num_layers: int = 2,
        dropout: float = 0.2,
        mode: str = "forecast",       # forecast | anomaly | classify
        num_classes: int = 6,
        forecast_horizon: int = 1,
    ):
        super().__init__()
        self.mode = mode
        self.hidden_size = hidden_size
        self.num_layers = num_layers

        # ── RNN backbone ──────────────────────────────
        self.rnn = nn.RNN(
            input_size=num_features,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
            nonlinearity="tanh",
        )

        self.dropout = nn.Dropout(dropout)

        # ── Output heads ──────────────────────────────
        if mode == "forecast":
            self.fc_out = nn.Linear(hidden_size, num_features * forecast_horizon)
            self.forecast_horizon = forecast_horizon
            self.num_features = num_features
        elif mode == "anomaly":
            self.fc_out = nn.Sequential(
                nn.Linear(hidden_size, 32),
                nn.ReLU(),
                nn.Linear(32, 1),
                nn.Sigmoid(),
            )
        elif mode == "classify":
            self.fc_out = nn.Sequential(
                nn.Linear(hidden_size, 32),
                nn.ReLU(),
                nn.Linear(32, num_classes),
            )
        else:
            raise ValueError(f"Unknown mode: {mode}. Use forecast|anomaly|classify")

    def forward(
        self,
        x: torch.Tensor,
        h0: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        """
        Args:
            x:  (batch, seq_len, num_features)
            h0: optional initial hidden state

        Returns:
            forecast mode  → (batch, forecast_horizon, num_features)
            anomaly mode   → (batch, 1) anomaly probability
            classify mode  → (batch, num_classes) logits
        """
        if h0 is None:
            h0 = torch.zeros(
                self.num_layers, x.size(0), self.hidden_size,
                device=x.device, dtype=x.dtype,
            )

        rnn_out, _ = self.rnn(x, h0)           # (batch, seq, hidden)
        last_hidden = rnn_out[:, -1, :]         # (batch, hidden)
        last_hidden = self.dropout(last_hidden)

        out = self.fc_out(last_hidden)

        if self.mode == "forecast":
            out = out.view(-1, self.forecast_horizon, self.num_features)

        return out


# ── Convenience functions ─────────────────────────────

def create_rnn_model(
    num_features: int = 13,
    mode: str = "anomaly",
    **kwargs,
) -> IrrigationRNN:
    """Factory function to create a configured RNN model."""
    return IrrigationRNN(num_features=num_features, mode=mode, **kwargs)


def example_training_loop():
    """
    📘 TEMPLATE: Example training loop — adapt to your data pipeline.
    """
    import numpy as np

    # Create model
    model = create_rnn_model(num_features=13, mode="anomaly", hidden_size=64)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    criterion = nn.BCELoss()   # binary cross-entropy for anomaly detection

    # Fake data for illustration
    batch_size, seq_len, n_feat = 32, 30, 13
    X = torch.randn(batch_size, seq_len, n_feat)
    y = torch.randint(0, 2, (batch_size, 1)).float()

    # Training step
    model.train()
    for epoch in range(5):
        optimizer.zero_grad()
        pred = model(X)
        loss = criterion(pred, y)
        loss.backward()
        optimizer.step()
        print(f"  Epoch {epoch+1}/5  Loss: {loss.item():.4f}")

    print("✓ RNN template training complete")
    return model


if __name__ == "__main__":
    print("=" * 50)
    print("  RNN Model Template — Smoke Test")
    print("=" * 50)
    example_training_loop()
