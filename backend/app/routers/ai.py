"""
🤖 AI Router — Model inference, listing, and management.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    SensorPredictionRequest,
    SensorPredictionResponse,
)
from app.services.ai_service import ai_service

router = APIRouter(prefix="/ai", tags=["AI Models"])


@router.get(
    "/models",
    summary="List loaded AI models",
)
async def list_models():
    """List all initialized AI models with their metadata."""
    return {"models": ai_service.list_models()}


@router.post(
    "/predict/sensor",
    response_model=SensorPredictionResponse,
    summary="Predict anomaly from a single sensor reading (Random Forest)",
)
async def predict_sensor(reading: SensorPredictionRequest):
    """
    Send a single sensor reading and get an anomaly prediction back.

    Uses the trained Random Forest model (model.pkl).
    Returns anomaly type, confidence, and per-class probabilities.
    """
    if not ai_service.rf_model.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="Random Forest model not loaded — run train_model.py first",
        )

    values = reading.model_dump()
    result = ai_service.predict_sensor(values)

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    return SensorPredictionResponse(**result)
