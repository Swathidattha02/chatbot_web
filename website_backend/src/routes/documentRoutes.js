const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const authenticate = require('../middleware/auth');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/documents');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only PDF and Word documents are allowed!'));
        }
    }
});

// Upload document endpoint
router.post('/upload', authenticate, upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const userId = req.user.id;
        const documentInfo = {
            userId: userId,
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: req.file.path,
            size: req.file.size,
            mimeType: req.file.mimetype,
            uploadedAt: new Date()
        };

        console.log('📄 Document uploaded:', documentInfo.originalName);

        // Process document with RAG system
        const ragService = require('../services/ragService');
        const ragResult = await ragService.uploadToRAG(req.file.path, req.file.originalname);

        if (ragResult.success) {
            console.log('✅ RAG processing successful:', ragResult.data);

            res.json({
                success: true,
                message: 'Document uploaded and processed successfully',
                document: {
                    id: documentInfo.filename,
                    name: documentInfo.originalName,
                    size: documentInfo.size,
                    uploadedAt: documentInfo.uploadedAt
                },
                rag: {
                    chunks: ragResult.data.num_chunks,
                    message: ragResult.data.message
                }
            });
        } else {
            console.warn('⚠️ RAG processing failed, document saved but not indexed:', ragResult.error);

            res.json({
                success: true,
                message: 'Document uploaded but RAG processing failed. File saved for later processing.',
                document: {
                    id: documentInfo.filename,
                    name: documentInfo.originalName,
                    size: documentInfo.size,
                    uploadedAt: documentInfo.uploadedAt
                },
                warning: 'Document not indexed for search. Make sure RAG service is running.'
            });
        }

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload document'
        });
    }
});

// Get user's uploaded documents
router.get('/list', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        // TODO: Get from database
        // For now, return empty array
        res.json({
            success: true,
            documents: []
        });

    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch documents'
        });
    }
});

// Delete document
router.delete('/:documentId', authenticate, async (req, res) => {
    try {
        const { documentId } = req.params;
        const userId = req.user.id;

        // TODO: Delete from database and filesystem

        res.json({
            success: true,
            message: 'Document deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete document'
        });
    }
});

module.exports = router;
