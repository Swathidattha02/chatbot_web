@echo off
echo ========================================
echo Starting RAG Service (Python Backend)
echo ========================================
echo.

cd /d "%~dp0rag_service"

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
    echo.
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat
echo.

REM Install dependencies
echo Installing/Updating dependencies...
pip install -r requirements.txt
echo.

REM Start the service
echo Starting RAG Service on port 8000...
echo.
python api.py

pause
