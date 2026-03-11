import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getSubjectsForClass } from "../config/syllabus";
import { Canvas } from "@react-three/fiber";
import { chatAPI } from "../services/api";
import LanguageSelector from "../components/LanguageSelector";
import LipSyncAvatar from "../components/LipSyncAvatar";
import translationService from "../services/translationService";
import {
    FileText,
    User,
    Bot,
    Volume2,
    Mic,
    MicOff,
    Square,
    Send,
    Circle,
    ChevronLeft,
    Monitor
} from "lucide-react";
import "../styles/PDFViewer.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function PDFViewer() {
    const { subjectId, chapterId } = useParams();
    const { user } = useAuth();
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
    // Remove visible timeSpent state as timer is removed from UI
    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);
    const timeTrackingRef = useRef(null);
    const abortControllerRef = useRef(null);
    const mouthAnimationFrameRef = useRef(null);
    const utteranceRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const [currentChapter, setCurrentChapter] = useState(chapter);
    const [currentSubject, setCurrentSubject] = useState(subject);

    useEffect(() => {
        // Recover chapter data
        if ((!currentChapter || !currentSubject) && user?.class) {
            const subjects = getSubjectsForClass(user.class);
            const foundSubject = subjects.find(s => s.id === parseInt(subjectId));
            if (foundSubject) {
                const foundChapter = (foundSubject.chapters || []).find(c => c.id === parseInt(chapterId));
                if (foundChapter) {
                    setCurrentSubject(foundSubject);
                    setCurrentChapter(foundChapter);
                }
            }
        }
    }, [user, subjectId, chapterId, currentChapter, currentSubject]);

    // Track time spent on chapter using Refs to avoid re-render issues
    const timeSpentRef = useRef(0);
    const lastSavedTimeRef = useRef(0);

    useEffect(() => {
        if (!user) return;

        // Fetch existing progress to initialize values
        const fetchInitialValue = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${API_BASE_URL}/progress/user`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.success) {
                    const existing = data.progress.find(p => p.chapterId === parseInt(chapterId));
                    if (existing) {
                        const seconds = Math.floor((existing.timeSpent || 0) * 60);
                        timeSpentRef.current = seconds;
                        lastSavedTimeRef.current = seconds;
                    }
                }
            } catch (error) {
                console.error("Error fetching initial progress:", error);
            }
        };

        fetchInitialValue();

        // Start tracking time in background
        timeTrackingRef.current = setInterval(() => {
            timeSpentRef.current += 1;
        }, 1000);

        // Save progress every 15 seconds
        const saveInterval = setInterval(async () => {
            const currentTime = timeSpentRef.current;
            const deltaSeconds = currentTime - lastSavedTimeRef.current;

            if (deltaSeconds >= 5 && currentChapter && currentSubject) {
                try {
                    const token = localStorage.getItem("token");
                    const minutesToSend = deltaSeconds / 60;

                    await fetch(`${API_BASE_URL}/progress/update`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            subjectId: parseInt(subjectId),
                            subjectName: currentSubject.name,
                            chapterId: parseInt(chapterId),
                            chapterName: currentChapter.title || currentChapter.name,
                            timeSpent: minutesToSend,
                        }),
                    });

                    lastSavedTimeRef.current = currentTime;
                } catch (error) {
                    console.error("Error saving progress:", error);
                }
            }
        }, 15000);

        return () => {
            clearInterval(timeTrackingRef.current);
            clearInterval(saveInterval);

            const currentTime = timeSpentRef.current;
            const deltaSeconds = currentTime - lastSavedTimeRef.current;

            if (deltaSeconds > 0 && currentChapter && currentSubject) {
                const token = localStorage.getItem("token");
                const minutesToSend = deltaSeconds / 60;

                fetch(`${API_BASE_URL}/progress/update`, {
                    method: "POST",
                    keepalive: true,
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        subjectId: parseInt(subjectId),
                        subjectName: currentSubject.name,
                        chapterId: parseInt(chapterId),
                        chapterName: currentChapter.title || currentChapter.name,
                        timeSpent: minutesToSend,
                    }),
                }).catch(err => console.error("Error saving final progress:", err));
            }
        };
    }, [user, subjectId, chapterId, currentChapter, currentSubject]);

    const handleSendMessage = useCallback(async (messageText) => {
        if (!messageText.trim() || loading) return;

        // Stop current speech when sending a new message
        if (isAvatarSpeaking) {
            stopSpeaking();
        }

        const userMessage = {
            role: "user",
            content: messageText,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputMessage("");
        setLoading(true);

        // Add a placeholder for the AI response that we will stream into
        const aiPlaceholder = {
            role: "assistant",
            content: "",
            timestamp: new Date(),
            isStreaming: true
        };
        setMessages(prev => [...prev, aiPlaceholder]);

        let fullContent = "";

        // Create new AbortController for this request
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            await chatAPI.streamMessage(
                {
                    message: messageText,
                    sessionId: sessionId,
                    language: currentLanguage,
                    context: `Subject: ${currentSubject?.name}, Chapter: ${currentChapter?.name || currentChapter?.title}`
                },
                (chunk) => {
                    // onChunk callback
                    fullContent += chunk;
                    setMessages(prev => {
                        const next = [...prev];
                        const last = next[next.length - 1];
                        if (last && last.role === 'assistant') {
                            last.content = fullContent;
                        }
                        return next;
                    });
                },
                (data) => {
                    // onComplete callback
                    setLoading(false);
                    abortControllerRef.current = null;
                    if (data.sessionId && !sessionId) {
                        setSessionId(data.sessionId);
                    }

                    // Remove streaming flag
                    setMessages(prev => {
                        const next = [...prev];
                        const last = next[next.length - 1];
                        if (last && last.role === 'assistant') {
                            last.isStreaming = false;
                        }
                        return next;
                    });

                    // Handle expressions if returned
                    if (fullContent.includes('[EXPRESSION:')) {
                        const match = fullContent.match(/\[EXPRESSION:\s*(\w+)\]/);
                        if (match && match[1]) {
                            setCurrentExpression(match[1].toLowerCase());
                        }
                    }
                },
                (error) => {
                    // onError callback
                    console.error("Streaming error:", error);
                    abortControllerRef.current = null;
                    setMessages(prev => {
                        const next = [...prev];
                        next[next.length - 1] = {
                            role: "assistant",
                            content: "Sorry, I encountered an error. Please try again.",
                            timestamp: new Date(),
                            isError: true
                        };
                        return next;
                    });
                    setLoading(false);
                },
                controller.signal
            );
        } catch (error) {
            console.error("Chat setup error:", error);
            abortControllerRef.current = null;
            setLoading(false);
        }
    }, [loading, sessionId, currentLanguage, currentSubject, currentChapter]);

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
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            if (mouthAnimationFrameRef.current) {
                cancelAnimationFrame(mouthAnimationFrameRef.current);
            }
        };
    }, [currentLanguage, handleSendMessage]);



    const handleStopResponse = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
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

        // Stop current speech when starting voice input
        if (!isListening && isAvatarSpeaking) {
            stopSpeaking();
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
        const translatedMsg = translationService.getLanguageChangeMessage(language);
        const systemMsg = {
            role: 'assistant',
            content: translatedMsg,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, systemMsg]);
    };

    const stopSpeaking = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();

            if (mouthAnimationFrameRef.current) {
                cancelAnimationFrame(mouthAnimationFrameRef.current);
                mouthAnimationFrameRef.current = null;
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
            utteranceRef.current = null;
        }
    };

    const handleReadAgain = (message) => {
        if (isAvatarSpeaking) {
            stopSpeaking();
            return;
        }

        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(message);
            utteranceRef.current = utterance;
            utterance.lang = currentLanguage === 'en' ? 'en-US' : 'hi-IN';

            const animateMouth = () => {
                const now = Date.now();
                const fast = Math.sin(now * 0.02) * 0.15;
                const medium = Math.sin(now * 0.008) * 0.2;
                const slow = Math.sin(now * 0.003) * 0.1;
                const microVariation = (Math.random() - 0.5) * 0.04;

                let intensity = 0.25 + fast + medium + slow + microVariation;
                intensity = Math.max(0.08, Math.min(0.5, intensity));
                setMouthValue(intensity);
                mouthAnimationFrameRef.current = requestAnimationFrame(animateMouth);
            };

            utterance.onstart = () => {
                setIsAvatarSpeaking(true);
                mouthAnimationFrameRef.current = requestAnimationFrame(animateMouth);
            };

            utterance.onend = () => {
                if (mouthAnimationFrameRef.current) {
                    cancelAnimationFrame(mouthAnimationFrameRef.current);
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
                utteranceRef.current = null;
            };

            utterance.onerror = () => {
                stopSpeaking();
            };

            window.speechSynthesis.speak(utterance);
        }
    };

    const handleBack = () => {
        navigate(`/subjects/${subjectId}/chapters`);
    };

    if ((!currentChapter || !currentSubject) && !user) {
        return (
            <div className="pdf-viewer-container">
                <div className="error-message">
                    <h2>Loading Chapter...</h2>
                </div>
            </div>
        );
    }

    if (!currentChapter || !currentSubject) {
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
                <button className="back-button" onClick={handleBack} title="Back to chapters">
                    <ChevronLeft size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Back to Chapters
                </button>
                <div className="chapter-info-header">
                    <h2>{currentChapter.name || currentChapter.title}</h2>
                </div>
            </div>

            <div className="pdf-viewer-content">
                {/* PDF Section - Left Side */}
                <div className="pdf-section">
                    <div className="pdf-container">
                        {currentChapter.pdfUrl ? (
                            <iframe
                                src={`${currentChapter.pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                title={currentChapter.name || currentChapter.title}
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
                                <div className="pdf-icon"><FileText size={48} /></div>
                                <h3>No PDF Available</h3>
                                <p>PDF for "{currentChapter.name || currentChapter.title}" is not available yet.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chatbot Section - Right Side */}
                <div className="chatbot-section">
                    <div className="chat-interface-pdf">
                        {/* Avatar Header */}
                        <div
                            className={`chat-avatar-header-pdf ${isAvatarSpeaking ? 'speaking' : ''}`}
                            onClick={isAvatarSpeaking ? stopSpeaking : null}
                            title={isAvatarSpeaking ? "Click to stop speaking" : ""}
                        >
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
                                    <div className="speaking-control-pdf">
                                        <span className="speaking-indicator"><Mic size={14} className="animate-pulse" /> Speaking...</span>
                                        <button onClick={stopSpeaking} className="btn-stop-speaking-pdf" title="Stop speaking">
                                            Stop <Square size={12} fill="currentColor" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="chat-messages-pdf">
                                {messages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`message ${msg.role === 'user' ? 'user-message' : 'avatar-message'}`}
                                    >
                                        <div className="message-avatar">
                                            {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
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
                                                        <Volume2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {loading && (
                                    <div className="message avatar-message">
                                        <div className="message-avatar"><Bot size={14} /></div>
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
                                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                                </button>
                                {loading ? (
                                    <button
                                        type="button"
                                        className="stop-button-pdf"
                                        onClick={handleStopResponse}
                                        title="Stop generating"
                                    >
                                        <Square size={16} fill="currentColor" />
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        className="send-button-pdf"
                                        disabled={loading || !inputMessage.trim()}
                                    >
                                        <Send size={16} />
                                    </button>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PDFViewer;
