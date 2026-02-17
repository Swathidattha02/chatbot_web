# 🚀 Complete Deployment Checklist

## Pre-Deployment Preparation

### ✅ Code Preparation
- [ ] All code committed to GitHub
- [ ] `.env` files are in `.gitignore` (never commit secrets!)
- [ ] Dockerfile created for RAG service
- [ ] `.dockerignore` created
- [ ] All dependencies listed in `requirements.txt` and `package.json`
- [ ] Test locally before deploying

### ✅ Accounts Setup
- [ ] GitHub account created
- [ ] MongoDB Atlas account created
- [ ] Railway account created (for FastAPI service)
- [ ] Render account created (for Node.js backend)
- [ ] Vercel account created (for frontend)
- [ ] Credit card added (for paid plans)

---

## 📦 Deployment Order

**Deploy in this order to avoid dependency issues:**

1. ✅ MongoDB Atlas (Database)
2. ✅ FastAPI + Ollama Service (AI Service)
3. ✅ Node.js Backend (API Server)
4. ✅ React Frontend (User Interface)

---

## Step 1: MongoDB Atlas Deployment

### Setup (5 minutes)

- [ ] Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [ ] Sign up / Log in
- [ ] Click "Build a Database"
- [ ] Select **FREE** tier (M0 Sandbox)
- [ ] Choose cloud provider: **AWS**
- [ ] Choose region: **Closest to you** (e.g., Mumbai for India)
- [ ] Cluster name: `Cluster0` (default is fine)
- [ ] Click "Create"

### Configure Access

- [ ] **Database Access**: Create user
  - Username: `your_username`
  - Password: Generate secure password (save it!)
  - Database User Privileges: **Read and write to any database**
  
- [ ] **Network Access**: Add IP
  - Click "Add IP Address"
  - Select **"Allow Access from Anywhere"** (0.0.0.0/0)
  - (For production, restrict to specific IPs)

### Get Connection String

- [ ] Click "Connect" on your cluster
- [ ] Choose "Connect your application"
- [ ] Driver: **Node.js**, Version: **4.1 or later**
- [ ] Copy connection string
- [ ] Replace `<password>` with your actual password
- [ ] Save this - you'll need it for backend!

**Example:**
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

**Status:** ✅ MongoDB Ready

---

## Step 2: FastAPI + Ollama Service (Railway)

### Prepare Code (5 minutes)

- [ ] Navigate to RAG service directory
  ```bash
  cd d:\app_intern\app_backend\rag_service
  ```

- [ ] Verify files exist:
  - [ ] `Dockerfile` ✅
  - [ ] `.dockerignore` ✅
  - [ ] `railway.json` ✅
  - [ ] `requirements.txt` ✅
  - [ ] `api.py` ✅
  - [ ] `rag_service.py` ✅
  - [ ] `streaming_handler.py` ✅

- [ ] Commit and push to GitHub
  ```bash
  git add .
  git commit -m "Add RAG service with Docker configuration"
  git push origin main
  ```

### Deploy on Railway (15 minutes)

