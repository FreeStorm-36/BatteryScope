@echo off
title BatteryScope Dev Server
cd /d "%~dp0"

echo ============================================
echo   BatteryScope - Dev Server (port 5188)
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 goto nonode

if exist "node_modules" goto run

echo [1/2] First run: installing dependencies (1-3 minutes, one time only)...
echo       Using npm mirror: registry.npmmirror.com
call npm install --no-audit --no-fund
if errorlevel 1 goto installfail
echo.

:run
echo [2/2] Starting dev server...
echo       Browser will open http://localhost:5188
echo       Close this window to stop the site.
echo.
start "" http://localhost:5188
call npm run dev
pause
exit /b 0

:nonode
echo [ERROR] Node.js not found. Please install it first: https://nodejs.org/
pause
exit /b 1

:installfail
echo [ERROR] npm install failed. Check your network and run this again.
pause
exit /b 1
