import os
import sys

# Mock pwd module for Windows compatibility
if os.name == 'nt':
    import sys
    from types import ModuleType
    mock_pwd = ModuleType('pwd')
    mock_pwd.getpwuid = lambda uid: None
    sys.modules['pwd'] = mock_pwd

from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import shutil
import json
import httpx
from langchain_community.document_loaders import PyPDFLoader, UnstructuredWordDocumentLoader
from dotenv import load_dotenv

# Language mapping
LANGUAGE_NAMES = {
    'en': 'English', 'hi': 'Hindi', 'ta': 'Tamil', 'te': 'Telugu',
    'kn': 'Kannada', 'ml': 'Malayalam', 'bn': 'Bengali',
    'mr': 'Marathi', 'gu': 'Gujarati', 'pa': 'Punjabi'
}

load_dotenv()

app = FastAPI(title="Website Summary-Based AI Service")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration from .env
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
LLM_MODEL = os.getenv("LLM_MODEL", "llama3.2")

# Global In-Memory Storage for Document Summary
# This avoids using heavy local databases like ChromaDB
document_data = {
    "filename": None,
    "summary": None,
    "full_text_snippet": None
}

class ChatRequest(BaseModel):
    message: str
    use_rag: bool = True
    language: str = "en"
    conversation_history: Optional[List[dict]] = []

@app.get("/health")
@app.get("/stats")
async def health_check():
    return {
        "status": "healthy",
        "has_document": document_data["filename"] is not None,
        "current_document": document_data["filename"],
        "summary_length": len(document_data["summary"]) if document_data["summary"] else 0
    }

async def generate_summary(text: str):
    """Generate a high-quality summary of the document using LLM"""
    print("🤖 Generating document summary...")
    
    # Take first 8000 characters to avoid context overflow while getting a good overview
    text_to_summarize = text[:8000]
    
    prompt = f"""Summarize the following document content in a clear, educational, and comprehensive way. 
Focus on the main topics, key concepts, and important details so that an AI tutor can use this summary to help a student.

CONTENT:
{text_to_summarize}

SUMMARY:"""

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": LLM_MODEL,
                    "prompt": prompt,
                    "stream": False
                }
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("response", "Could not generate summary.")
            return "Error: Summary service unavailable."
        except Exception as e:
            print(f"Summary generation error: {e}")
            return f"Error: {str(e)}"

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload and summarize a document"""
    try:
        # Clear existing document data first
        document_data["filename"] = None
        document_data["summary"] = None
        document_data["full_text_snippet"] = None
        
        os.makedirs("./uploads", exist_ok=True)
        file_path = f"./uploads/{file.filename}"
        
        print(f"📥 NEW UPLOAD INITIATED: {file.filename}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Load document
        if file.filename.lower().endswith('.pdf'):
            loader = PyPDFLoader(file_path)
        elif file.filename.lower().endswith(('.doc', '.docx')):
            loader = UnstructuredWordDocumentLoader(file_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported format.")
            
        docs = loader.load()
        full_text = " ".join([d.page_content for d in docs])
        print(f"📄 Extracted {len(full_text)} characters from {file.filename}")
        
        # Generate and store summary
        summary = await generate_summary(full_text)
        
        document_data["filename"] = file.filename
        document_data["summary"] = summary
        document_data["full_text_snippet"] = full_text[:4000] 
        
        print(f"✅ Success: Updated memory with {file.filename} summary.")
        return {
            "success": True,
            "filename": file.filename,
            "summary": summary[:200] + "...",
            "message": "Document successfully summarized."
        }
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/stream")
async def stream_chat(request: ChatRequest):
    """Chat using the generated summary as context"""
    try:
        lang_name = LANGUAGE_NAMES.get(request.language, "English")
        
        # Base System Prompt
        if request.language == 'en':
            system_prompt = "You are an expert AI tutor. Use a friendly and educational tone."
        else:
            system_prompt = f"### 🚨 MANDATORY LANGUAGE RULE 🚨\nYOU ARE A {lang_name.upper()} TUTOR. EVERYTHING YOU WRITE MUST BE IN {lang_name.upper()}."

        # Inject Document Summary if available
        if document_data["summary"]:
            system_prompt += f"\n\n[DOCUMENT LOADED: {document_data['filename']}]\n"
            system_prompt += f"You have access to a comprehensive summary of the current document the student is studying. Use this summary to guide your teaching and answer their questions.\n\n"
            system_prompt += f"DOCUMENT SUMMARY:\n{document_data['summary']}"
            
            # Add a small snippet of real text if they ask something specific
            if document_data["full_text_snippet"]:
                system_prompt += f"\n\nBEGINNING CONTENT SNIPPET:\n{document_data['full_text_snippet']}"

        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history
        if request.conversation_history:
            for msg in request.conversation_history[-6:]: # Keep last 6 for focus
                messages.append(msg)
            
        messages.append({"role": "user", "content": request.message})

        return StreamingResponse(
            generate_ollama_stream(messages),
            media_type="text/event-stream"
        )
    except Exception as e:
        print(f"Chat stream error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def generate_ollama_stream(messages):
    async with httpx.AsyncClient(timeout=90.0) as client:
        try:
            async with client.stream(
                "POST",
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": LLM_MODEL,
                    "messages": messages,
                    "stream": True
                }
            ) as response:
                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            data = json.loads(line)
                            if "message" in data and "content" in data["message"]:
                                chunk = data["message"]["content"]
                                yield f"data: {json.dumps({'content': chunk, 'done': False})}\n\n"
                            
                            if data.get("done", False):
                                yield f"data: {json.dumps({'content': '', 'done': True})}\n\n"
                        except:
                            continue
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"

@app.post("/clear")
async def clear_store():
    """Clear memory"""
    document_data["filename"] = None
    document_data["summary"] = None
    document_data["full_text_snippet"] = None
    return {"success": True, "message": "Memory cleared."}

if __name__ == "__main__":
    import uvicorn
    print("Starting Website Summary-Based AI Service on port 8001...")
    uvicorn.run(app, host="0.0.0.0", port=8001)
