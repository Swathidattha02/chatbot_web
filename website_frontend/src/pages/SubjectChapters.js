import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getSubjectsForClass } from "../config/syllabus";
import { Canvas } from "@react-three/fiber";
import { chatAPI } from "../services/api";
import LanguageSelector from "../components/LanguageSelector";
import LipSyncAvatar from "../components/LipSyncAvatar";
import translationService from "../services/translationService";
import QuizModal from "../components/QuizModal";
import { 
    BookOpen, Clock, CheckCircle2, 
    Lock, Timer, Lightbulb, Square, 
    User, Bot, Volume2, Mic, StopCircle, 
    Send, RotateCcw, Target,
    Languages as LanguagesIcon,
    Calculator, Microscope, Dna, Globe, FileText,
    Atom, Beaker, Monitor
} from "lucide-react";
import "../styles/SubjectChapters.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function SubjectChapters() {
    const { subjectId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    // ── Chapters ──────────────────────────────────────────────────
    const [subject, setSubject] = useState(null);
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [quizStatuses, setQuizStatuses] = useState({}); // chapterId -> { passed, bestScore, bestPercentage }
    const [activeQuiz, setActiveQuiz] = useState(null);   // chapter object being quizzed

    // ── Chat (mirrors PDFViewer exactly) ──────────────────────────
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content: "Hello! I'm here to help you with this subject. Ask me anything about the chapters!",
            timestamp: new Date(),
        },
    ]);
    const [inputMessage, setInputMessage] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [currentLanguage, setCurrentLanguage] = useState("en");
    const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
    const [mouthValue, setMouthValue] = useState(0);
    const [currentExpression, setCurrentExpression] = useState("neutral");
    const [isListening, setIsListening] = useState(false);
    const [isVoiceSupported, setIsVoiceSupported] = useState(false);

    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);
    const abortControllerRef = useRef(null);
    const mouthAnimationFrameRef = useRef(null);
    const utteranceRef = useRef(null);
    const internalQueueRef = useRef([]);
    const sentenceBufferRef = useRef("");
    const isAvatarSpeakingRef = useRef(false);
    const handleSendMessageRef = useRef(null);

    const handleStopResponse = useCallback(() => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        setChatLoading(false);
    }, []);

    const fetchQuizStatuses = useCallback(async (chapterList, token) => {
        try {
            const res = await fetch(`${API_BASE_URL}/quiz/subject/${subjectId}`, {
                headers: { Authorization: `Bearer ${token || localStorage.getItem("token")}` },
            });
            const data = await res.json();
            if (data.success) {
                const map = {};
                data.quizzes.forEach((q) => {
                    map[q.chapterId] = { 
                        passed: q.passed, 
                        bestScore: q.score, 
                        bestPercentage: q.percentage,
                        attempts: q.attempts?.length || 0 
                    };
                });
                setQuizStatuses(map);
            }
        } catch { }
    }, [subjectId]);


    const cleanTextForTTS = (text) => {
        if (!text) return "";
        return text
            .replace(/```[\s\S]*?```/g, " [code] ")
            .replace(/[*_~`#]/g, "")
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
            .replace(/\n+/g, ". ")
            .replace(/\.\.+/g, ".")
            .trim();
    };

    // TTS Unlock Utility
    const unlockTTS = useCallback(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const unlockUtterance = new SpeechSynthesisUtterance(" ");
            unlockUtterance.volume = 0;
            window.speechSynthesis.speak(unlockUtterance);
        }
    }, []);

    const stopSpeaking = useCallback(() => {
        isAvatarSpeakingRef.current = false;
        internalQueueRef.current = [];
        if ("speechSynthesis" in window) {
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

    const processInternalQueue = useCallback(() => {
        if (internalQueueRef.current.length === 0) {
            setIsAvatarSpeaking(false);
            isAvatarSpeakingRef.current = false;
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
        utterance.lang = currentLanguage === 'en' ? 'en-US' : 'hi-IN';
        
        const resumeInterval = setInterval(() => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
            } else {
                clearInterval(resumeInterval);
            }
        }, 10000);

        utterance.onstart = () => {
            isAvatarSpeakingRef.current = true;
            setIsAvatarSpeaking(true);
            if (!mouthAnimationFrameRef.current) {
                mouthAnimationFrameRef.current = requestAnimationFrame(animateMouth);
            }
        };

        utterance.onend = () => {
            clearInterval(resumeInterval);
            processInternalQueue();
        };

        utterance.onerror = () => {
            clearInterval(resumeInterval);
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

    // ── Auto scroll ───────────────────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

    // ── Load chapters ─────────────────────────────────────────────
    useEffect(() => {
        const fetchSubjectAndChapters = async () => {
            try {
                if (user?.class) {
                    const subjects = getSubjectsForClass(user.class);
                    const foundSubject = subjects.find((s) => s.id === parseInt(subjectId));
                    if (foundSubject) {
                        const token = localStorage.getItem("token");
                        let progressData = [];
                        try {
                            const res = await fetch(`${API_BASE_URL}/progress/subject/${subjectId}`, {
                                headers: { Authorization: `Bearer ${token}` },
                            });
                            const data = await res.json();
                            if (data.success) progressData = data.progress;
                        } catch { }

                        const chaptersWithProgress = (foundSubject.chapters || []).map((chapter, index) => {
                            const cp = progressData.find((p) => p.chapterId === chapter.id);
                            const timeSpentVal = cp?.timeSpent || 0;
                            const progressPercent = cp
                                ? cp.completed
                                    ? 100
                                    : Math.min(Math.floor((timeSpentVal / 2) * 100), 99)
                                : 0;
                            return {
                                ...chapter,
                                progress: progressPercent,
                                timeSpent: timeSpentVal,
                                isLocked:
                                    index === 0
                                        ? false
                                        : !progressData.find(
                                            (p) => p.chapterId === foundSubject.chapters[index - 1]?.id
                                        )?.completed,
                                requiredTime: 2,
                            };
                        });
                        setSubject(foundSubject);
                        setChapters(chaptersWithProgress);

                        // Fetch quiz statuses for all chapters
                        fetchQuizStatuses(foundSubject.chapters, token);
                    } else {
                        setSubject({ id: parseInt(subjectId), name: "Subject", icon: "📚", color: "#667eea" });
                        setChapters([]);
                    }
                }
                setLoading(false);
            } catch {
                setLoading(false);
            }
        };
        fetchSubjectAndChapters();
    }, [subjectId, user, fetchQuizStatuses]);



    // ── When student passes a quiz → refresh chapters ─────────────
    const handleQuizPassed = (chapterId) => {
        setQuizStatuses((prev) => ({
            ...prev,
            [chapterId]: { 
                ...prev[chapterId], 
                passed: true,
                attempts: (prev[chapterId]?.attempts || 0) + 1
            },
        }));
        // Re-fetch chapters to get updated progress/completion
        setChapters((prev) =>
            prev.map((c) =>
                c.id === chapterId ? { ...c, progress: c.timeSpent >= 2 ? 100 : c.progress } : c
            )
        );
    };

    // ── Send message (same as PDFViewer) ──────────────────────────
    const handleSendMessage = useCallback(
        async (messageText) => {
            if (!messageText.trim() || chatLoading) return;

            stopSpeaking();
            handleStopResponse();
            unlockTTS();
            isAvatarSpeakingRef.current = false;
            sentenceBufferRef.current = "";

            setMessages((prev) => [...prev, { role: "user", content: messageText, timestamp: new Date() }]);
            setInputMessage("");
            setChatLoading(true);

            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "", timestamp: new Date(), isStreaming: true },
            ]);

            let fullContent = "";
            const controller = new AbortController();
            abortControllerRef.current = controller;

            try {
                await chatAPI.streamMessage(
                    {
                        message: messageText,
                        sessionId,
                        language: currentLanguage,
                        context: `Subject: ${subject?.name}`,
                    },
                    (chunk) => {
                        fullContent += chunk;
                        setMessages((prev) => {
                            const next = [...prev];
                            const last = next[next.length - 1];
                            if (last?.role === "assistant") last.content = fullContent;
                            return next;
                        });
                    },
                    (data) => {
                        setChatLoading(false);
                        abortControllerRef.current = null;
                        if (data.sessionId && !sessionId) setSessionId(data.sessionId);
                        
                        setMessages((prev) => {
                            const next = [...prev];
                            const last = next[next.length - 1];
                            if (last?.role === "assistant") last.isStreaming = false;
                            return next;
                        });
                        
                        if (fullContent.includes("[EXPRESSION:")) {
                            const match = fullContent.match(/\[EXPRESSION:\s*(\w+)\]/);
                            if (match?.[1]) setCurrentExpression(match[1].toLowerCase());
                        }
                    },
                    (error) => {
                        console.error("Stream error:", error);
                        abortControllerRef.current = null;
                        setMessages((prev) => {
                            const next = [...prev];
                            next[next.length - 1] = {
                                role: "assistant",
                                content: "Sorry, I encountered an error. Please try again.",
                                timestamp: new Date(),
                            };
                            return next;
                        });
                        setChatLoading(false);
                    },
                    controller.signal
                );
            } catch {
                abortControllerRef.current = null;
                setChatLoading(false);
            }
        },
        [chatLoading, sessionId, currentLanguage, subject, stopSpeaking, unlockTTS, handleStopResponse]
    );

    useEffect(() => {
        handleSendMessageRef.current = handleSendMessage;
    }, [handleSendMessage]);

    // ── Voice recognition (same as PDFViewer) ────────────────────
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            setIsVoiceSupported(true);
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = currentLanguage === "en" ? "en-US" : "hi-IN";
            recognitionRef.current.onresult = (e) => {
                const transcript = e.results[0][0].transcript;
                if (transcript?.trim()) {
                    if (handleSendMessageRef.current) {
                        handleSendMessageRef.current(transcript);
                    }
                }
            };
            recognitionRef.current.onerror = () => setIsListening(false);
            recognitionRef.current.onend = () => setIsListening(false);
        }
        return () => {
            recognitionRef.current?.stop();
            if ("speechSynthesis" in window) window.speechSynthesis.cancel();
            if (mouthAnimationFrameRef.current) cancelAnimationFrame(mouthAnimationFrameRef.current);
        };
    }, [currentLanguage]);

    const handleReadAgain = (message) => {
        speakMessage(cleanTextForTTS(message));
    };



    const handleFormSubmit = (e) => { e.preventDefault(); handleSendMessage(inputMessage); };

    const toggleVoiceListening = () => {
        if (!isVoiceSupported) { alert("Speech recognition not supported. Use Chrome."); return; }
        if (!isListening && isAvatarSpeaking) stopSpeaking();
        if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
        else { recognitionRef.current.start(); setIsListening(true); }
    };

    const handleLanguageChange = (language) => {
        setCurrentLanguage(language);
        setMessages((prev) => [
            ...prev,
            { role: "assistant", content: translationService.getLanguageChangeMessage(language), timestamp: new Date() },
        ]);
    };

    // ── Chapter helpers ───────────────────────────────────────────
    const handleChapterClick = (chapter) => {
        if (chapter.isLocked) { alert("🔒 Complete the previous chapter to unlock this one."); return; }
        navigate(`/subjects/${subjectId}/chapters/${chapter.id}/pdf`, { state: { chapter, subject } });
    };

    const formatTime = (minutes) => {
        const rounded = Math.round(minutes);
        if (rounded < 60) return `${rounded}m`;
        const h = Math.floor(rounded / 60), m = rounded % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    const getChapterStatus = (chapter) => {
        if (chapter.isLocked) return { text: <><Lock size={14} /> Locked</>, className: "status-locked" };
        if (chapter.progress === 100) return { text: <><CheckCircle2 size={14} /> Complete</>, className: "status-complete" };
        if (chapter.progress > 0) return { text: <><Clock size={14} /> In Progress</>, className: "status-in-progress" };
        return { text: <><Square size={14} /> Not Started</>, className: "status-not-started" };
    };

    if (loading) {
        return (
            <div className="chapters-container">
                <div className="loading-spinner-chapters">
                    <div className="spinner"></div>
                    <p>Loading chapters...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chapters-container">
            {/* ── Header ─────────────────────────────────────────── */}
            <div className="chapters-header">
                {subject && (
                    <div className="subject-header-chapters">
                        <div className="subject-header-icon-chapters" style={{ background: subject.color }}>
                            {subject.icon === "📐" ? <Calculator size={32} /> : 
                             subject.icon === "🔬" ? <Microscope size={32} /> :
                             subject.icon === "🧬" ? <Dna size={32} /> :
                             subject.icon === "📚" ? <BookOpen size={32} /> :
                             subject.icon === "🌍" ? <Globe size={32} /> :
                             subject.icon === "🇮🇳" ? <LanguagesIcon size={32} /> :
                             subject.icon === "⚛️" ? <Atom size={32} /> :
                             subject.icon === "🧪" ? <Beaker size={32} /> :
                             subject.icon === "💻" ? <Monitor size={32} /> :
                             <BookOpen size={32} />}
                        </div>
                        <div className="subject-header-info-chapters">
                            <h1>{subject.name}</h1>
                            <p>{chapters.length} Chapters • {chapters.filter((c) => c.progress === 100).length} Completed</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Two-column content ──────────────────────────────── */}
            <div className="chapters-content-grid">
                {/* LEFT: chapter list */}
                <div className="chapters-left-col">
                    <div className="chapters-list-professional">
                        {chapters.map((chapter, index) => {
                            const status = getChapterStatus(chapter);
                            const qStatus = quizStatuses[chapter.id];
                            const quizPassed = qStatus?.passed || false;
                            return (
                                <div key={chapter.id} className="chapter-item-wrap">
                                    {/* Chapter card */}
                                    <div
                                        className={`chapter-card-professional ${chapter.isLocked ? "locked" : ""}`}
                                        onClick={() => handleChapterClick(chapter)}
                                    >
                                        <div className="chapter-left-section">
                                            <div
                                                className={`chapter-number-badge ${chapter.isLocked ? "locked" : ""}`}
                                                style={{ background: chapter.isLocked ? "#cbd5e1" : subject?.color }}
                                            >
                                                {chapter.isLocked ? <Lock size={20} /> : index + 1}
                                            </div>
                                            <div className="chapter-main-info">
                                                <h3 className="chapter-title-professional">{chapter.name || chapter.title}</h3>
                                                <div className="chapter-meta-info">
                                                    <span className="meta-item">
                                                        <span className="meta-icon"><Clock size={12} /></span>
                                                        Total: {formatTime(chapter.timeSpent)}
                                                    </span>
                                                    {!chapter.isLocked && chapter.progress < 100 && (
                                                        <>
                                                            <span className="meta-divider">•</span>
                                                            <span className="meta-item">
                                                                <span className="meta-icon"><Timer size={12} /></span>
                                                                Min: {chapter.requiredTime}m
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="chapter-right-section">
                                            {!chapter.isLocked && (
                                                <div className="chapter-progress-info">
                                                    <div className="progress-circle-container">
                                                        <svg className="progress-circle" width="60" height="60">
                                                            <circle cx="30" cy="30" r="26" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                                                            <circle
                                                                cx="30" cy="30" r="26" fill="none"
                                                                stroke={subject?.color || "#667eea"}
                                                                strokeWidth="4"
                                                                strokeDasharray={`${2 * Math.PI * 26}`}
                                                                strokeDashoffset={`${2 * Math.PI * 26 * (1 - chapter.progress / 100)}`}
                                                                strokeLinecap="round"
                                                                transform="rotate(-90 30 30)"
                                                            />
                                                        </svg>
                                                        <div className="progress-percentage-overlay">{chapter.progress}%</div>
                                                    </div>
                                                </div>
                                            )}
                                            <div className={`chapter-status-badge ${status.className}`}>{status.text}</div>
                                        </div>
                                    </div>

                                    {/* Quiz button — shown below each unlocked chapter */}
                                    {!chapter.isLocked && (
                                        <div className="chapter-quiz-row">
                                            <div className="chapter-quiz-label">
                                                {quizPassed ? (
                                                    <span className="quiz-done-badge"><CheckCircle2 size={14} /> Quiz Passed · {qStatus?.bestPercentage}%</span>
                                                ) : (
                                                    <span className="quiz-todo-badge"><FileText size={14} /> Quiz Required for 100%</span>
                                                )}
                                            </div>

                                            <div className="chapter-quiz-actions">
                                                {/* Attempts Remaining Display — Moved here */}
                                                <div className={`quiz-attempts-info ${((qStatus?.attempts || 0) >= 3) ? 'out' : ''}`}>
                                                    <Target size={12} />
                                                    <span>{Math.max(0, 3 - (qStatus?.attempts || 0))} attempts left</span>
                                                </div>

                                                {((qStatus?.attempts || 0) < 3 || (quizPassed && (qStatus?.attempts || 0) < 3)) ? (
                                                    <button
                                                        className={`chapter-quiz-btn ${quizPassed ? "quiz-passed" : ""}`}
                                                        style={!quizPassed ? { background: subject?.color } : {}}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveQuiz(chapter);
                                                        }}
                                                    >
                                                        {quizPassed ? <><RotateCcw size={16} /> Retake Quiz</> : <><Target size={16} /> Take Quiz</>}
                                                    </button>
                                                ) : (
                                                    <div className="quiz-maxed-badge">
                                                        <Lock size={14} /> Maxed
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Info box */}
                    <div className="info-box">
                        <div className="info-icon"><Lightbulb size={24} color="#f59e0b" /></div>
                        <div className="info-content">
                            <h4>How Chapter Unlocking Works</h4>
                            <p>Complete each chapter by spending at least 2 minutes to unlock the next one.</p>
                        </div>
                    </div>
                </div>

                {/* RIGHT: chatbot — exact same as PDFViewer */}
                <div className="chatbot-section">
                    <div className="chat-interface-pdf">
                        {/* Avatar Header */}
                        <div
                            className={`chat-avatar-header-pdf ${(isAvatarSpeaking || chatLoading) ? "speaking" : ""}`}
                            onClick={() => {
                                if (chatLoading) handleStopResponse();
                                else if (isAvatarSpeaking) stopSpeaking();
                            }}
                            title={(isAvatarSpeaking || chatLoading) ? "Click to stop" : ""}
                        >
                            <div className="avatar-canvas-container-pdf">
                                <Canvas camera={{ position: [0, 1.6, 5.5], fov: 15 }} style={{ width: "100%", height: "100%", background: "transparent" }}>
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
                                        <button onClick={stopSpeaking} className="btn-stop-speaking-pdf">Stop <StopCircle size={14} /></button>
                                    </div>
                                )}
                            </div>

                            <div className="chat-messages-pdf">
                                {messages.map((msg, index) => (
                                    <div key={index} className={`message ${msg.role === "user" ? "user-message" : "avatar-message"}`}>
                                        <div className="message-avatar">{msg.role === "user" ? <User size={16} /> : <Bot size={16} />}</div>
                                        <div className="message-content">
                                            <div className="message-text">{msg.content}</div>
                                            <div className="message-footer">
                                                <div className="message-time">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                                                {msg.role === "assistant" && msg.content && !msg.isStreaming && (
                                                    <button
                                                        className="read-again-button"
                                                        onClick={() => handleReadAgain(msg.content)}
                                                        disabled={isAvatarSpeaking}
                                                        title="Read again"
                                                    ><Volume2 size={14} /></button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {chatLoading && (
                                    <div className="message avatar-message">
                                        <div className="message-avatar"><Bot size={16} /></div>
                                        <div className="message-content">
                                            <div className="typing-indicator"><span></span><span></span><span></span></div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <form className="chat-input-form-pdf" onSubmit={handleFormSubmit}>
                                <input
                                    type="text"
                                    className="chat-input-pdf"
                                    placeholder="Ask about this subject..."
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    disabled={chatLoading}
                                />
                                <button
                                    type="button"
                                    className={`voice-input-button ${isListening ? "listening" : ""}`}
                                    onClick={toggleVoiceListening}
                                    disabled={chatLoading || isAvatarSpeaking || !isVoiceSupported}
                                    title={!isVoiceSupported ? "Voice not supported" : isListening ? "Stop listening" : "Voice input"}
                                >
                                    {isListening ? <Mic size={20} className="animate-pulse" /> : <Mic size={20} />}
                                </button>
                                {chatLoading ? (
                                    <button type="button" className="stop-button-pdf" onClick={handleStopResponse} title="Stop generating"><Square size={16} /></button>
                                ) : (
                                    <button type="submit" className="send-button-pdf" disabled={chatLoading || !inputMessage.trim()}><Send size={16} /></button>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            {/* ── Quiz Modal ──────────────────────────────────────── */}
            {activeQuiz && subject && (
                <QuizModal
                    chapter={activeQuiz}
                    subject={subject}
                    onClose={() => setActiveQuiz(null)}
                    onPassed={(chapterId) => {
                        handleQuizPassed(chapterId);
                    }}
                />
            )}
        </div>
    );
}

export default SubjectChapters;
