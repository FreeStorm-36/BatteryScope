@echo off
title BatteryScope Offline Server
cd /d "%~dp0"

echo ============================================
echo   BatteryScope - Offline Server (port 5188)
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 goto nonode

if not exist "dist\index.html" goto nodist

echo No npm install is needed. Opening the built website...
start "" http://127.0.0.1:5188
node serve-dist.mjs
pause
exit /b 0

:nonode
echo [ERROR] Node.js was not found. Please install it first: https://nodejs.org/
pause
exit /b 1

:nodist
echo [ERROR] The dist folder is missing. Please extract the full delivery package again.
pause
exit /b 1
