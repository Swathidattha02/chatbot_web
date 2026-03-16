import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { chatAPI } from "../services/api";
import LanguageSelector from "../components/LanguageSelector";
import LipSyncAvatar from "../components/LipSyncAvatar";
import translationService from "../services/translationService";
import "../styles/Chat.css";

function ChatWithAvatar() {
    const location = useLocation();
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hello! I\'m your interactive avatar. How can I help you today?',
            timestamp: new Date()
        }
    ]);
    const [inputMessage, setInputMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [currentLanguage, setCurrentLanguage] = useState('en');
    const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
    const [mouthValue, setMouthValue] = useState(0);
    const [currentExpression] = useState('neutral');
    const [isListening, setIsListening] = useState(false);
    const [isVoiceSupported, setIsVoiceSupported] = useState(false);
    const [loadedDocument, setLoadedDocument] = useState(null);
    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);
    const mouthAnimationFrameRef = useRef(null);
    const utteranceRef = useRef(null);
    const abortControllerRef = useRef(null);
    const isTtsProcessingRef = useRef(false);
    const internalQueueRef = useRef([]);
    const audioRef = useRef(null);
    const elevenLabsTimerRef = useRef(null);
    const handleSendMessageRef = useRef(null);
    const currentLanguageRef = useRef(currentLanguage);

    useEffect(() => {
        currentLanguageRef.current = currentLanguage;
    }, [currentLanguage]);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    const handleStopResponse = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setLoading(false);
    }, []);

    const stopSpeaking = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        if (elevenLabsTimerRef.current) {
            clearInterval(elevenLabsTimerRef.current);
        }

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();

            if (mouthAnimationFrameRef.current) {
                cancelAnimationFrame(mouthAnimationFrameRef.current);
                mouthAnimationFrameRef.current = null;
            }

            setMouthValue(0);
            setIsAvatarSpeaking(false);
            isTtsProcessingRef.current = false;
            utteranceRef.current = null;
        }
    }, []);

    const animateMouth = useCallback(() => {
        if (!isTtsProcessingRef.current && !window.speechSynthesis.speaking) {
            setMouthValue(0);
            return;
        }
        const now = Date.now();
        const intensity = Math.max(0.08, Math.min(0.5, 0.25 + Math.sin(now * 0.02) * 0.15 + Math.sin(now * 0.008) * 0.2 + (Math.random() - 0.5) * 0.04));
        setMouthValue(intensity);
        mouthAnimationFrameRef.current = requestAnimationFrame(animateMouth);
    }, []);

    const getBestVoiceForLang = useCallback((langCode) => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) return null;

        const SynthesisLangMap = {
            'en': ['en-US', 'en-GB'], 'hi': ['hi-IN'], 'ta': ['ta-IN'], 'te': ['te-IN'],
            'kn': ['kn-IN'], 'ml': ['ml-IN'], 'bn': ['bn-IN'], 'mr': ['mr-IN'],
            'gu': ['gu-IN'], 'pa': ['pa-IN']
        };
        const targetLocales = SynthesisLangMap[langCode] || ['en-US'];
        
        let bestVoice = voices.find(v => 
            targetLocales.some(loc => v.lang.replace('_', '-').includes(loc)) && 
            (v.name.includes('Natural') || v.localService)
        );
        if (!bestVoice) {
            bestVoice = voices.find(v => targetLocales.some(loc => v.lang.replace('_', '-').includes(loc)));
        }
        return bestVoice;
    }, []);
    
    const cleanTextForTTS = (text) => {
        if (!text) return "";
        let cleaned = text
            .replace(/```[\s\S]*?```/g, " ") 
            .replace(/\([^)]+\)/g, " ") 
            .replace(/\[[^\]]+\]/g, " ") 
            .replace(/[*_~`#/\\-]/g, " ") 
            .replace(/(\d+)\.\s+/g, "$1 ")
            .replace(/\n+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        return cleaned;
    };

    const speakWithElevenLabs = useCallback(async (text, lang) => {
        try {
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
            const response = await fetch(`${apiUrl}/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text, voiceId: "ErXwobaYiN019PkySvjV" })
            });

            if (!response.ok) {
                const errBody = await response.text();
                console.error("❌ ElevenLabs Proxy Error Details:", errBody);
                throw new Error(`TTS Server Error: ${response.status}`);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            
            return new Promise((resolve, reject) => {
                const audio = new Audio(url);
                audioRef.current = audio;

                audio.onplay = () => {
                    isTtsProcessingRef.current = true;
                    setIsAvatarSpeaking(true);
                    if (!mouthAnimationFrameRef.current) {
                        mouthAnimationFrameRef.current = requestAnimationFrame(animateMouth);
                    }
                };

                audio.onended = () => {
                    setIsAvatarSpeaking(false);
                    isTtsProcessingRef.current = false;
                    setMouthValue(0);
                    URL.revokeObjectURL(url);
                    resolve();
                };

                audio.onerror = (e) => {
                    URL.revokeObjectURL(url);
                    reject(e);
                };

                audio.play().catch(reject);
            });
        } catch (error) {
            console.error("ElevenLabs speak error:", error);
            throw error;
        }
    }, [animateMouth]);

    const processInternalQueue = useCallback(async () => {
        if (internalQueueRef.current.length === 0) {
            setIsAvatarSpeaking(false);
            isTtsProcessingRef.current = false;
            setMouthValue(0);
            return;
        }

        const nextMessage = internalQueueRef.current.shift();
        const cleanedText = cleanTextForTTS(nextMessage);
        const lang = currentLanguageRef.current;
        
        console.log(`🎤 TTS Processing [${lang}] - Text: "${cleanedText.substring(0, 50)}..."`);

        if (!cleanedText || cleanedText.trim().length <= 1) {
            processInternalQueue();
            return;
        }

        if (lang !== 'en') {
            try {
                isTtsProcessingRef.current = true;
                await speakWithElevenLabs(cleanedText, lang);
                processInternalQueue();
                return;
            } catch (err) {
                console.warn("⚠️ ElevenLabs failed, falling back to Web Speech:", err.message);
            }
        }

        const utterance = new SpeechSynthesisUtterance(cleanedText);
        utteranceRef.current = utterance;
        const voice = getBestVoiceForLang(lang);
        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
        } else {
            const SynthesisLangMap = { 'en': 'en-US', 'hi': 'hi-IN', 'ta': 'ta-IN', 'te': 'te-IN', 'kn': 'kn-IN', 'ml': 'ml-IN', 'bn': 'bn-IN', 'mr': 'mr-IN', 'gu': 'gu-IN', 'pa': 'pa-IN' };
            utterance.lang = SynthesisLangMap[lang] || 'en-US';
        }

        utterance.rate = 0.95;
        utterance.onstart = () => {
            isTtsProcessingRef.current = true;
            setIsAvatarSpeaking(true);
            if (!mouthAnimationFrameRef.current) {
                mouthAnimationFrameRef.current = requestAnimationFrame(animateMouth);
            }
        };

        utterance.onend = () => {
            setTimeout(processInternalQueue, 100);
        };

        utterance.onerror = (e) => {
            console.error("Speech chunk error:", e);
            processInternalQueue();
        };

        window.speechSynthesis.speak(utterance);
    }, [getBestVoiceForLang, speakWithElevenLabs, animateMouth]);

    const speakMessage = useCallback((text) => {
        if (!text) return;
        
        stopSpeaking();
        
        setTimeout(() => {
            const chunks = text.match(/[^.!?|।\n?؟।]+([.!?|।\n?؟।]|$)/g) || [text];
            const refinedChunks = [];
            for (let i = 0; i < chunks.length; i++) {
                let chunk = chunks[i].trim();
                // Join "1." or "Step 1" style bullets to the next chunk
                if (chunk.match(/^\d+\.?$/) && i + 1 < chunks.length) {
                    refinedChunks.push(chunk + " " + chunks[i+1].trim());
                    i++;
                } else if (chunk.length > 0) {
                    refinedChunks.push(chunk);
                }
            }

            internalQueueRef.current = refinedChunks;
            if (internalQueueRef.current.length > 0) {
                processInternalQueue();
            }
        }, 400);
    }, [processInternalQueue, stopSpeaking]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        if (location.state?.uploadedDocument) {
            const doc = location.state.uploadedDocument;
            setSessionId(null);
            setLoadedDocument(doc);
            setMessages([
                { role: 'assistant', content: "Hello! I'm your interactive avatar. How can I help you today?", timestamp: new Date() },
                { role: 'assistant', content: `📄 ${doc.message}`, timestamp: new Date(), isSystemMessage: true }
            ]);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const handleSendMessage = useCallback(async (messageText) => {
        if (!messageText.trim() || loading) return;

        handleStopResponse();
        stopSpeaking();
        
        const userMessage = { role: "user", content: messageText, timestamp: new Date() };
        setMessages((prev) => [...prev, userMessage]);
        setInputMessage("");
        setLoading(true);

        const streamingMessage = { role: "assistant", content: "", timestamp: new Date(), isStreaming: true };
        setMessages((prev) => [...prev, streamingMessage]);

        try {
            let fullContent = "";
            abortControllerRef.current = new AbortController();

            await chatAPI.streamMessage(
                { message: messageText, sessionId, language: currentLanguage, use_rag: !!loadedDocument },
                (chunk) => {
                    fullContent += chunk;
                    // Only show stream in real-time if it's English
                    // For other languages, we wait and show the translated version all at once
                    if (currentLanguage === 'en') {
                        setMessages((prevMessages) => {
                            const newMessages = [...prevMessages];
                            const index = newMessages.findLastIndex(msg => msg.isStreaming);
                            if (index !== -1) {
                                newMessages[index] = { ...newMessages[index], content: fullContent };
                            }
                            return newMessages;
                        });
                    } else {
                        // For non-English, show a placeholder so the user knows we're working
                        setMessages((prevMessages) => {
                            const newMessages = [...prevMessages];
                            const index = newMessages.findLastIndex(msg => msg.isStreaming);
                            if (index !== -1 && newMessages[index].content === "") {
                                newMessages[index] = { ...newMessages[index], content: "*(ఆలోచిస్తున్నాను... Generating response...)*" };
                            }
                            return newMessages;
                        });
                    }
                },
                async (data) => {
                    console.log("🏁 AI Stream Complete. Content length:", fullContent.length);
                    let finalResponse = fullContent || data.fullResponse;
                    
                    if (currentLanguage !== 'en' && finalResponse) {
                        try {
                            console.log(`🌍 Initiating streaming translation to ${currentLanguage}...`);
                            
                            // 1. Prepare to stream translation
                            let translatedSoFar = "";
                            
                            // 2. Clear placeholder and start showing translated chunks
                            setMessages((prev) => {
                                const newMessages = [...prev];
                                const index = newMessages.findLastIndex(msg => msg.role === "assistant");
                                if (index !== -1) {
                                    newMessages[index] = { 
                                        ...newMessages[index], 
                                        content: "⏳ *భాష మారుతోంది... Translating...*" 
                                    };
                                }
                                return newMessages;
                            });

                            // 3. Call streaming translation
                            const translated = await translationService.translate(finalResponse, currentLanguage, (chunk) => {
                                translatedSoFar += chunk;
                                setMessages((prev) => {
                                    const newMessages = [...prev];
                                    const index = newMessages.findLastIndex(msg => msg.role === "assistant");
                                    if (index !== -1) {
                                        newMessages[index] = { 
                                            ...newMessages[index], 
                                            content: translatedSoFar 
                                        };
                                    }
                                    return newMessages;
                                });
                            });
                            
                            if (translated) finalResponse = translated;
                        } catch (err) { 
                            console.error("❌ Translation sequence failed:", err); 
                        }
                    }

                    // 4. Final update to ensure state is synchronized and streaming stops
                    setMessages((prevMessages) => {
                        const newMessages = [...prevMessages];
                        const index = newMessages.findLastIndex(msg => msg.role === "assistant");
                        if (index !== -1) {
                            newMessages[index] = { 
                                ...newMessages[index], 
                                content: finalResponse, 
                                isStreaming: false, 
                                timestamp: new Date() 
                            };
                        }
                        return newMessages;
                    });

                    setLoading(false);
                    if (!sessionId && data.sessionId) setSessionId(data.sessionId);
                    console.log("✨ Response fully processed.");
                },
                (error) => {
                    console.error("Stream error:", error);
                    setMessages((prev) => {
                        const newMessages = [...prev];
                        const index = newMessages.findLastIndex(msg => msg.isStreaming);
                        if (index !== -1) {
                            newMessages[index] = { ...newMessages[index], content: "Sorry, I encountered an error. Please try again.", isStreaming: false, isError: true };
                        }
                        return newMessages;
                    });
                    setLoading(false);
                },
                abortControllerRef.current.signal
            );
        } catch (error) {
            console.error("Chat error:", error);
            setLoading(false);
        }
    }, [loading, sessionId, currentLanguage, loadedDocument, handleStopResponse, stopSpeaking, speakMessage]);

    useEffect(() => {
        handleSendMessageRef.current = handleSendMessage;
    }, [handleSendMessage]);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            setIsVoiceSupported(true);
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            
            const recognitionLangMap = {
                'en': 'en-US', 'hi': 'hi-IN', 'ta': 'ta-IN', 'te': 'te-IN',
                'kn': 'kn-IN', 'ml': 'ml-IN', 'bn': 'bn-IN', 'mr': 'mr-IN',
                'gu': 'gu-IN', 'pa': 'pa-IN'
            };
            
            recognitionRef.current.lang = recognitionLangMap[currentLanguage] || 'en-US';

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (transcript && transcript.trim()) {
                    if (handleSendMessageRef.current) {
                        handleSendMessageRef.current(transcript);
                    }
                }
            };
            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };
            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
        return () => {
            if (recognitionRef.current) recognitionRef.current.stop();
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        };
    }, [currentLanguage]);

    const handleFormSubmit = (e) => {
        e.preventDefault();
        handleSendMessage(inputMessage);
    };

    const toggleVoiceListening = () => {
        if (!isVoiceSupported) {
            alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
            return;
        }

        // Stop avatar speech when user wants to talk
        stopSpeaking();

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (err) {
                console.error("Recognition start error:", err);
            }
        }
    };

    const handleLanguageChange = useCallback((language) => {
        setCurrentLanguage(language);
        const translatedMsg = translationService.getLanguageChangeMessage(language);
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: translatedMsg,
            timestamp: new Date()
        }]);
    }, []);

    const handleNewChat = () => {
        setMessages([
            {
                role: 'assistant',
                content: 'Hello! I\'m your interactive avatar. How can I help you today?',
                timestamp: new Date()
            }
        ]);
        setSessionId(null);
    };

    const handleReadAgain = (text) => {
        speakMessage(cleanTextForTTS(text));
    };

    return (
        <div className="chat-page">
            <div className="chat-interface">
                <div
                    className={`chat-avatar-header ${(isAvatarSpeaking || loading) ? 'speaking' : ''}`}
                    onClick={() => {
                        if (loading) handleStopResponse();
                        else if (isAvatarSpeaking) stopSpeaking();
                    }}
                    title={(isAvatarSpeaking || loading) ? "Click to stop" : ""}
                >
                    <div className="avatar-canvas-container">
                        <Canvas camera={{ position: [0, 1.6, 5.5], fov: 15 }} style={{ width: '100%', height: '100%', background: 'transparent' }}>
                            <ambientLight intensity={0.8} />
                            <directionalLight position={[0, 5, 5]} intensity={1} />
                            <LipSyncAvatar url="/avatar1.glb" animation="idle" mouthValue={mouthValue} expression={currentExpression} gesture="none" position={[0, -4, 0]} scale={2.5} />
                        </Canvas>
                    </div>
                    <div className="avatar-background-blur"></div>
                </div>

                <div className="chat-content">
                    <LanguageSelector currentLanguage={currentLanguage} onLanguageChange={handleLanguageChange} supportedLanguages={translationService.getSupportedLanguages()} />

                    <div className="chat-header">
                        <h3>
                            <span className="chat-header-icon">🤖</span>
                            AI Educational Tutor
                        </h3>
                        {loading && (
                            <div className="speaking-control">
                                <span className="speaking-indicator">⚡ Generating...</span>
                                <button onClick={handleStopResponse} className="btn-stop-speaking" title="Stop">Stop ⏹</button>
                            </div>
                        )}
                        {isAvatarSpeaking && (
                            <div className="speaking-control">
                                <span className="speaking-indicator">🎤 Speaking...</span>
                                <button onClick={stopSpeaking} className="btn-stop-speaking" title="Stop">Stop ⏹</button>
                            </div>
                        )}
                        <button onClick={handleNewChat} className="btn-new-chat">New Chat</button>
                    </div>

                    <div className="chat-messages">
                        {messages.map((msg, index) => (
                            <div key={index} className={`message ${msg.role === 'user' ? 'user-message' : 'avatar-message'}`}>
                                <div className="message-avatar">{msg.role === 'user' ? '👤' : '🤖'}</div>
                                <div className="message-content">
                                    <div className="message-text">{msg.content}</div>
                                    <div className="message-footer">
                                        <div className="message-time">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                                        {msg.role === 'assistant' && msg.content && !msg.isStreaming && (
                                            <button
                                                className="read-again-button"
                                                onClick={() => handleReadAgain(msg.content)}
                                                disabled={isAvatarSpeaking}
                                                title="Read again"
                                            >
                                                🔊
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="message avatar-message">
                                <div className="message-avatar">🤖</div>
                                <div className="message-content">
                                    <div className="typing-indicator"><span></span><span></span><span></span></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="chat-input-form" onSubmit={handleFormSubmit}>
                        <input type="text" className="chat-input" placeholder="Type your message..." value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} disabled={loading} />
                        <button type="button" className={`voice-input-button ${isListening ? 'listening' : ''}`} onClick={toggleVoiceListening} disabled={loading || !isVoiceSupported} title={!isVoiceSupported ? 'Voice not supported' : isListening ? 'Stop listening' : 'Voice input'}>
                            {isListening ? '🎤' : '🎙️'}
                        </button>
                        <button type="submit" className="send-button" disabled={loading || !inputMessage.trim()}>{loading ? '⏳' : '📤'}</button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ChatWithAvatar;
