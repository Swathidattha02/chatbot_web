import os
import sys

# Mock pwd module for Windows compatibility
if os.name == 'nt':
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
import google.generativeai as genai

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
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_LLM_API_KEY")
GEMINI_MODEL = "gemini-2.5-flash"

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Deprecated: Ollama configuration (kept for reference)
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

async def generate_summary(text: str):
    """Generate a high-quality summary of the document using Gemini API"""
    print("🤖 Generating document summary using Gemini...")
    
    if not GEMINI_API_KEY:
        raise Exception("Gemini API key not configured (GEMINI_API_KEY)")
    
    # Take first 8000 characters to avoid context overflow while getting a good overview
    text_to_summarize = text[:8000]
    
    prompt = f"""Summarize the following document content in a clear, educational, and comprehensive way. 
Focus on the main topics, key concepts, and important details so that an AI tutor can use this summary to help a student.

CONTENT:
{text_to_summarize}

SUMMARY:"""

    try:
        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=1024,
                temperature=0.7
            )
        )
        
        if response.text:
            print(f"✅ Summary generated ({len(response.text)} characters)")
            return response.text
        else:
            raise Exception("No response from Gemini")
            
    except Exception as e:
        print(f"❌ Error generating summary: {e}")
        raise

def build_system_prompt(language: str):
    """Build the system prompt based on the selected language and loaded document"""
    lang_name = LANGUAGE_NAMES.get(language, "English")
    
    # Determine strict language rule
    if language == 'en':
        prompt = (
            "YOU ARE AN EXPERT EDUCATIONAL TUTOR. "
            "YOUR TASK IS TO PROVIDE A COMPREHENSIVE, DETAILED, AND STEP-BY-STEP EXPLANATION. "
            "IMPORTANT: NEVER give short answers. Your response MUST be thorough and cover all aspects of the student's question. "
            "If the question is about types or categories, list ALL major categories and explain each one in detail. "
            "Use clear structure, headings, and bullet points. Focus on providing the MOST ACCURATE and DETAILED academic content."
        )
    else:
        prompt = (
            f"### EDUCATIONAL TUTOR RULE ###\n"
            f"YOU ARE AN EXPERT EDUCATIONAL TUTOR. YOUR TASK IS TO PROVIDE A COMPREHENSIVE, DETAILED, AND STEP-BY-STEP EXPLANATION IN ENGLISH.\n\n"
            f"IMPORTANT: Your response will be automatically translated into {lang_name.upper()} for the student. "
            f"Focus on providing the MOST ACCURATE and DETAILED academic explanation in English. "
            f"NEVER give short one-sentence answers. Always provide a full, structured educational response.\n\n"
            f"Begin answering in English now:"
        )

    # Inject Document Summary if available
    if document_data["summary"]:
        prompt += f"\n\n[DOCUMENT DATA LOADED: {document_data['filename']}]\n"
        prompt += (
            f"YOU MUST STUDY AND USE THE DOCUMENT CONTENT PROVIDED BELOW TO ANSWER THE STUDENT'S QUESTION. "
            f"Even if the student asks general questions like 'what does this pdf contain?', you MUST explain the key topics from the DOCUMENT SUMMARY provided. "
            f"Use BOTH the following document summary AND your own expert knowledge. "
            f"IF THE QUESTION CAN BE ANSWERED BY THE DOCUMENT, PRIORITIZE THE DOCUMENT'S INFORMATION.\n\n"
            f"NEVER say you cannot see files. You have been given the content below.\n\n"
        )
        prompt += f"DOCUMENT SUMMARY:\n{document_data['summary']}"
        
        if document_data["full_text_snippet"]:
            prompt += f"\n\nBEGINNING CONTENT SNIPPET:\n{document_data['full_text_snippet']}"
            
    return prompt

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
    """Chat using the generated summary as context (streaming)"""
    try:
        system_prompt = build_system_prompt(request.language)
        lang_name = LANGUAGE_NAMES.get(request.language, "English")

        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history
        if request.conversation_history:
            for msg in request.conversation_history[-6:]: 
                messages.append(msg)
            
        # Reinforce language in the final user message
        final_message = request.message
        # REMOVED: Contradictory instruction to answer in target language.
        # We now always answer in English and let the dedicated translation step handle it.
        # This prevents the LLM from outputting short/incomplete answers in regional scripts.
            
        messages.append({"role": "user", "content": final_message})

        return StreamingResponse(
            generate_gemini_stream(messages),
            media_type="text/event-stream"
        )
    except Exception as e:
        print(f"Chat stream error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(request: ChatRequest):
    """Chat using the generated summary as context (non-streaming via Gemini)"""
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="Gemini API key not configured")
        
        system_prompt = build_system_prompt(request.language)
        lang_name = LANGUAGE_NAMES.get(request.language, "English")

        messages = [{"role": "user", "content": system_prompt}]
        
        if request.conversation_history:
            for msg in request.conversation_history[-6:]:
                messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
            
        final_message = request.message
        # Always output in English for higher quality; translation handled by frontend
        messages.append({"role": "user", "content": final_message})

        try:
            model = genai.GenerativeModel(GEMINI_MODEL)
            response = model.generate_content(
                [msg["content"] for msg in messages],
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=1536,
                    temperature=0.7
                )
            )
            
            content = response.text if response.text else ""
            return {
                "success": True,
                "response": content,
                "language": request.language,
                "context_used": bool(document_data["summary"])
            }
        except Exception as e:
            # Fallback to OpenAI if Gemini fails
            if not OPENAI_API_KEY:
                raise HTTPException(status_code=500, detail=f"Gemini failed and OpenAI not configured: {str(e)}")
            
            print(f"⚠️ Gemini failed, trying OpenAI...")
            async with httpx.AsyncClient(timeout=90.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    json={
                        "model": "gpt-4o-mini",
                        "messages": messages,
                        "max_tokens": 1536,
                        "temperature": 0.7
                    },
                    headers={
                        "Authorization": f"Bearer {OPENAI_API_KEY}",
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    return {
                        "success": True,
                        "response": content,
                        "language": request.language,
                        "context_used": bool(document_data["summary"])
                    }
                else:
                    raise HTTPException(status_code=response.status_code, detail="OpenAI error")
                
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def generate_gemini_stream(messages):
    """Stream response from Gemini API"""
    try:
        if not GEMINI_API_KEY:
            yield f"data: {json.dumps({'error': 'Gemini API key not configured', 'done': True})}\n\n"
            return
        
        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(
            [msg["content"] for msg in messages],
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=1536,
                temperature=0.7
            ),
            stream=True
        )
        
        for chunk in response:
            if chunk.text:
                yield f"data: {json.dumps({'content': chunk.text, 'done': False})}\n\n"
        
        yield f"data: {json.dumps({'content': '', 'done': True})}\n\n"
        
    except Exception as e:
        print(f"❌ Gemini streaming error: {e}")
        yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"

async def generate_openai_stream(messages):
    """Stream response from OpenAI API (fallback)"""
    try:
        if not OPENAI_API_KEY:
            yield f"data: {json.dumps({'error': 'OpenAI API key not configured', 'done': True})}\n\n"
            return
        
        async with httpx.AsyncClient(timeout=90.0) as client:
            async with client.stream(
                "POST",
                "https://api.openai.com/v1/chat/completions",
                json={
                    "model": "gpt-4o-mini",
                    "messages": messages,
                    "max_tokens": 1536,
                    "temperature": 0.7,
                    "stream": True
                },
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                }
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        try:
                            data = json.loads(line[6:])
                            content = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if content:
                                yield f"data: {json.dumps({'content': content, 'done': False})}\n\n"
                            if data.get("choices", [{}])[0].get("finish_reason"):
                                yield f"data: {json.dumps({'content': '', 'done': True})}\n\n"
                        except:
                            continue
    except Exception as e:
        print(f"❌ OpenAI streaming error: {e}")
        yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"

@app.get("/health")
@app.get("/stats")
async def health_check():
    return {
        "status": "healthy",
        "has_document": document_data["filename"] is not None,
        "current_document": document_data["filename"],
        "summary_length": len(document_data["summary"]) if document_data["summary"] else 0,
        "llm_provider": "Gemini (with OpenAI fallback)"
    }

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
