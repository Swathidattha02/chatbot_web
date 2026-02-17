# 🚨 Deployment Troubleshooting Guide

## Quick Diagnosis

### Is your service down? Follow this flowchart:

```
Service not working?
        │
        ├─ Frontend not loading?
        │   ├─ Check Vercel dashboard
        │   ├─ Check browser console (F12)
        │   └─ See: Frontend Issues
        │
        ├─ Can't login/signup?
        │   ├─ Check backend logs
        │   ├─ Check MongoDB connection
        │   └─ See: Authentication Issues
        │
        ├─ Chat not working?
        │   ├─ Check Railway logs
        │   ├─ Check Ollama status
        │   └─ See: AI Service Issues
        │
        └─ Document upload failing?
            ├─ Check file size
            ├─ Check backend logs
            └─ See: Upload Issues
```

---

## Frontend Issues (Vercel)

### ❌ Problem: "Page not found" or blank screen

**Symptoms:**
- White screen
- 404 error
- "This page could not be found"

**Solutions:**

1. **Check build status**
   ```
   Vercel Dashboard → Your Project → Deployments
   ```
   - Look for failed builds (red X)
   - Click on deployment to see build logs

2. **Check environment variables**
   ```
   Vercel Dashboard → Settings → Environment Variables
   ```
   - Verify `REACT_APP_BACKEND_URL` is set
   - Should be: `https://your-backend.onrender.com`

3. **Check build command**
   ```
   Vercel Dashboard → Settings → General
   ```
   - Build Command: `npm run build`
   - Output Directory: `build`
   - Install Command: `npm install`

4. **Redeploy**
   ```
   Vercel Dashboard → Deployments → ⋯ → Redeploy
   ```

### ❌ Problem: "Failed to fetch" or CORS errors

**Symptoms:**
- Console error: "CORS policy blocked"
- Console error: "Failed to fetch"
- Network errors in browser DevTools

**Solutions:**

1. **Check backend URL**
   - Open browser console (F12)
   - Look for failed requests
   - Verify URL is correct

2. **Update CORS in backend**
   ```javascript
   // website_backend/src/server.js
   app.use(cors({ 
     origin: "https://your-frontend.vercel.app",
     credentials: true 
   }));
   ```

3. **Redeploy backend** after CORS fix

4. **Check if backend is running**
   ```bash
   curl https://your-backend.onrender.com/
   ```

### ❌ Problem: Slow loading or timeout

**Solutions:**

1. **Check Render backend status**
   - Free tier spins down after 15 min
   - First request takes 30-60s to wake up
   - **Solution**: Upgrade to Starter plan ($7/mo)

2. **Optimize bundle size**
   ```bash
   cd website_frontend
   npm run build
   # Check build/static/js/*.js file sizes
   ```

---

## Backend Issues (Render)

### ❌ Problem: "Service Unavailable" or 503 errors

**Symptoms:**
- Backend not responding
- 503 Service Unavailable
- Timeout errors

**Solutions:**

1. **Check service status**
   ```
   Render Dashboard → Your Service → Events
   ```
   - Look for "Deploy succeeded" (green)
   - Check for crashes or restarts

2. **Check logs**
   ```
   Render Dashboard → Your Service → Logs
   ```
   - Look for errors (red text)
   - Check for "Server running on port 5000"

3. **Common log errors:**

   **Error: "MongoDB Connection Error"**
   ```
   Solution:
   1. Check MongoDB Atlas is running
   2. Verify MONGO_URI in environment variables
   3. Check IP whitelist (should be 0.0.0.0/0)
   ```

   **Error: "Port already in use"**
   ```
   Solution:
   1. Render sets PORT automatically
   2. Ensure server.js uses process.env.PORT
   3. Don't hardcode port 5000
   ```

   **Error: "Module not found"**
   ```
   Solution:
   1. Check package.json has all dependencies
   2. Trigger manual deploy
   3. Clear build cache and redeploy
   ```

