@echo off
setlocal
cd /d "%~dp0"

echo [Studio Launcher] Checking if Backend is running...
netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting FastAPI backend...
    start "Studio Backend" /min cmd /c ".\backend\venv\Scripts\uvicorn.exe main:app --app-dir backend --host 127.0.0.1 --port 8000"
) else (
    echo Backend is already running.
)

echo [Studio Launcher] Checking if Frontend is running...
netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting Frontend server...
    start "Studio Frontend" /min cmd /c "npm run dev"
) else (
    echo Frontend is already running.
)

:: Wait 1 second for dev server readiness before opening browser
timeout /t 1 /nobreak >nul

echo Opening in Opera GX...
start "" "C:\Users\Roee4\AppData\Local\Programs\Opera GX\opera.exe" "http://localhost:5173"
exit
