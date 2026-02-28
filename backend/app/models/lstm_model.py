"""
🧠 LSTM Model Template — Long Short-Term Memory Network
========================================================
Template architecture for time-series anomaly detection / forecasting
on irrigation sensor data.

The LSTM is generally better than vanilla RNN for longer sequences because
it avoids vanishing gradients via its cell state and gating mechanism.

Usage:
    model = IrrigationLSTM(num_features=13, hidden_size=128, num_layers=2)
    output = model(input_sequence)   # (batch, seq_len, features)

This is a TEMPLATE — train with your own data pipeline.
"""
import torch
import torch.nn as nn
from typing import Optional, Tuple


class IrrigationLSTM(nn.Module):
    """
    LSTM network for irrigation time-series.

    Architecture:
        Input → LSTM layers → LayerNorm → Dropout → FC head → Output

    Modes:
        - 'forecast'  : predict next N sensor values
        - 'anomaly'   : output anomaly score (single neuron + sigmoid)
        - 'classify'  : classify anomaly type (6-class softmax)
        - 'autoencoder' : reconstruct input sequence (high reconstruction
                          error = anomaly)
    """

    def __init__(
        self,
        num_features: int = 13,
        hidden_size: int = 128,
        num_layers: int = 2,
        dropout: float = 0.3,
        mode: str = "forecast",
        num_classes: int = 6,
        forecast_horizon: int = 1,
        bidirectional: bool = False,
    ):
        super().__init__()
        self.mode = mode
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.bidirectional = bidirectional
        self.num_directions = 2 if bidirectional else 1

        effective_hidden = hidden_size * self.num_directions

        # ── LSTM backbone ─────────────────────────────
        self.lstm = nn.LSTM(
            input_size=num_features,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
            bidirectional=bidirectional,
        )

        self.layer_norm = nn.LayerNorm(effective_hidden)
        self.dropout = nn.Dropout(dropout)

        # ── Output heads ──────────────────────────────
        if mode == "forecast":
            self.fc_out = nn.Sequential(
                nn.Linear(effective_hidden, hidden_size),
                nn.GELU(),
                nn.Linear(hidden_size, num_features * forecast_horizon),
            )
            self.forecast_horizon = forecast_horizon
            self.num_features = num_features

        elif mode == "anomaly":
            self.fc_out = nn.Sequential(
                nn.Linear(effective_hidden, 64),
                nn.GELU(),
                nn.Dropout(0.2),
                nn.Linear(64, 1),
                nn.Sigmoid(),
            )

        elif mode == "classify":
            self.fc_out = nn.Sequential(
                nn.Linear(effective_hidden, 64),
                nn.GELU(),
                nn.Dropout(0.2),
                nn.Linear(64, num_classes),
            )

        elif mode == "autoencoder":
            # Decoder mirrors encoder: FC → repeat → LSTM
            self.decoder_fc = nn.Linear(effective_hidden, hidden_size)
            self.decoder_lstm = nn.LSTM(
                input_size=hidden_size,
                hidden_size=num_features,
                num_layers=1,
                batch_first=True,
            )
            self._seq_len = 30   # will be overridden dynamically

        else:
            raise ValueError(
                f"Unknown mode: {mode}. Use forecast|anomaly|classify|autoencoder"
            )

    def forward(
        self,
        x: torch.Tensor,
        hidden: Optional[Tuple[torch.Tensor, torch.Tensor]] = None,
    ) -> torch.Tensor:
        """
        Args:
            x:      (batch, seq_len, num_features)
            hidden: optional (h0, c0) tuple

        Returns:
            forecast     → (batch, forecast_horizon, num_features)
            anomaly      → (batch, 1) anomaly probability
            classify     → (batch, num_classes) logits
            autoencoder  → (batch, seq_len, num_features) reconstruction
        """
        batch_size = x.size(0)
        seq_len = x.size(1)

        if hidden is None:
            h0 = torch.zeros(
                self.num_layers * self.num_directions, batch_size, self.hidden_size,
                device=x.device, dtype=x.dtype,
            )
            c0 = torch.zeros_like(h0)
            hidden = (h0, c0)

        lstm_out, (hn, cn) = self.lstm(x, hidden)   # (batch, seq, hidden*dirs)

        if self.mode == "autoencoder":
            # Use last hidden → decode back to full sequence
            encoded = lstm_out[:, -1, :]                       # (batch, hidden*dirs)
            decoded = self.decoder_fc(encoded)                 # (batch, hidden)
            decoded = decoded.unsqueeze(1).repeat(1, seq_len, 1)  # (batch, seq, hidden)
            reconstruction, _ = self.decoder_lstm(decoded)     # (batch, seq, features)
            return reconstruction

        # For all other modes, use the last time-step output
        last_out = lstm_out[:, -1, :]            # (batch, hidden*dirs)
        last_out = self.layer_norm(last_out)
        last_out = self.dropout(last_out)

        out = self.fc_out(last_out)

        if self.mode == "forecast":
            out = out.view(-1, self.forecast_horizon, self.num_features)

        return out


