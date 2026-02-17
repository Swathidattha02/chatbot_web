"""
RAG Service - Core implementation with Sentence Transformers and ChromaDB
Handles document processing, embedding generation, and similarity-based retrieval
"""

import os
from typing import List, Dict, Optional
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.docstore.document import Document
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RAGService:
    """
    RAG Service using Sentence Transformers for embeddings and ChromaDB for vector storage
    """
    
    def __init__(
        self,
        embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2",
        persist_directory: str = "./chroma_db",
        similarity_threshold: float = 0.5,
        top_k: int = 3,
        chunk_size: int = 500,
        chunk_overlap: int = 50
    ):
        """
        Initialize RAG service with embedding model and vector store
        
        Args:
            embedding_model: HuggingFace model name for sentence embeddings
            persist_directory: Directory to persist ChromaDB data
            similarity_threshold: Minimum cosine similarity for retrieval (0-1)
            top_k: Number of top chunks to retrieve
            chunk_size: Size of text chunks in characters
            chunk_overlap: Overlap between chunks in characters
        """
        logger.info(f"🚀 Initializing RAG Service...")
        logger.info(f"📦 Loading embedding model: {embedding_model}")
        
        # Initialize sentence transformer model
        self.embedding_model = SentenceTransformer(embedding_model)
        self.embedding_dimension = self.embedding_model.get_sentence_embedding_dimension()
        logger.info(f"✅ Model loaded - Embedding dimension: {self.embedding_dimension}")
        
        # Initialize ChromaDB client with persistence
        self.persist_directory = persist_directory
        os.makedirs(persist_directory, exist_ok=True)
        
        self.chroma_client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Create or get collection
        self.collection_name = "documents"
        try:
            self.collection = self.chroma_client.get_collection(name=self.collection_name)
            logger.info(f"📚 Loaded existing collection: {self.collection_name}")
        except:
            self.collection = self.chroma_client.create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}  # Use cosine similarity
            )
            logger.info(f"📚 Created new collection: {self.collection_name}")
        
        # Configuration
        self.similarity_threshold = similarity_threshold
        self.top_k = top_k
        
        # Initialize text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        logger.info(f"⚙️ Configuration:")
        logger.info(f"   - Similarity threshold: {similarity_threshold}")
        logger.info(f"   - Top K results: {top_k}")
        logger.info(f"   - Chunk size: {chunk_size}")
        logger.info(f"   - Chunk overlap: {chunk_overlap}")
        logger.info(f"✅ RAG Service initialized successfully!")
    
    def load_document(self, file_path: str, file_type: str) -> List[Document]:
        """
        Load document from file
        
        Args:
            file_path: Path to the document file
            file_type: Type of file (pdf, txt, docx)
            
        Returns:
            List of LangChain Document objects
        """
        logger.info(f"📄 Loading document: {file_path} (type: {file_type})")
        
        try:
            if file_type == "pdf":
                loader = PyPDFLoader(file_path)
            elif file_type == "txt":
                loader = TextLoader(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
            
            documents = loader.load()
            logger.info(f"✅ Loaded {len(documents)} pages/sections")
            return documents
        except Exception as e:
            logger.error(f"❌ Error loading document: {e}")
            raise
    
    def chunk_documents(self, documents: List[Document]) -> List[Document]:
        """
        Split documents into chunks
        
        Args:
            documents: List of LangChain documents
            
        Returns:
            List of chunked documents
        """
        logger.info(f"✂️ Chunking documents...")
        chunks = self.text_splitter.split_documents(documents)
        logger.info(f"✅ Created {len(chunks)} chunks")
        return chunks
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for text chunks using sentence transformers
        
        Args:
            texts: List of text strings
            
        Returns:
            List of embedding vectors
        """
        logger.info(f"🧮 Generating embeddings for {len(texts)} chunks...")
        embeddings = self.embedding_model.encode(
            texts,
            show_progress_bar=True,
            convert_to_numpy=True
        )
        logger.info(f"✅ Generated {len(embeddings)} embeddings")
        return embeddings.tolist()
    
    def add_documents(self, file_path: str, file_type: str) -> Dict:
        """
        Process and add documents to vector store
        
        Args:
            file_path: Path to document file
            file_type: Type of file (pdf, txt)
            
        Returns:
            Dictionary with processing statistics
        """
        try:
            # Load document
            documents = self.load_document(file_path, file_type)
            
            # Chunk documents
            chunks = self.chunk_documents(documents)
            
            # Extract text from chunks
            texts = [chunk.page_content for chunk in chunks]
            
            # Generate embeddings
            embeddings = self.generate_embeddings(texts)
            
            # Create unique IDs for chunks using file name and index
            import hashlib
            file_hash = hashlib.md5(file_path.encode()).hexdigest()[:8]
            ids = [f"{file_hash}_chunk_{i}" for i in range(len(chunks))]
            
            # Create metadata
            metadatas = [
                {
                    "source": file_path,
                    "chunk_index": i,
                    "page": chunk.metadata.get("page", 0)
                }
                for i, chunk in enumerate(chunks)
            ]
            
            # Add to ChromaDB
            logger.info(f"💾 Adding {len(chunks)} chunks to vector store...")
            self.collection.add(
                embeddings=embeddings,
                documents=texts,
                metadatas=metadatas,
                ids=ids
            )
            
            logger.info(f"✅ Successfully added documents to vector store!")
            
            return {
                "success": True,
                "num_chunks": len(chunks),
                "num_embeddings": len(embeddings),
                "file_path": file_path
            }
            
        except Exception as e:
            logger.error(f"❌ Error adding documents: {e}")
            raise
    
    def retrieve_relevant_chunks(
        self,
        query: str,
        top_k: Optional[int] = None,
        threshold: Optional[float] = None
    ) -> List[Dict]:
        """
        Retrieve relevant chunks using cosine similarity
        
        Args:
            query: User query string
            top_k: Number of top results (overrides default)
            threshold: Similarity threshold (overrides default)
            
        Returns:
            List of relevant chunks with metadata and scores
        """
        k = top_k or self.top_k
        thresh = threshold or self.similarity_threshold
        
        logger.info(f"🔍 Retrieving relevant chunks for query: '{query}'")
        logger.info(f"   - Top K: {k}")
        logger.info(f"   - Threshold: {thresh}")
        
        try:
            # Generate query embedding
            query_embedding = self.embedding_model.encode([query])[0].tolist()
            
            # Query ChromaDB
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=k * 2  # Get more results to filter by threshold
            )
            
            # Filter by similarity threshold
            relevant_chunks = []
            
            if results['documents'] and len(results['documents'][0]) > 0:
                for i, (doc, metadata, distance) in enumerate(zip(
                    results['documents'][0],
                    results['metadatas'][0],
                    results['distances'][0]
                )):
                    # ChromaDB returns distance, convert to similarity
                    # For cosine distance: similarity = 1 - distance
                    similarity = 1 - distance
                    
                    logger.info(f"   Chunk {i}: similarity = {similarity:.3f}")
                    
                    if similarity >= thresh:
                        relevant_chunks.append({
                            "text": doc,
                            "metadata": metadata,
                            "similarity": similarity
                        })
                
                # Sort by similarity and take top k
                relevant_chunks = sorted(
                    relevant_chunks,
                    key=lambda x: x['similarity'],
                    reverse=True
                )[:k]
            
            logger.info(f"✅ Found {len(relevant_chunks)} chunks above threshold {thresh}")
            
            return relevant_chunks
            
        except Exception as e:
            logger.error(f"❌ Error retrieving chunks: {e}")
            raise
    
    def get_context_for_query(self, query: str) -> str:
        """
        Get formatted context string for RAG
        
        Args:
            query: User query
            
        Returns:
            Formatted context string
        """
        chunks = self.retrieve_relevant_chunks(query)
        
        if not chunks:
            logger.warning("⚠️ No relevant chunks found")
            return ""
        
        # Format context
        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            context_parts.append(
                f"[Context {i}] (Relevance: {chunk['similarity']:.2f})\n{chunk['text']}"
            )
        
        context = "\n\n---\n\n".join(context_parts)
        logger.info(f"📝 Generated context with {len(chunks)} chunks")
        
        return context
    
    def clear_collection(self):
        """Clear all documents from the collection"""
        logger.info("🗑️ Clearing collection...")
        try:
            self.chroma_client.delete_collection(name=self.collection_name)
            self.collection = self.chroma_client.create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            logger.info("✅ Collection cleared successfully")
        except Exception as e:
            logger.error(f"❌ Error clearing collection: {e}")
            raise
    
    def get_stats(self) -> Dict:
        """Get statistics about the vector store"""
        try:
            count = self.collection.count()
            return {
                "total_chunks": count,
                "collection_name": self.collection_name,
                "embedding_dimension": self.embedding_dimension,
                "similarity_threshold": self.similarity_threshold,
                "top_k": self.top_k
            }
        except Exception as e:
            logger.error(f"❌ Error getting stats: {e}")
            return {}
