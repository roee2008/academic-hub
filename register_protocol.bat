@echo off
setlocal

set "BAT_PATH=c:\Users\Roee4\OneDrive\מסמכים\Antigravity\studio\start_app.bat"

echo Registering studio:// protocol in Windows...

reg add "HKCU\Software\Classes\studio" /ve /t REG_SZ /d "URL:Studio Protocol" /f >nul
reg add "HKCU\Software\Classes\studio" /v "URL Protocol" /t REG_SZ /d "" /f >nul
reg add "HKCU\Software\Classes\studio\shell\open\command" /ve /t REG_SZ /d "\"%BAT_PATH%\" \"%%1\"" /f >nul

echo Protocol registered successfully!
echo You can now bookmark: studio://run in Opera GX.
pause
