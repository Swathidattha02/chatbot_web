@echo off
echo ========================================
echo   AI Avatar Website - Quick Start
echo ========================================
echo.

echo Starting MongoDB...
net start MongoDB
if %errorlevel% neq 0 (
    echo MongoDB service not found or already running
)
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd /d %~dp0website_backend && npm start"
timeout /t 3 /nobreak >nul
echo.

echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd /d %~dp0website_frontend && npm start"
echo.

echo ========================================
echo   Servers are starting...
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit this window...
pause >nul
