# 🏗️ Deployment Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                          │
│                    https://your-app.vercel.app                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL (Frontend - React)                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • React SPA (Single Page Application)                   │  │
│  │  • User Interface                                        │  │
│  │  • Authentication UI                                     │  │
│  │  • Dashboard, Chat, Analytics                           │  │
│  │  • PDF Viewer                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ REST API Calls
                             │ (JSON)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 RENDER (Backend - Node.js/Express)              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  API Endpoints:                                          │  │
│  │  • POST /api/auth/signup                                 │  │
│  │  • POST /api/auth/login                                  │  │
│  │  • GET  /api/progress/:userId                            │  │
│  │  • POST /api/progress/update                             │  │
│  │  • POST /api/documents/upload                            │  │
│  │  • POST /api/chat                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────┬─────────────────────────┬────────────────────────┘
               │                         │
               │                         │ HTTP Requests
               │                         │ (Document Upload, Chat)
               │                         ▼
               │         ┌───────────────────────────────────────────┐
               │         │   RAILWAY (AI Service - FastAPI + Ollama) │
               │         │  ┌────────────────────────────────────┐  │
               │         │  │  FastAPI REST API                  │  │
               │         │  │  ┌──────────────────────────────┐  │  │
               │         │  │  │  RAG Service                 │  │  │
               │         │  │  │  • Document Processing       │  │  │
               │         │  │  │  • PDF/TXT Parsing           │  │  │
               │         │  │  │  • Text Chunking             │  │  │
               │         │  │  │  • Embedding Generation      │  │  │
               │         │  │  └──────────────────────────────┘  │  │
               │         │  │  ┌──────────────────────────────┐  │  │
               │         │  │  │  ChromaDB (Vector Store)     │  │  │
               │         │  │  │  • Semantic Search           │  │  │
               │         │  │  │  • Similarity Matching       │  │  │
               │         │  │  │  • Context Retrieval         │  │  │
               │         │  │  └──────────────────────────────┘  │  │
               │         │  │  ┌──────────────────────────────┐  │  │
               │         │  │  │  Ollama (LLM Service)        │  │  │
               │         │  │  │  • llama3.2 Model            │  │  │
               │         │  │  │  • Text Generation           │  │  │
               │         │  │  │  • Streaming Responses       │  │  │
               │         │  │  └──────────────────────────────┘  │  │
               │         │  └────────────────────────────────────┘  │
               │         └───────────────────────────────────────────┘
               │
               │ MongoDB Driver
               │ (Mongoose)
               ▼
┌─────────────────────────────────────────────────────────────────┐
│              MONGODB ATLAS (Database - Cloud)                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Collections:                                            │  │
│  │  • users (authentication, profiles)                      │  │
│  │  • subjects (course structure)                           │  │
│  │  • chapters (learning content)                           │  │
│  │  • progress (user learning data)                         │  │
│  │  • documents (uploaded files metadata)                   │  │
│  │  • chatHistory (conversation logs)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. User Authentication Flow

```
User Browser                Node.js Backend              MongoDB Atlas
     │                            │                            │
     │  POST /api/auth/signup     │                            │
     ├───────────────────────────►│                            │
     │  {email, password, name}   │                            │
     │                            │  Hash password (bcrypt)    │
     │                            │  Create user document      │
     │                            ├───────────────────────────►│
     │                            │                            │
     │                            │◄───────────────────────────┤
     │                            │  User saved                │
     │                            │  Generate JWT token        │
     │◄───────────────────────────┤                            │
     │  {token, user}             │                            │
     │                            │                            │
```

### 2. Document Upload & RAG Flow

```
User Browser          Node.js Backend         FastAPI Service         ChromaDB
     │                      │                        │                    │
     │  Upload PDF          │                        │                    │
     ├─────────────────────►│                        │                    │
     │                      │  Forward file          │                    │
     │                      ├───────────────────────►│                    │
     │                      │                        │  Parse PDF         │
     │                      │                        │  Extract text      │
     │                      │                        │  Split into chunks │
     │                      │                        │  Generate embeddings
     │                      │                        │  (Sentence-BERT)   │
     │                      │                        ├───────────────────►│
     │                      │                        │                    │
     │                      │                        │  Store vectors     │
     │                      │                        │◄───────────────────┤
     │                      │◄───────────────────────┤                    │
     │◄─────────────────────┤  Success               │                    │
     │  {success, chunks}   │                        │                    │
```

### 3. RAG-Enhanced Chat Flow

