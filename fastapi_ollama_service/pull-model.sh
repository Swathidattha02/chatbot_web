#!/bin/bash
# Script to pull the model during Docker build

# Start Ollama server in the background
ollama serve &

# Wait for the server to start (check health endpoint)
echo "Waiting for Ollama server to start..."
until curl -s http://localhost:11434/api/tags > /dev/null; do
    sleep 1
done

# Pull the model
echo "Pulling llama3.2 model..."
ollama pull llama3.2

# Success message
echo "Model llama3.2 pulled successfully!"

# Shutdown Ollama server cleanly
pkill ollama
sleep 2
