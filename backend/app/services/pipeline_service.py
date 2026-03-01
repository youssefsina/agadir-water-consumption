"""
Pipeline Service — End-to-End Real-Time IoT → AI → Store → Broadcast
======================================================================
Every 30 seconds:
  1. IoT Simulator generates a sensor reading
  2. Random Forest model predicts anomaly
  3. Reading + prediction are stored in memory
  4. Everything is broadcast to all connected WebSocket clients
  5. If anomaly detected → WhatsApp notification is triggered
"""
from __future__ import annotations

import asyncio
import json
import time
from datetime import datetime
from typing import List, Dict, Any, Optional

from app.services.iot_simulator import iot_simulator
from app.services.ai_service import ai_service
from app.services.whatsapp_service import send_message as whatsapp_send_message
from app.supabase_client import supabase_client


def _get_whatsapp_recipients() -> list[str]:
    """Fetch active WhatsApp contacts from Supabase, fall back to env defaults."""
    from app.config import WHATSAPP_DEFAULT_RECIPIENTS
    try:
        if supabase_client:
            result = supabase_client.table("whatsapp_contacts").select("phone").eq("active", True).execute()
            phones = [r["phone"] for r in (result.data or []) if r.get("phone")]
            if phones:
                return phones
    except Exception as e:
        print(f"  ⚠ Failed to fetch WhatsApp contacts from Supabase: {e}")
    return WHATSAPP_DEFAULT_RECIPIENTS or []


class PipelineStore:
    """In-memory store for IoT readings + predictions."""

    def __init__(self, max_size: int = 2000):
        self.readings: List[Dict[str, Any]] = []
        self.max_size = max_size
        self.anomaly_count = 0
        self.total_count = 0
        self.last_anomaly: Optional[Dict[str, Any]] = None
        self.whatsapp_log: List[Dict[str, Any]] = []

    def add(self, entry: Dict[str, Any]):
        self.readings.append(entry)
        self.total_count += 1
        if entry.get("prediction", {}).get("is_anomaly", False):
            self.anomaly_count += 1
            self.last_anomaly = entry
        if len(self.readings) > self.max_size:
            self.readings.pop(0)

    def get_recent(self, n: int = 50) -> List[Dict[str, Any]]:
        return self.readings[-n:]

    def get_stats(self) -> dict:
        return {
            "total_readings": self.total_count,
            "stored_readings": len(self.readings),
            "anomaly_count": self.anomaly_count,
            "anomaly_rate": round(self.anomaly_count / max(self.total_count, 1) * 100, 2),
            "last_anomaly": self.last_anomaly,
            "whatsapp_messages_sent": len(self.whatsapp_log),
        }


# Module-level singleton
pipeline_store = PipelineStore()


