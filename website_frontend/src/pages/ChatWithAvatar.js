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

    // Maintain a ref for handleSendMessage to avoid re-initializing speech recognition
    const handleSendMessageRef = useRef(null);

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

    const cleanTextForTTS = (text) => {
        if (!text) return "";
        return text
            .replace(/```[\s\S]*?```/g, " [code] ") // Skip code blocks
            .replace(/[*_~`#]/g, "") // Remove markdown
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Simplify links
            .replace(/\n+/g, ". ") // Better pauses
            .replace(/\.\.+/g, ".") // Clean ellipses
            .trim();
    };

    const stopSpeaking = useCallback(() => {
        isTtsProcessingRef.current = false;
        internalQueueRef.current = [];

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();

            if (mouthAnimationFrameRef.current) {
                cancelAnimationFrame(mouthAnimationFrameRef.current);
                mouthAnimationFrameRef.current = null;
            }

            setMouthValue(0);
            setIsAvatarSpeaking(false);
            utteranceRef.current = null;
        }
    }, []);

    const animateMouth = useCallback(() => {
        if (!isTtsProcessingRef.current && !window.speechSynthesis.speaking) {
            setMouthValue(0);
            return;
        }
        const now = Date.now();
        const intensity = Math.max(0.08, Math.min(0.5, 0.25 + Math.sin(now * 0.02) * 0.15 + Math.sin(now * 0.008) * 0.2 + Math.sin(now * 0.003) * 0.1 + (Math.random() - 0.5) * 0.04));
        setMouthValue(intensity);
        mouthAnimationFrameRef.current = requestAnimationFrame(animateMouth);
    }, []);

    const processInternalQueue = useCallback(() => {
        if (internalQueueRef.current.length === 0) {
            setIsAvatarSpeaking(false);
            isTtsProcessingRef.current = false;
            setMouthValue(0);
            return;
        }

        const text = internalQueueRef.current.shift();
        if (!text) {
            processInternalQueue();
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;
        const langMap = {
            'en': 'en-US',
            'hi': 'hi-IN',
            'ta': 'ta-IN',
            'te': 'te-IN',
            'kn': 'kn-IN',
            'ml': 'ml-IN',
            'bn': 'bn-IN',
            'mr': 'mr-IN',
            'gu': 'gu-IN',
            'pa': 'pa-IN'
        };
        utterance.lang = langMap[currentLanguage] || 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        isTtsProcessingRef.current = true;
        setIsAvatarSpeaking(true);

        utterance.onstart = () => {
            if (!mouthAnimationFrameRef.current) {
                mouthAnimationFrameRef.current = requestAnimationFrame(animateMouth);
            }
        };

        utterance.onend = () => {
            processInternalQueue();
        };

        utterance.onerror = (e) => {
            console.error("Speech chunk error:", e);
            processInternalQueue();
        };

        window.speechSynthesis.speak(utterance);
    }, [currentLanguage, animateMouth]);

    const speakMessage = useCallback((text) => {
        if (!text || !('speechSynthesis' in window)) return;
        
        window.speechSynthesis.cancel();
        
        setTimeout(() => {
            const chunks = text.match(/[^.!?\n]+[.!?\n]?/g) || [text];
            internalQueueRef.current = chunks.map(c => c.trim()).filter(c => c.length > 0);
            processInternalQueue();
        }, 200);
    }, [processInternalQueue]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        if (location.state?.uploadedDocument) {
            const doc = location.state.uploadedDocument;
            setMessages(prev => {
                const alreadyAdded = prev.some(m => m.isSystemMessage && m.content.includes(doc.name));
                if (alreadyAdded) return prev;
                setLoadedDocument(doc);
                return [...prev, {
                    role: 'assistant',
                    content: `📄 ${doc.message}`,
                    timestamp: new Date(),
                    isSystemMessage: true
                }];
            });
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const handleSendMessage = useCallback(async (messageText) => {
        if (!messageText.trim() || loading) return;

        handleStopResponse();
        if (isAvatarSpeaking) stopSpeaking();
        
        const userMessage = {
            role: "user",
            content: messageText,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputMessage("");
        setLoading(true);

        const streamingMessage = {
            role: "assistant",
            content: "",
            timestamp: new Date(),
            isStreaming: true,
        };
        setMessages((prev) => [...prev, streamingMessage]);

        try {
            let fullContent = "";
            let messageIndex = null;
            abortControllerRef.current = new AbortController();

            await chatAPI.streamMessage(
                {
                    message: messageText,
                    sessionId,
                    language: currentLanguage,
                    use_rag: !!loadedDocument 
                },
                (chunk) => {
                    fullContent += chunk;
                    setMessages((prev) => {
                        if (messageIndex === null) {
                            messageIndex = prev.length - 1;
                        }
                        const newMessages = [...prev];
                        if (newMessages[messageIndex]) {
                            newMessages[messageIndex] = {
                                ...newMessages[messageIndex],
                                content: fullContent,
                            };
                        }
                        return newMessages;
                    });
                },
                (data) => {
                    const finalResponse = fullContent || data.fullResponse;
                    setMessages((prev) => {
                        const newMessages = [...prev];
                        const finalIndex = messageIndex !== null ? messageIndex : prev.length - 1;
                        if (newMessages[finalIndex]) {
                            newMessages[finalIndex] = {
                                role: "assistant",
                                content: finalResponse,
                                timestamp: new Date(),
                                isStreaming: false,
                            };
                        }
                        return newMessages;
                    });

                    if (!sessionId && data.sessionId) {
                        setSessionId(data.sessionId);
                    }
                    setLoading(false);
                },
                (error) => {
                    console.error("Stream error:", error);
                    setMessages((prev) => {
                        const newMessages = [...prev];
                        const errorIndex = messageIndex !== null ? messageIndex : prev.length - 1;
                        if (newMessages[errorIndex]) {
                            newMessages[errorIndex] = {
                                role: "assistant",
                                content: "Sorry, I encountered an error. Please try again.",
                                timestamp: new Date(),
                                isError: true,
                                isStreaming: false,
                            };
                        }
                        return newMessages;
                    });
                    setLoading(false);
                },
                abortControllerRef.current.signal
            );
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => {
                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                const errorMsg = {
                    role: "assistant",
                    content: "Sorry, I encountered an error. Please try again.",
                    timestamp: new Date(),
                    isError: true,
                };
                if (newMessages[lastIndex] && newMessages[lastIndex].isStreaming) {
                    newMessages[lastIndex] = errorMsg;
                } else {
                    newMessages.push(errorMsg);
                }
                return newMessages;
            });
            setLoading(false);
        }
    }, [loading, sessionId, currentLanguage, loadedDocument, handleStopResponse, isAvatarSpeaking, stopSpeaking]);

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
            recognitionRef.current.lang = currentLanguage === 'en' ? 'en-US' : 'hi-IN';

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