```
User Browser      Node.js Backend    FastAPI Service    ChromaDB    Ollama
     │                  │                   │               │          │
     │  Send message    │                   │               │          │
     ├─────────────────►│                   │               │          │
     │                  │  Forward query    │               │          │
     │                  ├──────────────────►│               │          │
     │                  │                   │  Search query │          │
     │                  │                   │  embedding    │          │
     │                  │                   ├──────────────►│          │
     │                  │                   │               │          │
     │                  │                   │  Return top-k │          │
     │                  │                   │  similar docs │          │
     │                  │                   │◄──────────────┤          │
     │                  │                   │                          │
     │                  │                   │  Build prompt with context
     │                  │                   │  Send to LLM  │          │
     │                  │                   ├─────────────────────────►│
     │                  │                   │               │  Generate│
     │                  │                   │               │  response│
     │                  │                   │◄─────────────────────────┤
     │                  │                   │  Stream tokens│          │
     │                  │◄──────────────────┤               │          │
     │◄─────────────────┤  Stream response  │               │          │
     │  (SSE/chunks)    │                   │               │          │
```

### 4. Progress Tracking Flow

```
User Browser          Node.js Backend          MongoDB Atlas
     │                      │                        │
     │  View PDF (2+ min)   │                        │
     │                      │                        │
     │  POST /api/progress  │                        │
     ├─────────────────────►│                        │
     │  {userId, chapterId, │                        │
     │   timeSpent: 120}    │                        │
     │                      │  Update progress       │
     │                      │  Mark complete         │
     │                      │  Calculate percentage  │
     │                      ├───────────────────────►│
     │                      │                        │
     │                      │◄───────────────────────┤
     │◄─────────────────────┤  Updated progress      │
     │  {progress: 33%}     │                        │
```

## Technology Stack

### Frontend (Vercel)
```
┌─────────────────────────────────┐
│  React 18.2.0                   │
│  ├─ React Router (Navigation)   │
│  ├─ Axios (HTTP Client)         │
│  ├─ React-PDF (PDF Viewer)      │
│  └─ CSS3 (Styling)              │
└─────────────────────────────────┘
```

### Backend (Render)
```
┌─────────────────────────────────┐
│  Node.js 18+                    │
│  ├─ Express.js (Web Framework)  │
│  ├─ Mongoose (MongoDB ODM)      │
│  ├─ JWT (Authentication)        │
│  ├─ Bcrypt (Password Hashing)   │
│  ├─ Multer (File Upload)        │
│  └─ CORS (Cross-Origin)         │
└─────────────────────────────────┘
```

### AI Service (Railway)
```
┌─────────────────────────────────┐
│  Python 3.11                    │
│  ├─ FastAPI (Web Framework)     │
│  ├─ Uvicorn (ASGI Server)       │
│  ├─ Ollama (LLM Runtime)        │
│  │  └─ llama3.2 (2GB model)     │
│  ├─ ChromaDB (Vector Store)     │
│  ├─ Sentence-Transformers       │
│  │  └─ all-MiniLM-L6-v2         │
│  ├─ LangChain (RAG Framework)   │
│  └─ PyPDF (PDF Processing)      │
└─────────────────────────────────┘
```

### Database (MongoDB Atlas)
```
┌─────────────────────────────────┐
│  MongoDB 7.0                    │
│  ├─ Cloud-hosted (AWS)          │
│  ├─ Automatic backups           │
│  ├─ Replica sets                │
│  └─ 512MB storage (Free tier)   │
└─────────────────────────────────┘
```

## Deployment Platforms Comparison

| Feature | Vercel | Render | Railway | MongoDB Atlas |
|---------|--------|--------|---------|---------------|
| **Purpose** | Frontend | Backend API | AI Service | Database |
| **Free Tier** | ✅ Generous | ✅ 750hrs/mo | ❌ Trial only | ✅ 512MB |
| **Auto-deploy** | ✅ Git push | ✅ Git push | ✅ Git push | N/A |
| **Custom domain** | ✅ Free | ✅ Free | ✅ Free | N/A |
| **SSL/HTTPS** | ✅ Auto | ✅ Auto | ✅ Auto | ✅ Built-in |
| **Build time** | 2-3 min | 3-5 min | 10-15 min | Instant |
| **Cold start** | None | ~30s (free) | None (paid) | None |
| **Scaling** | Auto | Manual | Auto | Auto |
| **Cost (prod)** | $0 | $7/mo | $10/mo | $0 |

## Resource Requirements

### Minimum (Budget Setup)
```
Frontend (Vercel):     Free tier
Backend (Render):      Starter ($7/mo) - 512MB RAM
AI Service (Railway):  Hobby ($5/mo) - 2GB RAM
Database (MongoDB):    Free tier - 512MB
─────────────────────────────────────────────
TOTAL:                 $12/month
```

### Recommended (Production)
```
Frontend (Vercel):     Free tier
Backend (Render):      Starter ($7/mo) - 512MB RAM
AI Service (Railway):  Hobby ($10/mo) - 4GB RAM
Database (MongoDB):    Free tier - 512MB
─────────────────────────────────────────────
TOTAL:                 $17/month
```

