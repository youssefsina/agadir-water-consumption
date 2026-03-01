"""
IoT Sensor Data Simulator
===========================
Generates realistic sensor readings every 30 seconds,
simulating an IoT device on a farm irrigation system.

This replaces the need for real hardware — data is generated
with realistic patterns (daily temp curve, irrigation schedule,
soil moisture dynamics) and random anomaly injection.
"""
from __future__ import annotations

import time
import math
import random
from datetime import datetime
from typing import Optional


# ── Anomaly types ────────────────────────────────────────
ANOMALY_LABELS = {
    0: "Normal",
    1: "Night_Leak",
    2: "Pipe_Burst",
    3: "Over_Irrigation",
    4: "Under_Irrigation",
    5: "Rain_Event",
}

# ── Irrigation schedule (24-hour clock) ──────────────────
MORNING_START = 6
MORNING_END = 8
EVENING_START = 17
EVENING_END = 19

# ── Normal operating ranges ─────────────────────────────
NORMAL_FLOW_MEAN = 35.0
NORMAL_FLOW_STD = 2.5
NORMAL_PRESSURE_MEAN = 2.8
NORMAL_PRESSURE_STD = 0.10
IDLE_FLOW_NOISE = 0.3

# ── Temperature ─────────────────────────────────────────
TEMP_MEAN = 28.0
TEMP_AMP = 8.0
TEMP_NOISE = 0.8


