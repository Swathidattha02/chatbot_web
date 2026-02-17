"""
Streaming Handler for RAG responses
Integrates with Ollama API and provides Server-Sent Events (SSE) streaming
"""

import requests
import json
import logging
from typing import AsyncGenerator, Optional

logger = logging.getLogger(__name__)


class StreamingHandler:
    """
    Handle streaming responses from Ollama with RAG context
    """
    
    def __init__(self, ollama_base_url: str, model: str = "llama3.2"):
        """
        Initialize streaming handler
        
        Args:
            ollama_base_url: Base URL for Ollama API
            model: Model name to use
        """
        self.ollama_base_url = ollama_base_url
        self.model = model
        logger.info(f"🌊 Streaming handler initialized with model: {model}")
    
    async def stream_chat_response(
        self,
        user_message: str,
        context: Optional[str] = None,
        conversation_history: Optional[list] = None,
        language: str = "en"
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat response from Ollama with optional RAG context
        
        Args:
            user_message: User's message
            context: Retrieved context from RAG
            conversation_history: Previous conversation messages
            language: Response language code (en, hi, te, etc.)
            
        Yields:
            Chunks of the response as Server-Sent Events
        """
        try:
            # Language mapping
            LANGUAGE_NAMES = {
                'en': 'English',
                'hi': 'Hindi',
                'ta': 'Tamil',
                'te': 'Telugu',
                'kn': 'Kannada',
                'ml': 'Malayalam',
                'bn': 'Bengali',
                'mr': 'Marathi',
                'gu': 'Gujarati',
                'pa': 'Punjabi'
            }
            
            language_name = LANGUAGE_NAMES.get(language, 'English')
            
            if language == 'en':
                language_instruction = ""
            else:
                language_instruction = f"""
### CRITICAL: LANGUAGE REQUIREMENT ###
YOU MUST RESPOND ENTIRELY IN {language_name.upper()}.
EVEN IF THE USER ASKS A QUESTION IN ENGLISH, YOU MUST ANSWER IN {language_name.upper()}.
DO NOT USE ENGLISH IN YOUR RESPONSE.
#####################################
"""

            # Build system prompt
            system_prompt = f"""You are a friendly and helpful AI avatar assistant with emotional intelligence.{language_instruction}

IMPORTANT: You must analyze sentiment and choose appropriate facial expressions.

For EVERY response, you must:
1. Analyze the sentiment of the user's input
2. Choose a facial expression: happy, sad, surprised, thinking, angry, worried, neutral

Format your response as:
[EXPRESSION: expression_name]
Your response in {language_name} here.

ALWAYS include the [EXPRESSION: ...] tag at the start of your response in {language_name}."""
            
            # Add RAG context if available
            if context:
                logger.info("📚 Adding RAG context to prompt")
                system_prompt += f"""

=== DOCUMENT CONTEXT ===
You have been provided with a document. The user is asking questions about it.

IMPORTANT INSTRUCTIONS FOR DOCUMENT QUESTIONS:
1. READ the document context carefully
2. Find the EXACT information that answers the user's question
3. Quote or paraphrase directly from the document
4. If the information is NOT in the document, clearly say "I don't see that information in the document"
5. Be specific and cite the relevant part of the document
6. Keep your answer focused on what the document says

=== RELEVANT DOCUMENT CONTENT ===
{context}

=== END DOCUMENT CONTEXT ===

Now answer the user's question ONLY based on the above document content. Be accurate and specific."""
            
            # Build messages
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add a hidden reminder to the user message if not English
            modified_user_message = user_message
            if language != "en":
                # Prepend for higher attention from the model
                modified_user_message = f"[INSTRUCTION: Answer ONLY in {language_name}] " + modified_user_message

            messages.append({"role": "user", "content": modified_user_message})
            
            # Make request to AI Service (Detect RunPod or Local Ollama)
            RUNPOD_API_KEY = os.getenv("RUNPOD_API_KEY")
            RUNPOD_ENDPOINT_ID = os.getenv("RUNPOD_ENDPOINT_ID")

            if RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID:
                logger.info(f"🚀 Using RunPod Serverless Endpoint: {RUNPOD_ENDPOINT_ID}")
                
                # Check if we should use streaming (RunPod serverless streaming is more complex, 
                # so we'll start with reliable non-streaming for now)
                url = f"https://api.runpod.ai/v1/{RUNPOD_ENDPOINT_ID}/runsync"
                headers = {
                    "Authorization": f"Bearer {RUNPOD_API_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "input": {
                        "method_name": "chat",
                        "input": {
                            "model": self.model,
                            "messages": messages,
                            "stream": False
                        }
                    }
                }
                
                response = requests.post(url, json=payload, headers=headers, timeout=120)
                response.raise_for_status()
                data = response.json()
                
                if "output" in data:
                    output = data["output"]
                    content = ""
                    if isinstance(output, str):
                        content = output
                    elif isinstance(output, dict) and "message" in output:
                        content = output["message"].get("content", "")
                    elif isinstance(output, dict) and "response" in output:
                        content = output.get("response", "")
                    
                    full_response = content
                    # "Fake" stream by yielding the whole message
                    yield f"data: {json.dumps({'content': content})}\n\n"
                    yield f"data: {json.dumps({'done': True})}\n\n"
                    return
                else:
                    error_msg = data.get("error", "Unknown RunPod error")
                    raise Exception(f"RunPod Error: {error_msg}")

            else:
                # Make streaming request to Local Ollama
                logger.info(f"🚀 Streaming request to Local Ollama: {self.ollama_base_url}/api/chat")
                
                response = requests.post(
                    f"{self.ollama_base_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "stream": True
                    },
                    stream=True,
                    timeout=60
                )
                
                response.raise_for_status()
                
                # Stream response chunks
                logger.info("📡 Streaming response chunks...")
                full_response = ""
                
                for line in response.iter_lines():
                    if line:
                        try:
                            chunk_data = json.loads(line)
                            
                            if "message" in chunk_data and "content" in chunk_data["message"]:
                                content = chunk_data["message"]["content"]
                                full_response += content
                                
                                # Yield as SSE format
                                yield f"data: {json.dumps({'content': content})}\n\n"
                            
                            # Check if done
                            if chunk_data.get("done", False):
                                logger.info("✅ Streaming complete")
                                yield f"data: {json.dumps({'done': True})}\n\n"
                                break
                        
                        except json.JSONDecodeError as e:
                            logger.error(f"❌ Error decoding chunk: {e}")
                            continue
            
            logger.info(f"📝 Full response length: {len(full_response)} characters")
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Ollama API error: {e}")
            error_message = f"Error connecting to Ollama: {str(e)}"
            yield f"data: {json.dumps({'error': error_message})}\n\n"
        
        except Exception as e:
            logger.error(f"❌ Streaming error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    def get_non_streaming_response(
        self,
        user_message: str,
        context: Optional[str] = None,
        conversation_history: Optional[list] = None,
        language: str = "en"
    ) -> dict:
        """
        Get non-streaming response (for testing or fallback)
        
        Args:
            user_message: User's message
            context: Retrieved context from RAG
            conversation_history: Previous conversation messages
            language: Response language code (en, hi, te, etc.)
            
        Returns:
            Response dictionary with message and metadata
        """
        try:
            # Language mapping
            LANGUAGE_NAMES = {
                'en': 'English', 'hi': 'Hindi', 'ta': 'Tamil', 'te': 'Telugu',
                'kn': 'Kannada', 'ml': 'Malayalam', 'bn': 'Bengali',
                'mr': 'Marathi', 'gu': 'Gujarati', 'pa': 'Punjabi'
            }
            language_name = LANGUAGE_NAMES.get(language, 'English')
            
            if language == 'en':
                language_instruction = ""
            else:
                language_instruction = f"""
### CRITICAL: LANGUAGE REQUIREMENT ###
YOU MUST RESPOND ENTIRELY IN {language_name.upper()}.
EVEN IF THE USER ASKS A QUESTION IN ENGLISH, YOU MUST ANSWER IN {language_name.upper()}.
DO NOT USE ENGLISH IN YOUR RESPONSE.
#####################################
"""

            # Build system prompt (same as streaming)
            system_prompt = f"You are a friendly and helpful AI avatar assistant.{language_instruction}"
            
            if context:
                system_prompt += f"\n\nContext:\n{context}"
            
            # Build messages
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add a hidden reminder to the user message if not English
            modified_user_message = user_message
            if language != "en":
                # Prepend for higher attention from the model
                modified_user_message = f"[INSTRUCTION: Answer ONLY in {language_name}] " + modified_user_message

            messages.append({"role": "user", "content": modified_user_message})
            
            # Make request to AI Service (Detect RunPod or Local Ollama)
            RUNPOD_API_KEY = os.getenv("RUNPOD_API_KEY")
            RUNPOD_ENDPOINT_ID = os.getenv("RUNPOD_ENDPOINT_ID")

            if RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID:
                logger.info(f"🚀 Using RunPod Serverless (Non-Streaming): {RUNPOD_ENDPOINT_ID}")
                url = f"https://api.runpod.ai/v1/{RUNPOD_ENDPOINT_ID}/runsync"
                headers = {
                    "Authorization": f"Bearer {RUNPOD_API_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "input": {
                        "method_name": "chat",
                        "input": {
                            "model": self.model,
                            "messages": messages,
                            "stream": False
                        }
                    }
                }
                
                response = requests.post(url, json=payload, headers=headers, timeout=120)
                response.raise_for_status()
                data = response.json()
                
                if "output" in data:
                    output = data["output"]
                    content = ""
                    if isinstance(output, str):
                        content = output
                    elif isinstance(output, dict) and "message" in output:
                        content = output["message"].get("content", "")
                    elif isinstance(output, dict) and "response" in output:
                        content = output.get("response", "")
                    
                    return {
                        "message": content,
                        "model": self.model,
                        "success": True
                    }
                else:
                    error_msg = data.get("error", "Unknown RunPod error")
                    raise Exception(f"RunPod Error: {error_msg}")

            else:
                # Make request to Local Ollama
                response = requests.post(
                    f"{self.ollama_base_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "stream": False
                    },
                    timeout=60
                )
                
                response.raise_for_status()
                data = response.json()
                
                return {
                    "message": data["message"]["content"],
                    "model": self.model,
                    "success": True
                }
            
        except Exception as e:
            logger.error(f"❌ Error getting response: {e}")
            return {
                "error": str(e),
                "success": False
            }
