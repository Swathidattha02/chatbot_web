import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getSubjectsForClass } from "../config/syllabus";
import "../styles/SubjectChapters.css";

function SubjectChapters() {
    const { subjectId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [subject, setSubject] = useState(null);
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userProgress, setUserProgress] = useState({});

    useEffect(() => {
        // Load subject and chapters based on user's class
        const fetchSubjectAndChapters = async () => {
            try {
                if (user?.class) {
                    const subjects = getSubjectsForClass(user.class);
                    const foundSubject = subjects.find(s => s.id === parseInt(subjectId));

                    if (foundSubject) {
                        // Fetch progress from backend
                        const token = localStorage.getItem("token");
                        let progressData = [];

                        try {
                            const response = await fetch(`http://localhost:5000/api/progress/subject/${subjectId}`, {
                                headers: {
                                    "Authorization": `Bearer ${token}`,
                                },
                            });
                            const data = await response.json();
                            if (data.success) {
                                progressData = data.progress;
                            }
                        } catch (error) {
                            console.error("Error fetching progress:", error);
                        }

                        // Transform chapters to include progress tracking fields
                        const chaptersWithProgress = (foundSubject.chapters || []).map((chapter, index) => {
                            const chapterProgress = progressData.find(p => p.chapterId === chapter.id);

                            // Calculate progress percentage
                            let progressPercent = 0;
                            let timeSpentVal = 0;

                            if (chapterProgress) {
                                timeSpentVal = chapterProgress.timeSpent || 0;
                                if (chapterProgress.completed) {
                                    progressPercent = 100;
                                } else {
                                    // Calculate percentage: (Time Spent / 2 minutes) * 100
                                    // Cap at 99% if not yet marked completed by backend
                                    progressPercent = Math.min(Math.floor((timeSpentVal / 2) * 100), 99);
                                }
                            }

                            return {
                                ...chapter,
                                progress: progressPercent,
                                timeSpent: timeSpentVal,
                                isLocked: index === 0 ? false : !progressData.find(p => p.chapterId === (foundSubject.chapters[index - 1]?.id))?.completed,
                                requiredTime: 2
                            };
                        });

                        setSubject(foundSubject);
                        setChapters(chaptersWithProgress);
                    } else {
                        // Subject not found, create empty subject
                        setSubject({
                            id: parseInt(subjectId),
                            name: "Subject",
                            icon: "📚",
                            color: "#667eea",
                        });
                        setChapters([]);
                    }
                }
                setLoading(false);
            } catch (error) {
                console.error("Error fetching chapters:", error);
                setLoading(false);
            }
        };

        fetchSubjectAndChapters();
    }, [subjectId, user]);

    const handleChapterClick = (chapter) => {
        if (chapter.isLocked) {
            alert("🔒 This chapter is locked! Complete the previous chapter to unlock it.");
            return;
        }

        navigate(`/subjects/${subjectId}/chapters/${chapter.id}/pdf`, {
            state: { chapter, subject }
        });
    };

    const handleBack = () => {
        navigate("/dashboard");
    };

    const formatTime = (minutes) => {
        if (minutes < 60) {
            return `${minutes}m`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    const getChapterStatus = (chapter) => {
        if (chapter.isLocked) {
            return { text: "🔒 Locked", className: "status-locked" };
        }
        if (chapter.progress === 100) {
            return { text: "✓ Complete", className: "status-complete" };
        }
        if (chapter.progress > 0) {
            return { text: "⏳ In Progress", className: "status-in-progress" };
        }
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
            <div className="chapters-header">
                <button onClick={handleBack} className="back-button-chapters">
                    ← Back to Dashboard
                </button>
                <div className="subject-header-chapters">
                    <div className="subject-header-icon-chapters" style={{ background: subject.color }}>
                        {subject.icon}
                    </div>
                    <div className="subject-header-info-chapters">
                        <h1>{subject.name}</h1>
                        <p>{chapters.length} Chapters • {chapters.filter(c => c.progress === 100).length} Completed</p>
                    </div>
                </div>
            </div>

            <div className="chapters-list-professional">
                {chapters.map((chapter, index) => {
                    const status = getChapterStatus(chapter);
                    return (
                        <div
                            key={chapter.id}
                            className={`chapter-card-professional ${chapter.isLocked ? 'locked' : ''}`}
                            onClick={() => handleChapterClick(chapter)}
                        >
                            <div className="chapter-left-section">
                                <div
                                    className={`chapter-number-badge ${chapter.isLocked ? 'locked' : ''}`}
                                    style={{
                                        background: chapter.isLocked ? '#cbd5e1' : subject.color
                                    }}
                                >
                                    {chapter.isLocked ? '🔒' : index + 1}
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
                                                <circle
                                                    cx="30"
                                                    cy="30"
                                                    r="26"
                                                    fill="none"
                                                    stroke="#e2e8f0"
                                                    strokeWidth="4"
                                                />
                                                <circle
                                                    cx="30"
                                                    cy="30"
                                                    r="26"
                                                    fill="none"
                                                    stroke={subject.color}
                                                    strokeWidth="4"
                                                    strokeDasharray={`${2 * Math.PI * 26}`}
                                                    strokeDashoffset={`${2 * Math.PI * 26 * (1 - chapter.progress / 100)}`}
                                                    strokeLinecap="round"
                                                    transform="rotate(-90 30 30)"
                                                />
                                            </svg>
                                            <div className="progress-percentage-overlay">
                                                {chapter.progress}%
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className={`chapter-status-badge ${status.className}`}>
                                    {status.text}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Info Box */}
            <div className="info-box">
                <div className="info-icon">💡</div>
                <div className="info-content">
                    <h4>How Chapter Unlocking Works</h4>
                    <p>Complete each chapter by spending at least 2 minutes to unlock the next one. Track your progress and time spent in real-time!</p>
                </div>
            </div>
        </div>
    );
}

export default SubjectChapters;
