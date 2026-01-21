import React, { useState, useRef, useEffect } from "react";
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
    const [currentExpression, setCurrentExpression] = useState('neutral');
    const [isListening, setIsListening] = useState(false);
    const [isVoiceSupported, setIsVoiceSupported] = useState(false);
    const [loadedDocument, setLoadedDocument] = useState(null);
    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Check for uploaded document from navigation state
    useEffect(() => {
        if (location.state?.uploadedDocument) {
            const doc = location.state.uploadedDocument;
            setLoadedDocument(doc);

            // Add system message about document loading
            const documentMessage = {
                role: 'assistant',
                content: `📄 ${doc.message}`,
                timestamp: new Date(),
                isSystemMessage: true
            };
            setMessages(prev => [...prev, documentMessage]);

            // Clear the navigation state to prevent re-adding on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // Initialize voice recognition
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
                    handleSendMessage(transcript);
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
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [currentLanguage]);

    const handleSendMessage = async (messageText) => {
        if (!messageText.trim() || loading) return;

        const userMessage = {
            role: "user",
            content: messageText,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputMessage("");
        setLoading(true);

        // Add placeholder for streaming response
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

            await chatAPI.streamMessage(
                {
                    message: messageText,
                    sessionId,
                    language: currentLanguage,
                },
                // onChunk - called for each chunk received
                (chunk) => {
                    fullContent += chunk;
                    setMessages((prev) => {
                        // Get the index of the last message (the streaming one)
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
                // onComplete - called when streaming is done
                (data) => {
                    setMessages((prev) => {
                        const newMessages = [...prev];
                        const finalIndex = messageIndex !== null ? messageIndex : prev.length - 1;
                        if (newMessages[finalIndex]) {
                            newMessages[finalIndex] = {
                                role: "assistant",
                                content: fullContent || data.fullResponse,
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
                // onError - called if streaming fails
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
                }
            );
        } catch (error) {
            console.error("Chat error:", error);

            const errorMessage = {
                role: "assistant",
                content: "Sorry, I encountered an error. Please try again.",
                timestamp: new Date(),
                isError: true,
            };

            setMessages((prev) => {
                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                if (newMessages[lastIndex] && newMessages[lastIndex].isStreaming) {
                    newMessages[lastIndex] = errorMessage;
                } else {
                    newMessages.push(errorMessage);
                }
                return newMessages;
            });

            setLoading(false);
        }
    };

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
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const handleLanguageChange = (language) => {
        setCurrentLanguage(language);
        console.log('Language changed to:', language);

        const langName = translationService.getLanguageName(language);
        const systemMsg = {
            role: 'assistant',
            content: `Language changed to ${langName}. I will now respond in ${langName}.`,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, systemMsg]);
    };

    const handleReadAgain = (message) => {
        if (isAvatarSpeaking) {
            console.log('Avatar is already speaking');
            return;
        }

        // Use Web Speech API to read the message
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang = currentLanguage === 'en' ? 'en-US' : 'hi-IN';

            let mouthAnimationFrame = null;

            // Animate mouth while speaking
            const animateMouth = () => {
                const now = Date.now();
                const fast = Math.sin(now * 0.02) * 0.15;
                const medium = Math.sin(now * 0.008) * 0.2;
                const slow = Math.sin(now * 0.003) * 0.1;
                const microVariation = (Math.random() - 0.5) * 0.04;

                let intensity = 0.25 + fast + medium + slow + microVariation;
                intensity = Math.max(0.08, Math.min(0.5, intensity));
                setMouthValue(intensity);
                mouthAnimationFrame = requestAnimationFrame(animateMouth);
            };

            utterance.onstart = () => {
                setIsAvatarSpeaking(true);
                mouthAnimationFrame = requestAnimationFrame(animateMouth);
            };

            utterance.onend = () => {
                if (mouthAnimationFrame) {
                    cancelAnimationFrame(mouthAnimationFrame);
                }
                // Gradually close mouth
                let closeValue = mouthValue;
                const closeInterval = setInterval(() => {
                    closeValue *= 0.7;
                    setMouthValue(closeValue);
                    if (closeValue < 0.05) {
                        clearInterval(closeInterval);
                        setMouthValue(0);
                    }
                }, 30);
                setIsAvatarSpeaking(false);
            };

            window.speechSynthesis.speak(utterance);
        }
    };

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

    return (
        <div className="chat-page">
            <div className="chat-interface">
                {/* Avatar Header - Top 30% */}
                <div className="chat-avatar-header">
                    <div className="avatar-canvas-container">
                        <Canvas
                            camera={{
                                position: [0, 1.6, 5.5],
                                fov: 15
                            }}
                            style={{
                                width: '100%',
                                height: '100%',
                                background: 'transparent'
                            }}
                        >
                            <ambientLight intensity={0.8} />
                            <directionalLight position={[0, 5, 5]} intensity={1} />

                            <LipSyncAvatar
                                url="/avatar1.glb"
                                animation="idle"
                                mouthValue={mouthValue}
                                expression={currentExpression}
                                gesture="none"
                                position={[0, -4, 0]}
                                scale={2.5}
                            />
                        </Canvas>
                    </div>
                    <div className="avatar-background-blur"></div>
                </div>

                {/* Chat Content - Bottom 70% */}
                <div className="chat-content">
                    {/* Language Selector */}
                    <LanguageSelector
                        currentLanguage={currentLanguage}
                        onLanguageChange={handleLanguageChange}
                        supportedLanguages={translationService.getSupportedLanguages()}
                    />

                    <div className="chat-header">
                        <h3>
                            <span className="chat-header-icon">🤖</span>
                            AI Educational Tutor
                        </h3>
                        {isAvatarSpeaking && (
                            <span className="speaking-indicator">🎤 Speaking...</span>
                        )}
                        <button onClick={handleNewChat} className="btn-new-chat">
                            New Chat
                        </button>
                    </div>

                    <div className="chat-messages">
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`message ${msg.role === 'user' ? 'user-message' : 'avatar-message'}`}
                            >
                                <div className="message-avatar">
                                    {msg.role === 'user' ? '👤' : '🤖'}
                                </div>
                                <div className="message-content">
                                    <div className="message-text">{msg.content}</div>
                                    <div className="message-footer">
                                        <div className="message-time">
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </div>
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
                                    <div className="typing-indicator">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="chat-input-form" onSubmit={handleFormSubmit}>
                        <input
                            type="text"
                            className="chat-input"
                            placeholder="Type your message..."
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            disabled={loading}
                        />
                        <button
                            type="button"
                            className={`voice-input-button ${isListening ? 'listening' : ''}`}
                            onClick={toggleVoiceListening}
                            disabled={loading || isAvatarSpeaking || !isVoiceSupported}
                            title={!isVoiceSupported ? 'Voice not supported' : isListening ? 'Stop listening' : 'Voice input'}
                        >
                            {isListening ? '🎤' : '🎙️'}
                        </button>
                        <button
                            type="submit"
                            className="send-button"
                            disabled={loading || !inputMessage.trim()}
                        >
                            {loading ? '⏳' : '📤'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ChatWithAvatar;
