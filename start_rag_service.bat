@echo off
echo ========================================
echo Starting RAG Service for Website
echo ========================================
echo.

cd /d "%~dp0"
cd app_backend\rag_service

echo Checking Python installation...
python --version
if errorlevel 1 (
    echo ERROR: Python not found! Please install Python 3.8+
    pause
    exit /b 1
)

echo.
echo Starting RAG Service on port 8001...
echo.
echo Press Ctrl+C to stop the service
echo ========================================
echo.

python api.py

pause