4. **Restart service**
   ```
   Render Dashboard → Your Service → Manual Deploy → Deploy latest commit
   ```

### ❌ Problem: "Cannot connect to MongoDB"

**Symptoms:**
- "MongoDB Connection Error" in logs
- Authentication errors
- Timeout connecting to database

**Solutions:**

1. **Check MongoDB Atlas cluster**
   ```
   MongoDB Atlas → Database → Cluster0
   ```
   - Ensure cluster is running (not paused)
   - Free tier doesn't pause, but check anyway

2. **Verify connection string**
   ```
   Render Dashboard → Environment → MONGO_URI
   ```
   - Format: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/`
   - Replace `<password>` with actual password
   - No spaces or special characters in password

3. **Check IP whitelist**
   ```
   MongoDB Atlas → Network Access
   ```
   - Should have: `0.0.0.0/0` (Allow from anywhere)
   - If not, click "Add IP Address" → "Allow Access from Anywhere"

4. **Test connection locally**
   ```bash
   cd website_backend
   node -e "const mongoose = require('mongoose'); mongoose.connect('YOUR_MONGO_URI').then(() => console.log('✅ Connected')).catch(err => console.error('❌', err));"
   ```

### ❌ Problem: Free tier spinning down

**Symptoms:**
- First request takes 30-60 seconds
- Service sleeps after 15 minutes of inactivity

**Solutions:**

1. **Upgrade to paid plan** (Recommended)
   ```
   Render Dashboard → Your Service → Settings → Instance Type → Starter ($7/mo)
   ```

2. **Keep-alive service** (Temporary workaround)
   - Use a cron job to ping your service every 10 minutes
   - Example: UptimeRobot (free monitoring service)

---

## AI Service Issues (Railway)

### ❌ Problem: "Ollama is not running"

**Symptoms:**
- Chat returns error
- Health check fails
- "Connection refused" to Ollama

**Solutions:**

1. **Check Railway logs**
   ```
   Railway Dashboard → Your Service → Deployments → View Logs
   ```
   - Look for: "Ollama is running"
   - Look for: "Pulling llama3.2 model..."
   - Look for: "Starting FastAPI server..."

2. **Common issues:**

   **Issue: Ollama didn't start**
   ```
   Logs show: "ollama: command not found"
   
   Solution:
   1. Check Dockerfile has: RUN curl -fsSL https://ollama.com/install.sh | sh
   2. Redeploy service
   ```

   **Issue: Model not downloaded**
   ```
   Logs show: "Error: model 'llama3.2' not found"
   
   Solution:
   1. Check Dockerfile has: ollama pull llama3.2
   2. Increase sleep time in start.sh (from 10 to 15 seconds)
   3. Redeploy
   ```

   **Issue: Port conflict**
   ```
   Logs show: "Address already in use"
   
   Solution:
   1. Ensure EXPOSE 8000 11434 in Dockerfile
   2. Check start command uses correct port
   3. Redeploy
   ```

3. **Test Ollama manually**
   ```
   Railway Dashboard → Your Service → Shell (if available)
   
   # Or test via API:
   curl https://your-service.railway.app/health
   ```

4. **Restart service**
   ```
   Railway Dashboard → Your Service → Settings → Restart
   ```

### ❌ Problem: Out of memory / Service crashing

**Symptoms:**
- Service keeps restarting
- "OOMKilled" in logs
- 502 Bad Gateway

**Solutions:**

1. **Check RAM usage**
   ```
   Railway Dashboard → Your Service → Metrics
   ```
   - If usage > 90%, you need more RAM

2. **Upgrade RAM**
   ```
   Railway Dashboard → Your Service → Settings → Resources
   ```
   - Minimum: 2GB (may crash)
   - Recommended: 4GB
   - Stable: 8GB

3. **Use smaller model**
   ```dockerfile
   # In Dockerfile, change:
   ollama pull llama3.2
   
   # To:
   ollama pull llama3.2:1b  # Smaller, faster, uses less RAM
   ```

4. **Reduce concurrent requests**
   ```python
   # In api.py, add to uvicorn.run():
   workers=1,
   limit_concurrency=5
   ```

### ❌ Problem: Slow response times (10+ seconds)

**Solutions:**

1. **Use smaller/faster model**
   ```dockerfile
   # Dockerfile
   ollama pull llama3.2:1b  # Fastest
   # or
   ollama pull phi3  # Good balance
   ```

2. **Reduce context retrieval**
   ```env
   # Railway environment variables
   TOP_K_RESULTS=2  # Instead of 3
   SIMILARITY_THRESHOLD=0.6  # Instead of 0.5 (fewer chunks)
   ```

3. **Upgrade to more CPU/RAM**
   ```
   Railway Dashboard → Settings → Resources → 4GB RAM + 2 vCPU
   ```

### ❌ Problem: Vector store not persisting

**Symptoms:**
- Uploaded documents disappear after restart
- Stats show 0 chunks after redeploy

**Solutions:**

1. **Add persistent volume**
   ```
   Railway Dashboard → Your Service → Settings → Volumes
   ```
   - Click "New Volume"
   - Mount Path: `/app/chroma_db`
   - Size: 1GB

2. **Verify environment variable**
   ```env
   CHROMA_PERSIST_DIR=/app/chroma_db
   ```

3. **Redeploy after adding volume**

---

## Database Issues (MongoDB Atlas)

### ❌ Problem: "Authentication failed"

**Solutions:**

1. **Check credentials**
   ```
   MongoDB Atlas → Database Access
   ```
   - Verify username exists
   - Reset password if needed

2. **Update connection string**
   ```
   Format: mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/
   ```
   - Replace USERNAME and PASSWORD
   - No angle brackets < >

3. **Special characters in password**
   ```
   If password has special characters, URL-encode them:
   @ → %40
   : → %3A
   / → %2F
   ? → %3F
   # → %23
   ```

### ❌ Problem: "Connection timeout"

**Solutions:**

1. **Check IP whitelist**
   ```
   MongoDB Atlas → Network Access → Add IP Address
   ```
   - Add: `0.0.0.0/0` (Allow from anywhere)

2. **Check cluster status**
   ```
   MongoDB Atlas → Database → Cluster0
   ```
   - Should show "Active" (green)

3. **Test connection**
   ```bash
   mongosh "mongodb+srv://cluster0.xxxxx.mongodb.net/" --username YOUR_USERNAME
   ```

---

## Upload Issues

### ❌ Problem: "File upload failed"

**Solutions:**

1. **Check file size**
   ```
   Maximum: 50MB (default)
   
   To increase, update backend:
   // website_backend/src/server.js
   app.use(express.json({ limit: '100mb' }));
   app.use(express.urlencoded({ limit: '100mb', extended: true }));
   ```

2. **Check file type**
   ```
   Supported: PDF, TXT only
   
   To add more types, update:
   // app_backend/rag_service/api.py
   supported_types = {".pdf": "pdf", ".txt": "txt", ".docx": "docx"}
   ```

3. **Check backend logs**
   ```
   Look for: "Upload error" or "Processing error"
   ```

---

## Authentication Issues

### ❌ Problem: "Invalid token" or "Unauthorized"

**Solutions:**

1. **Clear browser storage**
   ```
   Browser DevTools (F12) → Application → Local Storage → Clear
   ```

2. **Check JWT secret**
   ```
   Render Dashboard → Environment → JWT_SECRET
   ```
   - Should be a long random string
   - Must be the same across all backend instances

3. **Token expiration**
   ```javascript
   // Backend generates tokens with 24h expiry
   // User needs to login again after 24 hours
   ```

### ❌ Problem: "User already exists"

**Solutions:**

1. **Use different email**
   ```
   Each email can only be registered once
   ```

2. **Reset database** (development only)
   ```
   MongoDB Atlas → Collections → users → Delete All
   ```

---

## Performance Issues

### ❌ Problem: Everything is slow

**Diagnosis checklist:**

1. **Check each service status**
   - [ ] Vercel: Deployment successful?
   - [ ] Render: Service running?
   - [ ] Railway: No crashes?
   - [ ] MongoDB: Cluster active?

2. **Check resource usage**
   - [ ] Railway RAM: < 80%?
   - [ ] Render CPU: < 80%?
   - [ ] MongoDB storage: < 80%?

3. **Check network**
   - [ ] Test from different location
   - [ ] Check internet speed
   - [ ] Try different browser

**Solutions:**

1. **Upgrade plans**
   ```
   Render: Free → Starter ($7/mo)
   Railway: 2GB → 4GB RAM
   ```

2. **Optimize code**
   ```
   - Enable caching
   - Reduce API calls
   - Lazy load components
   ```

3. **Use CDN**
   ```
   Vercel automatically uses CDN
   Ensure static assets are optimized
   ```

---

## Emergency Procedures

### 🚨 Complete Service Failure

1. **Check all platforms**
   ```
   Vercel:  https://www.vercel-status.com/
   Render:  https://status.render.com/
   Railway: https://railway.app/status
   MongoDB: https://status.cloud.mongodb.com/
   ```

2. **Rollback to previous version**
   ```
   Vercel:  Dashboard → Deployments → Previous → Promote
   Render:  Dashboard → Manual Deploy → Previous commit
   Railway: Dashboard → Deployments → Previous → Redeploy
   ```

3. **Contact support**
   ```
   Vercel:  support@vercel.com
   Render:  support@render.com
   Railway: help@railway.app
   MongoDB: support@mongodb.com
   ```

### 🚨 Data Loss

1. **Restore from backup**
   ```
   MongoDB Atlas → Backup → Restore (M10+ only)
   ```

2. **Check deployment history**
   ```
   All platforms keep deployment history
   Can redeploy previous working version
   ```

---

## Useful Commands

### Test all services

```bash
# Frontend
curl https://your-app.vercel.app

