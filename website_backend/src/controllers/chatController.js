const ChatHistory = require("../models/ChatHistory");
const axios = require("axios");
const mongoose = require("mongoose");

// Ollama configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const LLM_MODEL = process.env.LLM_MODEL || "llama3.2";

// Language mapping
const LANGUAGE_NAMES = {
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
};

// Helper function to generate system prompt with language support
const getSystemPrompt = (language = 'en') => {
    const languageName = LANGUAGE_NAMES[language] || 'English';

    if (language === 'en') {
        return `You are an expert educational AI tutor designed to help students learn effectively. 
Follow these guidelines:

1. **For Math/Science Questions:**
   - Break down solutions into clear, numbered steps
   - Explain the reasoning behind each step
   - Show all calculations and formulas used
   - Use simple language that students can understand
   - Provide examples when helpful

2. **For Conceptual Questions:**
   - Start with a simple definition
   - Provide detailed explanations with examples
   - Use analogies to make concepts relatable
   - Break complex topics into smaller parts

3. **Formatting:**
   - Use clear headings and bullet points
   - Highlight important formulas or key points
   - Number your steps for math problems
   - Keep explanations organized and easy to follow

4. **Tone:**
   - Be encouraging and patient
   - Avoid jargon unless necessary (then explain it)
   - Make learning engaging and accessible

Always prioritize clarity and understanding over brevity. If a student asks a math question, show every step of the solution with clear explanations.`;
    }

    // High-force language instruction for non-English responses
    return `### 🚨 MANDATORY LANGUAGE RULE 🚨
YOU ARE A ${languageName.toUpperCase()} TUTOR. 

1. EVERYTHING YOU WRITE MUST BE IN ${languageName.toUpperCase()}.
2. IF THE USER ASKS A QUESTION IN ENGLISH, YOU MUST ANSWER IN ${languageName.toUpperCase()}.
3. IF YOU FIND INFORMATION IN AN ENGLISH DOCUMENT, YOU MUST TRANSLATE IT TO ${languageName.toUpperCase()} BEFORE SHARING.
4. DO NOT USE ENGLISH SENTENCES. TRANSLATE ALL CONCEPTS TO ${languageName.toUpperCase()}.
5. START YOUR RESPONSE DIRECTLY IN ${languageName.toUpperCase()}.

You are an expert educational AI tutor helping students learn in ${languageName}.
Follow these guidelines:
- Translate all technical definitions into ${languageName}
- Break down math steps in ${languageName}
- Use analogies relevant to ${languageName} speakers
- Be encouraging and patient

### FINAL REMINDER: YOUR ENTIRE RESPONSE MUST BE IN ${languageName.toUpperCase()} ###`;
};

