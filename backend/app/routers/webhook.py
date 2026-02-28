"""
📡 Webhook Router
=================
Receives inbound data from IoT devices, external services, or automation triggers.
"""
from __future__ import annotations

import hmac
import hashlib
import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException, Header, Request

from app.config import WEBHOOK_SECRET
from app.models.schemas import WebhookPayload, WebhookResponse

router = APIRouter(prefix="/webhook", tags=["Webhooks"])

# ── In-memory event log (swap with DB in production) ──
_event_log: List[dict] = []
MAX_LOG_SIZE = 1000


def _verify_secret(payload: WebhookPayload) -> bool:
    """Simple secret-based auth. Replace with HMAC signature in production."""
    if not WEBHOOK_SECRET:
        return True
    return payload.secret == WEBHOOK_SECRET


# ── Routes ────────────────────────────────────────────

@router.post(
    "/ingest",
    response_model=WebhookResponse,
    summary="Ingest IoT sensor data",
    description="Receives a sensor reading or event from a field IoT device.",
)
async def ingest_webhook(payload: WebhookPayload):
    """
    Main inbound webhook endpoint.

    Supported event_types:
        - sensor_reading : raw sensor values from a device
        - alert          : threshold-triggered alert from device firmware
        - heartbeat      : device keep-alive ping
        - command_ack    : acknowledgement of a command sent to the device
    """
    if not _verify_secret(payload):
        raise HTTPException(status_code=403, detail="Invalid webhook secret")

    event_id = str(uuid.uuid4())

    event = {
        "event_id": event_id,
        "device_id": payload.device_id,
        "event_type": payload.event_type,
        "timestamp": payload.timestamp.isoformat(),
        "received_at": datetime.utcnow().isoformat(),
        "data": payload.data,
    }

    # Store event
    _event_log.append(event)
    if len(_event_log) > MAX_LOG_SIZE:
        _event_log.pop(0)

    # Process based on event type
    message = f"Event '{payload.event_type}' from device '{payload.device_id}' logged."

    if payload.event_type == "alert":
        # In production: trigger notification, SMS, email, etc.
        message += " ⚠ Alert flagged for review."

    elif payload.event_type == "sensor_reading":
        # In production: feed into AI pipeline for real-time scoring
        message += " 📊 Queued for AI processing."

    elif payload.event_type == "heartbeat":
        message += " 💓 Device is alive."

    return WebhookResponse(
        status="received",
        message=message,
        event_id=event_id,
    )


@router.post(
    "/batch",
    response_model=WebhookResponse,
    summary="Batch ingest multiple events",
)
async def batch_ingest(payloads: List[WebhookPayload]):
    """Ingest multiple events at once (e.g., from offline buffer flush)."""
    event_ids = []
    for payload in payloads:
        if not _verify_secret(payload):
            raise HTTPException(status_code=403, detail="Invalid secret in batch")

        event_id = str(uuid.uuid4())
        _event_log.append({
            "event_id": event_id,
            "device_id": payload.device_id,
            "event_type": payload.event_type,
            "timestamp": payload.timestamp.isoformat(),
            "received_at": datetime.utcnow().isoformat(),
            "data": payload.data,
        })
        event_ids.append(event_id)

        if len(_event_log) > MAX_LOG_SIZE:
            _event_log.pop(0)

    return WebhookResponse(
        status="received",
        message=f"Batch of {len(payloads)} events ingested.",
        event_id=",".join(event_ids[:5]) + ("..." if len(event_ids) > 5 else ""),
    )


@router.get(
    "/events",
    summary="List recent webhook events",
)
async def list_events(limit: int = 50, device_id: str = None, event_type: str = None):
    """Retrieve recent inbound webhook events."""
    filtered = _event_log

    if device_id:
        filtered = [e for e in filtered if e["device_id"] == device_id]
    if event_type:
        filtered = [e for e in filtered if e["event_type"] == event_type]

    return {
        "total": len(filtered),
        "events": filtered[-limit:],
    }


@router.delete(
    "/events",
    summary="Clear event log",
)
async def clear_events():
    """Clear the in-memory event log."""
    count = len(_event_log)
    _event_log.clear()
    return {"message": f"Cleared {count} events."}


# ── HMAC Signature Webhook (advanced) ─────────────────

@router.post(
    "/secure",
    response_model=WebhookResponse,
    summary="HMAC-signed webhook endpoint",
    description="For production: validates X-Webhook-Signature header.",
)
async def secure_webhook(
    request: Request,
    x_webhook_signature: str = Header(None),
):
    """
    Production-grade webhook with HMAC-SHA256 signature verification.

    The sender should compute:
        HMAC-SHA256(secret_key, request_body) → hex digest

    And send it in the X-Webhook-Signature header.
    """
    body = await request.body()

    if x_webhook_signature:
        expected = hmac.new(
            WEBHOOK_SECRET.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(x_webhook_signature, expected):
            raise HTTPException(status_code=403, detail="Invalid HMAC signature")

    import json
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    event_id = str(uuid.uuid4())
    _event_log.append({
        "event_id": event_id,
        "received_at": datetime.utcnow().isoformat(),
        "data": data,
        "signature_verified": x_webhook_signature is not None,
    })

    return WebhookResponse(
        status="received",
        message="Secure webhook processed.",
        event_id=event_id,
    )
