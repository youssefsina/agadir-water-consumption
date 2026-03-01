@echo off
title AgriFlow AI - Launcher

echo.
echo =========================================
echo   AgriFlow AI - Smart Irrigation System
echo =========================================
echo.

:: ── Backend (FastAPI) ─────────────────────
echo [1/2] Starting Backend (FastAPI on :8000)...
start "AgriFlow Backend" cmd /k "cd /d %~dp0backend && python run.py"

:: Brief pause so backend gets a head start
timeout /t 2 /nobreak >nul

:: ── Frontend (Next.js) ────────────────────
echo [2/2] Starting Frontend (Next.js on :3000)...
start "AgriFlow Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo =========================================
echo   Both servers are launching!
echo   Frontend : https://agadir-water-consumption-vejs.vercel.app
echo   API Docs : https://agadir-water-consumption-vejs.vercel.app/docs
echo =========================================
echo.
echo This window can be closed.
pause