// @desc    Send message to AI avatar and get response
// @route   POST /api/chat/message
// @access  Private
exports.sendMessage = async (req, res) => {
    try {
        const { message, sessionId, language = "en" } = req.body;
        const userId = req.user.id;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Message is required",
            });
        }

        console.log(`📩 Incoming message from user ${userId}: "${message.substring(0, 50)}..." [Lang: ${language}, Session: ${sessionId}]`);

        // Find or create chat session
        let chatSession;
        try {
            if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
                chatSession = await ChatHistory.findById(sessionId);
            }

            if (!chatSession) {
                console.log('📝 Creating new chat session for user:', userId);
                chatSession = await ChatHistory.create({
                    userId,
                    language,
                    messages: [],
                });
            }
        } catch (sessionError) {
            console.error('❌ Session error:', sessionError.message);
            chatSession = await ChatHistory.create({
                userId,
                language,
                messages: [],
            });
        }

        // Add user message to history
        chatSession.messages.push({
            role: "user",
            content: message,
        });

        // Get AI response from Ollama
        let aiResponse = "I'm your AI assistant. How can I help you today?";
        let audioUrl = null;

        // Try RAG service first for document-aware responses
        const ragService = require('../services/ragService');
        const ragHealth = await ragService.checkRAGHealth();

        if (ragHealth.available) {
            try {
                console.log('🤖 Using RAG service for enhanced response');

                const ragResponse = await ragService.chatWithRAG(message, true, language);

                if (ragResponse.success) {
                    aiResponse = ragResponse.data.response || ragResponse.data.message;
                    const contextUsed = ragResponse.data.context_used || false;
                    const numChunks = ragResponse.data.num_chunks || 0;

                    if (!aiResponse) {
                        throw new Error('RAG service returned empty response');
                    }

                    if (contextUsed) {
                        console.log(`✅ RAG response with ${numChunks} context chunks`);
                    } else {
                        console.log('✅ RAG response (no relevant context found)');
                    }
                } else {
                    throw new Error('RAG service returned error');
                }
            } catch (ragError) {
                console.warn('⚠️ RAG service failed, falling back to direct Ollama:', ragError.message);
                // Fall through to direct Ollama call below
            }
        } else {
            console.log('ℹ️ RAG service not available, using direct Ollama');
        }

        // Fallback to direct Ollama if RAG didn't work
        if (aiResponse === "I'm your AI assistant. How can I help you today?") {
            try {
                // Call AI Service (Detect RunPod or Local Ollama)
                const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
                const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;

                if (RUNPOD_API_KEY && RUNPOD_ENDPOINT_ID) {
                    console.log('🚀 Using RunPod Serverless Endpoint:', RUNPOD_ENDPOINT_ID);

                    const runpodResponse = await axios.post(
                        `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/runsync`,
                        {
                            input: {
                                method_name: "chat", // Most ollama workers use this or generic 'input'
                                input: {
                                    model: LLM_MODEL,
                                    messages: [
                                        { role: 'system', content: systemPrompt },
                                        ...currentConversation
                                    ],
                                    stream: false
                                }
                            }
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${RUNPOD_API_KEY}`,
                                'Content-Type': 'application/json'
                            },
                            timeout: 120000 // 2 minutes for cold starts
                        }
                    );

                    if (runpodResponse.data && runpodResponse.data.output) {
                        // Handle different worker output formats
                        const output = runpodResponse.data.output;
                        if (typeof output === 'string') {
                            aiResponse = output;
                        } else if (output.message && output.message.content) {
                            aiResponse = output.message.content;
                        } else if (output.response) {
                            aiResponse = output.response;
                        }
                    } else if (runpodResponse.data && runpodResponse.data.error) {
                        throw new Error(`RunPod Error: ${runpodResponse.data.error}`);
                    }
                } else {
                    // Call Local Ollama API
                    const ollamaResponse = await axios.post(
                        `${OLLAMA_BASE_URL}/api/chat`,
                        {
                            model: LLM_MODEL,
                            messages: [
                                {
                                    role: 'system',
                                    content: systemPrompt
                                },
                                ...currentConversation
                            ],
                            stream: false
                        },
                        {
                            timeout: 60000,
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                    if (ollamaResponse.data && ollamaResponse.data.message) {
                        aiResponse = ollamaResponse.data.message.content;
                        console.log('✅ Ollama response received:', aiResponse.substring(0, 100) + '...');
                    }
                }
            } catch (aiError) {
                console.error("❌ AI Service Error:", aiError.message);

                if (aiError.message.includes('RunPod')) {
                    aiResponse = "I'm having trouble connecting to my remote AI service on RunPod. It might be starting up (Cold Start) or the API key is invalid.";
                } else if (aiError.code === 'ECONNREFUSED') {
                    console.error('⚠️ Ollama is not running. Please start Ollama service.');
                    aiResponse = "I'm having trouble connecting to my AI service. Please make sure Ollama is running with llama3.2 model installed.";
                } else if (aiError.response?.status === 404) {
                    console.error('⚠️ Model not found. Please pull llama3.2 model.');
                    aiResponse = "The AI model is not available. Please run: ollama pull llama3.2";
                } else {
                    aiResponse = "I apologize, but I'm having technical difficulties. Please try again in a moment.";
                }
            }
        }

        // Add AI response to history
        chatSession.messages.push({
            role: "assistant",
            content: aiResponse,
            audioUrl,
        });

        await chatSession.save();

        res.status(200).json({
            success: true,
            sessionId: chatSession._id,
            response: aiResponse,
            audioUrl,
        });
    } catch (error) {
        console.error("❌ Chat Controller Error:", error);
        res.status(500).json({
            success: false,
            message: "Error processing chat message",
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// @desc    Get chat history
// @route   GET /api/chat/history
// @access  Private
exports.getChatHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.query;

        if (sessionId) {
            // Get specific session
            const session = await ChatHistory.findOne({
                _id: sessionId,
                userId,
            });

            if (!session) {
                return res.status(404).json({
                    success: false,
                    message: "Chat session not found",
                });
            }

            return res.status(200).json({
                success: true,
                session,
            });
        }

        // Get all sessions for user
        const sessions = await ChatHistory.find({ userId })
            .sort({ updatedAt: -1 })
            .limit(20);

        res.status(200).json({
            success: true,
            sessions,
        });
    } catch (error) {
        console.error("Get Chat History Error:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching chat history",
            error: error.message,
        });
    }
};

// @desc    Delete chat session
// @route   DELETE /api/chat/:sessionId
// @access  Private
exports.deleteChat = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;

        const session = await ChatHistory.findOneAndDelete({
            _id: sessionId,
            userId,
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Chat session not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Chat session deleted successfully",
        });
    } catch (error) {
        console.error("Delete Chat Error:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting chat session",
            error: error.message,
        });
    }
};

// @desc    Stream message to AI avatar and get streaming response
// @route   POST /api/chat/stream
// @access  Private
exports.streamMessage = async (req, res) => {
    try {
        const { message, sessionId, language = "en" } = req.body;
        const userId = req.user.id;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Message is required",
            });
        }

        // Set headers for Server-Sent Events
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // Find or create chat session
        let chatSession;
        try {
            if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
                chatSession = await ChatHistory.findById(sessionId);
            }

            if (!chatSession) {
                chatSession = await ChatHistory.create({
                    userId,
                    language,
                    messages: [],
                });
            }
        } catch (sessionError) {
            chatSession = await ChatHistory.create({
                userId,
                language,
                messages: [],
            });
        }

        // Add user message to history
        chatSession.messages.push({
            role: "user",
            content: message,
        });

        // Try RAG service first
        const ragService = require('../services/ragService');
        const ragHealth = await ragService.checkRAGHealth();

        let fullResponse = "";
        let usedRAG = false;

        if (ragHealth.available) {
            try {
                const useRAG = req.body.use_rag !== false; // Default to true unless explicitly false
                console.log(`🤖 Requesting from RAG Service - use_rag: ${useRAG}, lang: ${language}`);

                const response = await axios.post(
                    `${require('../services/ragService').RAG_SERVICE_URL}/chat/stream`,
                    {
                        message,
                        use_rag: useRAG,
                        language: language
                    },
                    {
                        responseType: 'stream',
                        timeout: 60000,
                    }
                );

                usedRAG = true;

                // Pipe the RAG stream directly
                for await (const chunk of response.data) {
                    const lines = chunk.toString().split('\n').filter(line => line.trim());
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const json = JSON.parse(line.slice(6));
                                if (json.content) {
                                    fullResponse += json.content;
                                    res.write(`data: ${JSON.stringify({ chunk: json.content, done: false })} \n\n`);
                                }
                            } catch (e) {
                                // Skip invalid JSON
                            }
                        }
                    }
                }
            } catch (ragError) {
                console.warn('⚠️ RAG streaming failed, falling back to Ollama:', ragError.message);
            }
        }

        // Fallback to AI Service streaming if RAG didn't work
        if (!usedRAG) {
            const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
            const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;

            const conversationHistory = chatSession.messages.slice(-10).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            }));

            const systemPrompt = getSystemPrompt(language);
            const languageName = LANGUAGE_NAMES[language] || 'English';

            // Reinforce language in the last message
            const currentConversation = [...conversationHistory];
            if (language !== 'en' && currentConversation.length > 0) {
                const lastMsg = currentConversation[currentConversation.length - 1];
                if (lastMsg.role === 'user') {
                    lastMsg.content = `[INSTRUCTION: Answer ONLY in ${languageName}] ${lastMsg.content}`;
                }
            }

            if (RUNPOD_API_KEY && RUNPOD_ENDPOINT_ID) {
                console.log('🚀 Using RunPod Serverless for streaming (as fake stream)');
                try {
                    const runpodUrl = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/runsync`;
                    const runpodResponse = await axios.post(
                        runpodUrl,
                        {
                            input: {
                                method_name: "chat",
                                input: {
                                    model: LLM_MODEL,
                                    messages: [
                                        { role: 'system', content: systemPrompt },
                                        ...currentConversation
                                    ],
                                    stream: false
                                }
                            }
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${RUNPOD_API_KEY}`,
                                'Content-Type': 'application/json'
                            },
                            timeout: 120000
                        }
                    );

                    if (runpodResponse.data && runpodResponse.data.output) {
                        const output = runpodResponse.data.output;
                        let content = "";
                        if (typeof output === 'string') {
                            content = output;
                        } else if (output.message && output.message.content) {
                            content = output.message.content;
                        } else if (output.response) {
                            content = output.response;
                        }

                        fullResponse = content;
                        // "Fake" stream for the client
                        res.write(`data: ${JSON.stringify({ chunk: fullResponse, done: false })} \n\n`);
                    } else if (runpodResponse.data && runpodResponse.data.error) {
                        throw new Error(`RunPod Error: ${runpodResponse.data.error}`);
                    }
                } catch (runpodError) {
                    console.error('❌ RunPod streaming error:', runpodError.message);
                    fullResponse = "I'm having trouble connecting to my remote AI service on RunPod.";
                    res.write(`data: ${JSON.stringify({ chunk: fullResponse, done: false })} \n\n`);
                }
            } else {
                console.log('🤖 Using Local Ollama streaming');
                try {
                    const ollamaResponse = await axios.post(
                        `${OLLAMA_BASE_URL}/api/chat`,
                        {
                            model: LLM_MODEL,
                            messages: [
                                {
                                    role: 'system',
                                    content: systemPrompt
                                },
                                ...currentConversation
                            ],
                            stream: true
                        },
                        {
                            responseType: 'stream',
                            timeout: 60000,
                        }
                    );

                    // Stream Ollama response
                    for await (const chunk of ollamaResponse.data) {
                        const lines = chunk.toString().split('\n').filter(line => line.trim());

                        for (const line of lines) {
                            try {
                                const json = JSON.parse(line);
                                if (json.message?.content) {
                                    fullResponse += json.message.content;
                                    res.write(`data: ${JSON.stringify({ chunk: json.message.content, done: false })} \n\n`);
                                }
                                if (json.done) {
                                    break;
                                }
                            } catch (e) {
                                // Skip invalid JSON
                            }
                        }
                    }
                } catch (ollamaError) {
                    console.error('❌ Ollama streaming error:', ollamaError.message);

                    if (ollamaError.code === 'ECONNREFUSED') {
                        fullResponse = "Ollama is not running. Please start the Ollama service on your computer.";
                    } else if (ollamaError.response?.status === 404) {
                        fullResponse = `The AI model(${LLM_MODEL}) is not found.Please run: ollama pull ${LLM_MODEL} `;
                    } else {
                        fullResponse = "I apologize, but I'm having technical difficulties. Please check if Ollama is running.";
                    }

                    res.write(`data: ${JSON.stringify({ chunk: fullResponse, done: false })} \n\n`);
                }
            }
        }

        // Save AI response to history
        chatSession.messages.push({
            role: "assistant",
            content: fullResponse,
        });

        await chatSession.save();

        // Send completion event
        res.write(`data: ${JSON.stringify({
            chunk: '',
            done: true,
            sessionId: chatSession._id,
            fullResponse: fullResponse
        })
            } \n\n`);

        res.end();

    } catch (error) {
        console.error("Stream Chat Error:", error);
        res.write(`data: ${JSON.stringify({
            error: error.message,
            done: true
        })
            } \n\n`);
        res.end();
    }
};
