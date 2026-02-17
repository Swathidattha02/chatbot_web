# 🚀 Website Deployment - Simple Steps

## 🎯 What You're Deploying

**Your Website has 3 parts:**

1. **Frontend** (React) → Vercel
2. **Backend** (Node.js) → Render  
3. **Ollama Service** (FastAPI) → Railway

---

## ⏱️ Time Required: 35 minutes

- Git Setup: 10 minutes
- Railway (Ollama): 15 minutes
- Render (Backend): 5 minutes
- Vercel (Frontend): 5 minutes

---

## 📋 Step 1: Git Setup (10 minutes)

### 1.1 Initialize Git

```bash
cd d:\app_intern
git init
```

### 1.2 Add Remote

```bash
git remote add origin https://github.com/Swathidattha02/chatbot_web.git
```

### 1.3 Pull Existing Code

```bash
git pull origin main --allow-unrelated-histories
```

If there are conflicts, resolve them or use:
```bash
git reset --hard origin/main
```

### 1.4 Add Website Files

```bash
# Add website files
git add website_frontend/
git add website_backend/
git add fastapi_ollama_service/
git add .gitignore

# Optional: Add docs
git add DEPLOYMENT_GUIDE.md
git add README.md
```

### 1.5 Verify (IMPORTANT!)

```bash
git status
```

**Check:** Make sure `.env` files are NOT in the list!

If you see `.env` files:
```bash
# Remove them
git reset website_frontend/.env
git reset website_backend/.env
git reset fastapi_ollama_service/.env
```

### 1.6 Commit and Push

```bash
git commit -m "Add website deployment files"
git push origin main
```

### 1.7 Verify on GitHub

Go to: https://github.com/Swathidattha02/chatbot_web

Check:
- ✅ `website_frontend/` is there
- ✅ `website_backend/` is there
- ✅ `fastapi_ollama_service/` is there
- ❌ NO `.env` files visible

---

## 📋 Step 2: Deploy Ollama Service to Railway (15 minutes)

### 2.1 Create Railway Account

1. Go to https://railway.app
2. Click "Login" → Sign in with GitHub
3. Authorize Railway

### 2.2 Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose `Swathidattha02/chatbot_web`

### 2.3 Configure Service

1. Railway will detect your repo
2. Click on the service card
3. Go to "Settings"
4. **Set Root Directory:** `fastapi_ollama_service`
5. Verify "Builder" shows: Dockerfile

### 2.4 Add Environment Variables

Click "Variables" tab, add these:

```env
PORT=8000
```

That's it! The Dockerfile handles everything else.

### 2.5 Upgrade Plan

1. Go to "Settings" → "Plan"
2. Click "Upgrade to Hobby"
3. Select **2GB RAM** (minimum) or **4GB RAM** (recommended)
4. Add payment method
5. Confirm

**Cost:** $5-10/month

### 2.6 Deploy

1. Railway will automatically start building
2. Go to "Deployments" tab
3. Watch the logs
4. Wait for:
   - "Building Dockerfile..."
   - "Installing Ollama..."
   - "Pulling llama3.2..."
   - "Starting FastAPI server..."
   - "Application startup complete"

**This takes 10-15 minutes on first deploy!**

### 2.7 Get Service URL

1. Go to "Settings" → "Networking"
2. Click "Generate Domain"
3. Copy the URL (e.g., `https://fastapi-ollama-production.up.railway.app`)

**Save this URL!** You'll need it for the backend.

### 2.8 Test

```bash
curl https://your-service.railway.app/health
```

Should return:
```json
{
  "status": "healthy",
  "ollama_available": true,
  "model": "llama3.2"
}
```

✅ **Railway Done!**

---

## 📋 Step 3: Deploy Backend to Render (5 minutes)

### 3.1 Create Render Account

1. Go to https://render.com
2. Sign up / Log in with GitHub

### 3.2 Create Web Service

1. Click "New +" → "Web Service"
2. Click "Connect account" (if first time)
3. Select `Swathidattha02/chatbot_web`
4. Click "Connect"

### 3.3 Configure Service

Fill in:

- **Name:** `ai-learning-backend` (or your choice)
- **Region:** Choose closest to you
- **Branch:** `main`
- **Root Directory:** `website_backend`
- **Runtime:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm start`

### 3.4 Select Plan

- **Free** (spins down after 15 min) OR
- **Starter** ($7/month) ← Recommended

### 3.5 Add Environment Variables

Click "Advanced" → "Add Environment Variable"

Add these:

```env
PORT=5000
MONGO_URI=mongodb+srv://swathidatthapasupuleti02_db_user:siesmikQhDM6T5uV@cluster0.9zyukaq.mongodb.net/?appName=Cluster0
JWT_SECRET=your_jwt_secret_key_here_change_in_production
OLLAMA_BASE_URL=https://your-railway-service.railway.app
LLM_MODEL=llama3.2
NODE_ENV=production
```

**Replace:**
- `OLLAMA_BASE_URL` with your Railway URL from Step 2.7
- `JWT_SECRET` with a random string

**To generate JWT secret:**
```bash
# PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

