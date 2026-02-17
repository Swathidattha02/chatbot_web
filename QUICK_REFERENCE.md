# 📋 Quick Reference - Deployment

## 🎯 Your Deployment URLs

Fill these in after deployment:

```
Frontend (Vercel):     https://_________________________.vercel.app
Backend (Render):      https://_________________________.onrender.com
AI Service (Railway):  https://_________________________.railway.app
MongoDB (Atlas):       mongodb+srv://_________________________
```

---

## ⚡ Quick Commands

### Test All Services
```bash
# Frontend
curl https://your-app.vercel.app

# Backend
curl https://your-backend.onrender.com/

# AI Service - Health
curl https://your-ai-service.railway.app/health

# AI Service - Stats
curl https://your-ai-service.railway.app/stats
```

### Upload Test Document
```bash
curl -X POST https://your-ai-service.railway.app/upload \
  -F "file=@document.pdf"
```

### Test Chat
```bash
curl -X POST https://your-ai-service.railway.app/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "use_rag": false}'
```

---

## 🔑 Environment Variables

### Frontend (Vercel)
```env
REACT_APP_BACKEND_URL=https://your-backend.onrender.com
```

### Backend (Render)
```env
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/
JWT_SECRET=your_random_secret_here
AI_AVATAR_SERVICE_URL=https://your-ai-service.railway.app
OLLAMA_BASE_URL=https://your-ai-service.railway.app
NODE_ENV=production
```

### AI Service (Railway)
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

---

## 📊 Platform Dashboards

| Platform | Dashboard URL |
|----------|---------------|
| Vercel | https://vercel.com/dashboard |
| Render | https://dashboard.render.com/ |
| Railway | https://railway.app/dashboard |
| MongoDB | https://cloud.mongodb.com/ |

---

## 🚀 Deployment Steps (Quick)

### 1. MongoDB Atlas (5 min)
1. Create cluster (Free M0)
2. Create database user
3. Whitelist IP: 0.0.0.0/0
4. Get connection string

### 2. Railway - AI Service (15 min)
1. New Project → GitHub repo
2. Root directory: `app_backend/rag_service`
3. Add environment variables
4. Add volume: `/app/chroma_db`
5. Upgrade to Hobby (4GB RAM)
6. Generate domain

### 3. Render - Backend (10 min)
1. New Web Service → GitHub repo
2. Root directory: `website_backend`
3. Build: `npm install`
4. Start: `npm start`
5. Add environment variables
6. Deploy

### 4. Vercel - Frontend (5 min)
1. Import GitHub repo
2. Root directory: `website_frontend`
3. Add env: `REACT_APP_BACKEND_URL`
4. Deploy

---

## 💰 Monthly Costs

| Service | Plan | Cost |
|---------|------|------|
| MongoDB Atlas | Free M0 | $0 |
| Railway (4GB) | Hobby | $10 |
| Render | Starter | $7 |
| Vercel | Free | $0 |
| **TOTAL** | | **$17** |

---

## 🔧 Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Frontend blank | Check Vercel build logs, verify env vars |
| Backend 503 | Check Render logs, verify MongoDB connection |
| Chat not working | Check Railway logs, ensure Ollama running |
| CORS error | Update backend CORS with frontend URL |
| Slow first request | Render free tier spins down - upgrade to Starter |
| Upload fails | Check file size (<50MB), verify file type (PDF/TXT) |
| Auth fails | Clear browser localStorage, check JWT_SECRET |

---

## 📱 API Endpoints

### Backend (Node.js)
```
POST   /api/auth/signup          - Create account
POST   /api/auth/login           - Login
GET    /api/progress/:userId     - Get progress
POST   /api/progress/update      - Update progress
POST   /api/documents/upload     - Upload document
```

### AI Service (FastAPI)
```
GET    /health                   - Health check
GET    /stats                    - Vector store stats
POST   /upload                   - Upload document
POST   /chat                     - Chat (non-streaming)
POST   /chat/stream              - Chat (streaming)
GET    /retrieve?query=...       - Test retrieval
POST   /clear                    - Clear vector store
```

---

## 🎨 Tech Stack

```
Frontend:  React 18 + React Router + Axios
Backend:   Node.js + Express + MongoDB + JWT
AI:        FastAPI + Ollama (llama3.2) + ChromaDB + RAG
Database:  MongoDB Atlas (Cloud)
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `DEPLOYMENT_GUIDE.md` | Main deployment guide |
| `DEPLOYMENT_CHECKLIST.md` | Step-by-step checklist |
| `FASTAPI_OLLAMA_DEPLOYMENT_GUIDE.md` | Detailed AI service guide |
| `ARCHITECTURE.md` | System architecture |
| `TROUBLESHOOTING.md` | Common issues & solutions |
| `QUICK_REFERENCE.md` | This file! |

---

## 🆘 Emergency Contacts

| Platform | Support |
|----------|---------|
| Vercel | support@vercel.com |
| Render | support@render.com |
| Railway | help@railway.app |
| MongoDB | support@mongodb.com |

---

## ✅ Health Check Checklist

Daily checks:
- [ ] Frontend loads: https://your-app.vercel.app
- [ ] Backend responds: https://your-backend.onrender.com/
- [ ] AI service healthy: https://your-ai-service.railway.app/health
- [ ] Can login/signup
- [ ] Can upload document
- [ ] Chat works
- [ ] No errors in logs

---

## 🔐 Security Checklist

- [ ] All services use HTTPS
- [ ] JWT_SECRET is random and secure
- [ ] MongoDB password is strong
- [ ] No secrets in GitHub repo
- [ ] CORS configured correctly
- [ ] MongoDB IP whitelist set
- [ ] Environment variables set on all platforms

---

## 📈 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Frontend load | < 2s | ___ |
| API response | < 300ms | ___ |
| Chat response | < 5s | ___ |
| Upload (10MB) | < 10s | ___ |
| Uptime | > 99% | ___ |

---

## 🎯 Post-Deployment Tasks

Week 1:
- [ ] Monitor all services daily
- [ ] Test all features thoroughly
- [ ] Check error logs
- [ ] Verify costs match expectations

Week 2:
- [ ] Set up monitoring (optional)
- [ ] Configure custom domain (optional)
- [ ] Set up backups
- [ ] Document any issues

Month 1:
- [ ] Review usage and costs
- [ ] Optimize performance
- [ ] Plan scaling if needed
- [ ] Update documentation

---

## 🚀 Scaling Checklist

When to scale:

**Frontend (Vercel):**
- [ ] > 100 GB bandwidth/month → Pro plan
- [ ] Need team features → Team plan

**Backend (Render):**
- [ ] Slow responses → Upgrade to Standard (2GB)
- [ ] High traffic → Add more instances

**AI Service (Railway):**
- [ ] RAM > 80% → Upgrade to 8GB
- [ ] Slow chat → Use smaller model or more CPU

**Database (MongoDB):**
- [ ] Storage > 400MB → Upgrade to M10
- [ ] Slow queries → Add indexes
- [ ] High traffic → Enable sharding

---

## 📞 Quick Support

**Before contacting support:**
1. Check status pages
2. Review logs
3. Try redeploying
4. Check documentation

**When contacting support, include:**
- Service name and URL
- Error message (exact text)
- Screenshot of logs
- Steps to reproduce
- Time of occurrence

---

**Last Updated:** 2026-01-22  
**Version:** 1.0  
**Status:** ✅ Ready for deployment
