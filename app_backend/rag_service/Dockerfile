FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads chroma_db

# Expose ports
EXPOSE 8000 11434

# Create startup script
RUN echo '#!/bin/bash\n\
    ollama serve &\n\
    sleep 10\n\
    echo "Pulling llama3.2 model..."\n\
    ollama pull llama3.2\n\
    echo "Starting FastAPI server..."\n\
    uvicorn api:app --host 0.0.0.0 --port ${PORT:-8000}' > /app/start.sh && \
    chmod +x /app/start.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the startup script
CMD ["/app/start.sh"]
