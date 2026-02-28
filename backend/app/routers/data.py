"""
📊 Data Router — REST API for querying irrigation datasets.
"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Query

from app.services.data_service import data_service

router = APIRouter(prefix="/data", tags=["Data"])


@router.get(
    "/query",
    summary="Query sensor data",
    description="Paginated query with optional time range and anomaly type filter.",
)
async def query_data(
    dataset: str = Query("raw", description="raw | normalized | train | test"),
    start: Optional[str] = Query(None, description="Start timestamp ISO 8601"),
    end: Optional[str] = Query(None, description="End timestamp ISO 8601"),
    limit: int = Query(100, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    anomaly_type: Optional[str] = Query(None, description="Filter: Normal, Night_Leak, Pipe_Burst, etc."),
):
    return data_service.query(
        start=start,
        end=end,
        limit=limit,
        offset=offset,
        anomaly_type=anomaly_type,
        dataset=dataset,
    )


@router.get(
    "/stats",
    summary="Dataset statistics",
)
async def get_stats(
    dataset: str = Query("raw", description="raw | normalized | train | test"),
):
    """Summary statistics including anomaly distribution and feature ranges."""
    return data_service.get_stats(dataset)


@router.get(
    "/row/{index}",
    summary="Single row by index",
)
async def get_row(
    index: int,
    dataset: str = Query("raw"),
):
    """Retrieve a single data row by its integer index."""
    row = data_service.get_row(index, dataset)
    if row is None:
        return {"error": f"Row {index} not found in '{dataset}' dataset"}
    return row


@router.get(
    "/batch",
    summary="Batch of rows",
)
async def get_batch(
    start: int = Query(0, ge=0),
    size: int = Query(50, ge=1, le=500),
    dataset: str = Query("raw"),
):
    """Retrieve a contiguous batch of rows."""
    return {
        "start_index": start,
        "batch_size": size,
        "data": data_service.get_batch(start, size, dataset),
    }


@router.get(
    "/anomaly-types",
    summary="List anomaly types",
)
async def list_anomaly_types():
    """Get the list of all anomaly types and their counts."""
    stats = data_service.get_stats("raw")
    return stats.get("anomaly_distribution", {})


@router.get(
    "/features",
    summary="List available features",
)
async def list_features():
    """List all feature columns and their ranges."""
    stats = data_service.get_stats("raw")
    return {
        "features": list(stats.get("feature_ranges", {}).keys()),
        "ranges": stats.get("feature_ranges", {}),
    }
