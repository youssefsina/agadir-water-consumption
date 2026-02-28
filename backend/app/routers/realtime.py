"""
📡 Real-time Data Router (WebSocket)
=====================================
Trading-style live data push via WebSocket connections.
Supports multiple concurrent clients, pause/resume, speed control,
and both full sensor feed + anomaly-only alert streams.
"""
from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.services.stream_service import manager, stream_sensor_data, stream_anomaly_alerts

router = APIRouter(tags=["Real-time Streaming"])


# ── WebSocket: Full sensor data feed ──────────────────

@router.websocket("/ws/sensors")
async def websocket_sensor_feed(
    ws: WebSocket,
    speed: int = Query(500, description="Push interval in ms"),
    batch: int = Query(1, description="Rows per push"),
    start: int = Query(0, description="Start index"),
):
    """
    🔴 LIVE sensor data stream.

    Connect and start receiving real-time sensor data like a trading ticker.

    Client can send JSON commands to control the stream:
    ```json
    { "command": "pause" }
    { "command": "resume" }
    { "command": "speed", "value": 200 }
    { "command": "batch", "value": 5 }
    { "command": "jump", "index": 5000 }
    { "command": "stop" }
    ```
    """
    config = {
        "speed_ms": speed,
        "batch_size": batch,
        "start_index": start,
    }

    await manager.connect(ws, config)

    try:
        await stream_sensor_data(ws)
    except WebSocketDisconnect:
        manager.disconnect(ws)


# ── WebSocket: Anomaly alerts only ────────────────────

@router.websocket("/ws/alerts")
async def websocket_alert_feed(
    ws: WebSocket,
    speed: int = Query(200, description="Push interval in ms"),
    start: int = Query(0, description="Start index"),
):
    """
    🔴 LIVE anomaly alert stream.

    Only pushes anomaly events (skips normal readings).
    Like a trading alert system — only fires when something noteworthy happens.
    """
    config = {
        "speed_ms": speed,
        "batch_size": 1,
        "start_index": start,
    }

    await manager.connect(ws, config)

    try:
        await stream_anomaly_alerts(ws)
    except WebSocketDisconnect:
        manager.disconnect(ws)


# ── REST: Stream status ──────────────────────────────

@router.get(
    "/stream/status",
    summary="Active WebSocket connections",
)
async def stream_status():
    """Get current streaming status and connection count."""
    return {
        "active_connections": manager.connection_count,
        "status": "streaming" if manager.connection_count > 0 else "idle",
    }
