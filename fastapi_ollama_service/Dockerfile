# Optimized Dockerfile for RunPod Serverless
# Bakes llama3.2 into the image to eliminate cold-start download times

FROM ollama/ollama:latest

# Set environment variables
ENV OLLAMA_HOST=0.0.0.0
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install Python and system dependencies
# We combine update, install, and cleanup to keep the image small
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl \
    procps \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Python requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip3 install --upgrade pip && \
    pip3 install --no-cache-dir -r requirements.txt

# Copy application code and scripts
COPY main.py .
COPY handler.py .
COPY pull-model.sh .
RUN chmod +x pull-model.sh

# BAKE THE MODEL: Pull llama3.2 during build process
# This adds the model to a Docker layer, making startup instant on RunPod
RUN ./pull-model.sh

# Copy startup script
COPY start.sh .
RUN chmod +x start.sh

# Expose the FastAPI port (8000) and Ollama port (11434)
EXPOSE 8000 11434

# Healthcheck to help RunPod determine if the worker is ready
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start Ollama and the FastAPI wrapper together
ENTRYPOINT ["./start.sh"]
