# 🔧 Git Setup & Deployment Guide

## 📍 Current Status

**Your situation:**
- ✅ Code exists locally in `d:\app_intern`
- ❌ **NOT** initialized as a Git repository
- ❌ **NOT** pushed to GitHub

**What this means:**
- You need to initialize Git and push to GitHub BEFORE deploying
- Railway, Render, and Vercel all deploy FROM GitHub
- This is a required step for deployment

---

## 🎯 Quick Answer

### **Do you need to push to GitHub?**

**YES! ✅** You MUST push your code to GitHub because:

1. **Railway** deploys from GitHub repository
2. **Render** deploys from GitHub repository  
3. **Vercel** deploys from GitHub repository

**All deployment platforms require your code to be in GitHub!**

---

## 🚀 Step-by-Step: Initialize Git & Push to GitHub

### Step 1: Create .gitignore (IMPORTANT!)

First, create a `.gitignore` file to exclude sensitive files:

```bash
cd d:\app_intern
```

Create `.gitignore` with this content:

```gitignore
# Environment variables (NEVER commit these!)
.env
*.env
.env.local
.env.production

# Node modules
node_modules/
*/node_modules/

# Python
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
venv/
env/
*.egg-info/

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Build outputs
build/
dist/
*.egg

# Database
*.sqlite
*.db

# ChromaDB
chroma_db/
*/chroma_db/

# Uploads
uploads/
*/uploads/

# Temporary files
*.tmp
*.temp
.cache/
```

### Step 2: Initialize Git Repository

```bash
# Initialize Git
git init

# Check status
git status
```

### Step 3: Add All Files

```bash
# Add all files (except those in .gitignore)
git add .

# Check what will be committed
git status
```

**⚠️ IMPORTANT:** Make sure `.env` files are NOT in the list!

### Step 4: Make First Commit

```bash
# Commit with a message
git commit -m "Initial commit: AI-powered learning platform with RAG"
```

### Step 5: Create GitHub Repository

**Option A: Via GitHub Website (Recommended)**

