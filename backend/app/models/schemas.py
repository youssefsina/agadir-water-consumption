"""
Pydantic models / schemas for request & response validation.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ── Sensor Reading ─────────────────────────────────────
class SensorReading(BaseModel):
    """Single point-in-time sensor measurement."""
    timestamp: datetime
    flow_lpm: float          = Field(..., description="Water flow in liters/min")
    pressure_bar: float      = Field(..., description="Pipe pressure in bar")
    soil_moisture_pct: float = Field(..., description="Soil moisture percentage")
    temperature_c: float     = Field(..., description="Ambient temperature °C")
    rain_probability: float  = Field(..., ge=0, le=1, description="Rain probability 0-1")
    hour_of_day: float       = Field(..., ge=0, lt=24)
    is_irrigating: int       = Field(..., ge=0, le=1)

    # Optional computed fields
    flow_rolling_mean: Optional[float] = None
    flow_rolling_std: Optional[float] = None
    pressure_rolling_mean: Optional[float] = None
    pressure_drop: Optional[float] = None
    flow_deviation: Optional[float] = None
    soil_delta: Optional[float] = None
    evap_index: Optional[float] = None

    # Labels
    anomaly_label: Optional[int] = 0
    anomaly_type: Optional[str] = "Normal"


# ── Webhook Payloads ──────────────────────────────────
class WebhookPayload(BaseModel):
    """Generic inbound webhook payload from IoT devices."""
    device_id: str              = Field(..., description="Unique IoT device identifier")
    event_type: str             = Field(..., description="Event: sensor_reading | alert | heartbeat")
    timestamp: datetime         = Field(default_factory=datetime.utcnow)
    data: dict                  = Field(default_factory=dict, description="Arbitrary event payload")
    secret: Optional[str]       = Field(None, description="Auth secret for validation")


class WebhookResponse(BaseModel):
    status: str = "received"
    message: str = ""
    event_id: Optional[str] = None


# ── WhatsApp ──────────────────────────────────────────
class WhatsAppSendRequest(BaseModel):
    """Request body for sending WhatsApp notification."""
    message: str = Field(..., min_length=1, max_length=4096, description="Text to send")
    to: Optional[str] = Field(None, description="Single recipient phone (E.164, e.g. +212612345678)")
    recipients: Optional[List[str]] = Field(None, description="List of recipient phones")


# ── AI Prediction ─────────────────────────────────────
class PredictionRequest(BaseModel):
    """Input sequence for AI model inference."""
    sequence: List[List[float]] = Field(
        ...,
        description="2D array of shape [sequence_length, num_features]",
    )
    model_type: str = Field("lstm", description="'rnn' or 'lstm'")


class PredictionResponse(BaseModel):
    model_type: str
    predicted_values: List[float]
    anomaly_score: Optional[float] = None
    is_anomaly: bool = False
    confidence: float = 0.0


# ── Data Query ────────────────────────────────────────
class DataQuery(BaseModel):
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    limit: int = Field(100, ge=1, le=5000)
    offset: int = Field(0, ge=0)
    anomaly_type: Optional[str] = None


class DataPage(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[dict]


# ── Real-time Stream Config ──────────────────────────
class StreamConfig(BaseModel):
    """Client-sent config when connecting to WebSocket."""
    speed_ms: int = Field(500, ge=50, le=5000, description="Interval between pushes (ms)")
    batch_size: int = Field(1, ge=1, le=50, description="Rows per push")
    start_index: int = Field(0, ge=0, description="Start from this row index")
    features: Optional[List[str]] = None   # subset of columns, None = all


# ── Health / Status ───────────────────────────────────
class HealthStatus(BaseModel):
    status: str = "healthy"
    version: str = "1.0.0"
    uptime_seconds: float = 0.0
    data_rows_loaded: int = 0
    active_ws_connections: int = 0
    models_loaded: List[str] = []
