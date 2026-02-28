@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

:MENU
cls
echo.
echo  ======================================================
echo       Agadir Water Consumption — Dev Toolbox
echo  ======================================================
echo.
echo   --- Servers ---
echo    [1]  Start Backend          (FastAPI + Uvicorn)
echo    [2]  Start Frontend         (Next.js dev)
echo    [3]  Start Both             (Backend + Frontend)
echo.
echo   --- Dependencies ---
echo    [4]  Install Backend deps   (pip install -r requirements.txt)
echo    [5]  Install Frontend deps  (npm install)
echo    [6]  Install All deps       (Backend + Frontend)
echo.
echo   --- Backend Tools ---
echo    [7]  Create Python venv     (python -m venv)
echo    [8]  Train Model            (python train_model.py)
echo    [9]  Evaluate Model         (python evaluate_model.py)
echo    [10] Run Simulation         (python simulation.py)
echo    [11] Run Dashboard          (python dashboard.py)
echo    [12] Freeze requirements    (pip freeze ^> requirements.txt)
echo.
echo   --- Frontend Tools ---
echo    [13] Build Frontend         (npm run build)
echo    [14] Lint Frontend          (npm run lint)
echo.
echo   --- Git ---
echo    [15] Git Status
echo    [16] Git Pull
echo    [17] Git Log (last 10)
echo.
echo   --- Other ---
echo    [18] Open API Docs          (http://localhost:8000/docs)
echo    [19] Open Frontend          (http://localhost:3000)
echo    [0]  Exit
echo.
echo  ======================================================
echo.
set /p "CHOICE=  Select an option: "

if "%CHOICE%"=="1"  goto START_BACKEND
if "%CHOICE%"=="2"  goto START_FRONTEND
if "%CHOICE%"=="3"  goto START_BOTH
if "%CHOICE%"=="4"  goto INSTALL_BACKEND
if "%CHOICE%"=="5"  goto INSTALL_FRONTEND
if "%CHOICE%"=="6"  goto INSTALL_ALL
if "%CHOICE%"=="7"  goto CREATE_VENV
if "%CHOICE%"=="8"  goto TRAIN_MODEL
if "%CHOICE%"=="9"  goto EVALUATE_MODEL
if "%CHOICE%"=="10" goto RUN_SIMULATION
if "%CHOICE%"=="11" goto RUN_DASHBOARD
if "%CHOICE%"=="12" goto FREEZE_REQS
if "%CHOICE%"=="13" goto BUILD_FRONTEND
if "%CHOICE%"=="14" goto LINT_FRONTEND
if "%CHOICE%"=="15" goto GIT_STATUS
if "%CHOICE%"=="16" goto GIT_PULL
if "%CHOICE%"=="17" goto GIT_LOG
if "%CHOICE%"=="18" goto OPEN_DOCS
if "%CHOICE%"=="19" goto OPEN_FRONTEND_URL
if "%CHOICE%"=="0"  goto EXIT

echo.
echo  [!] Invalid option. Try again.
timeout /t 2 /noq >nul
goto MENU

:: ── Servers ────────────────────────────────────────────────

:START_BACKEND
echo.
echo  [*] Starting FastAPI backend on http://localhost:8000 ...
start "Backend — FastAPI" cmd /k "cd /d "%BACKEND%" && call Scripts\activate.bat && python run.py --reload"
echo  [OK] Backend started in a new window.
goto PAUSE_AND_MENU

:START_FRONTEND
echo.
echo  [*] Starting Next.js frontend on http://localhost:3000 ...
start "Frontend — Next.js" cmd /k "cd /d "%FRONTEND%" && npm run dev"
echo  [OK] Frontend started in a new window.
goto PAUSE_AND_MENU

:START_BOTH
echo.
echo  [*] Starting Backend...
start "Backend — FastAPI" cmd /k "cd /d "%BACKEND%" && call Scripts\activate.bat && python run.py --reload"
timeout /t 3 /noq >nul
echo  [*] Starting Frontend...
start "Frontend — Next.js" cmd /k "cd /d "%FRONTEND%" && npm run dev"
echo.
echo  [OK] Both servers started.
echo       Backend  : http://localhost:8000
echo       API Docs : http://localhost:8000/docs
echo       Frontend : http://localhost:3000
goto PAUSE_AND_MENU

:: ── Dependencies ───────────────────────────────────────────

:INSTALL_BACKEND
echo.
echo  [*] Installing backend dependencies...
cd /d "%BACKEND%"
call Scripts\activate.bat
pip install -r requirements.txt
echo  [OK] Backend dependencies installed.
goto PAUSE_AND_MENU

:INSTALL_FRONTEND
echo.
echo  [*] Installing frontend dependencies...
cd /d "%FRONTEND%"
call npm install
echo  [OK] Frontend dependencies installed.
goto PAUSE_AND_MENU

:INSTALL_ALL
echo.
echo  [*] Installing backend dependencies...
cd /d "%BACKEND%"
call Scripts\activate.bat
pip install -r requirements.txt
echo.
echo  [*] Installing frontend dependencies...
cd /d "%FRONTEND%"
call npm install
echo.
echo  [OK] All dependencies installed.
goto PAUSE_AND_MENU

:: ── Backend Tools ──────────────────────────────────────────

:CREATE_VENV
echo.
echo  [*] Creating Python virtual environment in backend...
cd /d "%BACKEND%"
python -m venv .
echo  [OK] Virtual environment created.
echo       Activate with: backend\Scripts\activate.bat
goto PAUSE_AND_MENU

:TRAIN_MODEL
echo.
echo  [*] Training model...
cd /d "%BACKEND%"
call Scripts\activate.bat
python train_model.py
echo  [OK] Training complete.
goto PAUSE_AND_MENU

:EVALUATE_MODEL
echo.
echo  [*] Evaluating model...
cd /d "%BACKEND%"
call Scripts\activate.bat
python evaluate_model.py
echo  [OK] Evaluation complete.
goto PAUSE_AND_MENU

:RUN_SIMULATION
echo.
echo  [*] Running simulation...
cd /d "%BACKEND%"
call Scripts\activate.bat
python simulation.py
echo  [OK] Simulation complete.
goto PAUSE_AND_MENU

:RUN_DASHBOARD
echo.
echo  [*] Running dashboard...
cd /d "%BACKEND%"
call Scripts\activate.bat
python dashboard.py
goto PAUSE_AND_MENU

:FREEZE_REQS
echo.
echo  [*] Freezing pip requirements...
cd /d "%BACKEND%"
call Scripts\activate.bat
pip freeze > requirements.txt
echo  [OK] requirements.txt updated.
goto PAUSE_AND_MENU

:: ── Frontend Tools ─────────────────────────────────────────

:BUILD_FRONTEND
echo.
echo  [*] Building frontend for production...
cd /d "%FRONTEND%"
call npm run build
echo  [OK] Build complete.
goto PAUSE_AND_MENU

:LINT_FRONTEND
echo.
echo  [*] Linting frontend...
cd /d "%FRONTEND%"
call npm run lint
echo  [OK] Lint complete.
goto PAUSE_AND_MENU

:: ── Git ────────────────────────────────────────────────────

:GIT_STATUS
echo.
cd /d "%ROOT%"
git status
goto PAUSE_AND_MENU

:GIT_PULL
echo.
cd /d "%ROOT%"
git pull
goto PAUSE_AND_MENU

:GIT_LOG
echo.
cd /d "%ROOT%"
git log --oneline --graph -n 10
goto PAUSE_AND_MENU

:: ── Other ──────────────────────────────────────────────────

:OPEN_DOCS
echo.
echo  [*] Opening API docs in browser...
start http://localhost:8000/docs
goto PAUSE_AND_MENU

:OPEN_FRONTEND_URL
echo.
echo  [*] Opening frontend in browser...
start http://localhost:3000
goto PAUSE_AND_MENU

:: ── Helpers ────────────────────────────────────────────────

:PAUSE_AND_MENU
echo.
echo  ──────────────────────────────────────────
pause
goto MENU

:EXIT
echo.
echo  Goodbye!
timeout /t 1 /noq >nul
exit /b 0