- [ ] Go to [Railway.app](https://railway.app)
- [ ] Click "Login" → Sign in with GitHub
- [ ] Click "New Project"
- [ ] Select "Deploy from GitHub repo"
- [ ] Choose your repository
- [ ] Railway detects the repo

### Configure Service

- [ ] Click on the deployed service
- [ ] Go to **"Settings"** tab
- [ ] Set **Root Directory**: `app_backend/rag_service`
- [ ] Verify **Builder**: Dockerfile detected

### Add Environment Variables

- [ ] Click **"Variables"** tab
- [ ] Click **"New Variable"**
- [ ] Add each variable:

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

### Add Persistent Storage

- [ ] Go to **"Settings"** → **"Volumes"**
- [ ] Click **"New Volume"**
- [ ] Mount Path: `/app/chroma_db`
- [ ] Size: 1GB (default)
- [ ] Click "Add"

### Upgrade Plan

- [ ] Go to **"Settings"** → **"Plan"**
- [ ] Current: Trial (limited)
- [ ] Click **"Upgrade to Hobby"**
- [ ] Select RAM: **4GB** (recommended) or 2GB (minimum)
- [ ] Confirm payment method
- [ ] Click "Upgrade"

### Monitor Deployment

- [ ] Go to **"Deployments"** tab
- [ ] Click on the latest deployment
- [ ] Watch logs for:
  - [ ] "Building Dockerfile..."
  - [ ] "Installing Ollama..."
  - [ ] "Pulling llama3.2 model..."
  - [ ] "Ollama is running"
  - [ ] "Starting FastAPI server..."
  - [ ] "Application startup complete"

**⏱️ First deployment: 10-15 minutes**

### Get Service URL

- [ ] Go to **"Settings"** → **"Networking"**
- [ ] Click **"Generate Domain"**
- [ ] Copy the URL (e.g., `https://rag-service-production.up.railway.app`)
- [ ] **Save this URL!** You'll need it for Node.js backend

### Test Deployment

- [ ] Open terminal
- [ ] Test health endpoint:
  ```bash
  curl https://your-service.railway.app/health
  ```
- [ ] Expected response:
  ```json
  {
    "status": "healthy",
    "ollama_url": "http://localhost:11434",
    "vector_store": {
      "total_chunks": 0,
      "collection_name": "documents",
      "embedding_dimension": 384,
      "similarity_threshold": 0.5,
      "top_k": 3
    }
  }
  ```

- [ ] Test stats endpoint:
  ```bash
  curl https://your-service.railway.app/stats
  ```

**Status:** ✅ FastAPI Service Ready

**Your Railway URL:** `_______________________________`

---

## Step 3: Node.js Backend (Render)

### Prepare Environment Variables

Before deploying, prepare these values:

- [ ] MongoDB connection string (from Step 1)
- [ ] Railway FastAPI URL (from Step 2)
- [ ] JWT secret (generate random string)

**Generate JWT Secret:**
```bash
# Option 1: PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})

# Option 2: Online
# Visit: https://randomkeygen.com/
```

### Deploy on Render

- [ ] Go to [Render.com](https://render.com)
- [ ] Sign up / Log in with GitHub
- [ ] Click **"New +"** → **"Web Service"**
- [ ] Click **"Connect account"** (if first time)
- [ ] Select your repository
- [ ] Click **"Connect"**

### Configure Service

- [ ] **Name**: `ai-chatbot-backend` (or your choice)
- [ ] **Region**: Choose closest to you
- [ ] **Branch**: `main`
- [ ] **Root Directory**: `website_backend`
- [ ] **Runtime**: `Node`
- [ ] **Build Command**: `npm install`
- [ ] **Start Command**: `npm start`

### Select Plan

- [ ] **Instance Type**: 
  - [ ] Free (⚠️ spins down after 15 min inactivity)
  - [ ] Starter - $7/month (✅ recommended)

### Add Environment Variables

- [ ] Scroll to **"Environment Variables"**
- [ ] Click **"Add Environment Variable"**
- [ ] Add each variable:

```env
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
JWT_SECRET=your_generated_secret_key_here
AI_AVATAR_SERVICE_URL=https://your-rag-service.railway.app
OLLAMA_BASE_URL=https://your-rag-service.railway.app
NODE_ENV=production
```

**⚠️ Important:** Replace with your actual values!

### Deploy

- [ ] Click **"Create Web Service"**
- [ ] Wait for deployment (3-5 minutes)
- [ ] Watch logs for:
  - [ ] "Installing dependencies..."
  - [ ] "✅ MongoDB Connected Successfully"
  - [ ] "🚀 Server running on port 5000"

### Get Backend URL

- [ ] Copy the URL from the top (e.g., `https://ai-chatbot-backend.onrender.com`)
- [ ] **Save this URL!** You'll need it for frontend

### Test Backend

- [ ] Test health endpoint:
  ```bash
  curl https://your-backend.onrender.com/
  ```
- [ ] Expected response:
  ```json
  {
    "success": true,
    "message": "AI Avatar Website Backend API is running",
    "version": "1.0.0"
  }
  ```

**Status:** ✅ Backend Ready

**Your Render URL:** `_______________________________`

---

## Step 4: React Frontend (Vercel)

### Update Environment Variable

- [ ] Open `website_frontend/.env`
- [ ] Update with your backend URL:
  ```env
  REACT_APP_BACKEND_URL=https://your-backend.onrender.com
  ```

### Commit Changes

- [ ] Commit the updated `.env`:
  ```bash
  cd d:\app_intern\website_frontend
  git add .env
  git commit -m "Update backend URL for production"
  git push origin main
  ```

### Deploy on Vercel

- [ ] Go to [Vercel.com](https://vercel.com)
- [ ] Sign up / Log in with GitHub
- [ ] Click **"Add New..."** → **"Project"**
- [ ] Click **"Import"** on your repository
- [ ] Click **"Import"** again

### Configure Project

- [ ] **Framework Preset**: `Create React App` (auto-detected)
- [ ] **Root Directory**: `website_frontend`
- [ ] **Build Command**: `npm run build` (auto-filled)
- [ ] **Output Directory**: `build` (auto-filled)

### Add Environment Variables

- [ ] Click **"Environment Variables"**
- [ ] Add variable:
  - **Key**: `REACT_APP_BACKEND_URL`
  - **Value**: `https://your-backend.onrender.com`
- [ ] Click **"Add"**

### Deploy

- [ ] Click **"Deploy"**
- [ ] Wait for deployment (2-3 minutes)
- [ ] Watch build logs

### Get Frontend URL

- [ ] After deployment completes, you'll see:
  - **"Congratulations! Your project has been deployed."**
- [ ] Click **"Visit"** or copy the URL
- [ ] Default: `https://your-project.vercel.app`

### Test Frontend

- [ ] Open the Vercel URL in browser
- [ ] Test signup/login
- [ ] Test chatbot
- [ ] Upload a document
- [ ] Test RAG chat

**Status:** ✅ Frontend Ready

**Your Vercel URL:** `_______________________________`

---

## 🎉 Post-Deployment

### Update CORS (Important!)

#### Update FastAPI Service

- [ ] Go to Railway dashboard
- [ ] Click on your RAG service
- [ ] Go to **"Variables"**
- [ ] Add new variable:
  ```env
  ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://your-backend.onrender.com
  ```

#### Update Node.js Backend

- [ ] Go to Render dashboard
- [ ] Click on your backend service
- [ ] Go to **"Environment"**
- [ ] Add variable:
  ```env
  FRONTEND_URL=https://your-frontend.vercel.app
  ```

### Test End-to-End

- [ ] Open frontend in browser
- [ ] Sign up with new account
- [ ] Log in
- [ ] Navigate to dashboard
- [ ] Upload a PDF document
- [ ] Go to chat
- [ ] Ask question about the document
- [ ] Verify RAG is working (answers based on document)
- [ ] Test streaming (responses appear word-by-word)

### Monitor Services

- [ ] **Railway**: Check logs, monitor RAM usage
- [ ] **Render Backend**: Check logs, response times
- [ ] **Vercel**: Check analytics, build status
- [ ] **MongoDB**: Check database size, connections

---

## 📊 Deployment Summary

Fill in your URLs:

| Service | Platform | URL | Status |
|---------|----------|-----|--------|
| **Database** | MongoDB Atlas | `mongodb+srv://...` | ⬜ |
| **AI Service** | Railway | `https://...railway.app` | ⬜ |
| **Backend API** | Render | `https://...onrender.com` | ⬜ |
| **Frontend** | Vercel | `https://...vercel.app` | ⬜ |

---

## 💰 Monthly Cost Estimate

| Service | Plan | Cost |
|---------|------|------|
| MongoDB Atlas | Free (M0) | $0 |
| Railway (RAG) | Hobby 4GB | $10 |
| Render (Backend) | Starter | $7 |
| Vercel (Frontend) | Free | $0 |
| **TOTAL** | | **$17/month** |

---

## 🐛 Troubleshooting

### Backend can't connect to MongoDB
- [ ] Check MongoDB IP whitelist (should be 0.0.0.0/0)
- [ ] Verify connection string is correct
- [ ] Check MongoDB Atlas cluster is running

### Frontend can't reach backend
- [ ] Verify `REACT_APP_BACKEND_URL` is correct
- [ ] Check CORS settings in backend
- [ ] Test backend URL directly with curl

### RAG service not responding
- [ ] Check Railway logs for errors
- [ ] Verify Ollama started successfully
- [ ] Ensure sufficient RAM (4GB recommended)
- [ ] Check if model downloaded (llama3.2)

### Slow response times
- [ ] Upgrade Railway to 4GB RAM
- [ ] Use smaller model (llama3.2:1b)
- [ ] Reduce TOP_K_RESULTS to 2
- [ ] Enable caching

---

## 🎯 Next Steps

- [ ] Set up custom domain (optional)
- [ ] Enable SSL/HTTPS (automatic on all platforms)
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Configure backups for MongoDB
- [ ] Set up CI/CD for auto-deployment
- [ ] Add error tracking
- [ ] Monitor costs and usage

---

## 📚 Documentation Links

- [Railway Docs](https://docs.railway.app/)
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
- [FastAPI Deployment Guide](./FASTAPI_OLLAMA_DEPLOYMENT_GUIDE.md)

---

**🎉 Congratulations! Your AI chatbot is now live!**

**Share your app:** `https://your-project.vercel.app`