### High Performance
```
Frontend (Vercel):     Pro ($20/mo) - Better analytics
Backend (Render):      Standard ($25/mo) - 2GB RAM
AI Service (Railway):  Hobby ($20/mo) - 8GB RAM
Database (MongoDB):    M10 ($57/mo) - 10GB storage
─────────────────────────────────────────────
TOTAL:                 $122/month
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Security Layers                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Transport Security                                      │
│     ├─ HTTPS/TLS 1.3 (All platforms)                       │
│     └─ Automatic SSL certificates                          │
│                                                             │
│  2. Authentication                                          │
│     ├─ JWT tokens (Bearer authentication)                  │
│     ├─ Password hashing (bcrypt, 10 rounds)                │
│     └─ Token expiration (24 hours)                         │
│                                                             │
│  3. Authorization                                           │
│     ├─ User-specific data access                           │
│     ├─ Protected routes (middleware)                       │
│     └─ Role-based access control                           │
│                                                             │
│  4. Data Security                                           │
│     ├─ MongoDB encryption at rest                          │
│     ├─ Environment variables (secrets)                     │
│     └─ No sensitive data in logs                           │
│                                                             │
│  5. API Security                                            │
│     ├─ CORS configuration                                  │
│     ├─ Rate limiting (planned)                             │
│     ├─ Input validation                                    │
│     └─ Error handling (no info leakage)                    │
│                                                             │
│  6. Network Security                                        │
│     ├─ MongoDB IP whitelist                                │
│     ├─ Private service communication                       │
│     └─ No exposed credentials                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Monitoring & Logging

```
┌──────────────────────────────────────────────────────────┐
│  Vercel (Frontend)                                       │
│  ├─ Analytics Dashboard                                  │
│  ├─ Build logs                                           │
│  ├─ Function logs                                        │
│  └─ Performance metrics                                  │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  Render (Backend)                                        │
│  ├─ Application logs                                     │
│  ├─ Request/response logs                                │
│  ├─ Error tracking                                       │
│  └─ Resource usage (CPU, RAM)                            │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  Railway (AI Service)                                    │
│  ├─ Build logs                                           │
│  ├─ Runtime logs                                         │
│  ├─ Ollama logs                                          │
│  ├─ Resource metrics                                     │
│  └─ Deployment history                                   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  MongoDB Atlas                                           │
│  ├─ Query performance                                    │
│  ├─ Connection metrics                                   │
│  ├─ Storage usage                                        │
│  └─ Slow query logs                                      │
└──────────────────────────────────────────────────────────┘
```

## Scaling Strategy

### Horizontal Scaling
```
Current:  1 instance each service
          ↓
Scale:    Multiple instances (load balanced)
          ↓
Result:   Higher availability, better performance
```

### Vertical Scaling
```
Current:  2-4GB RAM (AI service)
          ↓
Scale:    8-16GB RAM
          ↓
Result:   Faster responses, larger models
```

### Database Scaling
```
Current:  Free tier (512MB)
          ↓
Scale:    M10 cluster (10GB, replica set)
          ↓
Result:   Better performance, automatic failover
```

## Backup & Recovery

```
┌─────────────────────────────────────────────────────────┐
│  Automated Backups                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  MongoDB Atlas:                                         │
│  ├─ Continuous backups (M10+)                          │
│  ├─ Point-in-time recovery                             │
│  └─ Snapshot retention: 7 days                         │
│                                                         │
│  Railway (Vector Store):                               │
│  ├─ Volume snapshots (manual)                          │
│  └─ Persistent storage                                 │
│                                                         │
│  Code Repository:                                       │
│  ├─ GitHub (version control)                           │
│  └─ Deployment history                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Disaster Recovery Plan

1. **Database Failure**
   - MongoDB Atlas: Automatic failover to replica
   - Recovery time: < 1 minute

2. **Backend Service Failure**
   - Render: Auto-restart on crash
   - Manual redeploy from GitHub
   - Recovery time: 3-5 minutes

3. **AI Service Failure**
   - Railway: Auto-restart on crash
   - Rebuild from Dockerfile
   - Recovery time: 10-15 minutes

4. **Frontend Failure**
   - Vercel: Rollback to previous deployment
   - Redeploy from GitHub
   - Recovery time: 2-3 minutes

## Performance Benchmarks

### Response Times (Expected)

| Operation | Time | Notes |
|-----------|------|-------|
| Page load | 1-2s | First load |
| API call | 100-300ms | Backend |
| Chat (no RAG) | 3-5s | LLM generation |
| Chat (with RAG) | 4-7s | Retrieval + generation |
| Document upload | 5-15s | Depends on size |
| PDF render | 2-4s | Per page |

### Throughput

| Metric | Value | Notes |
|--------|-------|-------|
| Concurrent users | 50-100 | With current setup |
| Requests/second | 10-20 | Backend API |
| Chat requests/min | 5-10 | AI service |
| Document uploads/hour | 100+ | Backend |

---

**📚 Related Documentation:**
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [FastAPI Deployment Guide](./FASTAPI_OLLAMA_DEPLOYMENT_GUIDE.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
