"""
Smart Irrigation Monitoring - Realistic Mock Data Generator
============================================================
Generates time-series sensor data simulating a real farm irrigation system.

Sensors simulated:
  - Flow meter        (liters/minute)
  - Pressure sensor   (bar)
  - Soil moisture     (%)
  - Temperature       (°C)
  - Rain probability  (0.0 – 1.0)

Anomaly types injected:
  0 = Normal
  1 = Night Leak       (flow when irrigation is OFF)
  2 = Pipe Burst       (flow spike + sudden pressure drop)
  3 = Over-Irrigation  (irrigation runs far too long)
  4 = Under-Irrigation (valve ON, but flow ≈ 0)
  5 = Rain Event       (rain probability spikes → irrigation paused)

Output files:
  - irrigation_raw.csv          : full dataset with labels
  - irrigation_train_normal.csv : only normal data  → train Isolation Forest
  - irrigation_test.csv         : mixed normal + anomalies → evaluate model
  - irrigation_normalized.csv   : MinMax-scaled features, label preserved
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
import os

# ─────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────
SEED        = 42
DAYS        = 60          # total simulation days
INTERVAL    = 5           # minutes between readings
OUTPUT_DIR  = "."         # change to your preferred output folder

# Irrigation schedule (24-hour clock)
MORNING_START  = 6        # 06:00
MORNING_END    = 8        # 08:00
EVENING_START  = 17       # 17:00
EVENING_END    = 19       # 19:00

# Normal operating ranges
NORMAL_FLOW_MEAN     = 35.0   # L/min during irrigation
NORMAL_FLOW_STD      = 2.5
NORMAL_PRESSURE_MEAN = 2.8    # bar
NORMAL_PRESSURE_STD  = 0.10
IDLE_FLOW_NOISE      = 0.3    # tiny sensor noise when pump is off

# Soil moisture dynamics
SOIL_INIT            = 35.0   # starting soil moisture %
SOIL_DRAIN_RATE      = 0.08   # % lost per 5-min interval (evaporation + use)
SOIL_FILL_RATE       = 0.25   # % gained per 5-min interval during irrigation
SOIL_MIN             = 15.0
SOIL_MAX             = 85.0

# Temperature (daily sinusoidal)
TEMP_MEAN  = 28.0    # °C daily average
TEMP_AMP   = 8.0     # °C peak-to-trough half-amplitude
TEMP_NOISE = 0.8     # °C random noise

# Rain probability
RAIN_BASE_PROB = 0.05   # chance of a rainy period starting any given hour

np.random.seed(SEED)

# ─────────────────────────────────────────────
# STEP 1 – Build timestamp index
# ─────────────────────────────────────────────
total_steps = int(DAYS * 24 * 60 / INTERVAL)
timestamps  = pd.date_range(start="2024-01-01 00:00", periods=total_steps, freq=f"{INTERVAL}min")
df = pd.DataFrame(index=timestamps)
df.index.name = "timestamp"

hour_of_day  = df.index.hour + df.index.minute / 60.0
day_of_year  = df.index.dayofyear
is_irrigating = (
    ((df.index.hour >= MORNING_START) & (df.index.hour < MORNING_END)) |
    ((df.index.hour >= EVENING_START) & (df.index.hour < EVENING_END))
).astype(int)

# ─────────────────────────────────────────────
# STEP 2 – Temperature (realistic daily curve)
# ─────────────────────────────────────────────
# Peak temperature around 14:00, coolest ~04:00
phase_offset = 4.0   # hours; shifts the cosine minimum to 04:00
temp = (
    TEMP_MEAN
    - TEMP_AMP * np.cos(2 * np.pi * (hour_of_day - phase_offset) / 24)
    + np.random.normal(0, TEMP_NOISE, total_steps)
    # slight seasonal drift over 60 days
    + 2.0 * np.sin(2 * np.pi * day_of_year / 365)
)
df["temperature_c"] = np.round(temp, 2)

# ─────────────────────────────────────────────
# STEP 3 – Rain probability (random rainy spells)
# ─────────────────────────────────────────────
rain_prob = np.zeros(total_steps)
i = 0
while i < total_steps:
    if np.random.rand() < RAIN_BASE_PROB / (60 / INTERVAL):
        # rainy spell lasts 2–8 hours
        spell_len = int(np.random.uniform(2, 8) * 60 / INTERVAL)
        peak_prob = np.random.uniform(0.55, 0.95)
        for j in range(spell_len):
            if i + j < total_steps:
                # bell-shaped probability within the spell
                t = j / spell_len
                rain_prob[i + j] = peak_prob * np.sin(np.pi * t)
    i += 1

rain_prob = np.clip(rain_prob + np.random.uniform(0, 0.05, total_steps), 0, 1)
df["rain_probability"] = np.round(rain_prob, 3)

# Irrigation is paused when rain is predicted (> 60%) or already falling
rain_pause = (rain_prob > 0.60).astype(int)
effective_irrigation = np.where(rain_pause == 1, 0, is_irrigating)

# ─────────────────────────────────────────────
# STEP 4 – Soil moisture (dynamic model)
# ─────────────────────────────────────────────
soil = np.zeros(total_steps)
soil[0] = SOIL_INIT
for i in range(1, total_steps):
    prev = soil[i - 1]
    if effective_irrigation[i]:
        # higher temp → faster evaporation partially offsets fill
        evap_factor = 1 + 0.02 * (df["temperature_c"].iloc[i] - TEMP_MEAN)
        delta = SOIL_FILL_RATE - SOIL_DRAIN_RATE * evap_factor
    else:
        evap_factor = 1 + 0.015 * (df["temperature_c"].iloc[i] - TEMP_MEAN)
        delta = -SOIL_DRAIN_RATE * evap_factor

    noise = np.random.normal(0, 0.05)
    soil[i] = np.clip(prev + delta + noise, SOIL_MIN, SOIL_MAX)

df["soil_moisture_pct"] = np.round(soil, 2)

# ─────────────────────────────────────────────
# STEP 5 – Flow & Pressure (normal operation)
# ─────────────────────────────────────────────
flow     = np.zeros(total_steps)
pressure = np.zeros(total_steps)

for i in range(total_steps):
    if effective_irrigation[i]:
        # Higher soil moisture → slightly lower needed flow
        moisture_factor = 1.0 - 0.003 * max(0, soil[i] - 40)
        flow[i]     = np.random.normal(NORMAL_FLOW_MEAN * moisture_factor, NORMAL_FLOW_STD)
        pressure[i] = np.random.normal(NORMAL_PRESSURE_MEAN, NORMAL_PRESSURE_STD)
    else:
        # Pump off: near-zero flow, residual line pressure
        flow[i]     = max(0, np.random.normal(0, IDLE_FLOW_NOISE))
        pressure[i] = np.random.normal(0.15, 0.05)   # residual static pressure

flow     = np.clip(flow, 0, None)
pressure = np.clip(pressure, 0, None)

# ─────────────────────────────────────────────
# STEP 6 – Inject anomalies
# ─────────────────────────────────────────────
anomaly_label = np.zeros(total_steps, dtype=int)

# Helper: pick random night windows (00:00–05:00 or 21:00–23:59)
def is_night(idx):
    h = timestamps[idx].hour
    return h < 5 or h >= 21

def inject_anomaly(center, duration_steps, atype, **kwargs):
    start = max(0, center - duration_steps // 2)
    end   = min(total_steps, start + duration_steps)
    for idx in range(start, end):
        anomaly_label[idx] = atype
        t = (idx - start) / duration_steps   # normalised 0→1 progress

        if atype == 1:   # ── Night Leak
            leak_rate = kwargs.get("leak_rate", 5.0)
            flow[idx]     = max(0, np.random.normal(leak_rate, 0.8))
            pressure[idx] = np.random.normal(NORMAL_PRESSURE_MEAN * 0.85, 0.12)

        elif atype == 2: # ── Pipe Burst
            # spike then drop as pipe empties
            if t < 0.2:
                flow[idx] = np.random.normal(NORMAL_FLOW_MEAN * 2.8, 4.0)
            else:
                flow[idx] = np.random.normal(NORMAL_FLOW_MEAN * 1.5, 3.0)
            pressure[idx] = np.random.normal(NORMAL_PRESSURE_MEAN * 0.40, 0.15)

        elif atype == 3: # ── Over-Irrigation (flow continues well past schedule)
            flow[idx]     = np.random.normal(NORMAL_FLOW_MEAN, NORMAL_FLOW_STD)
            pressure[idx] = np.random.normal(NORMAL_PRESSURE_MEAN, NORMAL_PRESSURE_STD)

        elif atype == 4: # ── Under-Irrigation (valve open, pump issue → near-zero flow)
            flow[idx]     = max(0, np.random.normal(1.5, 0.8))
            pressure[idx] = np.random.normal(0.30, 0.08)

        elif atype == 5: # ── Extreme Rain Event (already handled in rain_prob but mark label)
            pass  # rain_prob already elevated; just mark label

# ── Place anomalies at realistic time positions ──────────────────────────────

steps_per_day  = int(24 * 60 / INTERVAL)
steps_per_hour = int(60 / INTERVAL)

anomaly_schedule = []

for day in range(DAYS):
    day_offset = day * steps_per_day

    # Night Leak: inject ~2 times per week (30% chance per day)
    if np.random.rand() < 0.30:
        center = day_offset + np.random.randint(0, 4 * steps_per_hour)  # 00:00–04:00
        anomaly_schedule.append((center, 3 * steps_per_hour, 1,
                                  {"leak_rate": np.random.uniform(3, 12)}))

    # Pipe Burst: rare (5% per day)
    if np.random.rand() < 0.05:
        # during an irrigation window
        morning_center = day_offset + int((MORNING_START + 0.5) * steps_per_hour)
        anomaly_schedule.append((morning_center, steps_per_hour, 2, {}))

    # Over-Irrigation: 10% chance per day, extends evening session by 2h
    if np.random.rand() < 0.10:
        center = day_offset + int((EVENING_END + 1) * steps_per_hour)
        anomaly_schedule.append((center, 2 * steps_per_hour, 3, {}))

    # Under-Irrigation: 8% chance per day
    if np.random.rand() < 0.08:
        center = day_offset + int((MORNING_START + 0.5) * steps_per_hour)
        anomaly_schedule.append((center, steps_per_hour, 4, {}))

    # Rain Event label (separate from rain_pause already applied)
    if np.random.rand() < 0.08:
        center = day_offset + int(np.random.uniform(8, 16) * steps_per_hour)
        rain_prob_slice = slice(max(0, center - steps_per_hour),
                                min(total_steps, center + 2 * steps_per_hour))
        rain_prob[rain_prob_slice] = np.clip(
            rain_prob[rain_prob_slice] + np.random.uniform(0.5, 0.9), 0, 1)
        anomaly_schedule.append((center, 2 * steps_per_hour, 5, {}))

# Apply all anomalies
for center, dur, atype, kwargs in anomaly_schedule:
    inject_anomaly(center, dur, atype, **kwargs)

df["flow_lpm"]      = np.round(np.clip(flow, 0, None), 3)
df["pressure_bar"]  = np.round(np.clip(pressure, 0, None), 3)
df["rain_probability"] = np.round(np.clip(rain_prob, 0, 1), 3)

# ─────────────────────────────────────────────
# STEP 7 – Engineered features (ML-ready)
# ─────────────────────────────────────────────
df["hour_of_day"]   = np.round(hour_of_day, 4)
df["is_irrigating"] = effective_irrigation
df["anomaly_label"] = anomaly_label

# Anomaly type names for readability
label_map = {0: "Normal", 1: "Night_Leak", 2: "Pipe_Burst",
             3: "Over_Irrigation", 4: "Under_Irrigation", 5: "Rain_Event"}
df["anomaly_type"] = df["anomaly_label"].map(label_map)

# Rolling statistics (window = 6 readings = 30 min)
WIN = 6
df["flow_rolling_mean"]   = df["flow_lpm"].rolling(WIN, min_periods=1).mean().round(3)
df["flow_rolling_std"]    = df["flow_lpm"].rolling(WIN, min_periods=1).std().fillna(0).round(3)
df["pressure_rolling_mean"] = df["pressure_bar"].rolling(WIN, min_periods=1).mean().round(3)
df["pressure_drop"]       = (df["pressure_bar"] - df["pressure_rolling_mean"]).round(3)

# Flow deviation from expected (contextual)
expected_flow = np.where(effective_irrigation == 1, NORMAL_FLOW_MEAN, 0.0)
df["flow_deviation"]  = np.round(df["flow_lpm"] - expected_flow, 3)

# Soil moisture rate of change
df["soil_delta"] = df["soil_moisture_pct"].diff().fillna(0).round(3)

# Temp-adjusted evaporation index (higher = more urgent to irrigate)
df["evap_index"] = np.round(
    (df["temperature_c"] / 40) * (1 - df["soil_moisture_pct"] / 100), 4)

# ─────────────────────────────────────────────
# STEP 8 – Save raw dataset
# ─────────────────────────────────────────────
raw_path = os.path.join(OUTPUT_DIR, "irrigation_raw.csv")
df.to_csv(raw_path)
print(f"[✓] Raw dataset saved  →  {raw_path}  ({len(df):,} rows)")

# Anomaly distribution
print("\nAnomaly distribution:")
print(df["anomaly_type"].value_counts().to_string())

# ─────────────────────────────────────────────
# STEP 9 – Train / Test split
#   Train: only normal data (for Isolation Forest unsupervised training)
#   Test : all data (for evaluation)
# ─────────────────────────────────────────────
normal_df = df[df["anomaly_label"] == 0].copy()
train_path = os.path.join(OUTPUT_DIR, "irrigation_train_normal.csv")
normal_df.to_csv(train_path)
print(f"\n[✓] Training set (Normal only) → {train_path}  ({len(normal_df):,} rows)")

test_path = os.path.join(OUTPUT_DIR, "irrigation_test.csv")
df.to_csv(test_path)
print(f"[✓] Test set (full)            → {test_path}  ({len(df):,} rows)")

# ─────────────────────────────────────────────
# STEP 10 – Normalize features (MinMaxScaler)
#   Scales all numeric features to [0, 1]
#   Labels and metadata columns are preserved as-is
# ─────────────────────────────────────────────
feature_cols = [
    "flow_lpm", "pressure_bar", "soil_moisture_pct",
    "temperature_c", "rain_probability", "hour_of_day",
    "flow_rolling_mean", "flow_rolling_std",
    "pressure_rolling_mean", "pressure_drop",
    "flow_deviation", "soil_delta", "evap_index",
]

scaler = MinMaxScaler()
norm_df = df.copy()
norm_df[feature_cols] = np.round(scaler.fit_transform(df[feature_cols]), 6)

norm_path = os.path.join(OUTPUT_DIR, "irrigation_normalized.csv")
norm_df.to_csv(norm_path)
print(f"[✓] Normalized dataset         → {norm_path}  ({len(norm_df):,} rows)")

# ─────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────
print("\n" + "="*55)
print("  DATASET SUMMARY")
print("="*55)
print(f"  Period        : {df.index[0].date()} → {df.index[-1].date()}")
print(f"  Interval      : {INTERVAL} minutes")
print(f"  Total rows    : {len(df):,}")
print(f"  Feature cols  : {len(feature_cols)}")
print(f"\n  Sensor ranges (raw):")
print(f"    Flow        : {df['flow_lpm'].min():.1f} – {df['flow_lpm'].max():.1f} L/min")
print(f"    Pressure    : {df['pressure_bar'].min():.2f} – {df['pressure_bar'].max():.2f} bar")
print(f"    Soil moist. : {df['soil_moisture_pct'].min():.1f} – {df['soil_moisture_pct'].max():.1f} %")
print(f"    Temperature : {df['temperature_c'].min():.1f} – {df['temperature_c'].max():.1f} °C")
print(f"    Rain prob.  : {df['rain_probability'].min():.2f} – {df['rain_probability'].max():.2f}")
print("="*55)
print("\nFiles ready for ML training:")
print("  1. irrigation_train_normal.csv  → fit Isolation Forest")
print("  2. irrigation_test.csv          → evaluate / score")
print("  3. irrigation_normalized.csv    → ready-scaled features")
print("  4. irrigation_raw.csv           → full raw reference\n")