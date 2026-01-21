import React, { useState, useRef, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { chatAPI } from "../services/api";
import LanguageSelector from "../components/LanguageSelector";
import LipSyncAvatar from "../components/LipSyncAvatar";
import translationService from "../services/translationService";
import "../styles/PDFViewer.css";

function PDFViewer() {
    const { subjectId, chapterId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { chapter, subject } = location.state || {};

    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hello! I\'m here to help you understand this chapter. Feel free to ask me any questions!',
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
    const [timeSpent, setTimeSpent] = useState(0); // Track time in seconds
    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);
    const timeTrackingRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Track time spent on chapter using Refs to avoid re-render issues
    const timeSpentRef = useRef(0);
    const lastSavedTimeRef = useRef(0);

    useEffect(() => {
        // Start tracking time
        timeTrackingRef.current = setInterval(() => {
            timeSpentRef.current += 1;
            // Optional: Update state only for UI display if needed, but throttle it
            if (timeSpentRef.current % 60 === 0) {
                setTimeSpent(timeSpentRef.current);
            }
        }, 1000);

        // Save progress every 10 seconds (more frequent updates)
        const saveInterval = setInterval(async () => {
            const currentTime = timeSpentRef.current;
            const deltaSeconds = currentTime - lastSavedTimeRef.current;

            if (deltaSeconds > 0 && chapter && subject) {
                try {
                    const token = localStorage.getItem("token");
                    // Send fractional minutes (e.g., 0.5 minutes for 30s)
                    const minutesToSend = deltaSeconds / 60;

                    await fetch("http://localhost:5000/api/progress/update", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            subjectId: parseInt(subjectId),
                            subjectName: subject.name,
                            chapterId: parseInt(chapterId),
                            chapterName: chapter.title || chapter.name,
                            timeSpent: minutesToSend,
                        }),
                    });

                    lastSavedTimeRef.current = currentTime;
                } catch (error) {
                    console.error("Error saving progress:", error);
                }
            }
        }, 10000); // Save every 10 seconds

        // Cleanup on unmount
        return () => {
            clearInterval(timeTrackingRef.current);
            clearInterval(saveInterval);

            // Final save when leaving page
            const currentTime = timeSpentRef.current;
            const deltaSeconds = currentTime - lastSavedTimeRef.current;

            if (deltaSeconds > 0 && chapter && subject) {
                const token = localStorage.getItem("token");
                // Send fractional minutes
                const minutesToSend = deltaSeconds / 60;

                fetch("http://localhost:5000/api/progress/update", {
                    method: "POST", // Keep-alive or standard POST
                    keepalive: true, // Important for updates during unmount
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        subjectId: parseInt(subjectId),
                        subjectName: subject.name,
                        chapterId: parseInt(chapterId),
                        chapterName: chapter.title || chapter.name,
                        timeSpent: minutesToSend,
                    }),
                }).catch(err => console.error("Error saving final progress:", err));
            }
        };
    }, []); // Empty dependency array ensures intervals are stable

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

        try {
            const response = await chatAPI.sendMessage({
                message: messageText,
                sessionId,
                language: currentLanguage,
                context: `Subject: ${subject?.name}, Chapter: ${chapter?.title}`
            });

            const aiMessage = {
                role: "assistant",
                content: response.data.response,
                timestamp: new Date(),
                audioUrl: response.data.audioUrl,
            };

            setMessages((prev) => [...prev, aiMessage]);

            if (!sessionId) {
                setSessionId(response.data.sessionId);
            }

            if (response.data.audioUrl) {
                const audio = new Audio(response.data.audioUrl);
                audio.play().catch((err) => console.error("Audio play error:", err));
            }
        } catch (error) {
            console.error("Chat error:", error);

            const errorMessage = {
                role: "assistant",
                content: "Sorry, I encountered an error. Please try again.",
                timestamp: new Date(),
                isError: true,
            };

            setMessages((prev) => [...prev, errorMessage]);
        } finally {
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
        const langName = translationService.getLanguageName(language);
        const systemMsg = {
            role: 'assistant',
            content: `Language changed to ${langName}. I will now respond in ${langName}.`,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, systemMsg]);
    };

    const handleReadAgain = (message) => {
        if (isAvatarSpeaking) return;

        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang = currentLanguage === 'en' ? 'en-US' : 'hi-IN';

            let mouthAnimationFrame = null;

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

    const handleBack = () => {
        navigate(`/subjects/${subjectId}/chapters`);
    };

    if (!chapter || !subject) {
        return (
            <div className="pdf-viewer-container">
                <div className="error-message">
                    <h2>Chapter not found</h2>
                    <button onClick={() => navigate('/dashboard')} className="btn-back">
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="pdf-viewer-container">
            <div className="pdf-viewer-header">
                <button onClick={handleBack} className="back-button">
                    ← Back to Chapters
                </button>
                <div className="chapter-info-header">
                    <span className="subject-badge" style={{ background: subject.color }}>
                        {subject.icon} {subject.name}
                    </span>
                    <h2>{chapter.title}</h2>
                </div>
            </div>

            <div className="pdf-viewer-content">
                {/* PDF Section - Left Side */}
                <div className="pdf-section">
                    <div className="pdf-container">
                        {chapter.pdfUrl ? (
                            <iframe
                                src={chapter.pdfUrl}
                                title={chapter.title || chapter.name}
                                className="pdf-iframe"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    border: 'none',
                                    borderRadius: '12px'
                                }}
                            />
                        ) : (
                            <div className="pdf-placeholder">
                                <div className="pdf-icon">📄</div>
                                <h3>No PDF Available</h3>
                                <p>PDF for "{chapter.title || chapter.name}" is not available yet.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chatbot Section - Right Side */}
                <div className="chatbot-section">
                    <div className="chat-interface-pdf">
                        {/* Avatar Header */}
                        <div className="chat-avatar-header-pdf">
                            <div className="avatar-canvas-container-pdf">
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

                        {/* Chat Content */}
                        <div className="chat-content-pdf">
                            <LanguageSelector
                                currentLanguage={currentLanguage}
                                onLanguageChange={handleLanguageChange}
                                supportedLanguages={translationService.getSupportedLanguages()}
                            />

                            <div className="chat-header-pdf">
                                <h3>Ask Questions</h3>
                                {isAvatarSpeaking && (
                                    <span className="speaking-indicator">🎤 Speaking...</span>
                                )}
                            </div>

                            <div className="chat-messages-pdf">
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

                            <form className="chat-input-form-pdf" onSubmit={handleFormSubmit}>
                                <input
                                    type="text"
                                    className="chat-input-pdf"
                                    placeholder="Ask about this chapter..."
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
                                    className="send-button-pdf"
                                    disabled={loading || !inputMessage.trim()}
                                >
                                    {loading ? '⏳' : '📤'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PDFViewer;
