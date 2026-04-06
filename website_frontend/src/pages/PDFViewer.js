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
    FileText, Mic, StopCircle, User, Bot,
    Volume2, Square, Send
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
    const abortControllerRef = useRef(null);
    const timeTrackingRef = useRef(null);
    const mouthAnimationFrameRef = useRef(null);
    const utteranceRef = useRef(null);

    const internalQueueRef = useRef([]);
    const sentenceBufferRef = useRef("");
    const isAvatarSpeakingRef = useRef(false);
    const handleSendMessageRef = useRef(null);


    const cleanTextForTTS = (text) => {
        if (!text) return "";
        return text
            .replace(/```[\s\S]*?```/g, " [code] ")
            .replace(/[*_~`#]/g, "")
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
            .replace(/\n+/g, ". ")
            .replace(/\.\.+/g, ".")
            .replace(/[,;:]/g, "") // Remove commas and other punctuation that cause mid-sentence pauses
            .trim();
    };

    const animateMouth = useCallback(() => {
        if (!window.speechSynthesis.speaking && !isAvatarSpeakingRef.current) {
            setMouthValue(0);
            mouthAnimationFrameRef.current = null;
            return;
        }
        const now = Date.now();
        let intensity = 0.25 + Math.sin(now * 0.02) * 0.15 + Math.sin(now * 0.008) * 0.2 + (Math.random() - 0.5) * 0.04;
        setMouthValue(Math.max(0.08, Math.min(0.5, intensity)));
        mouthAnimationFrameRef.current = requestAnimationFrame(animateMouth);
    }, []);

    const stopSpeaking = useCallback(() => {
        isAvatarSpeakingRef.current = false;
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

    const speakWithElevenLabs = useCallback(async (text, lang) => {
        try {
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
            const response = await fetch(`${apiUrl}/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text, voiceId: "pNInz6ovhh93LU4LcVNo" })
            });

            if (!response.ok) throw new Error(`TTS Server Error: ${response.status}`);

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            
            return new Promise((resolve, reject) => {
                audio.onplay = () => {
                    isAvatarSpeakingRef.current = true;
                    setIsAvatarSpeaking(true);
                    if (!mouthAnimationFrameRef.current) {
                        mouthAnimationFrameRef.current = requestAnimationFrame(animateMouth);
                    }
                };
                audio.onended = () => {
                    URL.revokeObjectURL(url);
                    resolve();
                };
                audio.onerror = reject;
                audio.play().catch(reject);
            });
        } catch (error) {
            console.error("ElevenLabs error:", error);
            throw error;
        }
    }, [animateMouth]);

    const processInternalQueue = useCallback(async () => {
        if (internalQueueRef.current.length === 0) {
            setIsAvatarSpeaking(false);
            isAvatarSpeakingRef.current = false;
            setMouthValue(0);
            return;
        }

        const text = internalQueueRef.current.shift();
        if (!text || text.trim().length <= 1) {
            processInternalQueue();
            return;
        }

        const lang = currentLanguage;

        // Try high-quality backend TTS (OpenAI/ElevenLabs) first
        try {
            await speakWithElevenLabs(text, lang);
            processInternalQueue();
            return;
        } catch (err) {
            console.warn("Falling back to browser TTS:", err);
        }

        // Browser Fallback
        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;
        
        // Voice selection for better local quality
        const voices = window.speechSynthesis.getVoices();
        const selectedVoice = voices.find(v => (lang === 'en' && v.lang.includes('en-US') && v.name.includes('Natural')));
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.lang = lang === 'en' ? 'en-US' : 'hi-IN';

        utterance.onstart = () => {
            isAvatarSpeakingRef.current = true;
            setIsAvatarSpeaking(true);
            if (!mouthAnimationFrameRef.current) {
                mouthAnimationFrameRef.current = requestAnimationFrame(animateMouth);
            }
        };

        utterance.onend = () => {
            processInternalQueue();
        };

        utterance.onerror = () => {
            processInternalQueue();
        };

        window.speechSynthesis.speak(utterance);
    }, [currentLanguage, animateMouth, speakWithElevenLabs]);

    const handleStopResponse = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setLoading(false);
    }, []);

    const speakSegment = useCallback((text) => {
        if (!text || !('speechSynthesis' in window)) return;
        const chunks = text.match(/[^.!?\n]+[.!?\n]?/g) || [text];
        const cleaned = chunks.map(c => c.trim()).filter(c => c.length > 0);
        internalQueueRef.current.push(...cleaned);

        if (!isAvatarSpeakingRef.current) {
            processInternalQueue();
        }
    }, [processInternalQueue]);

    const speakMessage = useCallback((text) => {
        if (!text || !('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        setTimeout(() => {
            const chunks = text.match(/[^.!?\n]+[.!?\n]?/g) || [text];
            internalQueueRef.current = chunks.map(c => c.trim()).filter(c => c.length > 0);
            processInternalQueue();
        }, 200);
    }, [processInternalQueue]);

    const unlockTTS = useCallback(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const unlockUtterance = new SpeechSynthesisUtterance(" ");
            unlockUtterance.volume = 0;
            window.speechSynthesis.speak(unlockUtterance);
        }
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);



    // Pre-load voices for better reliability in Chrome
    useEffect(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
            }
        }
    }, []);

    const [currentChapter, setCurrentChapter] = useState(chapter);
    const [currentSubject, setCurrentSubject] = useState(subject);
    const [viewMode, setViewMode] = useState('pdf'); // 'pdf' or 'chat' for mobile

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

        // Stop current speech and state when sending a new message
        stopSpeaking();
        handleStopResponse();
        unlockTTS();
        isAvatarSpeakingRef.current = false; // Force reset to allow new response to trigger
        sentenceBufferRef.current = ""; // Reset buffer

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
                    sentenceBufferRef.current += chunk;

                    // Update UI only - Removed automatic speech
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

                    // Final cleanup: stop streaming state
                    setLoading(false);
                    abortControllerRef.current = null;
                    sentenceBufferRef.current = "";
                    setMessages(prev => {
                        const next = [...prev];
                        const last = next[next.length - 1];
                        if (last && last.role === 'assistant') {
                            last.isStreaming = false;
                        }
                        return next;
                    });

                    if (fullContent.includes("[EXPRESSION:")) {
                        const match = fullContent.match(/\[EXPRESSION:\s*(\w+)\]/);
                        if (match?.[1]) setCurrentExpression(match[1].toLowerCase());
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
    }, [loading, sessionId, currentLanguage, currentSubject, currentChapter, stopSpeaking, unlockTTS, handleStopResponse, speakSegment]);

    useEffect(() => {
        handleSendMessageRef.current = handleSendMessage;
    }, [handleSendMessage]);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

        // Disable mic usage if avatar is speaking to prevent overlapping
        if (isAvatarSpeaking) {
            console.log("Mic disabled while avatar is speaking");
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
        const translatedMsg = translationService.getLanguageChangeMessage(language);
        const systemMsg = {
            role: 'assistant',
            content: translatedMsg,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, systemMsg]);
    };





    const handleReadAgain = (message) => {
        speakMessage(cleanTextForTTS(message));
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
        <div className={`pdf-viewer-container view-mode-${viewMode}`}>
            <div className="pdf-viewer-header">
                <div className="chapter-info-header">
                    <button onClick={() => navigate(-1)} className="back-button">Back</button>
                    <h2>{currentChapter.name || currentChapter.title}</h2>
                </div>
            </div>

            <div className="mobile-view-toggle">
                <button 
                    className={`view-toggle-btn ${viewMode === 'pdf' ? 'active' : ''}`}
                    onClick={() => setViewMode('pdf')}
                >
                    Textbook
                </button>
                <button 
                    className={`view-toggle-btn ${viewMode === 'chat' ? 'active' : ''}`}
                    onClick={() => setViewMode('chat')}
                >
                    AI Chat
                </button>
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
                            className={`chat-avatar-header-pdf ${(isAvatarSpeaking || loading) ? 'speaking' : ''}`}
                            onClick={() => {
                                if (loading) handleStopResponse();
                                else if (isAvatarSpeaking) stopSpeaking();
                            }}
                            title={(isAvatarSpeaking || loading) ? "Click to stop" : ""}
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
                                            Stop <StopCircle size={14} />
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
                                            {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
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
                                        <div className="message-avatar"><Bot size={16} /></div>
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
                                    {isListening ? <Mic size={20} className="animate-pulse" /> : <Mic size={20} />}
                                </button>
                                {loading ? (
                                    <button
                                        type="button"
                                        className="stop-button-pdf"
                                        onClick={handleStopResponse}
                                        title="Stop generating"
                                    >
                                        <Square size={16} />
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
