"""
Control Panel — Jinja-rendered admin page
==========================================
Simple HTML panel for monitoring health, database, AI,
forcing anomaly situations, and sending WhatsApp messages.

No auth, no security — just a quick dev tool.
"""
from __future__ import annotations

import time
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates

from app.services.iot_simulator import iot_simulator, ANOMALY_LABELS
from app.services.ai_service import ai_service
from app.services.data_service import data_service
from app.services.stream_service import manager
from app.services.pipeline_service import pipeline_manager, pipeline_store
from app.services.whatsapp_service import send_message as whatsapp_send_message, send_alert
from app.supabase_client import supabase_client

# ── Templates ─────────────────────────────────────────
TEMPLATE_DIR = Path(__file__).resolve().parent / "templates"
templates = Jinja2Templates(directory=str(TEMPLATE_DIR))

router = APIRouter(prefix="/panel", tags=["Control Panel"])

# Reference to the app start-time (set in main.py)
_start_time = time.time()


# ── HTML Page ─────────────────────────────────────────

@router.get("", response_class=HTMLResponse)
@router.get("/", response_class=HTMLResponse)
async def panel_page(request: Request):
    """Render the control panel page."""
    uptime = round(time.time() - _start_time, 2)

    health = {
        "status": "healthy",
        "version": "1.0.0",
        "uptime_seconds": uptime,
        "data_rows_loaded": data_service.total_rows,
        "active_ws_connections": manager.connection_count + pipeline_manager.client_count,
        "models_loaded": [m["name"] for m in ai_service.list_models()],
        "pipeline_running": pipeline_manager._running,
    }

    stats = pipeline_store.get_stats() if pipeline_manager._running else None
    recent = pipeline_store.get_recent(1)
    latest = recent[0] if recent else None

    return templates.TemplateResponse("panel.html", {
        "request": request,
        "health": health,
        "db_connected": supabase_client is not None,
        "stats": stats,
        "latest": latest,
    })


# ── API: Force Anomaly ────────────────────────────────

@router.post("/api/force-anomaly")
async def force_anomaly(request: Request):
    """
    Force the IoT simulator into a specific anomaly state.
    Body: { "anomaly_id": 0-5, "duration": 5 }
    """
    body = await request.json()
    anomaly_id = int(body.get("anomaly_id", 0))
    duration = int(body.get("duration", 5))

    if anomaly_id not in ANOMALY_LABELS:
        return JSONResponse({"ok": False, "detail": f"Unknown anomaly_id {anomaly_id}"}, status_code=400)

    # Directly set the simulator state
    iot_simulator._current_anomaly = anomaly_id
    iot_simulator._anomaly_remaining = duration if anomaly_id != 0 else 0
    iot_simulator._anomaly_cooldown = 0

    label = ANOMALY_LABELS[anomaly_id]
    print(f"  🎛️ Panel: Forced anomaly → {anomaly_id} ({label}) for {duration} ticks")

    return {"ok": True, "anomaly_id": anomaly_id, "label": label, "duration": duration}


# ── API: Force Tick ───────────────────────────────────

@router.post("/api/force-tick")
async def force_tick():
    """Manually trigger one pipeline tick right now."""
    entry = await pipeline_manager.force_tick()
    return entry


# ── API: WhatsApp Send ────────────────────────────────

@router.post("/api/whatsapp/send")
async def whatsapp_send(request: Request):
    """Send a WhatsApp message. Body: { "phone": "+...", "message": "..." }"""
    body = await request.json()
    phone = body.get("phone", "").strip() or None
    message = body.get("message", "").strip()

    if not message:
        return JSONResponse({"success": False, "error": "Message is empty"}, status_code=400)

    result = whatsapp_send_message(message, to=phone)
    return result


@router.post("/api/whatsapp/test-alert")
async def whatsapp_test_alert():
    """Send a test alert via WhatsApp."""
    result = send_alert(
        device_id="panel-test",
        event_type="Test Alert",
        data={"source": "Control Panel", "note": "This is a manual test alert."},
    )
    return result
