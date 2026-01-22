const axios = require('axios');

// RAG Service configuration
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8001';

/**
 * Upload document to RAG service for processing
 */
const uploadToRAG = async (filePath, originalName) => {
    try {
        const FormData = require('form-data');
        const fs = require('fs');

        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath), originalName);

        const response = await axios.post(`${RAG_SERVICE_URL}/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
            },
            timeout: 120000, // 2 minutes for large PDFs
        });

        return {
            success: true,
            data: response.data,
        };
    } catch (error) {
        console.error('RAG upload error:', error.message);
        return {
            success: false,
            error: error.message,
        };
    }
};

/**
 * Chat with RAG-enhanced context
 */
const chatWithRAG = async (message, useRAG = true) => {
    try {
        const response = await axios.post(
            `${RAG_SERVICE_URL}/chat`,
            {
                message,
                use_rag: useRAG,
            },
            {
                timeout: 60000,
            }
        );

        return {
            success: true,
            data: response.data,
        };
    } catch (error) {
        console.error('RAG chat error:', error.message);
        return {
            success: false,
            error: error.message,
        };
    }
};

/**
 * Get RAG service statistics
 */
const getRAGStats = async () => {
    try {
        const response = await axios.get(`${RAG_SERVICE_URL}/stats`, {
            timeout: 5000,
        });

        return {
            success: true,
            data: response.data,
        };
    } catch (error) {
        console.error('RAG stats error:', error.message);
        return {
            success: false,
            error: error.message,
        };
    }
};

/**
 * Clear RAG vector store
 */
const clearRAGStore = async () => {
    try {
        const response = await axios.post(`${RAG_SERVICE_URL}/clear`, {}, {
            timeout: 10000,
        });

        return {
            success: true,
            data: response.data,
        };
    } catch (error) {
        console.error('RAG clear error:', error.message);
        return {
            success: false,
            error: error.message,
        };
    }
};

/**
 * Check if RAG service is available
 */
const checkRAGHealth = async () => {
    try {
        const response = await axios.get(`${RAG_SERVICE_URL}/health`, {
            timeout: 5000,
        });

        return {
            available: true,
            data: response.data,
        };
    } catch (error) {
        console.error('RAG service not available:', error.message);
        return {
            available: false,
            error: error.message,
        };
    }
};

module.exports = {
    uploadToRAG,
    chatWithRAG,
    getRAGStats,
    clearRAGStore,
    checkRAGHealth,
};
