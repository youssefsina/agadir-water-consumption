from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

# Create a minimal FastAPI app for Vercel
app = FastAPI(
    title="🌊 AgriFlow API",
    description="Smart Irrigation Monitoring API"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """API root"""
    return {
        "name": "🌊 AgriFlow API",
        "version": "1.0.0",
        "status": "healthy"
    }

@app.get("/health")
async def health():
    """Health check"""
    return {
        "status": "healthy",
        "version": "1.0.0"
    }

@app.get("/api/data/stats")
async def get_stats():
    """Get mock irrigation stats"""
    return {
        "total_flow": 12500,
        "avg_pressure": 3.2,
        "total_zones": 4,
        "active_sensors": 8
    }

@app.get("/api/sensors/status")
async def sensors_status():
    """Get sensor status"""
    return {
        "sensors": [
            {"id": "S001", "status": "online", "battery": 85},
            {"id": "S002", "status": "online", "battery": 92},
            {"id": "S003", "status": "warning", "battery": 15}
        ]
    }

# Mangum handler for Vercel
handler = Mangum(app)
