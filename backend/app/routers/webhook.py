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

from app.config import WEBHOOK_SECRET, WASENDER_WEBHOOK_SECRET
from app.models.schemas import WebhookPayload, WebhookResponse, WhatsAppSendRequest
from app.services.whatsapp_service import send_alert as whatsapp_send_alert
from app.services.whatsapp_service import send_message as whatsapp_send_message

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
        # Send WhatsApp notification to configured recipients
        wa_result = whatsapp_send_alert(
            device_id=payload.device_id,
            event_type=payload.event_type,
            data=payload.data,
        )
        if wa_result.get("success"):
            message += f" 📱 WhatsApp sent to {wa_result.get('sent_count', 0)} recipient(s)."
        elif wa_result.get("error"):
            message += " ⚠ Alert flagged (WhatsApp not configured or failed)."
        else:
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


# ── WaSendAPI Inbound Webhook ──────────────────────────
# Use this URL in WaSendAPI dashboard: https://YOUR_DOMAIN/webhook/wasenderapi

@router.post(
    "/wasenderapi",
    summary="WaSendAPI webhook (inbound)",
    description="Receives events from WaSendAPI (incoming messages, status updates). Enter this URL in WaSendAPI dashboard.",
)
async def wasenderapi_webhook(
    request: Request,
    x_webhook_signature: str = Header(None, alias="X-Webhook-Signature"),
):
    """
    WaSendAPI posts events here (messages.received, messages.upsert, etc.).

    In WaSendAPI dashboard → Session → Webhook URL, enter:
        https://YOUR_PUBLIC_DOMAIN/webhook/wasenderapi

    For local dev, use ngrok: https://xxx.ngrok.io/webhook/wasenderapi
    """
    body = await request.body()

    # Verify signature (optional but recommended)
    if WASENDER_WEBHOOK_SECRET and x_webhook_signature:
        if x_webhook_signature != WASENDER_WEBHOOK_SECRET:
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    import json
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event = data.get("event", "unknown")
    event_id = str(uuid.uuid4())

    # Store WaSendAPI event
    _event_log.append({
        "event_id": event_id,
        "source": "wasenderapi",
        "event": event,
        "received_at": datetime.utcnow().isoformat(),
        "data": data,
    })
    if len(_event_log) > MAX_LOG_SIZE:
        _event_log.pop(0)

    # Always return 200 quickly (WaSendAPI requirement)
    return {"received": True, "event": event}


# ── WhatsApp Notification Webhook ─────────────────────

@router.post(
    "/whatsapp/send",
    summary="Send WhatsApp notification",
    description="Send a message to WhatsApp. Connect your AI app to POST here when alerts or anomalies are detected.",
)
async def send_whatsapp(payload: WhatsAppSendRequest):
    """
    Outbound webhook for WhatsApp notifications.

    Your AI app or external service can POST here to trigger WhatsApp alerts.

    Example:
        POST /webhook/whatsapp/send
        {"message": "Anomaly detected in zone A", "to": "+212612345678"}

    Or use recipients for multiple:
        {"message": "Alert!", "recipients": ["212612345678", "212698765432"]}
    """
    result = whatsapp_send_message(
        message=payload.message,
        to=payload.to,
        recipients=payload.recipients,
    )

    if result.get("success"):
        return {
            "status": "sent",
            "message": f"Message sent to {result.get('sent_count', 0)} recipient(s).",
            "results": result.get("results", []),
        }

    return {
        "status": "failed",
        "error": result.get("error", "Unknown error"),
        "results": result.get("results", []),
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
