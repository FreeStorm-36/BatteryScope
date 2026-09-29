@echo off
title BatteryScope Dev Server
cd /d "%~dp0"

rem 端口分工（三者必须互不重复）：
rem   5188 = 启动离线版.bat  -> node serve-dist.mjs，直接跑已构建的 dist
rem   5173 = 启动网站.bat    -> vite dev，带热更新，改源码用这个
rem   5189 = 启动静态版.bat  -> vite preview，验证构建产物
rem 注意：dev server 曾经也用 5188，会跟离线版抢同一个端口 —— Windows 下
rem 0.0.0.0:5188 与 127.0.0.1:5188 能同时监听，同一页面里不同请求被两个服务
rem 轮流处理，表现为"首页能打开、点导航就跳不动"。别再改回去。

echo ============================================
echo   BatteryScope - Dev Server (port 5173)
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
echo       Browser will open http://localhost:5173
echo       Close this window to stop the site.
echo.
start "" http://localhost:5173
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
