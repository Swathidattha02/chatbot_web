# 🚀 RAG Service Quick Deploy

## Local Testing with Docker

### Build the Docker image
```bash
cd app_backend/rag_service
docker build -t rag-service .
```

### Run the container
```bash
docker run -p 8000:8000 -p 11434:11434 \
  -e PORT=8000 \
  -e OLLAMA_BASE_URL=http://localhost:11434 \
  -v $(pwd)/chroma_db:/app/chroma_db \
  -v $(pwd)/uploads:/app/uploads \
  rag-service
```

### Test the service
```bash
# Health check
curl http://localhost:8000/health

# Upload a document
curl -X POST http://localhost:8000/upload \
  -F "file=@sample.pdf"

# Chat
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is this about?", "use_rag": true}'
```

## Deploy to Railway

1. Push code to GitHub
2. Go to https://railway.app
3. New Project → Deploy from GitHub
4. Select repository
5. Set root directory: `app_backend/rag_service`
6. Add environment variables (see main deployment guide)
7. Deploy!

## Deploy to Render

1. Go to https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Root Directory: `app_backend/rag_service`
5. Environment: Docker
6. Instance Type: Standard (2GB minimum)
7. Deploy!

## Environment Variables

```env
PORT=8000
OLLAMA_BASE_URL=http://localhost:11434
CHROMA_PERSIST_DIR=/app/chroma_db
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
SIMILARITY_THRESHOLD=0.5
TOP_K_RESULTS=3
CHUNK_SIZE=500
CHUNK_OVERLAP=50
```

## Troubleshooting

### Container won't start
- Check logs: `docker logs <container_id>`
- Ensure ports 8000 and 11434 are free
- Increase RAM allocation (4GB recommended)

### Ollama not responding
- Wait longer for model download (first run takes 5-10 minutes)
- Check if ollama process is running: `docker exec <container_id> ps aux | grep ollama`

### Out of memory
- Use smaller model: Change `llama3.2` to `llama3.2:1b` in Dockerfile
- Increase Docker memory limit
- Use cloud platform with more RAM

## Next Steps

See `FASTAPI_OLLAMA_DEPLOYMENT_GUIDE.md` for complete deployment instructions!
