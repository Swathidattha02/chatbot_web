const express = require("express");
const router = express.Router();
const { getLlmResponse } = require("../services/llmService");

// @desc    Translate text using Gemini/OpenAI (with streaming)
router.post("/translate", async (req, res) => {
    try {
        const { text, targetLang, targetName, stream = false } = req.body;
        
        if (!text || !targetLang) {
            return res.status(400).json({ error: "Text and targetLang are required" });
        }

        console.log(`🌍 [Translation] Target: ${targetName || targetLang} | Stream: ${stream}`);

        let systemPrompt = `You are a professional translator. Translate the following text from English to ${targetName || targetLang} precisely and completely.
Do NOT summarize, Do NOT skip any sentences, and Do NOT add any notes. 
Keep the original structure, including any numbering or bullet points.
If there are technical terms, you may include the English term in parentheses next to the translation if it helps clarity.`;

        if (targetLang === 'te') {
            systemPrompt += `
Role: Translate for an Indian student. Use formal, standard academic Telugu (గ్రాంథిక భాష కాదు, కానీ పాఠ్యపుస్తక భాష).
IMPORTANT: Use standard Telugu biological and scientific terms where possible (e.g., use "ఏకదళబీజాలు" for Monocotyledons). 
Ensure long explanations remain detailed and scientifically accurate.`;
        }

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `TEXT TO TRANSLATE:\n${text}\n\nTRANSLATION:` }
        ];

        if (stream) {
            // Setup SSE for streaming
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders();

            let translatedText = '';
            
            try {
                for await (const chunk of getLlmResponse(messages, { maxTokens: 2048, temperature: 0.3 }, targetLang)) {
                    if (chunk.content && !chunk.done) {
                        translatedText += chunk.content;
                        res.write(`data: ${JSON.stringify({ chunk: chunk.content })} \n\n`);
                    }
                    if (chunk.done) {
                        res.write(`data: ${JSON.stringify({ chunk: '', done: true })} \n\n`);
                        break;
                    }
                }
            } catch (error) {
                console.error('❌ Translation streaming error:', error.message);
                res.write(`data: ${JSON.stringify({ error: error.message, done: true })} \n\n`);
            }
            
            res.end();
        } else {
            // Non-streaming: collect full translation
            let translatedText = '';
            
            try {
                for await (const chunk of getLlmResponse(messages, { maxTokens: 2048, temperature: 0.3 }, targetLang)) {
                    if (chunk.content && !chunk.done) {
                        translatedText += chunk.content;
                    }
                    if (chunk.done) {
                        break;
                    }
                }
                
                res.json({ translatedText: translatedText.trim() });
            } catch (error) {
                console.error('❌ Translation error:', error.message);
                res.status(500).json({ error: error.message });
            }
        }

    } catch (error) {
        console.error('❌ Translation route error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        } else {
            res.end();
        }
    }
});

module.exports = router;
