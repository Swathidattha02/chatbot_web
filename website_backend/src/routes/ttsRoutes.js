const express = require("express");
const router = express.Router();
const axios = require("axios");
const fs = require('fs');
const path = require('path');

// ─ PROVIDER: OpenAI TTS (English) ─
const callOpenAiTts = async (text) => {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
        throw new Error("OpenAI API key not configured on server");
    }

    console.log(`🤖 Using OpenAI TTS for English: ${text.substring(0, 30)}...`);

    const response = await axios({
        method: 'post',
        url: 'https://api.openai.com/v1/audio/speech',
        data: {
            model: "tts-1",
            voice: "alloy",
            input: text,
            response_format: "mp3"
        },
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
    });

    return response.data;
};

// ─ PROVIDER: ElevenLabs TTS (Non-English) ─
const callElevenLabsTts = async (text, voiceId) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
        throw new Error("ElevenLabs API key not configured on server");
    }

    console.log(`🎙️ Using ElevenLabs TTS [${voiceId}] for non-English: ${text.substring(0, 30)}...`);

    const response = await axios({
        method: 'post',
        url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
        data: {
            text: text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.8,
                style: 0.05,
                use_speaker_boost: true
            }
        },
        headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey
        },
        responseType: 'arraybuffer'
    });

    return response.data;
};

// ─ UTILITY: Determine language and call appropriate provider ─
const getTtsAudio = async (text, language, voiceId) => {
    // Normalize language input
    const normalizedLang = (language || 'en').toLowerCase().trim();
    const isEnglish = normalizedLang === 'en' || normalizedLang === 'english' || normalizedLang === '';

    if (isEnglish) {
        return await callOpenAiTts(text);
    } else {
        return await callElevenLabsTts(text, voiceId);
    }
};

// ─ ROUTE: POST /api/tts ─
router.post("/tts", async (req, res) => {
    try {
        const { text, lang, language, voiceId = "21m00Tcm4TlvDq8ikWAM" } = req.body;
        const detectedLanguage = lang || language || 'en';

        // Validation
        if (!text) {
            return res.status(400).json({ error: "Text is required" });
        }

        // Get audio from appropriate provider
        const audioBuffer = await getTtsAudio(text, detectedLanguage, voiceId);

        // Send audio stream
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length,
            'Cache-Control': 'no-cache'
        });

        res.send(Buffer.from(audioBuffer));

    } catch (error) {
        const errorMsg = error.response ? error.response.data.toString() : error.message;
        console.error("❌ TTS Proxy Error:", errorMsg);
        
        // Log to file for debugging
        fs.appendFileSync(
            path.join(__dirname, '../../tts_debug.log'),
            `[${new Date().toISOString()}] Error: ${errorMsg}\n`
        );

        res.status(error.response?.status || 500).json({
            error: "Failed to fetch audio from TTS provider",
            details: errorMsg,
            provider: error.message.includes('OpenAI') ? 'OpenAI' : 'ElevenLabs'
        });
    }
});

module.exports = router;
