const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Default options for LLM calls
const DEFAULT_OPTIONS = {
    maxTokens: 2048,
    temperature: 0.7,
    topP: 0.95,
    topK: 64,
    timeout: 30000
};

// ─ PROVIDER: Gemini API (Primary) ─
const callGeminiApi = async function* (messages, options = {}) {
    // Read at call-time so dotenv is already loaded
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
        throw new Error("Gemini API key not configured on server (GEMINI_API_KEY)");
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    try {
        console.log(`🤖 Calling Gemini for ${messages.length} messages`);

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Separate system message from conversation messages
        const systemMsg = messages.find(m => m.role === 'system');
        const conversationMsgs = messages.filter(m => m.role !== 'system');

        // Build system instruction (Gemini handles system separately)
        const systemInstruction = systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined;

        // Convert chat messages to Gemini format — parts MUST be an array
        const contents = conversationMsgs.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        // If no conversation messages (only system), add a dummy user turn
        if (contents.length === 0) {
            contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
        }

        // Generate content with streaming
        const modelWithSystem = systemInstruction
            ? genAI.getGenerativeModel({ model: "gemini-2.0-flash", systemInstruction })
            : model;

        const result = await modelWithSystem.generateContentStream({
            contents,
            generationConfig: {
                maxOutputTokens: opts.maxTokens,
                temperature: opts.temperature,
                topP: opts.topP,
                topK: opts.topK
            }
        });

        // Stream chunks
        for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
                yield {
                    content: text,
                    done: false
                };
            }
        }

        yield {
            content: '',
            done: true
        };

    } catch (error) {
        console.error('❌ Gemini API Error:', error.message);
        throw error;
    }
};

// ─ PROVIDER: OpenAI API (Fallback) ─
const callOpenAiApi = async function* (messages, options = {}) {
    // Read at call-time so dotenv is already loaded
    const apiKey = process.env.OPENAI_LLM_API_KEY;
    
    if (!apiKey) {
        throw new Error("OpenAI API key not configured on server (OPENAI_LLM_API_KEY)");
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };

    try {
        console.log(`🚀 Calling OpenAI for ${messages.length} messages`);

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4o-mini',
                messages: messages,
                max_tokens: opts.maxTokens,
                temperature: opts.temperature,
                top_p: opts.topP,
                stream: true
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: opts.timeout,
                responseType: 'stream'
            }
        );

        // Stream chunks
        let buffer = '';
        for await (const chunk of response.data) {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep partial line in buffer

            for (const line of lines) {
                if (!line.trim() || line === 'data: [DONE]') continue;
                
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        const content = data.choices?.[0]?.delta?.content;
                        
                        if (content) {
                            yield {
                                content: content,
                                done: false
                            };
                        }

                        if (data.choices?.[0]?.finish_reason) {
                            yield {
                                content: '',
                                done: true
                            };
                        }
                    } catch (e) {
                        // Partial JSON, continue
                    }
                }
            }
        }

        // Send final done if not already sent
        yield {
            content: '',
            done: true
        };

    } catch (error) {
        console.error('❌ OpenAI API Error:', error.message);
        throw error;
    }
};

// ─ ROUTER: Get response from appropriate provider with fallback ─
const getLlmResponse = async function* (messages, options = {}, language = 'en') {
    let lastError = null;
    let geminiFailed = false;

    // Try Gemini first
    try {
        console.log(`📤 Attempting Gemini (primary LLM) for ${language}...`);
        for await (const chunk of callGeminiApi(messages, options)) {
            yield chunk;
        }
        return; // Success, exit
    } catch (geminiError) {
        lastError = geminiError;
        geminiFailed = true;
        console.warn(`⚠️ Gemini failed: ${geminiError.message}`);
    }

    // Fallback to OpenAI
    if (geminiFailed) {
        try {
            console.log(`📤 Gemini failed, falling back to OpenAI (secondary LLM)...`);
            for await (const chunk of callOpenAiApi(messages, options)) {
                yield chunk;
            }
            return; // Success, exit
        } catch (openaiError) {
            lastError = openaiError;
            console.error(`❌ Both LLM providers failed`);
        }
    }

    // Both failed - return error
    if (lastError) {
        yield {
            content: `I'm experiencing technical difficulties with my AI services. Error: ${lastError.message}`,
            done: true,
            error: true
        };
    }
};

// ─ UTILITY: Format system prompt with language context ─
const formatSystemPrompt = (basePrompt, language = 'en') => {
    if (language !== 'en' && language !== 'english' && language !== '') {
        const languageNames = {
            'te': 'Telugu',
            'hi': 'Hindi',
            'ta': 'Tamil',
            'kn': 'Kannada',
            'ml': 'Malayalam',
            'bn': 'Bengali',
            'mr': 'Marathi',
            'gu': 'Gujarati',
            'pa': 'Punjabi'
        };
        
        const langName = languageNames[language] || language;
        return `${basePrompt}\n\nIMPORTANT: The user is communicating in ${langName}. Please respond in ${langName}.`;
    }
    
    return basePrompt;
};

module.exports = {
    callGeminiApi,
    callOpenAiApi,
    getLlmResponse,
    formatSystemPrompt,
    DEFAULT_OPTIONS
};
