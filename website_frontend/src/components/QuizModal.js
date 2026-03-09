import React, { useState, useEffect } from "react";
import "./QuizModal.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function QuizModal({ chapter, subject, onClose, onPassed }) {
    const [phase, setPhase] = useState("loading"); // loading | quiz | result | error
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [currentQ, setCurrentQ] = useState(0);
    const [errorMsg, setErrorMsg] = useState("");

    // Generate quiz on mount
    useEffect(() => {
        generateQuiz();
        // eslint-disable-next-line
    }, []);

    const generateQuiz = async () => {
        setPhase("loading");
        setErrorMsg("");
        // Ollama can be slow locally — give it 3 minutes
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 180000);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/quiz/generate`, {
                method: "POST",
                signal: controller.signal,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    chapterName: chapter.name || chapter.title,
                    subjectName: subject.name,
                    chapterId: chapter.id,
                    subjectId: subject.id,
                }),
            });
            clearTimeout(timeout);
            const data = await res.json();
            if (!data.success) throw new Error(data.message || "Failed to generate quiz");
            setQuestions(data.questions);
            setAnswers({});
            setCurrentQ(0);
            setPhase("quiz");
        } catch (err) {
            clearTimeout(timeout);
            if (err.name === "AbortError") {
                setErrorMsg("Quiz generation timed out. Ollama may be busy — please try again.");
            } else {
                setErrorMsg(err.message);
            }
            setPhase("error");
        }
    };


    const handleAnswer = (questionId, option) => {
        setAnswers((prev) => ({ ...prev, [questionId]: option }));
    };

    const handleSubmit = async () => {
        // Check all answered
        const unanswered = questions.filter((q) => !answers[q.id]);
        if (unanswered.length > 0) {
            alert(`Please answer all questions. ${unanswered.length} question(s) remaining.`);
            // Jump to first unanswered
            setCurrentQ(questions.indexOf(unanswered[0]));
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/quiz/submit`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    subjectId: subject.id,
                    subjectName: subject.name,
                    chapterId: chapter.id,
                    chapterName: chapter.name || chapter.title,
                    answers,
                    questions,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            setResult(data);
            setPhase("result");
            if (data.passed && onPassed) onPassed(chapter.id);
        } catch (err) {
            setErrorMsg(err.message);
            setPhase("error");
        } finally {
            setSubmitting(false);
        }
    };

    const answeredCount = Object.keys(answers).length;
    const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
    const q = questions[currentQ];

    return (
        <div className="quiz-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="quiz-modal">
                {/* ── Header ─────────────────────────────────────── */}
                <div className="quiz-modal-header" style={{ background: subject.color }}>
                    <div className="quiz-header-info">
                        <span className="quiz-subject-icon">{subject.icon}</span>
                        <div>
                            <div className="quiz-chapter-label">{chapter.name || chapter.title}</div>
                            <div className="quiz-title">Chapter Quiz</div>
                        </div>
                    </div>
                    <button className="quiz-close-btn" onClick={onClose}>✕</button>
                </div>

                {/* ── LOADING ─────────────────────────────────────── */}
                {phase === "loading" && (
                    <div className="quiz-body quiz-loading">
                        <div className="quiz-spinner"></div>
                        <p className="quiz-loading-text">🧠 AI is generating your quiz...</p>
                        <p className="quiz-loading-sub">Creating 10 custom questions for this chapter</p>
                    </div>
                )}

                {/* ── ERROR ───────────────────────────────────────── */}
                {phase === "error" && (
                    <div className="quiz-body quiz-error-state">
                        <div className="quiz-error-icon">⚠️</div>
                        <h3>Couldn't Generate Quiz</h3>
                        <p>{errorMsg}</p>
                        <div className="quiz-error-actions">
                            <button className="quiz-btn-primary" onClick={generateQuiz}>Try Again</button>
                            <button className="quiz-btn-secondary" onClick={onClose}>Close</button>
                        </div>
                    </div>
                )}

                {/* ── QUIZ ────────────────────────────────────────── */}
                {phase === "quiz" && q && (
                    <div className="quiz-body">
                        {/* Progress bar */}
                        <div className="quiz-progress-bar-wrap">
                            <div className="quiz-progress-bar" style={{ width: `${progress}%`, background: subject.color }} />
                        </div>
                        <div className="quiz-progress-label">
                            {answeredCount} of {questions.length} answered
                        </div>

                        {/* Question navigator dots */}
                        <div className="quiz-dots">
                            {questions.map((qq, i) => (
                                <button
                                    key={qq.id}
                                    className={`quiz-dot ${i === currentQ ? "active" : ""} ${answers[qq.id] ? "answered" : ""}`}
                                    style={answers[qq.id] ? { background: subject.color } : {}}
                                    onClick={() => setCurrentQ(i)}
                                    title={`Q${i + 1}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>

                        {/* Question */}
                        <div className="quiz-question-card">
                            <div className="quiz-q-number" style={{ color: subject.color }}>
                                Question {currentQ + 1} of {questions.length}
                            </div>
                            <h3 className="quiz-question-text">{q.question}</h3>

                            {/* Options */}
                            <div className="quiz-options">
                                {q.options.map((opt) => (
                                    <button
                                        key={opt}
                                        className={`quiz-option ${answers[q.id] === opt ? "selected" : ""}`}
                                        style={answers[q.id] === opt ? { borderColor: subject.color, background: `${subject.color}18` } : {}}
                                        onClick={() => handleAnswer(q.id, opt)}
                                    >
                                        <span
                                            className="quiz-option-radio"
                                            style={answers[q.id] === opt ? { background: subject.color, borderColor: subject.color } : {}}
                                        ></span>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="quiz-nav">
                            <button
                                className="quiz-btn-secondary"
                                onClick={() => setCurrentQ((p) => Math.max(0, p - 1))}
                                disabled={currentQ === 0}
                            >
                                ← Prev
                            </button>
                            {currentQ < questions.length - 1 ? (
                                <button
                                    className="quiz-btn-primary"
                                    style={{ background: subject.color }}
                                    onClick={() => setCurrentQ((p) => p + 1)}
                                >
                                    Next →
                                </button>
                            ) : (
                                <button
                                    className="quiz-btn-submit"
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                >
                                    {submitting ? "Submitting..." : "Submit Quiz 🎯"}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ── RESULT ──────────────────────────────────────── */}
                {phase === "result" && result && (
                    <div className="quiz-body quiz-result">
                        {/* Score circle */}
                        <div className={`quiz-score-circle ${result.passed ? "passed" : "failed"}`}>
                            <div className="quiz-score-num">{result.score}/{result.total}</div>
                            <div className="quiz-score-pct">{result.percentage}%</div>
                        </div>

                        <h2 className={`quiz-result-title ${result.passed ? "passed" : "failed"}`}>
                            {result.passed ? "🎉 Quiz Passed!" : "😟 Quiz Failed"}
                        </h2>
                        <p className="quiz-result-sub">
                            {result.passed
                                ? "Great job! This chapter is now complete."
                                : `You need ${result.passPercent}% to pass. Try again!`}
                        </p>

                        {/* Answer review */}
                        <div className="quiz-review">
                            <h4 className="quiz-review-title">Answer Review</h4>
                            {result.results.map((r, i) => (
                                <div key={i} className={`quiz-review-item ${r.isCorrect ? "correct" : "wrong"}`}>
                                    <div className="quiz-review-q">
                                        <span className={`quiz-review-icon`}>{r.isCorrect ? "✅" : "❌"}</span>
                                        <span>Q{r.id}: {r.question}</span>
                                    </div>
                                    {!r.isCorrect && (
                                        <div className="quiz-review-answer">
                                            <span className="quiz-your-ans">Your: {r.userAnswer || "Not answered"}</span>
                                            <span className="quiz-correct-ans">Correct: {r.correctAnswer}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="quiz-result-actions">
                            {!result.passed && (
                                <button className="quiz-btn-primary" onClick={generateQuiz}>
                                    🔄 Retake Quiz
                                </button>
                            )}
                            <button className="quiz-btn-secondary" onClick={onClose}>
                                {result.passed ? "✓ Done" : "Close"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default QuizModal;
