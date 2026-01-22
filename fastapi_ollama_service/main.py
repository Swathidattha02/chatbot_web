from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import httpx
import json
import asyncio

app = FastAPI(title="Ollama AI Service")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ollama configuration
OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_MODEL = "llama3.2"

# Request models
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = []
    stream: bool = True
    model: Optional[str] = DEFAULT_MODEL

class HealthResponse(BaseModel):
    status: str
    ollama_available: bool
    model: str

# System prompt for educational tutor
SYSTEM_PROMPT = """You are an expert educational AI tutor designed to help students learn effectively. Follow these guidelines:

1. **For Math/Science Questions:**
   - Break down solutions into clear, numbered steps
   - Explain the reasoning behind each step
   - Show all calculations and formulas used
   - Use simple language that students can understand
   - Provide examples when helpful

2. **For Conceptual Questions:**
   - Start with a simple definition
   - Provide detailed explanations with examples
   - Use analogies to make concepts relatable
   - Break complex topics into smaller parts

3. **Formatting:**
   - Use clear headings and bullet points
   - Highlight important formulas or key points
   - Number your steps for math problems
   - Keep explanations organized and easy to follow

4. **Tone:**
   - Be encouraging and patient
   - Avoid jargon unless necessary (then explain it)
   - Make learning engaging and accessible

Always prioritize clarity and understanding over brevity."""

@app.get("/")
async def root():
    return {"message": "Ollama AI Service is running", "status": "healthy"}

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check if Ollama service is available"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            ollama_available = response.status_code == 200
            
            return HealthResponse(
                status="healthy",
                ollama_available=ollama_available,
                model=DEFAULT_MODEL
            )
    except Exception as e:
        return HealthResponse(
            status="degraded",
            ollama_available=False,
            model=DEFAULT_MODEL
        )

@app.post("/chat")
async def chat(request: ChatRequest):
    """Chat endpoint with streaming support"""
    try:
        # Build conversation history
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]
        
        # Add conversation history
        for msg in request.conversation_history[-10:]:  # Last 10 messages
            messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Add current message
        messages.append({
            "role": "user",
            "content": request.message
        })
        
        if request.stream:
            return StreamingResponse(
                stream_ollama_response(messages, request.model),
                media_type="text/event-stream"
            )
        else:
            # Non-streaming response
            response = await get_ollama_response(messages, request.model)
            return {"response": response}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

async def stream_ollama_response(messages: List[dict], model: str):
    """Stream responses from Ollama"""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": model,
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
                                yield f"data: {json.dumps({'chunk': chunk, 'done': False})}\n\n"
                            
                            if data.get("done", False):
                                yield f"data: {json.dumps({'chunk': '', 'done': True})}\n\n"
                                break
                        except json.JSONDecodeError:
                            continue
                            
    except Exception as e:
        error_msg = f"Ollama streaming error: {str(e)}"
        yield f"data: {json.dumps({'error': error_msg, 'done': True})}\n\n"

async def get_ollama_response(messages: List[dict], model: str) -> str:
    """Get non-streaming response from Ollama"""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": False
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("message", {}).get("content", "No response generated")
            else:
                raise HTTPException(status_code=response.status_code, detail="Ollama request failed")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ollama error: {str(e)}")

@app.get("/models")
async def list_models():
    """List available Ollama models"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch models")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching models: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
