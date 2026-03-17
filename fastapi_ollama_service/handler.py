import runpod
import requests
import json
import os

# System prompt for educational tutor (Matches your main.py)
SYSTEM_PROMPT = """You are an expert educational AI tutor designed to help students learn effectively. 
Focus on breaking down math/science steps, using analogies for concepts, and always being encouraging 
."""

def handler(job):
    """
    The main handler for RunPod Serverless
    """
    job_input = job['input']
    
    # Extract data from the format we defined in Node.js
    # Structure: { "method_name": "chat", "input": { "model": "...", "messages": [...] } }
    method = job_input.get("method_name", "chat")
    params = job_input.get("input", {})
    
    model = params.get("model", "llama3.2")
    messages = params.get("messages", [])
    
    # Ensure system prompt is present
    if not any(m.get("role") == "system" for m in messages):
        messages.insert(0, {"role": "system", "content": SYSTEM_PROMPT})

    try:
        # Call the local Ollama service (which is started by start.sh)
        response = requests.post(
            "http://localhost:11434/api/chat",
            json={
                "model": model,
                "messages": messages,
                "stream": False
            },
            timeout=120
        )
        
        return response.json()
        
    except Exception as e:
        return {"error": str(e)}

# Start the RunPod worker
runpod.serverless.start({"handler": handler})
