"""
Stream service — manages WebSocket connections for real-time data push.
Simulates a "trading-style" live data feed from the irrigation dataset.
"""
from __future__ import annotations

import asyncio
import json
import time
from typing import Set, Dict, Any

from fastapi import WebSocket

from app.services.data_service import data_service


class ConnectionManager:
    """
    Tracks active WebSocket connections and handles broadcast.
    Similar to a financial trading data feed.
    """

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._connection_configs: Dict[int, Dict[str, Any]] = {}

    async def connect(self, ws: WebSocket, config: dict = None):
        await ws.accept()
        self.active_connections.add(ws)
        self._connection_configs[id(ws)] = config or {
            "speed_ms": 500,
            "batch_size": 1,
            "start_index": 0,
            "features": None,
        }
        print(f"🔌 WebSocket connected  (total: {len(self.active_connections)})")

    def disconnect(self, ws: WebSocket):
        self.active_connections.discard(ws)
        self._connection_configs.pop(id(ws), None)
        print(f"🔌 WebSocket disconnected  (total: {len(self.active_connections)})")

    def get_config(self, ws: WebSocket) -> dict:
        return self._connection_configs.get(id(ws), {})

    def update_config(self, ws: WebSocket, new_config: dict):
        cfg = self._connection_configs.get(id(ws), {})
        cfg.update(new_config)
        self._connection_configs[id(ws)] = cfg

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)

    async def broadcast(self, message: dict):
        """Send message to ALL connected clients."""
        dead = set()
        payload = json.dumps(message, default=str)
        for ws in self.active_connections:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.disconnect(ws)


# Module-level singleton
manager = ConnectionManager()


# ── Streaming coroutine ──────────────────────────────

async def stream_sensor_data(ws: WebSocket):
    """
    Push rows from the dataset to the client in real time,
    like a live trading ticker.

    Client can send JSON messages to control the stream:
        { "command": "pause" }
        { "command": "resume" }
        { "command": "speed", "value": 200 }
        { "command": "jump", "index": 5000 }
        { "command": "stop" }
    """
    config = manager.get_config(ws)
    idx = config.get("start_index", 0)
    speed_ms = config.get("speed_ms", 500)
    batch_size = config.get("batch_size", 1)
    paused = False

    total_rows = data_service.total_rows

    try:
        while True:
            # Check for client commands (non-blocking)
            try:
                raw = await asyncio.wait_for(ws.receive_text(), timeout=0.01)
                msg = json.loads(raw)
                cmd = msg.get("command", "")

                if cmd == "pause":
                    paused = True
                elif cmd == "resume":
                    paused = False
                elif cmd == "speed":
                    speed_ms = max(50, min(5000, int(msg.get("value", 500))))
                elif cmd == "batch":
                    batch_size = max(1, min(50, int(msg.get("value", 1))))
                elif cmd == "jump":
                    idx = max(0, min(total_rows - 1, int(msg.get("index", 0))))
                elif cmd == "stop":
                    break

            except asyncio.TimeoutError:
                pass  # no message — keep streaming

            if paused:
                await asyncio.sleep(0.1)
                continue

            # Fetch & send batch
            rows = data_service.get_batch(idx, batch_size)
            if not rows:
                # Loop back to start (continuous feed)
                idx = 0
                rows = data_service.get_batch(idx, batch_size)

            payload = {
                "type": "sensor_data",
                "index": idx,
                "total": total_rows,
                "progress_pct": round(idx / max(total_rows, 1) * 100, 2),
                "timestamp": time.time(),
                "data": rows,
            }

            await ws.send_text(json.dumps(payload, default=str))
            idx += batch_size

            await asyncio.sleep(speed_ms / 1000.0)

    except Exception as e:
        print(f"⚠ Stream error: {e}")
    finally:
        manager.disconnect(ws)


async def stream_anomaly_alerts(ws: WebSocket):
    """
    Dedicated stream that ONLY pushes anomaly events.
    Skips normal readings — like a trading alerting system.
    """
    config = manager.get_config(ws)
    idx = config.get("start_index", 0)
    speed_ms = config.get("speed_ms", 200)
    total_rows = data_service.total_rows

    try:
        while True:
            # Check commands
            try:
                raw = await asyncio.wait_for(ws.receive_text(), timeout=0.01)
                msg = json.loads(raw)
                if msg.get("command") == "stop":
                    break
            except asyncio.TimeoutError:
                pass

            row = data_service.get_row(idx)
            if row is None:
                idx = 0
                continue

            idx += 1

            # Only push anomalies
            if row.get("anomaly_label", 0) != 0:
                payload = {
                    "type": "anomaly_alert",
                    "index": idx - 1,
                    "total": total_rows,
                    "timestamp": time.time(),
                    "alert": row,
                }
                await ws.send_text(json.dumps(payload, default=str))
                await asyncio.sleep(speed_ms / 1000.0)
            else:
                # Fast-forward through normal readings
                await asyncio.sleep(0.01)

    except Exception as e:
        print(f"⚠ Alert stream error: {e}")
    finally:
        manager.disconnect(ws)
