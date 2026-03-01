"""
🌊 Smart Irrigation — FastAPI Backend
======================================
Main application entry point.

Features:
    ✅ REST API for data queries
    ✅ WebSocket real-time streaming (trading-style)
    ✅ Webhook ingestion for IoT devices
    ✅ AI model templates (RNN, LSTM, Attention, Autoencoder)
    ✅ Interactive API docs at /docs

Run:
    python run.py
    # or
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.services.data_service import data_service
from app.services.ai_service import ai_service
from app.services.stream_service import manager
from app.services.pipeline_service import pipeline_manager, pipeline_store
from app.supabase_client import supabase_client

# Import routers
from app.routers import webhook, realtime, data, ai, pipeline, panel

# ── Startup / Shutdown ────────────────────────────────
_start_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Runs on startup and shutdown."""
    # ── Startup ───────────────────────────────────
    print("\n" + "=" * 55)
    print("  🌊  Smart Irrigation Backend — Starting Up")
    print("=" * 55 + "\n")

    data_service.load()
    ai_service.init_default_models()

    # Start the IoT → AI → Store → Broadcast pipeline
    await pipeline_manager.start()

    # Share startup time with panel router
    panel._start_time = _start_time

    print("\n" + "=" * 55)
    print("  ✅  Ready!  Open https://agadir-water-consumption-vejs.vercel.app/docs")
    print("  🎛️  Control Panel: https://agadir-water-consumption-vejs.vercel.app/panel")
    if supabase_client:
        print("  ⚡  Supabase Client connected successfully.")
    else:
        print("  ⚠️  Supabase Client failed to connect.")
    print("  🔄  Pipeline running — IoT data every 30s")
    print("  📡  Connect: wss://agadir-water-consumption-vejs.vercel.app/pipeline/ws")
    print("=" * 55 + "\n")

    yield

    # ── Shutdown ──────────────────────────────────
    await pipeline_manager.stop()
    print("\n🛑 Shutting down...")


# ── Create App ────────────────────────────────────────
app = FastAPI(
    title="🌊 Smart Irrigation API",
    description=(
        "Real-time irrigation monitoring with AI-powered anomaly detection.\n\n"
        "## Features\n"
        "- **REST API** — Query sensor data, statistics, anomaly types\n"
        "- **WebSocket** — Live data streaming (connect to `/ws/sensors` or `/ws/alerts`)\n"
        "- **Webhooks** — Ingest data from IoT devices\n"
        "- **AI Models** — RNN/LSTM templates for anomaly detection & forecasting\n"
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register Routers ─────────────────────────────────
app.include_router(webhook.router)
app.include_router(realtime.router)
app.include_router(data.router)
app.include_router(ai.router)
app.include_router(pipeline.router)
app.include_router(panel.router)


# ── Root & Health ─────────────────────────────────────

@app.get("/", tags=["Health"])
@app.post("/", tags=["Health"])
async def root():
    """API root — basic info. Accepts GET and POST (for systems that POST to base URL)."""
    return {
        "name": "🌊 Smart Irrigation API",
        "version": "1.0.0",
        "docs": "/docs",
        "websocket_endpoints": [
            "wss://agadir-water-consumption-vejs.vercel.app/ws/sensors",
            "wss://agadir-water-consumption-vejs.vercel.app/ws/alerts",
        ],
        "webhook_endpoints": [
            "POST /webhook/ingest — IoT sensor data",
            "POST /webhook/wasenderapi — WaSendAPI inbound",
            "POST /webhook/whatsapp/send — Send WhatsApp notification",
        ],
    }


@app.get("/health", tags=["Health"])
async def health():
    """Health check with uptime and loaded resources."""
    from app.models.schemas import HealthStatus

    return HealthStatus(
        status="healthy",
        version="1.0.0",
        uptime_seconds=round(time.time() - _start_time, 2),
        data_rows_loaded=data_service.total_rows,
        active_ws_connections=manager.connection_count + pipeline_manager.client_count,
        models_loaded=[m["name"] for m in ai_service.list_models()],
        pipeline_running=pipeline_manager._running,
        pipeline_stats=pipeline_store.get_stats() if pipeline_manager._running else None,
    )