class PipelineManager:
    """
    Manages the real-time pipeline:
      IoT → Model → Store → WebSocket Broadcast → WhatsApp Alert
    """

    def __init__(self):
        from fastapi import WebSocket
        self.clients: set = set()
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self.interval_seconds = 30
        self._whatsapp_cooldown = 0  # seconds until next WA message allowed
        self.WHATSAPP_COOLDOWN_TICKS = 5  # minimum ticks between WA messages

    async def connect(self, ws):
        """Register a WebSocket client for live updates."""
        await ws.accept()
        self.clients.add(ws)
        print(f"📡 Pipeline client connected (total: {len(self.clients)})")

        # Send recent history to new client
        history = pipeline_store.get_recent(50)
        if history:
            await ws.send_text(json.dumps({
                "type": "history",
                "data": history,
                "stats": pipeline_store.get_stats(),
            }, default=str))

    def disconnect(self, ws):
        self.clients.discard(ws)
        print(f"📡 Pipeline client disconnected (total: {len(self.clients)})")

    @property
    def client_count(self) -> int:
        return len(self.clients)

    async def broadcast(self, message: dict):
        """Send to all connected pipeline clients."""
        dead = set()
        payload = json.dumps(message, default=str)
        for ws in self.clients:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.disconnect(ws)

    async def start(self):
        """Start the pipeline loop (called on server startup)."""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._pipeline_loop())
        print(f"🔄 Pipeline started — generating data every {self.interval_seconds}s")

    async def stop(self):
        """Stop the pipeline loop."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        print("🛑 Pipeline stopped")

    async def _pipeline_loop(self):
        """Main loop: generate → predict → store → broadcast → alert."""
        while self._running:
            try:
                entry = await self._process_one_tick()
                await self.broadcast(entry)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"⚠ Pipeline error: {e}")
                import traceback
                traceback.print_exc()

            await asyncio.sleep(self.interval_seconds)

    async def _process_one_tick(self) -> dict:
        """
        One full cycle:
          1. Generate IoT reading
          2. Run RF prediction
          3. Store combined result
          4. If anomaly → trigger WhatsApp
          5. Return the entry for broadcast
        """
        # ── 1. Generate IoT data ────────────────────────
        reading = iot_simulator.generate()
        print(f"  📊 IoT tick #{reading['tick']}: "
              f"flow={reading['flow_lpm']:.1f} pressure={reading['pressure_bar']:.2f} "
              f"soil={reading['soil_moisture_pct']:.1f}% "
              f"[ground_truth={reading['anomaly_type']}]")

        # ── 2. Run model prediction ─────────────────────
        prediction = {"anomaly_id": 0, "anomaly_type": "Normal", "is_anomaly": False, "confidence": 0.0, "probabilities": {}}

        if ai_service.rf_model.is_loaded:
            try:
                pred_input = {
                    "flow_lpm": reading["flow_lpm"],
                    "pressure_bar": reading["pressure_bar"],
                    "soil_moisture_pct": reading["soil_moisture_pct"],
                    "temperature_c": reading["temperature_c"],
                    "rain_probability": reading["rain_probability"],
                    "hour_of_day": reading["hour_of_day"],
                    "flow_rolling_mean": reading["flow_rolling_mean"],
                    "flow_rolling_std": reading["flow_rolling_std"],
                    "pressure_rolling_mean": reading["pressure_rolling_mean"],
                    "pressure_drop": reading["pressure_drop"],
                    "flow_deviation": reading["flow_deviation"],
                    "soil_delta": reading["soil_delta"],
                    "evap_index": reading["evap_index"],
                }
                prediction = ai_service.predict_sensor(pred_input)
                if "error" in prediction:
                    print(f"  ⚠ RF prediction error: {prediction['error']}")
                    prediction = {"anomaly_id": 0, "anomaly_type": "Normal", "is_anomaly": False, "confidence": 0.0, "probabilities": {}}
            except Exception as e:
                print(f"  ⚠ RF prediction failed: {e}")
        else:
            print("  ⚠ RF model not loaded — using ground truth as prediction")
            prediction = {
                "anomaly_id": reading["anomaly_label"],
                "anomaly_type": reading["anomaly_type"],
                "is_anomaly": reading["anomaly_label"] != 0,
                "confidence": 0.95 if reading["anomaly_label"] != 0 else 0.99,
                "probabilities": {},
            }

        print(f"  🤖 Prediction: {prediction['anomaly_type']} "
              f"(anomaly={prediction['is_anomaly']}, conf={prediction['confidence']:.2f})")

        # ── 3. Combine & store ──────────────────────────
        entry = {
            "type": "pipeline_tick",
            "timestamp": reading["timestamp"],
            "tick": reading["tick"],
            "sensor_data": reading,
            "prediction": prediction,
            "ground_truth": {
                "anomaly_label": reading["anomaly_label"],
                "anomaly_type": reading["anomaly_type"],
            },
            "server_time": time.time(),
            "stats": pipeline_store.get_stats(),
        }

        pipeline_store.add(entry)

        # ── 3.5. Save to Supabase ───────────────────────
        if supabase_client:
            try:
                db_payload = {
                    "timestamp": reading["timestamp"],
                    "flow_lpm": reading["flow_lpm"],
                    "pressure_bar": reading["pressure_bar"],
                    "soil_moisture_pct": reading["soil_moisture_pct"],
                    "temperature_c": reading["temperature_c"],
                    "rain_probability": reading.get("rain_probability", 0),
                    "hour_of_day": reading.get("hour_of_day", 0),
                    "is_irrigating": reading.get("is_irrigating", 0),
                    "flow_rolling_mean": reading.get("flow_rolling_mean"),
                    "flow_rolling_std": reading.get("flow_rolling_std"),
                    "pressure_rolling_mean": reading.get("pressure_rolling_mean"),
                    "pressure_drop": reading.get("pressure_drop"),
                    "flow_deviation": reading.get("flow_deviation"),
                    "soil_delta": reading.get("soil_delta"),
                    "evap_index": reading.get("evap_index"),
                    "anomaly_label": int(prediction.get("is_anomaly", False)),
                    "anomaly_type": prediction.get("anomaly_type", "Normal"),
                    "anomaly_confidence": float(prediction.get("confidence", 0.0)),
                    "device_id": "simulated_iot_1"
                }
                # supabase_client.table is sync
                supabase_client.table("sensor_readings").insert(db_payload).execute()
                print("  💾 Saved to Supabase 'sensor_readings'")
            except Exception as e:
                print(f"  ⚠ Failed to save to Supabase: {e}")

        # ── 4. WhatsApp alert on anomaly ────────────────
        if prediction.get("is_anomaly", False):
            if self._whatsapp_cooldown <= 0:
                recipients = _get_whatsapp_recipients()
                wa_message = (
                    f"🚨 *ANOMALY DETECTED*\n\n"
                    f"🕐 Time: {reading['timestamp']}\n"
                    f"⚠ Type: {prediction['anomaly_type']}\n"
                    f"📊 Confidence: {prediction['confidence']:.1%}\n\n"
                    f"💧 Flow: {reading['flow_lpm']:.1f} L/min\n"
                    f"🔧 Pressure: {reading['pressure_bar']:.2f} bar\n"
                    f"🌱 Soil: {reading['soil_moisture_pct']:.1f}%\n"
                    f"🌡 Temp: {reading['temperature_c']:.1f}°C\n\n"
                    f"Please check the dashboard immediately."
                )
                if recipients:
                    wa_result = whatsapp_send_message(wa_message, recipients=recipients)
                else:
                    wa_result = {"success": False, "error": "No WhatsApp recipients configured"}
                pipeline_store.whatsapp_log.append({
                    "timestamp": reading["timestamp"],
                    "anomaly_type": prediction["anomaly_type"],
                    "result": wa_result,
                })
                entry["whatsapp_sent"] = True
                entry["whatsapp_result"] = wa_result
                self._whatsapp_cooldown = self.WHATSAPP_COOLDOWN_TICKS
                print(f"  📱 WhatsApp alert sent: {prediction['anomaly_type']}")
            else:
                entry["whatsapp_sent"] = False
                entry["whatsapp_cooldown"] = self._whatsapp_cooldown
                self._whatsapp_cooldown -= 1
        else:
            if self._whatsapp_cooldown > 0:
                self._whatsapp_cooldown -= 1

        return entry

    async def force_tick(self) -> dict:
        """Manually trigger one pipeline tick (for testing)."""
        entry = await self._process_one_tick()
        await self.broadcast(entry)
        return entry


# Module-level singleton
pipeline_manager = PipelineManager()
