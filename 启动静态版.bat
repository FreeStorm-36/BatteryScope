@echo off
title BatteryScope Static Preview
cd /d "%~dp0"

echo ============================================
echo   BatteryScope - Static Preview (port 5189)
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 goto nonode

if exist "node_modules" goto checkdist

echo [1/3] First run: installing dependencies (1-3 minutes, one time only)...
echo       Using npm mirror: registry.npmmirror.com
call npm install --no-audit --no-fund
if errorlevel 1 goto installfail
echo.

:checkdist
if exist "dist\index.html" goto run

echo [2/3] Build output not found, building...
call npm run build
if errorlevel 1 goto buildfail
echo.

:run
echo [3/3] Starting static server...
echo       Browser will open http://localhost:5189
echo       Close this window to stop the site.
echo.
start "" http://localhost:5189
call npm run preview -- --port 5189
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

:buildfail
echo [ERROR] vite build failed. Run "npm install" first, then retry.
pause
exit /b 1
