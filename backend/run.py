"""
Entry point — run the FastAPI server.

Usage:
    python run.py
    python run.py --port 8080
    python run.py --reload
"""
import argparse
import uvicorn

from app.config import HOST, PORT, DEBUG


def main():
    parser = argparse.ArgumentParser(description="Smart Irrigation API Server")
    parser.add_argument("--host", default=HOST, help="Bind host")
    parser.add_argument("--port", type=int, default=PORT, help="Bind port")
    parser.add_argument("--reload", action="store_true", default=DEBUG, help="Auto-reload on code changes")
    args = parser.parse_args()

    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info",
    )


if __name__ == "__main__":
    main()
