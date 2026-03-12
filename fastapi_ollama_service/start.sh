#!/bin/bash
# Runtime startup script

# Start Ollama server in the background
echo "Starting Ollama server..."
ollama serve &

# Wait for Ollama to be ready
until curl -s http://localhost:11434/api/tags > /dev/null; do
    sleep 1
done
echo "Ollama server is ready!"

# Start the FastAPI server
echo "Starting FastAPI server..."
exec python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