### 3.6 Deploy

1. Click "Create Web Service"
2. Wait 3-5 minutes
3. Watch logs for:
   - "Installing dependencies..."
   - "✅ MongoDB Connected Successfully"
   - "🚀 Server running on port 5000"

### 3.7 Get Backend URL

Copy the URL from the top (e.g., `https://ai-learning-backend.onrender.com`)

**Save this URL!** You'll need it for frontend.

### 3.8 Test

```bash
curl https://your-backend.onrender.com/
```

Should return:
```json
{
  "success": true,
  "message": "AI Avatar Website Backend API is running",
  "version": "1.0.0"
}
```

✅ **Render Done!**

---

## 📋 Step 4: Deploy Frontend to Vercel (5 minutes)

### 4.1 Update Frontend .env

**IMPORTANT:** Update your local `.env` first:

```bash
cd website_frontend
```

Edit `.env`:
```env
REACT_APP_BACKEND_URL=https://your-backend.onrender.com
```

**Replace** with your Render URL from Step 3.7

Commit this change:
```bash
cd ..
git add website_frontend/.env
git commit -m "Update backend URL for production"
git push origin main
```

### 4.2 Create Vercel Account

1. Go to https://vercel.com
2. Sign up / Log in with GitHub

### 4.3 Import Project

1. Click "Add New..." → "Project"
2. Click "Import" next to `chatbot_web`

### 4.4 Configure Project

- **Framework Preset:** Create React App (auto-detected)
- **Root Directory:** `website_frontend`
- **Build Command:** `npm run build` (auto-filled)
- **Output Directory:** `build` (auto-filled)

### 4.5 Add Environment Variable

Click "Environment Variables"

Add:
- **Key:** `REACT_APP_BACKEND_URL`
- **Value:** `https://your-backend.onrender.com`

### 4.6 Deploy

1. Click "Deploy"
2. Wait 2-3 minutes
3. Watch build logs

### 4.7 Get Frontend URL

After deployment:
- You'll see "Congratulations!"
- Copy the URL (e.g., `https://chatbot-web.vercel.app`)

### 4.8 Test

1. Open the URL in browser
2. Try to sign up
3. Try to log in
4. Test the chatbot

✅ **Vercel Done!**

---

## 🎉 Deployment Complete!

### Your Live URLs:

```
Frontend:  https://your-app.vercel.app
Backend:   https://your-backend.onrender.com
AI Service: https://your-ollama.railway.app
```

---

## ✅ Post-Deployment Checklist

Test everything:

- [ ] Frontend loads
- [ ] Can sign up
- [ ] Can log in
- [ ] Dashboard displays
- [ ] Can view chapters
- [ ] Can chat with AI
- [ ] AI responds correctly
- [ ] Progress tracking works
- [ ] Analytics display

---

## 🐛 Common Issues

### Issue: "Failed to fetch" in frontend

**Solution:**
1. Check CORS in backend
2. Verify `REACT_APP_BACKEND_URL` is correct
3. Check backend is running on Render

### Issue: "Ollama is not running"

**Solution:**
1. Check Railway logs
2. Verify Railway service is running
3. Check `OLLAMA_BASE_URL` in Render backend

### Issue: "MongoDB connection failed"

**Solution:**
1. Check MongoDB Atlas is running
2. Verify `MONGO_URI` is correct
3. Check IP whitelist (should be 0.0.0.0/0)

### Issue: Backend is slow on first request

**Solution:**
- This is normal on Render free tier (spins down)
- Upgrade to Starter plan ($7/month)

---

## 💰 Monthly Costs

```
MongoDB Atlas:  FREE
Railway (2GB):  $5/month
Render (Starter): $7/month
Vercel:         FREE
─────────────────────────
TOTAL:          $12/month
```

Or with 4GB Railway: $17/month

---

## 📞 Support

If you get stuck:

1. Check logs on each platform
2. Verify environment variables
3. Test each service individually
4. Check `TROUBLESHOOTING.md`

---

## 🎯 Summary

**What you deployed:**
1. ✅ Railway - Ollama AI service
2. ✅ Render - Node.js backend
3. ✅ Vercel - React frontend

**Total time:** ~35 minutes

**Total cost:** $12-17/month

**Your website is now LIVE!** 🎉

---

**Next:** Share your URL and start using your AI-powered learning platform!
