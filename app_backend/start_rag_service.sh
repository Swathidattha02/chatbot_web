#!/bin/bash

echo "========================================"
echo "Starting RAG Service (Python Backend)"
echo "========================================"
echo ""

cd "$(dirname "$0")/rag_service"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    echo ""
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate
echo ""

# Install dependencies
echo "Installing/Updating dependencies..."
pip install -r requirements.txt
echo ""

# Start the service
echo "Starting RAG Service on port 8000..."
echo ""
python api.py
