"""
📊 Dashboard Router — Single endpoint for frontend initial load.
Returns pipeline status + recent history in one response for dynamic data transfer.
"""
from __future__ import annotations

from fastapi import APIRouter

from app.services.pipeline_service import pipeline_manager, pipeline_store

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/init",
    summary="Dashboard initial data",
    description="Returns pipeline status and recent history in one call for frontend bootstrap.",
)
async def dashboard_init(count: int = 50):
    """
    Single API to transfer all data needed for dashboard first paint:
    - Pipeline running state and stats
    - Last N pipeline readings (sensor + predictions)
    """
    return {
        "status": {
            "running": pipeline_manager._running,
            "interval_seconds": pipeline_manager.interval_seconds,
            "connected_clients": pipeline_manager.client_count,
            "stats": pipeline_store.get_stats(),
        },
        "history": {
            "data": pipeline_store.get_recent(count),
            "stats": pipeline_store.get_stats(),
        },
    }
