const express = require("express");
const router = express.Router();
const axios = require("axios");

router.post("/tts", async (req, res) => {
    try {
        const { text, voiceId = "ErXwobaYiN019PkySvjV" } = req.body;
        const apiKey = process.env.ELEVENLABS_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: "ElevenLabs API key not configured on server" });
        }

        if (!text) {
            return res.status(400).json({ error: "Text is required" });
        }

        console.log(`🎙️ Proxying ElevenLabs [${voiceId}] request for: ${text.substring(0, 30)}...`);

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

        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': response.data.length
        });

        res.send(Buffer.from(response.data));

    } catch (error) {
        const errorMsg = error.response ? error.response.data.toString() : error.message;
        console.error("❌ ElevenLabs Proxy Error:", errorMsg);
        
        // Log to file for debugging
        const fs = require('fs');
        const path = require('path');
        fs.appendFileSync(path.join(__dirname, '../../tts_debug.log'), `[${new Date().toISOString()}] Error: ${errorMsg}\n`);

        res.status(error.response ? error.response.status : 500).json({
            error: "Failed to fetch audio from ElevenLabs",
            details: errorMsg
        });
    }
});

module.exports = router;
