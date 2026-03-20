const express = require("express");
const router = express.Router();

// @desc    Translate text using local Ollama (supports streaming)
router.post("/translate", async (req, res) => {
    try {
        const { text, targetLang, targetName, stream = false } = req.body;
        
        if (!text || !targetLang) {
            return res.status(400).json({ error: "Text and targetLang are required" });
        }

        console.log(`🌍 [Translation] Target: ${targetName || targetLang} | Stream: ${stream}`);

        const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
        const model = "llama3.2:latest";

        let prompt = `You are a professional translator. Translate the following text from English to ${targetName || targetLang} precisely and completely.
Do NOT summarize, Do NOT skip any sentences, and Do NOT add any notes. 
Keep the original structure, including any numbering or bullet points.
If there are technical terms, you may include the English term in parentheses next to the translation if it helps clarity.

Target Language: ${targetName || targetLang}`;

        if (targetLang === 'te') {
            prompt += `
Role: Translate for an Indian student. Use formal, standard academic Telugu (గ్రాంథిక భాష కాదు, కానీ పాఠ్యపుస్తక భాష).
IMPORTANT: Use standard Telugu biological and scientific terms where possible (e.g., use "ఏకదళబీజాలు" for Monocotyledons). 
Ensure long explanations remain detailed and scientifically accurate.`;
        }
        
        prompt += `\n\nTEXT TO TRANSLATE:\n${text}\n\nTRANSLATION:`;

        if (stream) {
            // Setup SSE
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    prompt: prompt,
                    stream: true,
                    options: { 
                        temperature: 0.3,
                        num_ctx: 4096,
                        num_predict: 2048 
                    }
                })
            });

            if (!response.ok) throw new Error(`Ollama error: ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep the last partial line in buffer

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const data = JSON.parse(line);
                        if (data.response) {
                            res.write(`data: ${JSON.stringify({ chunk: data.response })} \n\n`);
                        }
                    } catch (e) {
                        // If parsing fails, it might be a partial JSON, but pop() should handle most cases.
                        // We'll keep it for the next chunk if it looks incomplete.
                    }
                }
            }
            res.write(`data: ${JSON.stringify({ done: true })} \n\n`);
            return res.end();
        } else {
            // Non-streaming fallback
            const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    prompt: prompt,
                    stream: false,
                    options: { 
                        temperature: 0.3,
                        num_ctx: 4096,
                        num_predict: 2048 
                    }
                })
            });

            if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
            const data = await response.json();
            return res.json({ translatedText: data.response.trim() });
        }

    } catch (error) {
        console.error("❌ Translation Exception:", error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: "Translation failed", details: error.message });
        } else {
            res.end();
        }
    }
});

module.exports = router;
