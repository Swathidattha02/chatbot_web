import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getSubjectsForClass } from "../config/syllabus";
import { 
    MessageSquare, Upload, BarChart3, BookOpen, 
    FileText, Clock, Flame, Trophy, Target, 
    Bot, Loader2, Play, ArrowRight, Calculator, 
    Microscope, Dna, Globe, Languages, Atom, 
    Beaker, Monitor, Megaphone, Inbox, Download
} from "lucide-react";
import Footer from "../components/Footer";
import "../styles/Dashboard.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const BASE_URL = API_BASE_URL.replace('/api', '');

function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
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
    const [alarmActive, setAlarmActive] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [violationReason, setViolationReason] = useState('');
    const [materials, setMaterials] = useState([]);

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

    const fetchMaterials = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/class-materials/student`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setMaterials(data.materials);
            }
        } catch (error) {
            console.error('Error fetching class materials:', error);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchMaterials();
        }
    }, [user, fetchMaterials]);

    // Load subjects based on user's class and fetch progress
    useEffect(() => {
        const fetchSubjectsAndProgress = async () => {
            try {
                if (user?.class) {
                    // Ensure user class is formatted as "Class X"
                    const normalizedClass = user.class.toString().trim().startsWith("Class")
                        ? user.class.toString().trim()
                        : `Class ${user.class.toString().trim()}`;

                    const classSubjects = getSubjectsForClass(normalizedClass);
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
                                userProgress = data.progress || [];
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

                {/* Class Materials & Announcements */}
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <Megaphone size={24} color="#f59e0b" />
                        <h2 className="section-title" style={{ fontSize: '24px', margin: 0 }}>Class Board</h2>
                        <span style={{ fontSize: '12px', background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '100px', fontWeight: 600 }}>
                            From your teacher
                        </span>
                    </div>

                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                        gap: '20px' 
                    }}>
                        {materials.length === 0 ? (
                            <div style={{ 
                                gridColumn: '1 / -1', 
                                padding: '40px', 
                                background: 'rgba(255, 255, 255, 0.05)', 
                                borderRadius: '20px', 
                                textAlign: 'center',
                                border: '2px dashed rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(10px)'
                            }}>
                                <Inbox size={48} color="rgba(255, 255, 255, 0.3)" style={{ marginBottom: '16px' }} />
                                <h3 style={{ color: 'white', marginBottom: '8px', opacity: 0.9 }}>Nothing shared yet</h3>
                                <p style={{ color: 'white', opacity: 0.6 }}>Your class teacher will share materials and announcements here.</p>
                            </div>
                        ) : (
                            materials.map((m) => (
                                <div key={m._id} style={{ 
                                    background: '#fff', 
                                    borderRadius: '16px', 
                                    padding: '20px', 
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                    border: '1px solid #f1f5f9',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ 
                                        position: 'absolute', 
                                        top: 0, 
                                        left: 0, 
                                        width: '4px', 
                                        height: '100%', 
                                        background: m.type === 'document' ? '#3b82f6' : '#f59e0b'
                                    }}></div>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                        <div style={{ 
                                            width: '40px', 
                                            height: '40px', 
                                            borderRadius: '10px', 
                                            background: m.type === 'document' ? '#eff6ff' : '#fff7ed',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {m.type === 'document' ? <FileText size={20} color="#3b82f6" /> : <Megaphone size={20} color="#f59e0b" />}
                                        </div>
                                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                                            {new Date(m.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    
                                    <h4 style={{ fontSize: '17px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>{m.title}</h4>
                                    <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: '1.5' }}>{m.description}</p>
                                    
                                    {m.type === 'document' && (
                                        <a 
                                            href={`${API_BASE_URL}/class-materials/download/${m._id}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            download={m.fileName}
                                            style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '8px', 
                                                background: '#f1f5f9', 
                                                padding: '10px 14px', 
                                                borderRadius: '10px',
                                                textDecoration: 'none',
                                                color: '#475569',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                            onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                        >
                                            <Download size={16} /> {m.fileName || 'Download Resource'}
                                        </a>
                                    )}
                                </div>
                            ))
                        )}
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
                            <h2 className="section-title">Studied Today</h2>
                            <span className="date-badge">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
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
                            <div className="achievement-card">
                                <div className="achievement-icon gold"><Trophy size={20} /></div>
                                <div className="achievement-info">
                                    <h3>Math Whiz</h3>
                                    <p>Scored 100% in Algebra Quiz</p>
                                </div>
                            </div>
                            <div className="achievement-card">
                                <div className="achievement-icon streak"><Flame size={20} /></div>
                                <div className="achievement-info">
                                    <h3>Consistent Learner</h3>
                                    <p>Maintained a 3-day streak</p>
                                </div>
                            </div>
                            <div className="achievement-card">
                                <div className="achievement-icon silver"><BookOpen size={20} /></div>
                                <div className="achievement-info">
                                    <h3>First Document</h3>
                                    <p>Uploaded and analyzed a PDF</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recommended Next Steps */}
                    <div className="recommendations-section">
                        <div className="section-header">
                            <h2 className="section-title">Recommended Next Steps</h2>
                        </div>
                        <div className="recommendations-list">
                            <div className="recommendation-item">
                                <div className="rec-icon"><Target size={20} color="#10b981" /></div>
                                <div className="rec-content">
                                    <h3>Take Chapter 3 Practice Quiz</h3>
                                    <p>You completed the chapter reading. Test your knowledge now!</p>
                                </div>
                                <button className="rec-btn">Start Quiz</button>
                            </div>
                            <div className="recommendation-item">
                                <div className="rec-icon"><Bot size={20} color="#4f46e5" /></div>
                                <div className="rec-content">
                                    <h3>Review Biology with AI</h3>
                                    <p>You struggled with 'Photosynthesis' in the last quiz. Have the chatbot explain it again.</p>
                                </div>
                                <button className="rec-btn btn-secondary">Chat Now</button>
                            </div>
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    export default Dashboard;
