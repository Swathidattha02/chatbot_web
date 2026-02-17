"""
FastAPI Application for RAG Service
Provides REST API endpoints for document upload, chat, and vector store management
"""

import os
import shutil
from pathlib import Path
from typing import Optional, List
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import logging

from rag_service import RAGService
from streaming_handler import StreamingHandler

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="RAG Service API",
    description="Retrieval-Augmented Generation service with Sentence Transformers and ChromaDB",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration from environment
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://10.75.80.9:11434")
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.5"))
TOP_K_RESULTS = int(os.getenv("TOP_K_RESULTS", "3"))
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "500"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "50"))

# Initialize services
logger.info("🚀 Initializing RAG Service...")
rag_service = RAGService(
    embedding_model=EMBEDDING_MODEL,
    persist_directory=CHROMA_PERSIST_DIR,
    similarity_threshold=SIMILARITY_THRESHOLD,
    top_k=TOP_K_RESULTS,
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP
)

streaming_handler = StreamingHandler(
    ollama_base_url=OLLAMA_BASE_URL,
    model="llama3.2"
)

# Upload directory
UPLOAD_DIR = Path("./uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Pydantic models
class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[dict]] = None
    use_rag: bool = True
    language: Optional[str] = "en"

class ChatResponse(BaseModel):
    message: str
    context_used: bool
    num_chunks: int = 0

class UploadResponse(BaseModel):
    success: bool
    filename: str
    num_chunks: int
    message: str

class StatsResponse(BaseModel):
    total_chunks: int
    collection_name: str
    embedding_dimension: int
    similarity_threshold: float
    top_k: int


# API Endpoints

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "RAG Service API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        stats = rag_service.get_stats()
        return {
            "status": "healthy",
            "ollama_url": OLLAMA_BASE_URL,
            "vector_store": stats
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """
    Upload and process a document
    
    Supported formats: PDF, TXT
    """
    try:
        logger.info(f"📤 Received file upload: {file.filename}")
        
        # Validate file type
        file_extension = Path(file.filename).suffix.lower()
        supported_types = {".pdf": "pdf", ".txt": "txt"}
        
        if file_extension not in supported_types:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Supported: {', '.join(supported_types.keys())}"
            )
        
        # Save uploaded file
        file_path = UPLOAD_DIR / file.filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"💾 Saved file to: {file_path}")
        
        # Process document
        file_type = supported_types[file_extension]
        result = rag_service.add_documents(str(file_path), file_type)
        
        # Clean up uploaded file (optional)
        # background_tasks.add_task(os.remove, file_path)
        
        return UploadResponse(
            success=True,
            filename=file.filename,
            num_chunks=result["num_chunks"],
            message=f"Successfully processed {result['num_chunks']} chunks"
        )
        
    except Exception as e:
        logger.error(f"❌ Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Streaming chat endpoint with RAG
    
    Returns Server-Sent Events (SSE) stream
    """
    try:
        logger.info(f"💬 Chat request: {request.message[:50]}...")
        
        # Get RAG context if enabled
        context = None
        if request.use_rag:
            context = rag_service.get_context_for_query(request.message)
            if context:
                logger.info(f"✅ Retrieved RAG context ({len(context)} chars)")
            else:
                logger.warning("⚠️ No relevant context found")
        
        # Stream response
        return StreamingResponse(
            streaming_handler.stream_chat_response(
                user_message=request.message,
                context=context,
                conversation_history=request.conversation_history,
                language=request.language
            ),
            media_type="text/event-stream"
        )
        
    except Exception as e:
        logger.error(f"❌ Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Non-streaming chat endpoint with RAG (for testing)
    """
    try:
        logger.info(f"💬 Chat request (non-streaming): {request.message[:50]}...")
        
        # Get RAG context if enabled
        context = None
        num_chunks = 0
        
        if request.use_rag:
            chunks = rag_service.retrieve_relevant_chunks(request.message)
            num_chunks = len(chunks)
            
            if chunks:
                context = rag_service.get_context_for_query(request.message)
                logger.info(f"✅ Retrieved {num_chunks} chunks")
        
        # Get response
        response = streaming_handler.get_non_streaming_response(
            user_message=request.message,
            context=context,
            conversation_history=request.conversation_history,
            language=request.language
        )
        
        if not response.get("success"):
            raise HTTPException(status_code=500, detail=response.get("error"))
        
        return ChatResponse(
            message=response["message"],
            context_used=context is not None,
            num_chunks=num_chunks
        )
        
    except Exception as e:
        logger.error(f"❌ Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/clear")
async def clear_vector_store():
    """Clear all documents from vector store"""
    try:
        logger.info("🗑️ Clearing vector store...")
        rag_service.clear_collection()
        return {
            "success": True,
            "message": "Vector store cleared successfully"
        }
    except Exception as e:
        logger.error(f"❌ Clear error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats", response_model=StatsResponse)
async def get_stats():
    """Get vector store statistics"""
    try:
        stats = rag_service.get_stats()
        return StatsResponse(**stats)
    except Exception as e:
        logger.error(f"❌ Stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/retrieve")
async def retrieve_chunks(query: str, top_k: int = 3, threshold: float = 0.5):
    """
    Test endpoint to retrieve relevant chunks
    """
    try:
        chunks = rag_service.retrieve_relevant_chunks(
            query=query,
            top_k=top_k,
            threshold=threshold
        )
        
        return {
            "query": query,
            "num_chunks": len(chunks),
            "chunks": chunks
        }
    except Exception as e:
        logger.error(f"❌ Retrieve error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", "8000"))
    
    logger.info(f"🚀 Starting RAG Service on port {port}")
    
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