1. Go to [GitHub.com](https://github.com)
2. Click the **"+"** icon (top right) → **"New repository"**
3. Repository name: `ai-learning-platform` (or your choice)
4. Description: "AI-powered learning platform with RAG chatbot"
5. **Keep it Private** (recommended) or Public
6. **DO NOT** initialize with README, .gitignore, or license
7. Click **"Create repository"**

**Option B: Via GitHub CLI (if installed)**

```bash
gh repo create ai-learning-platform --private --source=. --remote=origin
```

### Step 6: Connect to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/ai-learning-platform.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

### Step 7: Verify

```bash
# Check remote
git remote -v

# Should show:
# origin  https://github.com/YOUR_USERNAME/ai-learning-platform.git (fetch)
# origin  https://github.com/YOUR_USERNAME/ai-learning-platform.git (push)
```

Visit your GitHub repository URL to confirm files are there!

---

## ✅ Verification Checklist

After pushing, verify:

- [ ] Repository exists on GitHub
- [ ] All code files are visible
- [ ] `.env` files are NOT visible (they should be ignored)
- [ ] `node_modules/` is NOT visible (should be ignored)
- [ ] `__pycache__/` is NOT visible (should be ignored)
- [ ] All documentation files are there
- [ ] Dockerfile is there
- [ ] requirements.txt files are there

---

## 🔐 Security Check

**CRITICAL:** Make sure these are NOT in GitHub:

❌ `.env` files  
❌ `node_modules/`  
❌ `__pycache__/`  
❌ Database files  
❌ API keys  
❌ Passwords  
❌ JWT secrets  

**If you accidentally committed secrets:**

```bash
# Remove from Git but keep locally
git rm --cached .env
git rm --cached website_backend/.env
git rm --cached website_frontend/.env
git rm --cached app_backend/rag_service/.env

# Commit the removal
git commit -m "Remove sensitive files"

# Push
git push
```

---

## 📦 Which Service to Deploy?

You have TWO FastAPI services:

### Option 1: RAG Service (RECOMMENDED) ✅

**Location:** `app_backend/rag_service/`

**Features:**
- ✅ Full RAG (Retrieval-Augmented Generation)
- ✅ Document upload (PDF, TXT)
- ✅ ChromaDB vector store
- ✅ Semantic search
- ✅ Streaming chat
- ✅ Context-aware responses

**Deploy this if:** You want full document-based Q&A functionality

**Root Directory for Railway:** `app_backend/rag_service`

### Option 2: Simple Chat Service

**Location:** `fastapi_ollama_service/`

**Features:**
- ✅ Basic Ollama chat
- ✅ Streaming responses
- ❌ No document upload
- ❌ No RAG
- ❌ No vector store

**Deploy this if:** You only need basic chat (not recommended)

**Root Directory for Railway:** `fastapi_ollama_service`

---

## 🚀 After Pushing to GitHub

### For Railway Deployment:

1. **Go to Railway.app**
2. **New Project** → **Deploy from GitHub repo**
3. **Select your repository:** `ai-learning-platform`
4. **Set Root Directory:**
   - For RAG Service: `app_backend/rag_service`
   - For Simple Chat: `fastapi_ollama_service`
5. **Railway will auto-detect Dockerfile**
6. **Add environment variables** (see DEPLOYMENT_CHECKLIST.md)
7. **Deploy!**

### For Render Deployment (Backend):

1. **Go to Render.com**
2. **New Web Service**
3. **Connect GitHub repo:** `ai-learning-platform`
4. **Root Directory:** `website_backend`
5. **Build Command:** `npm install`
6. **Start Command:** `npm start`
7. **Add environment variables**
8. **Deploy!**

### For Vercel Deployment (Frontend):

1. **Go to Vercel.com**
2. **Import Git Repository**
3. **Select:** `ai-learning-platform`
4. **Root Directory:** `website_frontend`
5. **Framework:** Create React App (auto-detected)
6. **Add environment variable:** `REACT_APP_BACKEND_URL`
7. **Deploy!**

---

## 🎯 Complete Git Workflow

### Initial Setup (One Time)

```bash
# 1. Create .gitignore
# (see Step 1 above)

# 2. Initialize Git
git init

# 3. Add files
git add .

# 4. First commit
git commit -m "Initial commit"

# 5. Create GitHub repo (via website)

# 6. Add remote
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# 7. Push
git branch -M main
git push -u origin main
```

### Future Updates

```bash
# 1. Make changes to your code

# 2. Check what changed
git status

# 3. Add changes
git add .

# 4. Commit
git commit -m "Description of changes"

# 5. Push
git push
```

**Note:** Railway, Render, and Vercel can auto-deploy on every push!

---

## 🔄 Deployment Workflow

```
Local Code
    ↓
Initialize Git
    ↓
Create .gitignore
    ↓
Commit code
    ↓
Create GitHub repo
    ↓
Push to GitHub
    ↓
Deploy from GitHub:
    ├─ Railway (AI Service)
    ├─ Render (Backend)
    └─ Vercel (Frontend)
```

---

## 📋 Quick Commands Reference

```bash
# Initialize Git
git init

# Check status
git status

# Add all files
git add .

# Commit
git commit -m "Your message"

# Add remote
git remote add origin https://github.com/USERNAME/REPO.git

# Push
git push -u origin main

# Check remote
git remote -v

# See commit history
git log --oneline

# See what will be committed
git status
```

---

## 🐛 Common Issues

### Issue: "fatal: not a git repository"
**Solution:** Run `git init` first

### Issue: ".env file is in GitHub!"
**Solution:**
```bash
git rm --cached .env
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Remove .env and update .gitignore"
git push
```

### Issue: "node_modules/ is in GitHub!"
**Solution:**
```bash
git rm -r --cached node_modules
echo "node_modules/" >> .gitignore
git add .gitignore
git commit -m "Remove node_modules"
git push
```

### Issue: "Repository too large"
**Solution:** Make sure .gitignore excludes:
- node_modules/
- __pycache__/
- chroma_db/
- uploads/

---

## ✅ Final Checklist

Before deploying:

- [ ] Git initialized (`git init`)
- [ ] `.gitignore` created with proper exclusions
- [ ] All code committed (`git commit`)
- [ ] GitHub repository created
- [ ] Remote added (`git remote add origin`)
- [ ] Code pushed to GitHub (`git push`)
- [ ] Verified on GitHub website
- [ ] No `.env` files in GitHub
- [ ] No `node_modules/` in GitHub
- [ ] Ready to deploy from GitHub!

---

## 🎯 Your Next Steps

1. **Create .gitignore** (use template above)
2. **Initialize Git** (`git init`)
3. **Add files** (`git add .`)
4. **Commit** (`git commit -m "Initial commit"`)
5. **Create GitHub repo** (via GitHub website)
6. **Push to GitHub** (follow commands from GitHub)
7. **Verify on GitHub**
8. **Proceed to deployment** (DEPLOYMENT_CHECKLIST.md)

---

## 📞 Need Help?

- **Git Basics:** [GitHub Guides](https://guides.github.com/)
- **Git Documentation:** [git-scm.com](https://git-scm.com/doc)
- **GitHub Help:** [docs.github.com](https://docs.github.com/)

---

**🎯 Summary:**

**YES, you MUST push to GitHub before deploying!**

**Steps:**
1. Create .gitignore
2. Initialize Git
3. Commit code
4. Create GitHub repo
5. Push to GitHub
6. Deploy from GitHub

**Time needed:** 10-15 minutes

**Then you can deploy!** 🚀
