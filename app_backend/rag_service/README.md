# RAG Service

Production-grade Retrieval-Augmented Generation service using:
- **Sentence Transformers** for embeddings (all-MiniLM-L6-v2)
- **ChromaDB** for vector storage
- **Cosine similarity** retrieval with configurable threshold
- **FastAPI** for REST API
- **Streaming responses** via Server-Sent Events

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment variables in `.env`:
```
OLLAMA_BASE_URL=http://10.75.80.9:11434
CHROMA_PERSIST_DIR=./chroma_db
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
SIMILARITY_THRESHOLD=0.5
TOP_K_RESULTS=3
CHUNK_SIZE=500
CHUNK_OVERLAP=50
PORT=8000
```

## Running the Service

Start the FastAPI server:
```bash
python api.py
```

Or with uvicorn directly:
```bash
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

### Health Check
```bash
GET /health
```

### Upload Document
```bash
POST /upload
Content-Type: multipart/form-data

file: <PDF or TXT file>
```

### Chat with Streaming
```bash
POST /chat/stream
Content-Type: application/json

{
  "message": "What is the main topic?",
  "use_rag": true,
  "conversation_history": []
}
```

### Chat (Non-streaming)
```bash
POST /chat
Content-Type: application/json

{
  "message": "What is the main topic?",
  "use_rag": true
}
```

### Clear Vector Store
```bash
POST /clear
```

### Get Statistics
```bash
GET /stats
```

### Test Retrieval
```bash
GET /retrieve?query=your+question&top_k=3&threshold=0.5
```

## Features

- ✅ Sentence transformer embeddings (384-dim)
- ✅ ChromaDB persistent vector storage
- ✅ Cosine similarity with configurable threshold (default: 0.5)
- ✅ Document chunking with overlap
- ✅ Streaming responses via SSE
- ✅ Support for PDF and TXT files
- ✅ Conversation history support
- ✅ CORS enabled for frontend integration

## Architecture

```
User Query → RAG Service → Embedding Model
                ↓
         ChromaDB (Cosine Similarity)
                ↓
         Top-K Chunks (threshold > 0.5)
                ↓
         Ollama LLM + Context
                ↓
         Streaming Response
```
