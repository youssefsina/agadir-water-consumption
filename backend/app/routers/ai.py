"""
🤖 AI Router — Model inference, listing, and management.
"""
from __future__ import annotations

import numpy as np
from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    PredictionRequest,
    PredictionResponse,
    SensorPredictionRequest,
    SensorPredictionResponse,
)
from app.services.ai_service import ai_service
from app.services.data_service import data_service
from app.config import SEQUENCE_LENGTH, FEATURE_COLS

router = APIRouter(prefix="/ai", tags=["AI Models"])


@router.get(
    "/models",
    summary="List loaded AI models",
)
async def list_models():
    """List all initialized AI models with their metadata."""
    return {"models": ai_service.list_models()}


@router.post(
    "/predict",
    response_model=PredictionResponse,
    summary="Run prediction on a sequence",
)
async def predict(request: PredictionRequest):
    """
    Feed a sequence into a model and get predictions.

    The sequence should be a 2D array of shape [sequence_length, num_features].
    Model types: rnn_anomaly, lstm_anomaly, lstm_classify, lstm_forecast,
                 lstm_attention, lstm_autoencoder
    """
    try:
        sequence = np.array(request.sequence, dtype=np.float32)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid sequence data: {e}")

    if sequence.ndim != 2:
        raise HTTPException(
            status_code=400,
            detail=f"Sequence must be 2D [seq_len, features], got shape {sequence.shape}",
        )

    result = ai_service.predict(request.model_type, sequence)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return PredictionResponse(
        model_type=result.get("model", request.model_type),
        predicted_values=result.get("predicted_values", []),
        anomaly_score=result.get("anomaly_score"),
        is_anomaly=result.get("is_anomaly", False),
        confidence=result.get("confidence", 0.0),
    )


@router.post(
    "/predict/from-dataset",
    summary="Predict using data from the loaded dataset",
)
async def predict_from_dataset(
    model_name: str = "lstm_anomaly",
    start_index: int = 0,
    seq_length: int = SEQUENCE_LENGTH,
    dataset: str = "normalized",
):
    """
    Grab a sequence directly from the dataset and run inference.
    No need to send raw data — just specify the index range.
    """
    df = data_service._get_df(dataset)
    if df is None:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset}' not loaded")

    end_index = start_index + seq_length
    if end_index > len(df):
        raise HTTPException(
            status_code=400,
            detail=f"Index range ({start_index}:{end_index}) exceeds dataset size ({len(df)})",
        )

    cols = [c for c in FEATURE_COLS if c in df.columns]
    sequence = df[cols].iloc[start_index:end_index].values.astype(np.float32)

    result = ai_service.predict(model_name, sequence)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    # Include the actual labels for comparison
    actual_labels = df["anomaly_type"].iloc[start_index:end_index].tolist() if "anomaly_type" in df.columns else []

    return {
        "prediction": result,
        "dataset_range": {
            "dataset": dataset,
            "start_index": start_index,
            "end_index": end_index,
            "seq_length": seq_length,
        },
        "actual_labels": actual_labels,
    }


@router.post(
    "/save/{model_name}",
    summary="Save model weights",
)
async def save_model(model_name: str):
    """Save a model's weights to disk."""
    try:
        path = ai_service.save_model(model_name)
        return {"message": f"Model saved to {path}", "path": path}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post(
    "/load/{model_name}",
    summary="Load saved model weights",
)
async def load_model(model_name: str):
    """Load previously saved weights into a model."""
    success = ai_service.load_model(model_name)
    if not success:
        raise HTTPException(status_code=404, detail=f"Could not load model '{model_name}'")
    return {"message": f"Model '{model_name}' weights loaded."}


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
