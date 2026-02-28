"""
Data service — loads and manages the irrigation CSV datasets.
"""
from __future__ import annotations

import pandas as pd
import numpy as np
from typing import Optional, Dict, Any, List

from app.config import (
    RAW_CSV, NORMALIZED_CSV, TRAIN_CSV, TEST_CSV,
    FEATURE_COLS, SEQUENCE_LENGTH,
)


class DataService:
    """Singleton-ish service that holds datasets in memory."""

    def __init__(self):
        self.raw_df: Optional[pd.DataFrame] = None
        self.norm_df: Optional[pd.DataFrame] = None
        self.train_df: Optional[pd.DataFrame] = None
        self.test_df: Optional[pd.DataFrame] = None
        self._loaded = False

    # ── Load ──────────────────────────────────────────
    def load(self) -> None:
        """Load all CSV datasets into memory."""
        if self._loaded:
            return

        print("📂 Loading datasets...")

        if RAW_CSV.exists():
            self.raw_df = pd.read_csv(RAW_CSV, parse_dates=["timestamp"], index_col="timestamp")
            print(f"   ✓ raw:        {len(self.raw_df):,} rows")
        else:
            print(f"   ⚠ raw CSV not found: {RAW_CSV}")

        if NORMALIZED_CSV.exists():
            self.norm_df = pd.read_csv(NORMALIZED_CSV, parse_dates=["timestamp"], index_col="timestamp")
            print(f"   ✓ normalized: {len(self.norm_df):,} rows")
        else:
            print(f"   ⚠ normalized CSV not found: {NORMALIZED_CSV}")

        if TRAIN_CSV.exists():
            self.train_df = pd.read_csv(TRAIN_CSV, parse_dates=["timestamp"], index_col="timestamp")
            print(f"   ✓ train:      {len(self.train_df):,} rows")

        if TEST_CSV.exists():
            self.test_df = pd.read_csv(TEST_CSV, parse_dates=["timestamp"], index_col="timestamp")
            print(f"   ✓ test:       {len(self.test_df):,} rows")

        self._loaded = True
        print("📂 All datasets loaded.\n")

    @property
    def total_rows(self) -> int:
        if self.raw_df is not None:
            return len(self.raw_df)
        return 0

    # ── Query ─────────────────────────────────────────
    def query(
        self,
        start: Optional[str] = None,
        end: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        anomaly_type: Optional[str] = None,
        dataset: str = "raw",
    ) -> Dict[str, Any]:
        """
        Query a dataset with optional time range and anomaly filter.
        Returns paginated dict with { total, limit, offset, data }.
        """
        df = self._get_df(dataset)
        if df is None:
            return {"total": 0, "limit": limit, "offset": offset, "data": []}

        mask = pd.Series(True, index=df.index)

        if start:
            mask &= df.index >= pd.Timestamp(start)
        if end:
            mask &= df.index <= pd.Timestamp(end)
        if anomaly_type:
            mask &= df["anomaly_type"] == anomaly_type

        filtered = df[mask]
        total = len(filtered)
        page = filtered.iloc[offset : offset + limit]

        records = page.reset_index().to_dict(orient="records")
        # Convert timestamps to ISO strings
        for r in records:
            if "timestamp" in r:
                r["timestamp"] = str(r["timestamp"])

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "data": records,
        }

    # ── Streaming slice ───────────────────────────────
    def get_row(self, index: int, dataset: str = "raw") -> Optional[dict]:
        """Get a single row by integer position (for streaming)."""
        df = self._get_df(dataset)
        if df is None or index < 0 or index >= len(df):
            return None
        row = df.iloc[index]
        record = row.to_dict()
        record["timestamp"] = str(df.index[index])
        return record

    def get_batch(self, start_idx: int, batch_size: int, dataset: str = "raw") -> List[dict]:
        """Get a batch of rows starting from start_idx."""
        df = self._get_df(dataset)
        if df is None:
            return []
        end_idx = min(start_idx + batch_size, len(df))
        if start_idx >= len(df):
            return []

        chunk = df.iloc[start_idx:end_idx]
        records = chunk.reset_index().to_dict(orient="records")
        for r in records:
            if "timestamp" in r:
                r["timestamp"] = str(r["timestamp"])
        return records

    # ── Sequences for AI ──────────────────────────────
    def get_sequences(
        self,
        dataset: str = "normalized",
        seq_length: int = SEQUENCE_LENGTH,
        features: Optional[List[str]] = None,
    ) -> np.ndarray:
        """
        Build sliding-window sequences for RNN/LSTM input.
        Returns shape (num_sequences, seq_length, num_features).
        """
        df = self._get_df(dataset)
        if df is None:
            return np.array([])

        cols = features or FEATURE_COLS
        values = df[cols].values.astype(np.float32)

        sequences = []
        for i in range(len(values) - seq_length):
            sequences.append(values[i : i + seq_length])

        return np.array(sequences)

    # ── Stats ─────────────────────────────────────────
    def get_stats(self, dataset: str = "raw") -> dict:
        """Quick summary statistics."""
        df = self._get_df(dataset)
        if df is None:
            return {}

        stats = {
            "total_rows": len(df),
            "time_range": {
                "start": str(df.index.min()),
                "end": str(df.index.max()),
            },
            "anomaly_distribution": (
                df["anomaly_type"].value_counts().to_dict()
                if "anomaly_type" in df.columns else {}
            ),
            "feature_ranges": {},
        }

        for col in FEATURE_COLS:
            if col in df.columns:
                stats["feature_ranges"][col] = {
                    "min": float(df[col].min()),
                    "max": float(df[col].max()),
                    "mean": float(df[col].mean()),
                    "std": float(df[col].std()),
                }

        return stats

    # ── Internal ──────────────────────────────────────
    def _get_df(self, name: str) -> Optional[pd.DataFrame]:
        return {
            "raw": self.raw_df,
            "normalized": self.norm_df,
            "train": self.train_df,
            "test": self.test_df,
        }.get(name, self.raw_df)


# Module-level singleton
data_service = DataService()
