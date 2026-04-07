import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { chatAPI } from "../services/api";
import LanguageSelector from "../components/LanguageSelector.jsx";
import LipSyncAvatar from "../components/LipSyncAvatar";
import translationService from "../services/translationService";
import { Bot, User, Zap, Square, Mic, Volume2, Clock, Send, RefreshCw, Sparkles } from "lucide-react";
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
    const [isTtsLoading, setIsTtsLoading] = useState(false);
    const [mouthValue, setMouthValue] = useState(0);
    const [currentExpression, setCurrentExpression] = useState("neutral");
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
    const audioCacheRef = useRef(new Map());
    const audioRef = useRef(null);
    const elevenLabsTimerRef = useRef(null);
    const handleSendMessageRef = useRef(null);
    const currentLanguageRef = useRef(currentLanguage);
    const sentenceBufferRef = useRef("");

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
        }

        if (mouthAnimationFrameRef.current) {
            cancelAnimationFrame(mouthAnimationFrameRef.current);
            mouthAnimationFrameRef.current = null;
        }

        setMouthValue(0);
        setIsAvatarSpeaking(false);
        setIsTtsLoading(false);
        isTtsProcessingRef.current = false;
        utteranceRef.current = null;
        
        // Clear queue
        internalQueueRef.current = [];
        audioCacheRef.current.forEach(url => URL.revokeObjectURL(url));
        audioCacheRef.current.clear();
    }, []);

    const animateMouth = useCallback(() => {
        if (!isTtsProcessingRef.current && !window.speechSynthesis.speaking && !audioRef.current) {
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

        const langMap = {
            'en': ['en-US', 'en-GB'], 'hi': ['hi-IN'], 'ta': ['ta-IN'], 'te': ['te-IN'],
            'kn': ['kn-IN'], 'ml': ['ml-IN'], 'bn': ['bn-IN'], 'mr': ['mr-IN'],
            'gu': ['gu-IN'], 'pa': ['pa-IN']
        };
        const targetLocales = langMap[langCode] || ['en-US'];

        let voice = voices.find(v =>
            targetLocales.some(loc => v.lang.replace('_', '-').toLowerCase().includes(loc.toLowerCase())) &&
            (v.name.includes('Natural') || v.name.includes('Online'))
        );

        if (!voice) {
            voice = voices.find(v => targetLocales.some(loc => v.lang.replace('_', '-').toLowerCase().includes(loc.toLowerCase())));
        }

        if (!voice) {
            voice = voices.find(v => v.lang.toLowerCase().startsWith(langCode.toLowerCase()));
        }

        return voice;
    }, []);

    const cleanTextForTTS = (text) => {
        if (!text) return "";
        let cleaned = text
            .replace(/```[\s\S]*?```/g, " ")
            .replace(/\([^)]+\)/g, " ")
            .replace(/\[[^\]]+\]/g, " ")
            .replace(/[*_~`#/\\-]/g, " ")
            .replace(/[|।॥]/g, ". ")
            .replace(/\n+/g, " ")
            .replace(/\s+/g, " ")
            .replace(/[,;:]/g, "")
            .trim();
        return cleaned;
    };

    const fetchAudioChunk = useCallback(async (text, index, lang) => {
        if (!text || text.trim().length <= 1) return null;
        
        try {
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
            const response = await fetch(`${apiUrl}/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text: text, 
                    lang: lang,
                    voiceId: "pNInz6ovhh93LU4LcVNo" 
                })
            });

            if (!response.ok) throw new Error(`TTS Fetch failed: ${response.status}`);
            
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            audioCacheRef.current.set(index, url);
            return url;
        } catch (error) {
            console.error(`❌ Error fetching chunk ${index}:`, error);
            return null;
        }
    }, []);

    const processInternalQueue = useCallback(async () => {
        if (internalQueueRef.current.length === 0) {
            setIsAvatarSpeaking(false);
            isTtsProcessingRef.current = false;
            setIsTtsLoading(false);
            setMouthValue(0);
            setCurrentExpression("neutral");
            
            audioCacheRef.current.forEach(url => URL.revokeObjectURL(url));
            audioCacheRef.current.clear();
            return;
        }

        isTtsProcessingRef.current = true;
        const currentItem = internalQueueRef.current[0];
        const { index, text } = currentItem;
        const lang = currentLanguageRef.current;

        let url = audioCacheRef.current.get(index);
        let attempts = 0;
        
        if (!url) {
            setIsTtsLoading(true);
            while (!url && attempts < 50) {
                await new Promise(r => setTimeout(r, 100));
                url = audioCacheRef.current.get(index);
                attempts++;
            }
        }

        if (!url) {
            console.warn(`⚠️ Chunk ${index} timed out, attempting browser fallback...`);
            
            const utterance = new SpeechSynthesisUtterance(text);
            utteranceRef.current = utterance;
            const voice = getBestVoiceForLang(lang);
            if (voice) {
                utterance.voice = voice;
                utterance.lang = voice.lang;
            }
            
            utterance.onstart = () => {
                setIsAvatarSpeaking(true);
                if (!mouthAnimationFrameRef.current) {
                    mouthAnimationFrameRef.current = requestAnimationFrame(animateMouth);
                }
            };
            
            utterance.onend = () => {
                internalQueueRef.current.shift();
                processInternalQueue();
            };
            
            window.speechSynthesis.speak(utterance);
            return;
        }

        setIsTtsLoading(false);

        try {
            const audio = new Audio(url);
            audioRef.current = audio;

            audio.onplay = () => {
                setIsAvatarSpeaking(true);
                if (!mouthAnimationFrameRef.current) {
                    mouthAnimationFrameRef.current = requestAnimationFrame(animateMouth);
                }
                setCurrentExpression("happy");
            };

            audio.onended = () => {
                internalQueueRef.current.shift();
                processInternalQueue();
            };

            await audio.play();
        } catch (error) {
            console.error("❌ Audio playback error:", error);
            internalQueueRef.current.shift();
            processInternalQueue();
        }
    }, [animateMouth, getBestVoiceForLang]);

    const speakMessage = useCallback((text) => {
        if (!text) return;
        
        stopSpeaking();
        
        setTimeout(() => {
            const lang = currentLanguageRef.current;
            const rawChunks = text.match(/[^.!?|।\n?？।]+([.!?|।\n?？/]|$)/g) || [text];
            const refinedChunks = [];

            for (let i = 0; i < rawChunks.length; i++) {
                let chunk = rawChunks[i].trim();
                // Join small things like "1." with following text
                if (chunk.match(/^\d+[\.।]?$/) && i + 1 < rawChunks.length) {
                    refinedChunks.push(chunk + " " + rawChunks[i + 1].trim());
                    i++;
                } else if (chunk.length > 1) {
                    refinedChunks.push(chunk);
                }
            }

            // Trigger parallel fetching for all chunks
            refinedChunks.forEach((chunk, i) => {
                const index = Date.now() + i;
                internalQueueRef.current.push({ index, text: chunk });
                fetchAudioChunk(chunk, index, lang);
            });

            if (internalQueueRef.current.length > 0) {
                processInternalQueue();
            }
        }, 300);
    }, [fetchAudioChunk, processInternalQueue, stopSpeaking]);

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
                { 
                    message: messageText, 
                    sessionId, 
                    language: currentLanguage, 
                    use_rag: !!loadedDocument,
                    context: loadedDocument ? `Uploaded Document: ${loadedDocument.name}` : null
                },
                (chunk) => {
                    fullContent += chunk;

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
                        setMessages((prevMessages) => {
                            const newMessages = [...prevMessages];
                            const index = newMessages.findLastIndex(msg => msg.isStreaming);
                            if (index !== -1 && (newMessages[index].content === "" || newMessages[index].content.includes("..."))) {
                                newMessages[index] = { ...newMessages[index], content: "*(ఆలోచిస్తున్నాను... Generating response...)*" };
                            }
                            return newMessages;
                        });
                    }
                },
                async (data) => {
                    let finalResponse = fullContent || data.fullResponse;

                    if (currentLanguage !== 'en' && finalResponse) {
                        try {
                            let translatedSoFar = "";
                            const translated = await translationService.translate(finalResponse, currentLanguage, (chunk) => {
                                translatedSoFar += chunk;
                                setMessages((prev) => {
                                    const newMessages = [...prev];
                                    const index = newMessages.findLastIndex(msg => msg.role === "assistant");
                                    if (index !== -1) {
                                        newMessages[index] = { ...newMessages[index], content: translatedSoFar };
                                    }
                                    return newMessages;
                                });
                            });
                            if (translated) finalResponse = translated;
                        } catch (err) {
                            console.error("❌ Translation sequence failed:", err);
                        }
                    }

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
                    
                    if (finalResponse) {
                        speakMessage(cleanTextForTTS(finalResponse));
                    }
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

        if (isAvatarSpeaking) return;

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
                    className={`chat-avatar-header ${(isAvatarSpeaking || loading || isTtsLoading) ? 'speaking' : ''} ${isTtsLoading ? 'tts-loading' : ''}`}
                    onClick={() => {
                        if (loading) handleStopResponse();
                        else if (isAvatarSpeaking) stopSpeaking();
                    }}
                >
                    <div className="avatar-canvas-container">
                        <Canvas camera={{ position: [0, 1.6, 5.5], fov: 15 }} style={{ width: '100%', height: '100%' }}>
                            <ambientLight intensity={0.8} />
                            <directionalLight position={[0, 5, 5]} intensity={1} />
                            <LipSyncAvatar url="/avatar1.glb" animation="idle" mouthValue={mouthValue} expression={currentExpression} gesture="none" position={[0, -4, 0]} scale={2.5} />
                        </Canvas>
                    </div>
                </div>

                <div className="chat-content">
                    <div className="chat-header">
                        <div className="chat-header-left">
                            <span className="chat-header-icon"><Bot size={28} /></span>
                            <div className="chat-header-content">
                                <h3>AI Educational Tutor</h3>
                                <p className="chat-header-subtitle">Interactive Learning Assistant</p>
                            </div>
                        </div>
                        <div className="chat-header-center">
                            {(loading || isTtsLoading) && (
                                <div className="speaking-control">
                                    <span className="speaking-indicator">
                                        {loading ? <Zap size={16} /> : <Volume2 size={16} />} 
                                        {loading ? "Generating..." : "Processing Voice..."}
                                    </span>
                                    <button onClick={handleStopResponse} className="btn-stop-speaking" title="Stop"><Square size={16} /> Stop</button>
                                </div>
                            )}
                            {isAvatarSpeaking && (
                                <div className="speaking-control">
                                    <span className="speaking-indicator">
                                        <div className="sound-wave">
                                            <span></span><span></span><span></span><span></span>
                                        </div> 
                                        Speaking...
                                    </span>
                                    <button onClick={stopSpeaking} className="btn-stop-speaking" title="Stop"><Square size={16} /> Stop</button>
                                </div>
                            )}
                        </div>
                        <div className="chat-header-right">
                            <LanguageSelector currentLanguage={currentLanguage} onLanguageChange={handleLanguageChange} supportedLanguages={translationService.getSupportedLanguages()} />
                            <button onClick={handleNewChat} className="btn-new-chat">
                                <Sparkles size={16} />
                                <span>New Chat</span>
                                <RefreshCw size={14} className="btn-new-chat-icon" />
                            </button>
                        </div>
                    </div>

                    <div className="chat-messages">
                        {messages.map((msg, index) => (
                            <div key={index} className={`message ${msg.role === 'user' ? 'user-message' : 'avatar-message'} ${isAvatarSpeaking && index === messages.findLastIndex(m => m.role === 'assistant') ? 'speaking' : ''}`}>
                                <div className="message-avatar">{msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}</div>
                                <div className="message-content">
                                    <div className="message-text">{msg.content}</div>
                                    <div className="message-footer">
                                        <div className="message-time">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                                        {msg.role === 'assistant' && msg.content && !msg.isStreaming && (
                                            <button className="read-again-button" onClick={() => handleReadAgain(msg.content)} disabled={isAvatarSpeaking}>
                                                <Volume2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="message avatar-message">
                                <div className="message-avatar"><Bot size={20} /></div>
                                <div className="typing-indicator"><span></span><span></span><span></span></div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="chat-input-form" onSubmit={handleFormSubmit}>
                        <input type="text" className="chat-input" placeholder="Type your message..." value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} disabled={loading} />
                        <button type="button" className={`voice-input-button ${isListening ? 'listening' : ''}`} onClick={toggleVoiceListening} disabled={loading || isAvatarSpeaking || !isVoiceSupported}>
                            {isListening ? (
                                <div className="sound-wave">
                                    <span></span><span></span><span></span><span></span>
                                </div>
                            ) : <Mic size={18} />}
                        </button>
                        <button type="submit" className="send-button" disabled={loading || !inputMessage.trim()}>{loading ? <Clock size={18} /> : <Send size={18} />}</button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ChatWithAvatar;
