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

        let prompt = `Translate the following text from English to ${targetName || targetLang}.`;
        if (targetLang === 'te') {
            prompt += ` Use clear, simple Telugu words that are commonly spoken. Use native Telugu words for better pronunciation. Write in proper Telugu script.`;
        }
        prompt += ` Provide ONLY the translation, without any explanations or additional text:\n\n${text}`;

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
                    options: { temperature: 0.3 }
                })
            });

            if (!response.ok) throw new Error(`Ollama error: ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.response) {
                            res.write(`data: ${JSON.stringify({ chunk: data.response })} \n\n`);
                        }
                    } catch (e) { }
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
                    options: { temperature: 0.3 }
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
