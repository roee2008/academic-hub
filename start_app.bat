@echo off
setlocal
cd /d "%~dp0"

echo [Studio Launcher] Checking if Backend is running...
netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting FastAPI backend...
    start "Studio Backend" /min cmd /c ".\backend\venv\Scripts\uvicorn.exe main:app --app-dir backend --host 0.0.0.0 --port 8000"
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

:: Wait 1 second for dev server readiness
timeout /t 1 /nobreak >nul

for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0 ^| findstr /v "0.0.0.0.*0.0.0.0"') do (
    set LOCAL_IP=%%a
)

echo ======================================================
echo   Nexus Academic Hub is Ready!
echo   On this PC:    http://localhost:5173
echo   On your Phone: http://192.168.16.44:5173
echo ======================================================

echo Opening in Opera GX...
start "" "C:\Users\Roee4\AppData\Local\Programs\Opera GX\opera.exe" "http://localhost:5173"
exit
