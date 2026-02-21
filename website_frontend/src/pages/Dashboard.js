import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getSubjectsForClass } from "../config/syllabus";
import "../styles/Dashboard.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [stats, setStats] = useState({
        totalChats: 0,
        docsUploaded: 0,
        hoursLearned: 0,
        streak: 0
    });
    const [todayActivity, setTodayActivity] = useState([]);

    // Load subjects based on user's class and fetch progress
    useEffect(() => {
        const fetchSubjectsAndProgress = async () => {
            try {
                if (user?.class) {
                    const classSubjects = getSubjectsForClass(user.class);
                    let userProgress = [];

                    // Fetch user progress from backend
                    try {
                        const token = localStorage.getItem('token');
                        if (token) {
                            const response = await fetch(`${API_BASE_URL}/progress/user`, {
                                headers: {
                                    'Authorization': `Bearer ${token}`
                                }
                            });
                            const data = await response.json();
                            if (data.success) {
                                userProgress = data.progress;
                            }
                        }
                    } catch (error) {
                        console.error("Error fetching user progress:", error);
                    }

                    // Fetch monthly analytics for stats cards
                    try {
                        const token = localStorage.getItem('token');
                        const analyticsResponse = await fetch(`${API_BASE_URL}/progress/analytics/monthly`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        const analyticsData = await analyticsResponse.json();
                        if (analyticsData.success) {
                            const { totalTime, aiTutorQueries, streak } = analyticsData.analytics;

                            setStats(prev => ({
                                ...prev,
                                totalChats: aiTutorQueries || 0,
                                hoursLearned: totalTime || 0,
                                streak: streak || 0
                            }));
                        }
                    } catch (error) {
                        console.error("Error fetching monthly analytics:", error);
                    }

                    // Fetch today's activity
                    try {
                        const token = localStorage.getItem('token');
                        const todayStr = new Date().toISOString().split('T')[0];
                        const dailyResponse = await fetch(`${API_BASE_URL}/progress/analytics/daily?date=${todayStr}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const dailyData = await dailyResponse.json();
                        if (dailyData.success) {
                            setTodayActivity(dailyData.analytics.subjects || []);
                        }
                    } catch (error) {
                        console.error("Error fetching today's activity:", error);
                    }

                    // Fetch documents for count
                    try {
                        const token = localStorage.getItem('token');
                        const docsResponse = await fetch(`${API_BASE_URL}/documents/list`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        const docsData = await docsResponse.json();
                        if (docsData.success) {
                            setStats(prev => ({
                                ...prev,
                                docsUploaded: docsData.documents?.length || 0
                            }));
                        }
                    } catch (error) {
                        console.error("Error fetching documents:", error);
                    }

                    // Add progress and chapter counts to subjects
                    const subjectsWithProgress = classSubjects.map(subject => {
                        // Filter progress for this specific subject
                        const subjectProgressEntries = userProgress.filter(p => p.subjectId === subject.id);

                        // Calculate granular progress (sum of all chapter percentages / total chapters)
                        let totalProgressPoints = 0;
                        const totalChaptersCount = subject.chapters?.length || 0;

                        if (totalChaptersCount > 0) {
                            subject.chapters.forEach(chapter => {
                                // Loose equality for ID matching to be safe
                                const p = subjectProgressEntries.find(entry => entry.chapterId === chapter.id);
                                if (p) {
                                    if (p.completed) {
                                        totalProgressPoints += 100;
                                    } else {
                                        // Partial credit based on time (capped at 99%)
                                        // Formula matches SubjectChapters logic: (Time / 2min) * 100
                                        const time = p.timeSpent || 0;
                                        const percent = Math.min((time / 2) * 100, 99);
                                        totalProgressPoints += percent;
                                    }
                                }
                            });
                        }

                        // Average progress across all chapters
                        const progressPercentage = totalChaptersCount > 0
                            ? Math.round(totalProgressPoints / totalChaptersCount)
                            : 0;

                        // Count fully completed for display if needed
                        const completedChaptersCount = subjectProgressEntries.filter(p => p.completed).length;

                        return {
                            ...subject,
                            progress: progressPercentage,
                            totalChapters: totalChaptersCount,
                            completedChapters: completedChaptersCount
                        };
                    });

                    setSubjects(subjectsWithProgress);
                }
                setLoading(false);
            } catch (error) {
                console.error("Error fetching subjects:", error);
                setLoading(false);
            }
        };

        fetchSubjectsAndProgress();
    }, [user]);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            alert('Please upload a PDF or Word document');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            return;
        }

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('document', file);
            formData.append('userId', user?.id || 'guest');

            // Upload to backend
            const response = await fetch(`${API_BASE_URL}/documents/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();

            // Navigate to chat with document info
            navigate('/chat', {
                state: {
                    uploadedDocument: {
                        name: file.name,
                        documentId: data.documentId,
                        message: `Document "${file.name}" loaded successfully! You can now ask questions about it.`
                    }
                }
            });

            // Clear the input
            event.target.value = '';
        } catch (error) {
            console.error('Upload error:', error);
            alert(`❌ Upload failed: ${error.message}\n\nNote: Make sure the backend server is running.`);
        } finally {
            setUploading(false);
        }
    };

    const handleSubjectClick = (subjectId) => {
        navigate(`/subjects/${subjectId}/chapters`);
    };

    const calculateOverallProgress = () => {
        if (subjects.length === 0) return 0;
        const totalProgress = subjects.reduce((sum, subject) => sum + subject.progress, 0);
        return Math.round(totalProgress / subjects.length);
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Welcome back, {user?.name}! 👋</h1>
                    <p className="dashboard-subtitle">
                        {user?.class ? `${user.class} Syllabus - ` : ''}Ready to continue your learning journey?
                    </p>
                </div>
            </div>

            <div className="dashboard-grid">
                {/* Quick Actions */}
                <div className="dashboard-card">
                    <div className="card-icon">💬</div>
                    <h3 className="card-title">Chat with AI Avatar</h3>
                    <p className="card-description">
                        Start a conversation with your personal AI tutor
                    </p>
                    <Link to="/chat" className="card-button">
                        Start Chatting →
                    </Link>
                </div>

                <div className="dashboard-card">
                    <div className="card-icon">📚</div>
                    <h3 className="card-title">Upload Documents</h3>
                    <p className="card-description">
                        Upload PDFs and documents for AI-powered Q&A
                    </p>
                    <label htmlFor="file-upload" className={`card-button ${uploading ? 'uploading' : ''}`}>
                        {uploading ? '⏳ Uploading...' : '📤 Upload Document'}
                    </label>
                    <input
                        id="file-upload"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                        disabled={uploading}
                    />
                </div>

                <div className="dashboard-card">
                    <div className="card-icon">📊</div>
                    <h3 className="card-title">Learning Analytics</h3>
                    <p className="card-description">
                        Track your progress and learning insights
                    </p>
                    <Link to="/analytics" className="card-button">
                        View Analytics →
                    </Link>
                </div>
            </div>

            {/* Subjects Section */}
            <div className="subjects-section">
                <div className="section-header">
                    <h2 className="section-title">Your Subjects</h2>
                    <div className="overall-progress-badge">
                        <span className="progress-label">Overall Progress</span>
                        <span className="progress-value">{calculateOverallProgress()}%</span>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                        <p>Loading subjects...</p>
                    </div>
                ) : (
                    <div className="subjects-grid">
                        {subjects.map((subject) => (
                            <div
                                key={subject.id}
                                className="subject-card"
                                onClick={() => handleSubjectClick(subject.id)}
                            >
                                <div className="subject-card-header">
                                    <div
                                        className="subject-icon-wrapper"
                                        style={{ backgroundColor: subject.color }}
                                    >
                                        <span className="subject-icon">{subject.icon}</span>
                                    </div>
                                    <div className="subject-info">
                                        <h3 className="subject-name">{subject.name}</h3>
                                        <p className="subject-chapters">
                                            {subject.completedChapters} of {subject.totalChapters} chapters
                                        </p>
                                    </div>
                                </div>

                                <div className="subject-progress-section">
                                    <div className="progress-info">
                                        <span className="progress-text">Progress</span>
                                        <span className="progress-percentage">{subject.progress}%</span>
                                    </div>
                                    <div className="progress-bar-wrapper">
                                        <div
                                            className="progress-bar-fill"
                                            style={{
                                                width: `${subject.progress}%`,
                                                backgroundColor: subject.color
                                            }}
                                        >
                                            <div className="progress-shine"></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="subject-card-footer">
                                    <span className="view-chapters-link">
                                        View Chapters →
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Today's Activity Section */}
            {todayActivity.length > 0 && (
                <div className="subjects-section today-activity-section">
                    <div className="section-header">
                        <h2 className="section-title">Studied Today</h2>
                        <span className="date-badge">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="today-activity-grid">
                        {todayActivity.map((sub, i) => (
                            <div key={i} className="today-activity-chip">
                                <span className="chip-icon">📖</span>
                                <div className="chip-info">
                                    <span className="chip-name">{sub.name}</span>
                                    <span className="chip-time">
                                        {sub.sessions && sub.sessions.length > 0
                                            ? `${sub.sessions[sub.sessions.length - 1].startTime} - ${sub.sessions[sub.sessions.length - 1].endTime || 'now'}`
                                            : `${Math.round(sub.timeSpent)} min`
                                        }
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats Section */}
            <div className="stats-section">
                <h2 className="section-title">Your Stats</h2>
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">💬</div>
                        <div className="stat-value">{stats.totalChats}</div>
                        <div className="stat-label">Total Chats</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">📄</div>
                        <div className="stat-value">{stats.docsUploaded}</div>
                        <div className="stat-label">Documents Uploaded</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">⏱️</div>
                        <div className="stat-value">{stats.hoursLearned}h</div>
                        <div className="stat-label">Hours Learned</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">🔥</div>
                        <div className="stat-value">{stats.streak} Days</div>
                        <div className="stat-label">Study Streak</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
