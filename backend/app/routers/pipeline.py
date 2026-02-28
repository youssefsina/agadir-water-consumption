"""
🔄 Pipeline Router — Real-Time IoT → AI → Store → Broadcast
==============================================================
WebSocket endpoint for live pipeline data + REST endpoints for control.
"""
from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.pipeline_service import pipeline_manager, pipeline_store

router = APIRouter(prefix="/pipeline", tags=["Pipeline"])


# ── WebSocket: Live pipeline feed ──────────────────────────

@router.websocket("/ws")
async def pipeline_websocket(ws: WebSocket):
    """
    🔴 LIVE pipeline feed.

    Connect to receive real-time IoT readings + AI predictions every 30 seconds.

    Each message includes:
    - sensor_data: raw IoT reading
    - prediction: RF model output (anomaly_type, confidence, etc.)
    - ground_truth: what the simulator actually injected
    - stats: running stats (total readings, anomaly count, etc.)
    - whatsapp_sent: whether a WhatsApp alert was triggered
    """
    await pipeline_manager.connect(ws)

    try:
        # Keep connection alive and listen for client commands
        while True:
            try:
                raw = await asyncio.wait_for(ws.receive_text(), timeout=0.5)
                msg = json.loads(raw)
                cmd = msg.get("command", "")

                if cmd == "force_tick":
                    # Manually trigger a tick (for testing)
                    entry = await pipeline_manager.force_tick()
                    # Already broadcast by force_tick

                elif cmd == "get_history":
                    n = msg.get("count", 50)
                    history = pipeline_store.get_recent(n)
                    await ws.send_text(json.dumps({
                        "type": "history",
                        "data": history,
                        "stats": pipeline_store.get_stats(),
                    }, default=str))

                elif cmd == "get_stats":
                    await ws.send_text(json.dumps({
                        "type": "stats",
                        "stats": pipeline_store.get_stats(),
                    }, default=str))

                elif cmd == "stop":
                    break

            except asyncio.TimeoutError:
                pass  # no message — keep connection alive

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"⚠ Pipeline WS error: {e}")
    finally:
        pipeline_manager.disconnect(ws)


# ── REST endpoints ────────────────────────────────────────

@router.get(
    "/status",
    summary="Pipeline status",
)
async def pipeline_status():
    """Get current pipeline status."""
    return {
        "running": pipeline_manager._running,
        "interval_seconds": pipeline_manager.interval_seconds,
        "connected_clients": pipeline_manager.client_count,
        "stats": pipeline_store.get_stats(),
    }


@router.get(
    "/history",
    summary="Get recent pipeline readings",
)
async def pipeline_history(count: int = 50):
    """Get the most recent pipeline readings with predictions."""
    return {
        "data": pipeline_store.get_recent(count),
        "stats": pipeline_store.get_stats(),
    }


@router.post(
    "/force-tick",
    summary="Force a pipeline tick (for testing)",
)
async def force_tick():
    """
    Manually trigger one pipeline cycle.
    Useful for testing without waiting 30 seconds.
    """
    entry = await pipeline_manager.force_tick()
    return entry


@router.post(
    "/start",
    summary="Start the pipeline",
)
async def start_pipeline():
    """Start the IoT simulation pipeline."""
    await pipeline_manager.start()
    return {"status": "started", "interval": pipeline_manager.interval_seconds}


@router.post(
    "/stop",
    summary="Stop the pipeline",
)
async def stop_pipeline():
    """Stop the IoT simulation pipeline."""
    await pipeline_manager.stop()
    return {"status": "stopped"}


@router.get(
    "/whatsapp-log",
    summary="WhatsApp alert log",
)
async def whatsapp_log():
    """Get the log of WhatsApp messages sent by the pipeline."""
    return {
        "total": len(pipeline_store.whatsapp_log),
        "log": pipeline_store.whatsapp_log[-50:],
    }

from app.services.iot_simulator import iot_simulator

@router.post(
    "/set-anomaly",
    summary="Force a specific anomaly type (Debug)",
)
async def set_anomaly(anomaly_type: int):
    """
    Force the simulator into a specific anomaly scenario.
    0: Normal
    1: Night_Leak
    2: Pipe_Burst
    3: Over_Irrigation
    4: Under_Irrigation
    5: Rain_Event
    """
    iot_simulator._current_anomaly = anomaly_type
    iot_simulator._anomaly_remaining = 20 # Keep it for 20 ticks
    return {"status": "success", "anomaly_type": anomaly_type}
