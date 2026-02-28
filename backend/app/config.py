"""
Application configuration.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from backend/ before reading env vars
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

# ── Paths ──────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent          # backend/
DATA_DIR = BASE_DIR                                        # CSVs live in backend/

RAW_CSV         = DATA_DIR / "irrigation_raw.csv"
NORMALIZED_CSV  = DATA_DIR / "irrigation_normalized.csv"
TRAIN_CSV       = DATA_DIR / "irrigation_train_normal.csv"
TEST_CSV        = DATA_DIR / "irrigation_test.csv"

# ── Server ─────────────────────────────────────────────
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))
DEBUG = os.getenv("DEBUG", "true").lower() == "true"

# ── Streaming ──────────────────────────────────────────
STREAM_INTERVAL_MS  = float(os.getenv("STREAM_INTERVAL_MS", 500))   # ms between pushes
STREAM_BATCH_SIZE   = int(os.getenv("STREAM_BATCH_SIZE", 1))        # rows per push

# ── AI Models ──────────────────────────────────────────
MODEL_DIR       = BASE_DIR / "saved_models"
SEQUENCE_LENGTH = 30       # lookback window for RNN/LSTM
FEATURE_COLS    = [
    "flow_lpm", "pressure_bar", "soil_moisture_pct",
    "temperature_c", "rain_probability", "hour_of_day",
    "flow_rolling_mean", "flow_rolling_std",
    "pressure_rolling_mean", "pressure_drop",
    "flow_deviation", "soil_delta", "evap_index",
]
NUM_FEATURES = len(FEATURE_COLS)

# ── Webhook ────────────────────────────────────────────
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "dev-secret-key-change-me")
# WaSendAPI: secret from dashboard → Webhook settings (for X-Webhook-Signature verification)
WASENDER_WEBHOOK_SECRET = os.getenv("WASENDER_WEBHOOK_SECRET", "")

# ── WhatsApp (WaSendAPI) ──────────────────────────────
# WaSendAPI API key: https://www.wasenderapi.com
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
# Default recipients for alerts (comma-separated, e.g. "212612345678,212698765432")
WHATSAPP_DEFAULT_RECIPIENTS = [
    p.strip()
    for p in (os.getenv("WHATSAPP_DEFAULT_RECIPIENTS", "") or "").split(",")
    if p.strip()
]

# ── CORS (allow frontend) ─────────────────────────────
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "*",
]