# Backend
curl https://your-backend.onrender.com/

# AI Service
curl https://your-ai-service.railway.app/health

# MongoDB (requires mongosh)
mongosh "your-connection-string" --eval "db.adminCommand('ping')"
```

### Check logs

```bash
# Vercel (requires CLI)
vercel logs your-app

# Render (via dashboard only)
# Railway (via dashboard only)
```

### Quick health check script

```bash
#!/bin/bash
echo "Checking all services..."

echo "Frontend:"
curl -s -o /dev/null -w "%{http_code}" https://your-app.vercel.app
echo ""

echo "Backend:"
curl -s -o /dev/null -w "%{http_code}" https://your-backend.onrender.com
echo ""

echo "AI Service:"
curl -s -o /dev/null -w "%{http_code}" https://your-ai-service.railway.app/health
echo ""
```

---

## Getting Help

### Documentation
- [Vercel Docs](https://vercel.com/docs)
- [Render Docs](https://render.com/docs)
- [Railway Docs](https://docs.railway.app/)
- [MongoDB Docs](https://docs.atlas.mongodb.com/)

### Community
- [Vercel Discord](https://vercel.com/discord)
- [Render Community](https://community.render.com/)
- [Railway Discord](https://discord.gg/railway)
- [MongoDB Community](https://www.mongodb.com/community/forums/)

### Your Project Documentation
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [Architecture](./ARCHITECTURE.md)
- [FastAPI Guide](./FASTAPI_OLLAMA_DEPLOYMENT_GUIDE.md)

---

**💡 Pro Tip:** Always check logs first! 90% of issues can be diagnosed from error logs.
