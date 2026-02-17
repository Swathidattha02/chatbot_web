# 🎓 AI-Powered Learning Platform

> A full-stack MERN application with RAG-enhanced AI chatbot for intelligent document-based learning

[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)](https://www.mongodb.com/cloud/atlas)
[![Node.js](https://img.shields.io/badge/Node.js-18+-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.2-blue)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-teal)](https://fastapi.tiangolo.com/)
[![Ollama](https://img.shields.io/badge/Ollama-llama3.2-orange)](https://ollama.com/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

This is a comprehensive AI-powered learning platform that combines:
- **Interactive Learning Dashboard** with progress tracking
- **PDF Document Viewer** with time-based chapter unlocking
- **RAG-Enhanced AI Chatbot** for document-based Q&A
- **Learning Analytics** with visual insights
- **Document Upload & Processing** with semantic search

**Live Demo:** [Coming Soon]

---

## ✨ Features

### 🎓 Learning Management
- ✅ Subject and chapter organization
- ✅ PDF document viewer with progress tracking
- ✅ Chapter locking system (complete previous to unlock next)
- ✅ Time-based completion (minimum 2 minutes per chapter)
- ✅ Progress bars and completion percentages
- ✅ Learning analytics with visual graphs

### 🤖 AI-Powered Chatbot
- ✅ **RAG (Retrieval-Augmented Generation)** for document-based answers
- ✅ **Streaming responses** for real-time interaction
- ✅ **Multi-language support** (planned)
- ✅ **Voice input** capability (planned)
- ✅ Context-aware conversations
- ✅ Document upload and processing (PDF, TXT)

### 📊 Analytics & Insights
- ✅ Weekly learning time tracking
- ✅ Monthly progress visualization
- ✅ Subject-wise time breakdown
- ✅ Interactive bar graphs
- ✅ Progress history

### 🔐 User Management
- ✅ Secure authentication (JWT)
- ✅ User profiles
- ✅ Progress persistence
- ✅ Session management

---

## 🏗️ Architecture

```
┌─────────────────┐
│  React Frontend │  ← User Interface (Vercel)
│   (Port 3000)   │
└────────┬────────┘
         │ REST API
         ↓
┌─────────────────┐
│  Node.js Backend│  ← API Server (Render)
│   (Port 5000)   │
└────┬────────┬───┘
     │        │
     │        └──────────────┐
     ↓                       ↓
┌─────────────┐    ┌──────────────────┐
│  MongoDB    │    │  FastAPI + Ollama│  ← AI Service (Railway)
│   Atlas     │    │    (Port 8000)   │
└─────────────┘    └──────────────────┘
                            │
                            ↓
                   ┌──────────────────┐
                   │  ChromaDB        │  ← Vector Store
                   │  (RAG System)    │
                   └──────────────────┘
```

**See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed diagrams**

---

## 🛠️ Tech Stack

### Frontend
- **React 18.2** - UI framework
- **React Router** - Navigation
- **Axios** - HTTP client
- **React-PDF** - PDF viewer
- **CSS3** - Styling

### Backend
- **Node.js 18+** - Runtime
- **Express.js** - Web framework
- **MongoDB + Mongoose** - Database
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Multer** - File upload

### AI Service
- **FastAPI** - Python web framework
- **Ollama** - LLM runtime (llama3.2)
- **ChromaDB** - Vector database
- **Sentence-Transformers** - Embeddings
- **LangChain** - RAG framework
- **PyPDF** - PDF processing

### DevOps & Deployment
- **Vercel** - Frontend hosting
- **Render** - Backend hosting
- **Railway** - AI service hosting
- **MongoDB Atlas** - Database hosting
- **Docker** - Containerization
- **GitHub** - Version control

---

## 📁 Project Structure

```
app_intern/
├── website_frontend/          # React frontend application
│   ├── public/
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/            # Page components
│   │   │   ├── Dashboard.js
│   │   │   ├── ChatWithAvatar.js
│   │   │   ├── Analytics.js
│   │   │   ├── PDFViewer.js
│   │   │   └── ...
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── .env
│
├── website_backend/           # Node.js backend API
│   ├── src/
│   │   ├── config/           # Configuration files
│   │   │   └── db.js
│   │   ├── controllers/      # Request handlers
│   │   │   ├── authController.js
│   │   │   ├── chatController.js
│   │   │   └── progressController.js
│   │   ├── models/           # MongoDB schemas
│   │   │   ├── User.js
│   │   │   ├── Subject.js
│   │   │   ├── Chapter.js
│   │   │   └── Progress.js
│   │   ├── routes/           # API routes
│   │   │   ├── authRoutes.js
│   │   │   ├── chatRoutes.js
│   │   │   ├── documentRoutes.js
│   │   │   └── progress.js
│   │   ├── middleware/       # Custom middleware
│   │   └── server.js         # Entry point
│   ├── package.json
│   └── .env
│
├── app_backend/
│   └── rag_service/          # FastAPI AI service
│       ├── api.py            # FastAPI application
│       ├── rag_service.py    # RAG implementation
│       ├── streaming_handler.py
│       ├── Dockerfile
│       ├── requirements.txt
│       ├── .dockerignore
│       ├── railway.json
│       └── .env
│
├── fastapi_ollama_service/   # Simple chat service (alternative)
│   ├── main.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── DEPLOYMENT_GUIDE.md       # Main deployment guide
├── DEPLOYMENT_CHECKLIST.md   # Step-by-step checklist
├── FASTAPI_OLLAMA_DEPLOYMENT_GUIDE.md  # Detailed AI service guide
├── ARCHITECTURE.md           # System architecture
├── TROUBLESHOOTING.md        # Common issues & solutions
├── QUICK_REFERENCE.md        # Quick reference card
└── README.md                 # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Python** 3.11+ ([Download](https://www.python.org/))
- **MongoDB** (Local or Atlas account)
- **Ollama** ([Download](https://ollama.com/))
- **Git** ([Download](https://git-scm.com/))

### Local Development Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd app_intern
```

#### 2. Setup Backend (Node.js)

```bash
cd website_backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your values:
# PORT=5000
# MONGO_URI=mongodb://localhost:27017/ai_learning
# JWT_SECRET=your_secret_key
# AI_AVATAR_SERVICE_URL=http://localhost:8000
# OLLAMA_BASE_URL=http://localhost:11434

# Start server
npm start
```

Server runs on: http://localhost:5000

#### 3. Setup Frontend (React)

```bash
cd website_frontend

# Install dependencies
npm install

# Create .env file
echo "REACT_APP_BACKEND_URL=http://localhost:5000" > .env

# Start development server
npm start
```

Frontend runs on: http://localhost:3000

#### 4. Setup AI Service (FastAPI)

```bash
cd app_backend/rag_service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install and start Ollama
# Download from: https://ollama.com/
ollama serve

# In another terminal, pull the model
ollama pull llama3.2

# Create .env file
cp .env.example .env

# Start FastAPI server
uvicorn api:app --reload --port 8000
```

AI Service runs on: http://localhost:8000

#### 5. Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **AI Service**: http://localhost:8000/docs (Swagger UI)

---

## 🌐 Deployment

### Quick Deployment (35 minutes total)

1. **MongoDB Atlas** (5 min) - Database
2. **Railway** (15 min) - AI Service
3. **Render** (10 min) - Backend API
4. **Vercel** (5 min) - Frontend

### Detailed Guides

📖 **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Main deployment guide  
📋 **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Step-by-step checklist  
🤖 **[FASTAPI_OLLAMA_DEPLOYMENT_GUIDE.md](./FASTAPI_OLLAMA_DEPLOYMENT_GUIDE.md)** - AI service deployment  
🏗️ **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture  
🐛 **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues  
⚡ **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick reference

### Deployment Cost

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| MongoDB Atlas | Free (M0) | $0 |
| Railway (AI) | Hobby 4GB | $10 |
| Render (Backend) | Starter | $7 |
| Vercel (Frontend) | Free | $0 |
| **TOTAL** | | **$17/month** |

---

## 📚 Documentation

### Core Documentation
- [README.md](./README.md) - This file
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deployment instructions
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Troubleshooting guide

### Specialized Guides
- [FASTAPI_OLLAMA_DEPLOYMENT_GUIDE.md](./FASTAPI_OLLAMA_DEPLOYMENT_GUIDE.md) - AI service deployment
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Deployment checklist
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Quick reference
- [3D_AVATAR_INTEGRATION.md](./3D_AVATAR_INTEGRATION.md) - 3D avatar integration
- [CHATBOT_FIX_INSTRUCTIONS.md](./CHATBOT_FIX_INSTRUCTIONS.md) - Chatbot fixes
- [DASHBOARD_PROGRESS_UPDATE.md](./DASHBOARD_PROGRESS_UPDATE.md) - Dashboard updates

---

## 📡 API Reference

### Backend API (Node.js)

#### Authentication
```http
POST /api/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword"
}
```

#### Progress Tracking
```http
GET /api/progress/:userId
Authorization: Bearer <token>
```

```http
POST /api/progress/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user_id",
  "chapterId": "chapter_id",
  "timeSpent": 120,
  "completed": true
}
```

### AI Service API (FastAPI)

#### Health Check
```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "ollama_url": "http://localhost:11434",
  "vector_store": {
    "total_chunks": 42,
    "collection_name": "documents",
    "embedding_dimension": 384
  }
}
```

#### Upload Document
```http
POST /upload
Content-Type: multipart/form-data

file: <PDF or TXT file>
```

#### Chat (Non-Streaming)
```http
POST /chat
Content-Type: application/json

{
  "message": "What is machine learning?",
  "use_rag": true,
  "conversation_history": []
}
```

#### Chat (Streaming)
```http
POST /chat/stream
Content-Type: application/json

{
  "message": "Explain neural networks",
  "use_rag": true
}
```

**Full API documentation:** http://localhost:8000/docs (when running locally)

---

## 🧪 Testing

### Run Tests

```bash
# Backend tests
cd website_backend
npm test

# Frontend tests
cd website_frontend
npm test

# AI Service tests
cd app_backend/rag_service
pytest
```

### Manual Testing Checklist

- [ ] User signup/login
- [ ] Dashboard loads with subjects
- [ ] Chapter navigation works
- [ ] PDF viewer displays correctly
- [ ] Progress tracking updates
- [ ] Document upload succeeds
- [ ] Chatbot responds correctly
- [ ] RAG retrieves relevant context
- [ ] Analytics display properly
- [ ] Chapter locking works

---

## 🔧 Configuration

### Environment Variables

#### Frontend (.env)
```env
REACT_APP_BACKEND_URL=http://localhost:5000
```

#### Backend (.env)
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/ai_learning
JWT_SECRET=your_secret_key_here
AI_AVATAR_SERVICE_URL=http://localhost:8000
OLLAMA_BASE_URL=http://localhost:11434
NODE_ENV=development
```

#### AI Service (.env)
```env
PORT=8000
OLLAMA_BASE_URL=http://localhost:11434
CHROMA_PERSIST_DIR=./chroma_db
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
SIMILARITY_THRESHOLD=0.5
TOP_K_RESULTS=3
CHUNK_SIZE=500
CHUNK_OVERLAP=50
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Test thoroughly before submitting PR

---

## 🐛 Known Issues

- [ ] Free tier backend (Render) spins down after 15 min inactivity
- [ ] First chat response may be slow (model loading)
- [ ] Large PDF files (>50MB) may timeout
- [ ] Voice input not yet implemented

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for solutions.

---

## 🗺️ Roadmap

### Phase 1 (Current)
- [x] Basic learning platform
- [x] PDF viewer with progress tracking
- [x] RAG-enhanced chatbot
- [x] Document upload
- [x] Analytics dashboard

### Phase 2 (Planned)
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] 3D avatar integration
- [ ] Mobile app (React Native)
- [ ] Collaborative learning features

### Phase 3 (Future)
- [ ] Quiz generation from documents
- [ ] Spaced repetition system
- [ ] Gamification elements
- [ ] Social learning features
- [ ] Advanced analytics with ML insights

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **Your Name** - *Initial work* - [GitHub](https://github.com/YOUR_USERNAME)

---

## 🙏 Acknowledgments

- [Ollama](https://ollama.com/) - Local LLM runtime
- [LangChain](https://www.langchain.com/) - RAG framework
- [ChromaDB](https://www.trychroma.com/) - Vector database
- [FastAPI](https://fastapi.tiangolo.com/) - Python web framework
- [React](https://reactjs.org/) - Frontend framework
- [MongoDB](https://www.mongodb.com/) - Database

---

## 📞 Support

- **Documentation**: See [docs](./DEPLOYMENT_GUIDE.md)
- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/YOUR_REPO/issues)
- **Email**: your.email@example.com

---

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/YOUR_USERNAME/YOUR_REPO?style=social)
![GitHub forks](https://img.shields.io/github/forks/YOUR_USERNAME/YOUR_REPO?style=social)
![GitHub issues](https://img.shields.io/github/issues/YOUR_USERNAME/YOUR_REPO)
![GitHub license](https://img.shields.io/github/license/YOUR_USERNAME/YOUR_REPO)

---

**Made with ❤️ for learners everywhere**

---

## 🎯 Quick Start Commands

```bash
# Clone and setup
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd app_intern

# Install all dependencies
cd website_backend && npm install && cd ..
cd website_frontend && npm install && cd ..
cd app_backend/rag_service && pip install -r requirements.txt && cd ../..

# Start all services (in separate terminals)
cd website_backend && npm start          # Terminal 1
cd website_frontend && npm start         # Terminal 2
cd app_backend/rag_service && uvicorn api:app --reload  # Terminal 3

# Or use Docker Compose (coming soon)
docker-compose up
```

---

**Last Updated:** 2026-01-22  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
