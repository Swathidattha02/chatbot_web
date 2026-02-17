const express = require('express');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const router = express.Router();

// RAG service URL
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8000';

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

/**
 * Upload document to RAG service
 */
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log(`📤 Proxying file upload to RAG service: ${req.file.originalname}`);

        // Create form data
        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });

        // Forward to Python RAG service
        const response = await axios.post(
            `${RAG_SERVICE_URL}/upload`,
            formData,
            {
                headers: {
                    ...formData.getHeaders()
                },
                timeout: 60000 // 60 second timeout
            }
        );

        console.log(`✅ Upload successful: ${response.data.num_chunks} chunks`);
        res.json(response.data);

    } catch (error) {
        console.error('❌ Upload proxy error:', error.message);

        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else if (error.code === 'ECONNREFUSED') {
            res.status(503).json({
                error: 'RAG service unavailable',
                message: 'Please ensure the Python RAG service is running'
            });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

/**
 * Streaming chat endpoint
 */
router.post('/chat/stream', async (req, res) => {
    try {
        const { message, conversation_history, use_rag = true } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log(`💬 Proxying streaming chat request: ${message.substring(0, 50)}...`);

        // Set headers for Server-Sent Events
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Forward to Python RAG service
        const response = await axios.post(
            `${RAG_SERVICE_URL}/chat/stream`,
            {
                message,
                conversation_history: conversation_history || [],
                use_rag
            },
            {
                responseType: 'stream',
                timeout: 120000 // 2 minute timeout
            }
        );

        // Pipe the stream to the client
        response.data.pipe(res);

        // Handle errors
        response.data.on('error', (error) => {
            console.error('❌ Stream error:', error);
            res.end();
        });

    } catch (error) {
        console.error('❌ Chat stream proxy error:', error.message);

        if (!res.headersSent) {
            if (error.code === 'ECONNREFUSED') {
                res.status(503).json({
                    error: 'RAG service unavailable',
                    message: 'Please ensure the Python RAG service is running'
                });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    }
});

/**
 * Non-streaming chat endpoint
 */
router.post('/chat', async (req, res) => {
    try {
        const { message, conversation_history, use_rag = true } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log(`💬 Proxying chat request: ${message.substring(0, 50)}...`);

        // Forward to Python RAG service
        const response = await axios.post(
            `${RAG_SERVICE_URL}/chat`,
            {
                message,
                conversation_history: conversation_history || [],
                use_rag
            },
            {
                timeout: 60000 // 60 second timeout
            }
        );

        console.log(`✅ Chat response received`);
        res.json(response.data);

    } catch (error) {
        console.error('❌ Chat proxy error:', error.message);

        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else if (error.code === 'ECONNREFUSED') {
            res.status(503).json({
                error: 'RAG service unavailable',
                message: 'Please ensure the Python RAG service is running'
            });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

/**
 * Clear vector store
 */
router.post('/clear', async (req, res) => {
    try {
        console.log('🗑️ Proxying clear request to RAG service');

        const response = await axios.post(`${RAG_SERVICE_URL}/clear`);

        console.log('✅ Vector store cleared');
        res.json(response.data);

    } catch (error) {
        console.error('❌ Clear proxy error:', error.message);

        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

/**
 * Get RAG service statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const response = await axios.get(`${RAG_SERVICE_URL}/stats`);
        res.json(response.data);
    } catch (error) {
        console.error('❌ Stats proxy error:', error.message);

        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

/**
 * Health check for RAG service
 */
router.get('/health', async (req, res) => {
    try {
        const response = await axios.get(`${RAG_SERVICE_URL}/health`);
        res.json(response.data);
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: 'RAG service unavailable',
            message: error.message
        });
    }
});

module.exports = router;
