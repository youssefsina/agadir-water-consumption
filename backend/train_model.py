    """
Train Random Forest on irrigation data → saves model.pkl
Run: python train_model.py
"""

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import pickle
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# ── Load data
df = pd.read_csv(
    BASE_DIR / "irrigation_normalized.csv",
    parse_dates=["timestamp"],
    index_col="timestamp",
)

FEATURES = [
    "flow_lpm", "pressure_bar", "soil_moisture_pct",
    "temperature_c", "rain_probability", "hour_of_day",
    "flow_rolling_mean", "flow_rolling_std",
    "pressure_drop", "flow_deviation", "soil_delta", "evap_index",
]

LABELS = {
    0: "Normal",
    1: "Night_Leak",
    2: "Pipe_Burst",
    3: "Over_Irrigation",
    4: "Under_Irrigation",
    5: "Rain_Event",
}

X = df[FEATURES]
y = df["anomaly_label"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

# ── Train
model = RandomForestClassifier(
    n_estimators=100,
    max_depth=12,
    class_weight="balanced",   # handles rare anomalies automatically
    random_state=42,
    n_jobs=-1,
)
model.fit(X_train, y_train)

# ── Evaluate
print(classification_report(
    y_test, model.predict(X_test), target_names=list(LABELS.values())
))

# ── Save
output_path = BASE_DIR / "model.pkl"
with open(output_path, "wb") as f:
    pickle.dump({"model": model, "features": FEATURES, "labels": LABELS}, f)

print(f"✓ model.pkl saved → {output_path}")