class IoTSimulator:
    """
    Generates one sensor reading at a time, simulating a live IoT device.
    Each call to `generate()` produces a new data point.
    """

    def __init__(self):
        self.soil_moisture = 35.0
        self._tick = 0
        self._anomaly_cooldown = 0  # ticks until next anomaly allowed
        self._current_anomaly = 0   # current forced anomaly type
        self._anomaly_remaining = 0  # ticks remaining in current anomaly
        self._ticks_since_last_anomaly = 0  # tracks ticks since last anomaly ended
        self.MAX_NORMAL_TICKS = 4   # force anomaly every 4 ticks (2 min at 30s interval)
        
        # Rolling buffers for computed features
        self._flow_buffer: list[float] = []
        self._pressure_buffer: list[float] = []
        self._prev_soil = 35.0
        
        self.BUFFER_SIZE = 6  # 6 readings = 3 minutes at 30s interval

    def generate(self) -> dict:
        """
        Generate one IoT sensor reading.
        Returns a dict with all features needed for the RF model.
        """
        now = datetime.now()
        hour = now.hour + now.minute / 60.0
        self._tick += 1

        # ── Determine irrigation state ──────────────────
        is_irrigating = (
            (MORNING_START <= now.hour < MORNING_END) or
            (EVENING_START <= now.hour < EVENING_END)
        )

        # ── Temperature (daily sinusoidal) ──────────────
        phase_offset = 4.0
        temperature = (
            TEMP_MEAN
            - TEMP_AMP * math.cos(2 * math.pi * (hour - phase_offset) / 24)
            + random.gauss(0, TEMP_NOISE)
        )

        # ── Rain probability ────────────────────────────
        rain_probability = random.uniform(0, 0.15)
        # Occasional rain spell (5% chance per reading)
        if random.random() < 0.05:
            rain_probability = random.uniform(0.55, 0.95)

        # ── Pause irrigation if raining ─────────────────
        rain_pause = rain_probability > 0.60
        effective_irrigation = is_irrigating and not rain_pause

        # ── Handle anomaly injection ────────────────────
        self._maybe_inject_anomaly(now)

        # ── Flow & Pressure ─────────────────────────────
        if self._current_anomaly == 1:  # Night leak
            flow = max(0, random.gauss(5.0 + random.uniform(0, 7), 0.8))
            pressure = max(0, random.gauss(NORMAL_PRESSURE_MEAN * 0.85, 0.12))
        elif self._current_anomaly == 2:  # Pipe burst
            flow = max(0, random.gauss(NORMAL_FLOW_MEAN * 2.5, 4.0))
            pressure = max(0, random.gauss(NORMAL_PRESSURE_MEAN * 0.40, 0.15))
        elif self._current_anomaly == 3:  # Over-irrigation
            flow = max(0, random.gauss(NORMAL_FLOW_MEAN, NORMAL_FLOW_STD))
            pressure = max(0, random.gauss(NORMAL_PRESSURE_MEAN, NORMAL_PRESSURE_STD))
        elif self._current_anomaly == 4:  # Under-irrigation
            flow = max(0, random.gauss(1.5, 0.8))
            pressure = max(0, random.gauss(0.30, 0.08))
        elif self._current_anomaly == 5:  # Rain event
            rain_probability = random.uniform(0.65, 0.95)
            flow = max(0, random.gauss(0, IDLE_FLOW_NOISE))
            pressure = max(0, random.gauss(0.15, 0.05))
        elif effective_irrigation:
            moisture_factor = 1.0 - 0.003 * max(0, self.soil_moisture - 40)
            flow = max(0, random.gauss(NORMAL_FLOW_MEAN * moisture_factor, NORMAL_FLOW_STD))
            pressure = max(0, random.gauss(NORMAL_PRESSURE_MEAN, NORMAL_PRESSURE_STD))
        else:
            flow = max(0, random.gauss(0, IDLE_FLOW_NOISE))
            pressure = max(0, random.gauss(0.15, 0.05))

        # ── Soil moisture dynamics ──────────────────────
        self._prev_soil = self.soil_moisture
        evap_factor = 1 + 0.02 * (temperature - TEMP_MEAN)
        if effective_irrigation or self._current_anomaly == 3:
            delta = 0.25 - 0.08 * evap_factor
        else:
            delta = -0.08 * evap_factor

        self.soil_moisture = max(15.0, min(85.0, self.soil_moisture + delta + random.gauss(0, 0.05)))

        # ── Update rolling buffers ──────────────────────
        self._flow_buffer.append(flow)
        self._pressure_buffer.append(pressure)
        if len(self._flow_buffer) > self.BUFFER_SIZE:
            self._flow_buffer.pop(0)
        if len(self._pressure_buffer) > self.BUFFER_SIZE:
            self._pressure_buffer.pop(0)

        # ── Compute features ────────────────────────────
        flow_rolling_mean = sum(self._flow_buffer) / len(self._flow_buffer)
        flow_rolling_std = self._std(self._flow_buffer)
        pressure_rolling_mean = sum(self._pressure_buffer) / len(self._pressure_buffer)
        pressure_drop = round(pressure - pressure_rolling_mean, 3)

        expected_flow = NORMAL_FLOW_MEAN if effective_irrigation else 0.0
        flow_deviation = round(flow - expected_flow, 3)
        soil_delta = round(self.soil_moisture - self._prev_soil, 3)
        evap_index = round((temperature / 40) * (1 - self.soil_moisture / 100), 4)

        # ── Anomaly label ───────────────────────────────
        anomaly_label = self._current_anomaly
        anomaly_type = ANOMALY_LABELS.get(anomaly_label, "Normal")

        # Decrement anomaly timer
        if self._anomaly_remaining > 0:
            self._anomaly_remaining -= 1
            if self._anomaly_remaining == 0:
                self._current_anomaly = 0
                self._anomaly_cooldown = random.randint(1, 2)  # short cooldown before next anomaly

        reading = {
            "timestamp": now.isoformat(),
            "flow_lpm": round(flow, 3),
            "pressure_bar": round(pressure, 3),
            "soil_moisture_pct": round(self.soil_moisture, 2),
            "temperature_c": round(temperature, 2),
            "rain_probability": round(rain_probability, 3),
            "hour_of_day": round(hour, 4),
            "is_irrigating": int(effective_irrigation),
            "flow_rolling_mean": round(flow_rolling_mean, 3),
            "flow_rolling_std": round(flow_rolling_std, 3),
            "pressure_rolling_mean": round(pressure_rolling_mean, 3),
            "pressure_drop": pressure_drop,
            "flow_deviation": flow_deviation,
            "soil_delta": soil_delta,
            "evap_index": evap_index,
            "anomaly_label": anomaly_label,
            "anomaly_type": anomaly_type,
            "tick": self._tick,
        }

        return reading

    def _maybe_inject_anomaly(self, now: datetime):
        """Inject anomalies — guaranteed at least once every 4 ticks (2 minutes)."""
        if self._current_anomaly != 0:
            return  # already in an anomaly

        self._ticks_since_last_anomaly += 1

        if self._anomaly_cooldown > 0:
            self._anomaly_cooldown -= 1
            # Override cooldown if we've waited too long
            if self._ticks_since_last_anomaly < self.MAX_NORMAL_TICKS:
                return

        # Force anomaly if MAX_NORMAL_TICKS reached, otherwise ~15% chance per tick
        if self._ticks_since_last_anomaly < self.MAX_NORMAL_TICKS and random.random() > 0.15:
            return

        hour = now.hour

        # Choose anomaly type based on time of day
        choices = []
        if hour < 5 or hour >= 21:
            # Night — leaks are most likely
            choices = [(1, 0.6), (2, 0.1), (5, 0.3)]
        elif MORNING_START <= hour < MORNING_END or EVENING_START <= hour < EVENING_END:
            # During irrigation — over/under/burst
            choices = [(2, 0.15), (3, 0.35), (4, 0.35), (5, 0.15)]
        else:
            # Daytime non-irrigation
            choices = [(1, 0.2), (2, 0.1), (5, 0.7)]

        # Weighted random choice
        rand = random.random()
        cumulative = 0
        anomaly_type = 0
        for atype, prob in choices:
            cumulative += prob
            if rand < cumulative:
                anomaly_type = atype
                break

        if anomaly_type > 0:
            self._current_anomaly = anomaly_type
            # Duration: 2-5 ticks (1 to 2.5 minutes)
            self._anomaly_remaining = random.randint(2, 5)
            self._ticks_since_last_anomaly = 0
            print(f"  ⚡ IoT Simulator: Injecting anomaly #{anomaly_type} "
                  f"({ANOMALY_LABELS[anomaly_type]}) for {self._anomaly_remaining} ticks")

    @staticmethod
    def _std(values: list[float]) -> float:
        """Compute standard deviation."""
        if len(values) < 2:
            return 0.0
        mean = sum(values) / len(values)
        variance = sum((x - mean) ** 2 for x in values) / (len(values) - 1)
        return round(variance ** 0.5, 3)


# Module-level singleton
iot_simulator = IoTSimulator()
