# RAG Integration Setup Guide

## 🎉 RAG Integration Complete!

Your website backend is now integrated with the RAG (Retrieval-Augmented Generation) system for document-aware chatbot responses!

## 📋 What Was Done

### 1. ✅ RAG Service Configuration
- Updated RAG service to use `localhost:11434` for Ollama
- Changed RAG service port to `8001` (to avoid conflict with backend on `5000`)

### 2. ✅ Backend Integration
- Created `src/services/ragService.js` - RAG service client
- Updated `src/routes/documentRoutes.js` - Documents now processed through RAG
- Updated `src/controllers/chatController.js` - Chat uses RAG when available
- Added `form-data` dependency for file uploads

### 3. ✅ Smart Fallback System
The chatbot now works in 3 modes:
1. **RAG Mode** (Best) - Uses uploaded documents for context-aware answers
2. **Direct Ollama** (Good) - General AI responses when RAG unavailable
3. **Error Handling** (Safe) - Friendly messages if services are down

## 🚀 How to Start Everything

### Step 1: Install RAG Service Dependencies (One-time)

```powershell
cd d:\app_intern\app_backend\rag_service
python -m pip install -r requirements.txt
```

**Note:** This is currently running in the background. Wait for it to complete.

### Step 2: Start RAG Service

```powershell
cd d:\app_intern\app_backend\rag_service
python api.py
```

This will start the RAG service on **port 8001**.

### Step 3: Verify All Services Running

You should have **3 services** running:

1. **Ollama** (port 11434) - AI model
   ```powershell
   ollama serve
   ```

2. **RAG Service** (port 8001) - Document processing
   ```powershell
   # In d:\app_intern\app_backend\rag_service
   python api.py
   ```

3. **Website Backend** (port 5000) - Already running ✅
   ```powershell
   # In d:\app_intern\website_backend
   npm start
   ```

4. **Website Frontend** (port 3000) - Already running ✅
   ```powershell
   # In d:\app_intern\website_frontend
   npm start
   ```

## 📊 How It Works Now

### Document Upload Flow:
```
User uploads PDF
    ↓
Website Backend (port 5000)
    ↓
RAG Service (port 8001)
    ↓
1. Extract text from PDF
2. Split into chunks (500 chars)
3. Create embeddings (384-dim vectors)
4. Store in ChromaDB
    ↓
Return: "Processed into X chunks"
```

### Chat Flow:
```
User asks question
    ↓
Website Backend checks RAG availability
    ↓
IF RAG available:
    ↓
    RAG Service:
    1. Convert question to embedding
    2. Search ChromaDB for similar chunks
    3. Retrieve top 3 relevant chunks
    4. Send chunks + question to Ollama
    5. Get context-aware response
    ↓
ELSE:
    ↓
    Direct Ollama:
    - General AI response (no document context)
    ↓
Return response to user
```

## 🧪 Testing the Integration

### Test 1: Upload a Document

1. Go to http://localhost:3000
2. Login
3. Click "Upload Document" on Dashboard
4. Select a PDF file
5. **Expected Result:**
   - If RAG running: "✅ Processed into X searchable chunks"
   - If RAG not running: "⚠️ File saved but not indexed"

### Test 2: Ask Questions About the Document

1. Go to "Chat with Avatar"
2. Upload a PDF (e.g., about "Integers")
3. Ask: "What is this document about?"
4. **Expected Result:**
   - With RAG: Specific answer based on PDF content
   - Without RAG: Generic response

### Test 3: Check Backend Logs

Watch the backend console for these messages:

**With RAG:**
```
📄 Document uploaded: filename.pdf
✅ RAG processing successful: { num_chunks: 15, ... }
🤖 Using RAG service for enhanced response
✅ RAG response with 3 context chunks
```

**Without RAG:**
```
📄 Document uploaded: filename.pdf
⚠️ RAG processing failed, document saved but not indexed
ℹ️ RAG service not available, using direct Ollama
```

## 🔧 Troubleshooting

### RAG Service Won't Start

**Problem:** `ModuleNotFoundError` or import errors

**Solution:**
```powershell
cd d:\app_intern\app_backend\rag_service
python -m pip install -r requirements.txt --force-reinstall
```

### ChromaDB Errors

**Problem:** Database corruption or version mismatch

**Solution:**
```powershell
cd d:\app_intern\app_backend\rag_service
# Delete the database
Remove-Item -Recurse -Force chroma_db
# Restart RAG service
python api.py
```

### Document Upload Succeeds But No RAG Processing

**Problem:** RAG service not running

**Check:**
```powershell
# Test if RAG service is responding
curl http://localhost:8001/health
```

**Solution:** Start the RAG service (see Step 2 above)

### Chatbot Doesn't Use Document Context

**Problem:** Document not uploaded to RAG or RAG service down

**Check Backend Logs:**
- Look for "✅ RAG processing successful" when uploading
- Look for "🤖 Using RAG service" when chatting

**Solution:**
1. Make sure RAG service is running
2. Re-upload the document
3. Ask a question

## 📈 Performance Tips

### For Faster Responses:
1. **Keep RAG service running** - First startup is slow (downloads models)
2. **Upload smaller PDFs** - Large PDFs take longer to process
3. **Ask specific questions** - Better retrieval accuracy

### For Better Accuracy:
1. **Upload relevant documents only** - Too many documents can dilute results
2. **Use clear questions** - "What is X?" works better than "Tell me stuff"
3. **Check similarity threshold** - Default is 0.5 (adjust in RAG .env if needed)

## 🎯 Next Steps

### Current Status:
- ✅ Backend integration complete
- ✅ Website backend running with RAG support
- ⏳ RAG service dependencies installing
- ⏳ RAG service needs to be started

### To Complete Setup:
1. **Wait** for pip install to finish (check terminal)
2. **Start RAG service**: `python api.py` in rag_service folder
3. **Test upload** and verify you see "Processed into X chunks"
4. **Test chat** and verify document-aware responses

## 📚 API Endpoints

### RAG Service (port 8001):
- `POST /upload` - Upload and process document
- `POST /chat` - Chat with RAG context
- `GET /stats` - Get vector store statistics
- `POST /clear` - Clear all documents
- `GET /health` - Health check

### Website Backend (port 5000):
- `POST /api/documents/upload` - Upload document (auto-forwards to RAG)
- `POST /api/chat/message` - Chat (auto-uses RAG if available)

## 🔒 Security Notes

- RAG service currently has no authentication
- In production, add API keys or JWT tokens
- Limit file upload sizes (current: 10MB)
- Sanitize file names and content

## 📝 Files Modified

1. `website_backend/src/services/ragService.js` - NEW
2. `website_backend/src/routes/documentRoutes.js` - UPDATED
3. `website_backend/src/controllers/chatController.js` - UPDATED
4. `app_backend/rag_service/.env` - UPDATED
5. `website_backend/package.json` - form-data added

## 🎊 Success Indicators

You'll know everything is working when:
1. ✅ Upload shows "Processed into X chunks"
2. ✅ Backend logs show "Using RAG service"
3. ✅ Chatbot answers questions about your PDF
4. ✅ Responses reference specific content from the document

---

**Ready to test!** Once the pip install completes, start the RAG service and upload a PDF! 🚀
