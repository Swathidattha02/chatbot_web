# FastAPI Ollama Service

AI service powered by FastAPI and Ollama for educational chatbot deployment.

---

## 🚀 Project Overview
This service provides AI chat capabilities using Ollama LLM, designed to be deployed alongside the Node.js backend. It handles all AI-related requests with streaming support.

---

## ✨ Features
- Streaming chat responses with Server-Sent Events
- Ollama LLM integration (llama3.2)
- Educational tutor system prompt
- Conversation history support
- Health check endpoints
- CORS enabled for frontend integration
- Docker containerized for easy deployment

---

## 🧠 Tech Stack
- **FastAPI** - Modern Python web framework
- **Ollama** - Local LLM runtime
- **Uvicorn** - ASGI server
- **httpx** - Async HTTP client
- **Pydantic** - Data validation
- **Docker** - Containerization

---

## 🏗️ Architecture
```
Frontend → Node Backend → FastAPI Service → Ollama
                ↓
            MongoDB
```

---

## 📂 Project Structure
```
fastapi_ollama_service/
├── main.py              # FastAPI application
├── requirements.txt     # Python dependencies
├── Dockerfile          # Docker configuration
├── .gitignore
└── README.md
```

---

## 🚀 Local Development

### Prerequisites
- Python 3.11+
- Ollama installed and running

### Setup
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the service
python main.py
```

Service will run on `http://localhost:8000`

---

## 🐳 Docker Deployment

### Build
```bash
docker build -t fastapi-ollama-service .
```

### Run
```bash
docker run -p 8000:8000 -p 11434:11434 fastapi-ollama-service
```

---

## 📡 API Endpoints

- `GET /` - Service status
- `GET /health` - Health check with Ollama status
- `POST /chat` - Chat endpoint (streaming/non-streaming)
- `GET /models` - List available Ollama models

---

## 🌐 Deployment Platforms

### Railway
1. Connect GitHub repo
2. Select `fastapi_ollama_service` folder
3. Railway will auto-detect Dockerfile
4. Deploy!

### Render
1. Create new Web Service
2. Connect GitHub repo
3. Set root directory to `fastapi_ollama_service`
4. Select Docker environment
5. Deploy!

**Note**: Requires at least 4GB RAM for Ollama

---

## 🤝 Contributing
Part of the AI Educational Chatbot project.

---

## 📝 License
ISC
