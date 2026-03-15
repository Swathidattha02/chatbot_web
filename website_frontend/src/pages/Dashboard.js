import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getSubjectsForClass } from "../config/syllabus";
import { 
    MessageSquare, Upload, BarChart3, BookOpen, 
    FileText, Clock, Flame, Trophy, Target, 
    Bot, Loader2, Play, ArrowRight, Calculator, 
    Microscope, Dna, Globe, Languages, Atom, 
    Beaker, Monitor, AlertCircle, RefreshCw
} from "lucide-react";
import Footer from "../components/Footer";
import dashboardService from "../services/dashboardService";
import "../styles/Dashboard.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD format
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');
    const [uploadStage, setUploadStage] = useState(0);
    const [stats, setStats] = useState({
        totalChats: 0,
        docsUploaded: 0,
        hoursLearned: 0,
        streak: 0
    });
    const [todayActivity, setTodayActivity] = useState([]);
    const [achievements, setAchievements] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [alarmActive, setAlarmActive] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [violationReason, setViolationReason] = useState('');

    const VIOLATION_MESSAGES = {
        tab_switch: { icon: '🔄', title: 'Tab Switch Detected!', subtitle: 'You switched away from the learning tab.' },
        focus_lost: { icon: '😴', title: 'Are You Still There?', subtitle: 'No activity detected for a while.' },
        window_blur: { icon: '🪟', title: 'Window Lost Focus!', subtitle: 'You clicked outside the browser window.' },
        visibility_hidden: { icon: '👁️', title: 'Tab Hidden!', subtitle: 'You switched to another browser tab.' },
    };

    const handleViolation = useCallback((v) => {
        setViolationReason(v.reason);
    }, []);
    const handleAlarmStart = useCallback(() => setAlarmActive(true), []);
    const handleAlarmStop = useCallback(() => { setAlarmActive(false); setCountdown(0); setViolationReason(''); }, []);
    const handleCountdown = useCallback((s) => setCountdown(s), []);

    const startStudySession = (subjectId) => {
        localStorage.setItem('isStudying', 'true');
        localStorage.setItem('currentStudySubject', subjectId);
        console.log(`Starting study session for ${subjectId}`);
    };

    const stopStudySession = () => {
        localStorage.setItem('isStudying', 'false');
        localStorage.removeItem('currentStudySubject');
        console.log("Study session stopped.");
    };

    // ─── LOAD DASHBOARD DATA ───────────────────────────────────────────────────
    const loadDashboardData = useCallback(async (dateToFetch = null) => {
        try {
            setLoading(true);
            setError(null);

            // Check if user is authenticated
            if (!user?.class) {
                setError("User information not available. Please login again.");
                return;
            }

            // Normalize class name
            const normalizedClass = user.class.toString().trim().startsWith("Class")
                ? user.class.toString().trim()
                : `Class ${user.class.toString().trim()}`;

            // Get subjects from config
            const classSubjects = getSubjectsForClass(normalizedClass);
            
            if (!classSubjects || classSubjects.length === 0) {
                setError("No subjects found for your class. Please contact support.");
                return;
            }

            // Fetch all dashboard data in parallel using batch service with the selected date
            const result = await dashboardService.fetchStudentDashboardBatch(dateToFetch || selectedDate);

                // Extract data from results
                const progressData = result.data.progress?.progress || [];
                const monthlyAnalytics = result.data.monthlyAnalytics?.analytics || {};
                const dailyAnalytics = result.data.dailyAnalytics?.analytics || {};
                const docsData = result.data.documents?.documents || [];

                // Update stats
                setStats(prev => ({
                    ...prev,
                    totalChats: monthlyAnalytics.aiTutorQueries || 0,
                    hoursLearned: (monthlyAnalytics.totalTime || 0) / 60, // Convert minutes to hours
                    streak: monthlyAnalytics.streak || 0,
                    docsUploaded: docsData.length || 0
                }));

                // Update today's activity
                setTodayActivity(dailyAnalytics.subjects || []);

                // Fetch achievements and recommendations (these are handled separately)
                try {
                    const achievementsResult = await dashboardService.fetchAchievements?.();
                    if (achievementsResult?.success) {
                        setAchievements(achievementsResult.achievements || []);
                    }
                } catch (err) {
                    console.warn("Could not load achievements:", err.message);
                }

                try {
                    const recsResult = await dashboardService.fetchRecommendations?.();
                    if (recsResult?.success) {
                        setRecommendations(recsResult.recommendations || []);
                    }
                } catch (err) {
                    console.warn("Could not load recommendations:", err.message);
                }

                // Enrich subjects with progress data
                const subjectsWithProgress = classSubjects.map(subject => {
                    const subjectProgressEntries = progressData.filter(p => p.subjectId === subject.id);

                    // Calculate overall progress
                    let totalProgressPoints = 0;
                    const totalChaptersCount = subject.chapters?.length || 0;

                    if (totalChaptersCount > 0) {
                        subject.chapters.forEach(chapter => {
                            const p = subjectProgressEntries.find(entry => entry.chapterId === chapter.id);
                            if (p) {
                                if (p.completed) {
                                    totalProgressPoints += 100;
                                } else {
                                    const time = p.timeSpent || 0;
                                    const percent = Math.min((time / 2) * 100, 99);
                                    totalProgressPoints += percent;
                                }
                            }
                        });
                    }

                    const progressPercentage = totalChaptersCount > 0
                        ? Math.round(totalProgressPoints / totalChaptersCount)
                        : 0;

                    const completedChaptersCount = subjectProgressEntries.filter(p => p.completed).length;

                    return {
                        ...subject,
                        progress: progressPercentage,
                        totalChapters: totalChaptersCount,
                        completedChapters: completedChaptersCount
                    };
                });

                setSubjects(subjectsWithProgress);
            } catch (err) {
                console.error("Error loading dashboard:", err);
                
                if (err.message?.includes("Authentication")) {
                    navigate("/login");
                    return;
                }
                
                setError(err.message || "Failed to load dashboard. Please try again.");
            } finally {
                setLoading(false);
            }
        }, [user, navigate, selectedDate]);

        // Call the function when dependencies change
        useEffect(() => {
            loadDashboardData();
        }, [loadDashboardData]);

    // ─── HANDLE DATE CHANGE ────────────────────────────────────────────────────
    const handleDateChange = useCallback(async (e) => {
        const newDate = e.target.value;
        setSelectedDate(newDate);
        // The useEffect will automatically trigger and load data for the new date
    }, []);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = [
            'application/pdf', 
            'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];
        
        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|txt)$/i)) {
            alert('Please upload a PDF, Word, or Text document');
            return;
        }

        // Validate file size (max 15MB)
        if (file.size > 15 * 1024 * 1024) {
            alert('File size must be less than 15MB');
            return;
        }

        setUploading(true);
        setUploadProgress(0);
        setUploadStatus('Connecting...');
        setUploadStage(0);

        const stages = [
            "Uploading file...",
            "Analyzing document...",
            "Extracting text content...",
            "Creating searchable chunks...",
            "Generating AI embeddings (this takes a moment)...",
            "Finalizing index..."
        ];

        let stageInterval;
        const startProcessingAnimation = () => {
            let currentStage = 1;
            setUploadStage(currentStage);
            setUploadStatus(stages[currentStage]);
            
            stageInterval = setInterval(() => {
                if (currentStage < stages.length - 1) {
                    currentStage++;
                    setUploadStage(currentStage);
                    setUploadStatus(stages[currentStage]);
                    // Only simulate progress up to 98% during processing
                    setUploadProgress(prev => Math.min(prev + (100 - prev) * 0.2, 98));
                }
            }, 3000); // Change message every 3 seconds
        };

        try {
            const formData = new FormData();
            formData.append('document', file);
            formData.append('userId', user?.id || 'guest');

            const axios = (await import('axios')).default;
            const token = localStorage.getItem('token');

            const response = await axios.post(`${API_BASE_URL}/documents/upload`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 95) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                    if (percentCompleted < 90) {
                        setUploadStatus(`Uploading: ${percentCompleted}%`);
                    } else if (percentCompleted >= 90 && uploadStage === 0) {
                        setUploadStatus('Processing on server...');
                        startProcessingAnimation();
                    }
                },
                timeout: 300000 
            });

            clearInterval(stageInterval);
            if (response.data.success) {
                setUploadProgress(100);
                setUploadStatus('Success! Redirecting...');
                const data = response.data;

                // Navigate to chat with document info
                navigate('/chat', {
                    state: {
                        uploadedDocument: {
                            name: file.name,
                            documentId: data.document?.id || data.documentId,
                            message: `Document "${file.name}" loaded successfully! You can now ask questions about it.`
                        }
                    }
                });
            } else {
                throw new Error(response.data.error || 'Upload failed');
            }

            // Clear the input
            event.target.value = '';
        } catch (error) {
            clearInterval(stageInterval);
            console.error('Upload error:', error);
            const errorMsg = error.response?.data?.error || error.message;
            alert(`❌ Upload failed: ${errorMsg}\n\nNote: For large documents, the processing can take up to a minute.`);
        } finally {
            setUploading(false);
            setUploadProgress(0);
            setUploadStatus('');
            setUploadStage(0);
        }
    };

    const handleSubjectClick = (subjectId) => {
        startStudySession(subjectId);
        navigate(`/subjects/${subjectId}/chapters`);
    };

    const calculateOverallProgress = () => {
        if (subjects.length === 0) return 0;
        const totalProgress = subjects.reduce((sum, subject) => sum + subject.progress, 0);
        return Math.round(totalProgress / subjects.length);
    };

    const subjectIconMap = {
        "📐": <Calculator size={24} />,
        "🔬": <Microscope size={24} />,
        "🧬": <Dna size={24} />,
        "📚": <BookOpen size={24} />,
        "🌍": <Globe size={24} />,
        "🇮🇳": <Languages size={24} />,
        "📖": <BookOpen size={24} />,
        "⚛️": <Atom size={24} />,
        "🧪": <Beaker size={24} />,
        "💻": <Monitor size={24} />
    };

    const renderSubjectIcon = (emoji) => subjectIconMap[emoji] || <span>{emoji}</span>;

    // ─── LOADING STATE ────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="dashboard-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
                <div style={{ textAlign: "center", gap: "20px" }}>
                    <Loader2 className="animate-spin" size={48} color="#4f46e5" style={{ margin: "0 auto 20px" }} />
                    <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1e293b" }}>Loading your dashboard...</h2>
                    <p style={{ color: "#64748b" }}>Fetching your progress and personalized content</p>
                </div>
            </div>
        );
    }

    // ─── ERROR STATE ──────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="dashboard-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
                <div style={{ textAlign: "center", gap: "20px", maxWidth: "500px" }}>
                    <AlertCircle size={64} color="#ef4444" style={{ margin: "0 auto 20px" }} />
                    <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#1e293b", marginBottom: "12px" }}>
                        Unable to Load Dashboard
                    </h1>
                    <p style={{ color: "#64748b", marginBottom: "24px" }}>
                        {error}
                    </p>
                    <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                padding: "10px 20px",
                                backgroundColor: "#4f46e5",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px"
                            }}
                        >
                            <RefreshCw size={16} /> Retry
                        </button>
                        <button
                            onClick={() => navigate("/login")}
                            style={{
                                padding: "10px 20px",
                                backgroundColor: "#e2e8f0",
                                color: "#1e293b",
                                border: "none",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontSize: "14px",
                            }}
                        >
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
                <div className="dashboard-header">
                    <div>
                        <h1 className="dashboard-title">Welcome back, {user?.name}!</h1>
                        <p className="dashboard-subtitle">
                            {user?.class ? `${user.class} Syllabus - ` : ''}Ready to continue your learning journey?
                        </p>
                    </div>
                </div>

                <div className="dashboard-grid">
                    {/* Quick Actions */}
                    <div className="dashboard-card">
                        <div className="card-icon"><MessageSquare size={32} color="#4f46e5" /></div>
                        <h3 className="card-title">Chat with AI Avatar</h3>
                        <p className="card-description">
                            Start a conversation with your personal AI tutor
                        </p>
                        <Link to="/chat" className="card-button">
                            Start Chatting <ArrowRight size={16} />
                        </Link>
                    </div>

                    <div className="dashboard-card">
                        <div className="card-icon"><Upload size={32} color="#ec4899" /></div>
                        <h3 className="card-title">Upload Documents</h3>
                        <p className="card-description">
                            Upload PDFs and documents for AI-powered Q&A
                        </p>
                        <label htmlFor="file-upload" className={`card-button ${uploading ? 'uploading disabled' : ''}`}>
                            {uploading ? (
                                <div className="upload-status-container">
                                    <Loader2 className="animate-spin" size={16} />
                                    <span>{uploadStatus}</span>
                                    <div className="upload-progress-mini">
                                        <div className="progress-bar-inner" style={{ width: `${uploadProgress}%` }}></div>
                                    </div>
                                </div>
                            ) : (
                                <><Upload size={16} /> Upload Document</>
                            )}
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
                        <div className="card-icon"><BarChart3 size={32} color="#10b981" /></div>
                        <h3 className="card-title">Learning Analytics</h3>
                        <p className="card-description">
                            Track your progress and learning insights
                        </p>
                        <Link to="/analytics" className="card-button">
                            View Analytics <ArrowRight size={16} />
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
                                            <span className="subject-icon">{renderSubjectIcon(subject.icon)}</span>
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
                                            View Chapters <ArrowRight size={16} />
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
                            <h2 className="section-title">
                                {selectedDate === new Date().toISOString().split('T')[0] ? 'Studied Today' : 'Study Progress'}
                            </h2>
                            <div className="date-picker-container">
                                <input
                                    type="date"
                                    className="date-picker-input"
                                    value={selectedDate}
                                    onChange={handleDateChange}
                                    max={new Date().toISOString().split('T')[0]}
                                />
                                <span className="date-badge">
                                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                        </div>
                        <div className="today-activity-grid">
                            {todayActivity.map((sub, i) => (
                                <div key={i} className="today-activity-chip">
                                    <span className="chip-icon"><BookOpen size={16} color="#4f46e5" /></span>
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
                            <div className="stat-icon"><MessageSquare size={20} color="#4f46e5" /></div>
                            <div className="stat-value">{stats.totalChats}</div>
                            <div className="stat-label">Total Chats</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon"><FileText size={20} color="#ec4899" /></div>
                            <div className="stat-value">{stats.docsUploaded}</div>
                            <div className="stat-label">Documents Uploaded</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon"><Clock size={20} color="#f59e0b" /></div>
                            <div className="stat-value">{stats.hoursLearned}h</div>
                            <div className="stat-label">Hours Learned</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon"><Flame size={20} color="#ef4444" /></div>
                            <div className="stat-value">{stats.streak} Days</div>
                            <div className="stat-label">Study Streak</div>
                        </div>
                    </div>
                </div>

                {/* Bottom Content Area */}
                <div className="dashboard-bottom-content">
                    {/* Recent Achievements Section */}
                    <div className="achievements-section">
                        <div className="section-header">
                            <h2 className="section-title">Recent Achievements</h2>
                            <span className="view-all-link">View All</span>
                        </div>
                        <div className="achievements-grid">
                            {achievements.length > 0 ? (
                                achievements.slice(0, 3).map((achievement, idx) => {
                                    const iconTypeMap = {
                                        'trophy': Trophy,
                                        'flame': Flame,
                                        'book': BookOpen,
                                        'default': Trophy
                                    };
                                    const IconComponent = iconTypeMap[achievement.type] || Trophy;
                                    const colorClass = achievement.colorClass || 'gold';
                                    return (
                                        <div key={idx} className="achievement-card">
                                            <div className={`achievement-icon ${colorClass}`}><IconComponent size={20} /></div>
                                            <div className="achievement-info">
                                                <h3>{achievement.name}</h3>
                                                <p>{achievement.description}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="no-data-placeholder">No achievements yet. Keep studying!</p>
                            )}
                        </div>
                    </div>

                    {/* Recommended Next Steps */}
                    <div className="recommendations-section">
                        <div className="section-header">
                            <h2 className="section-title">Recommended Next Steps</h2>
                        </div>
                        <div className="recommendations-list">
                            {recommendations.length > 0 ? (
                                recommendations.map((rec, idx) => {
                                    const iconTypeMap = {
                                        'target': Target,
                                        'bot': Bot,
                                        'default': Target
                                    };
                                    const IconComponent = iconTypeMap[rec.iconType] || Target;
                                    const getColorForIcon = (type) => {
                                        const colors = {
                                            'target': '#10b981',
                                            'bot': '#4f46e5',
                                            'default': '#10b981'
                                        };
                                        return colors[type] || colors.default;
                                    };
                                    const handleAction = () => {
                                        if (rec.action === 'quiz') {
                                            navigate('/quiz');
                                        } else if (rec.action === 'chat') {
                                            navigate('/chat');
                                        }
                                    };
                                    return (
                                        <div key={idx} className="recommendation-item">
                                            <div className="rec-icon"><IconComponent size={20} color={getColorForIcon(rec.iconType)} /></div>
                                            <div className="rec-content">
                                                <h3>{rec.title}</h3>
                                                <p>{rec.description}</p>
                                            </div>
                                            <button className={`rec-btn ${rec.action === 'chat' ? 'btn-secondary' : ''}`} onClick={handleAction}>
                                                {rec.buttonText}
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="no-data-placeholder">No recommendations at the moment. Great work!</p>
                            )}
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    export default Dashboard;