# ── Attention-enhanced variant ────────────────────────

class AttentionLSTM(nn.Module):
    """
    LSTM with temporal attention — attends to all time steps instead
    of just the last one.  Better for detecting anomalies that span
    multiple time steps (e.g., slow leaks).
    """

    def __init__(
        self,
        num_features: int = 13,
        hidden_size: int = 128,
        num_layers: int = 2,
        dropout: float = 0.3,
        num_classes: int = 6,
        mode: str = "classify",
    ):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=num_features,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )
        # Attention weights
        self.attn_fc = nn.Linear(hidden_size, 1)

        self.classifier = nn.Sequential(
            nn.LayerNorm(hidden_size),
            nn.Linear(hidden_size, 64),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(64, num_classes if mode == "classify" else 1),
        )
        self.mode = mode

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        lstm_out, _ = self.lstm(x)             # (batch, seq, hidden)

        # Attention scores
        attn_scores = self.attn_fc(lstm_out)   # (batch, seq, 1)
        attn_weights = torch.softmax(attn_scores, dim=1)

        # Context vector = weighted sum of all time steps
        context = (lstm_out * attn_weights).sum(dim=1)  # (batch, hidden)

        out = self.classifier(context)

        if self.mode == "anomaly":
            out = torch.sigmoid(out)

        return out


# ── Convenience functions ─────────────────────────────

def create_lstm_model(
    num_features: int = 13,
    mode: str = "anomaly",
    use_attention: bool = False,
    **kwargs,
) -> nn.Module:
    """Factory function to create a configured LSTM model."""
    if use_attention:
        return AttentionLSTM(num_features=num_features, mode=mode, **kwargs)
    return IrrigationLSTM(num_features=num_features, mode=mode, **kwargs)


def example_training_loop():
    """
    📘 TEMPLATE: Example training loop — adapt to your data pipeline.
    """

    # ── Standard LSTM (anomaly detection) ─────────────
    print("\n── Standard LSTM ──")
    model = create_lstm_model(num_features=13, mode="anomaly", hidden_size=128)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    criterion = nn.BCELoss()

    batch_size, seq_len, n_feat = 32, 30, 13
    X = torch.randn(batch_size, seq_len, n_feat)
    y = torch.randint(0, 2, (batch_size, 1)).float()

    model.train()
    for epoch in range(5):
        optimizer.zero_grad()
        pred = model(X)
        loss = criterion(pred, y)
        loss.backward()
        optimizer.step()
        print(f"  Epoch {epoch+1}/5  Loss: {loss.item():.4f}")

    # ── Attention LSTM (classify) ─────────────────────
    print("\n── Attention LSTM (classify) ──")
    attn_model = create_lstm_model(
        num_features=13, mode="classify", use_attention=True
    )
    cls_optimizer = torch.optim.Adam(attn_model.parameters(), lr=1e-3)
    cls_criterion = nn.CrossEntropyLoss()

    y_cls = torch.randint(0, 6, (batch_size,))

    attn_model.train()
    for epoch in range(5):
        cls_optimizer.zero_grad()
        logits = attn_model(X)
        loss = cls_criterion(logits, y_cls)
        loss.backward()
        cls_optimizer.step()
        print(f"  Epoch {epoch+1}/5  Loss: {loss.item():.4f}")

    # ── Autoencoder LSTM ──────────────────────────────
    print("\n── LSTM Autoencoder ──")
    ae_model = IrrigationLSTM(num_features=13, mode="autoencoder", hidden_size=64)
    ae_optim = torch.optim.Adam(ae_model.parameters(), lr=1e-3)
    ae_criterion = nn.MSELoss()

    ae_model.train()
    for epoch in range(5):
        ae_optim.zero_grad()
        recon = ae_model(X)
        loss = ae_criterion(recon, X)
        loss.backward()
        ae_optim.step()
        print(f"  Epoch {epoch+1}/5  Recon Loss: {loss.item():.4f}")

    print("\n✓ LSTM template training complete")


if __name__ == "__main__":
    print("=" * 50)
    print("  LSTM Model Template — Smoke Test")
    print("=" * 50)
    example_training_loop()
