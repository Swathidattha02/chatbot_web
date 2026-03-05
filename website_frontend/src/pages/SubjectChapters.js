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

    // ── Auto scroll ───────────────────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

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
    }, [subjectId, user]);

    // ── Fetch quiz statuses for all chapters ──────────────────────
    const fetchQuizStatuses = async (chapterList, token) => {
        try {
            const res = await fetch(`${API_BASE_URL}/quiz/subject/${subjectId}`, {
                headers: { Authorization: `Bearer ${token || localStorage.getItem("token")}` },
            });
            const data = await res.json();
            if (data.success) {
                const map = {};
                data.quizzes.forEach((q) => {
                    map[q.chapterId] = { passed: q.passed, bestScore: q.score, bestPercentage: q.percentage };
                });
                setQuizStatuses(map);
            }
        } catch { }
    };

    // ── When student passes a quiz → refresh chapters ─────────────
    const handleQuizPassed = (chapterId) => {
        setQuizStatuses((prev) => ({
            ...prev,
            [chapterId]: { ...prev[chapterId], passed: true },
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

            if (isAvatarSpeaking) stopSpeaking();

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
        // eslint-disable-next-line
        [chatLoading, sessionId, currentLanguage, subject]
    );

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
                if (transcript?.trim()) handleSendMessage(transcript);
            };
            recognitionRef.current.onerror = () => setIsListening(false);
            recognitionRef.current.onend = () => setIsListening(false);
        }
        return () => {
            recognitionRef.current?.stop();
            if ("speechSynthesis" in window) window.speechSynthesis.cancel();
            if (mouthAnimationFrameRef.current) cancelAnimationFrame(mouthAnimationFrameRef.current);
        };
    }, [currentLanguage, handleSendMessage]);

    const stopSpeaking = () => {
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            if (mouthAnimationFrameRef.current) cancelAnimationFrame(mouthAnimationFrameRef.current);
            let v = mouthValue;
            const t = setInterval(() => {
                v *= 0.7;
                setMouthValue(v);
                if (v < 0.05) { clearInterval(t); setMouthValue(0); }
            }, 30);
            setIsAvatarSpeaking(false);
            utteranceRef.current = null;
        }
    };

    const handleReadAgain = (message) => {
        if (isAvatarSpeaking) { stopSpeaking(); return; }
        if ("speechSynthesis" in window) {
            const utterance = new SpeechSynthesisUtterance(message);
            utteranceRef.current = utterance;
            utterance.lang = currentLanguage === "en" ? "en-US" : "hi-IN";
            const animateMouth = () => {
                const now = Date.now();
                let intensity = 0.25 + Math.sin(now * 0.02) * 0.15 + Math.sin(now * 0.008) * 0.2 + (Math.random() - 0.5) * 0.04;
                setMouthValue(Math.max(0.08, Math.min(0.5, intensity)));
                mouthAnimationFrameRef.current = requestAnimationFrame(animateMouth);
            };
            utterance.onstart = () => { setIsAvatarSpeaking(true); mouthAnimationFrameRef.current = requestAnimationFrame(animateMouth); };
            utterance.onend = () => {
                if (mouthAnimationFrameRef.current) cancelAnimationFrame(mouthAnimationFrameRef.current);
                let v = mouthValue;
                const t = setInterval(() => { v *= 0.7; setMouthValue(v); if (v < 0.05) { clearInterval(t); setMouthValue(0); } }, 30);
                setIsAvatarSpeaking(false);
                utteranceRef.current = null;
            };
            utterance.onerror = () => stopSpeaking();
            window.speechSynthesis.speak(utterance);
        }
    };

    const handleStopResponse = () => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        setChatLoading(false);
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
        if (chapter.isLocked) return { text: "🔒 Locked", className: "status-locked" };
        if (chapter.progress === 100) return { text: "✓ Complete", className: "status-complete" };
        if (chapter.progress > 0) return { text: "⏳ In Progress", className: "status-in-progress" };
        return { text: "○ Not Started", className: "status-not-started" };
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
                            {subject.icon}
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
                                                {chapter.isLocked ? "🔒" : index + 1}
                                            </div>
                                            <div className="chapter-main-info">
                                                <h3 className="chapter-title-professional">{chapter.name || chapter.title}</h3>
                                                <div className="chapter-meta-info">
                                                    <span className="meta-item">
                                                        <span className="meta-icon">⏱️</span>
                                                        Total: {formatTime(chapter.timeSpent)}
                                                    </span>
                                                    {!chapter.isLocked && chapter.progress < 100 && (
                                                        <>
                                                            <span className="meta-divider">•</span>
                                                            <span className="meta-item">
                                                                <span className="meta-icon">⏲️</span>
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
                                                    <span className="quiz-done-badge">✅ Quiz Passed · {qStatus?.bestPercentage}%</span>
                                                ) : (
                                                    <span className="quiz-todo-badge">📝 Quiz Required for 100%</span>
                                                )}
                                            </div>
                                            <button
                                                className={`chapter-quiz-btn ${quizPassed ? "quiz-passed" : ""}`}
                                                style={!quizPassed ? { background: subject?.color } : {}}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveQuiz(chapter);
                                                }}
                                            >
                                                {quizPassed ? "🔁 Retake Quiz" : "🎯 Take Quiz"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Info box */}
                    <div className="info-box">
                        <div className="info-icon">💡</div>
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
                            className={`chat-avatar-header-pdf ${isAvatarSpeaking ? "speaking" : ""}`}
                            onClick={isAvatarSpeaking ? stopSpeaking : null}
                            title={isAvatarSpeaking ? "Click to stop speaking" : ""}
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
                                        <span className="speaking-indicator">🎤 Speaking...</span>
                                        <button onClick={stopSpeaking} className="btn-stop-speaking-pdf">Stop ⏹</button>
                                    </div>
                                )}
                            </div>

                            <div className="chat-messages-pdf">
                                {messages.map((msg, index) => (
                                    <div key={index} className={`message ${msg.role === "user" ? "user-message" : "avatar-message"}`}>
                                        <div className="message-avatar">{msg.role === "user" ? "👤" : "🤖"}</div>
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
                                                    >🔊</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {chatLoading && (
                                    <div className="message avatar-message">
                                        <div className="message-avatar">🤖</div>
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
                                    {isListening ? "🎤" : "🎙️"}
                                </button>
                                {chatLoading ? (
                                    <button type="button" className="stop-button-pdf" onClick={handleStopResponse} title="Stop generating">■</button>
                                ) : (
                                    <button type="submit" className="send-button-pdf" disabled={chatLoading || !inputMessage.trim()}>📤</button>
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
                        setActiveQuiz(null);
                    }}
                />
            )}
        </div>
    );
}

export default SubjectChapters;
