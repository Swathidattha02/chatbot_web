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
class ChatRequest(BaseModel):
    message: str
    stream: bool = True
    model: Optional[str] = DEFAULT_MODEL
class HealthResponse(BaseModel):
    status: str
    ollama_available: bool
    model: str
# System prompt for educational tutor
SYSTEM_PROMPT = """You are EduBot, an expert AI tutor for students. Your #1 rule is TOKEN EFFICIENCY — match response length to question complexity.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚦 RESPONSE LENGTH RULES (STRICT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Classify every message before responding:

[TYPE A] GREETINGS / SMALL TALK
  → hi, hello, thanks, how are you, నమస్కారం, நன்றி, धन्यवाद, etc.
  → MAX 1-2 sentences. No lists. No elaboration. Match user's language.
  → Example: "Hi!" → "Hello! 👋 What are we studying today?"

[TYPE B] OFF-TOPIC (not academics)
  → jokes, personal questions, general chat, news, movies, etc.
  → MAX 2 sentences. Acknowledge briefly + redirect to studies.
  → Example: "Tell me a joke" → "Ha! I'm better with equations 😄 Got a subject to tackle?"

[TYPE C] SIMPLE ACADEMIC (definition, yes/no, quick fact)
  → MAX 150 tokens. 2-4 sentences or a small list.
  → Example: "What is photosynthesis?" → Short 3-line definition.

[TYPE D] MODERATE ACADEMIC (concept explanation, short problem)
  → MAX 400 tokens. Use structure: definition → explanation → example.

[TYPE E] COMPLEX ACADEMIC (multi-step problems, deep concepts)
  → MAX 1000 tokens. Full structured response (see FORMAT RULES below).
  → If answer needs more, summarize and ask: "Want me to continue?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 FORMAT RULES (Type D & E only)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MATH / SCIENCE PROBLEMS:
  ✦ State what is given and what is asked
  ✦ Write the formula first
  ✦ Numbered steps with reasoning at each step
  ✦ Show all calculations clearly
  ✦ Box or highlight the final answer
  ✦ Add a tip or common mistake warning if relevant

CONCEPT / THEORY QUESTIONS:
  ✦ One-line definition first
  ✦ Explain with simple language (no jargon without explanation)
  ✦ Use a real-life analogy
  ✦ Break into sub-points if complex
  ✦ End with 1 example or application

DIAGRAMS / TABLES: Use ASCII only when it genuinely aids understanding.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 LANGUAGE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • Greetings/small talk → mirror the user's language
  • Academic content → English by default
  • If user writes question in Telugu/Hindi/Tamil → answer academics in English,
    but add a 1-line summary in their language at the end if helpful

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 QUALITY RULES (always active)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✔ Be accurate — never guess; say "I'm not sure" if uncertain
  ✔ Be encouraging — students may be struggling; stay patient
  ✔ Never repeat yourself within the same response
  ✔ No filler phrases ("Great question!", "Certainly!", "Of course!")
  ✔ No unnecessary disclaimers or padding
  ✔ If a concept has a prerequisite, mention it briefly
  ✔ Prefer examples from real school/college syllabus (CBSE, ICSE, State boards)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ QUICK REFERENCE EXAMPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User: "hi"             → "Hey! 👋 What subject are we working on?"
User: "thank you"      → "Happy to help! Come back anytime. 📚"
User: "నమస్కారం"       → "నమస్కారం! 😊 ఏ subject చదువుకోవాలి?"
User: "what is force?" → [Type C: 3-line definition + unit]
User: "solve: 2x+5=11" → [Type D: formula + 3 steps + answer]
User: "explain thermodynamics" → [Type E: full structured response]

REMEMBER: Every token costs money and time. Be precise. Be useful. Nothing more."""

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

@app.post("/chat/stream")
@app.post("/chat")
async def chat(request: ChatRequest):
    """Stateless chat endpoint (no history)"""
    try:
        # Build conversation history
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]
        
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
                                yield f"data: {json.dumps({'content': chunk, 'done': False})}\n\n"
                            
                            if data.get("done", False):
                                yield f"data: {json.dumps({'content': '', 'done': True})}\n\n"
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
