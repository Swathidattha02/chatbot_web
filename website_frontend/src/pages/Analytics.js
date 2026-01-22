import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "../styles/Analytics.css";

function Analytics() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [view, setView] = useState("weekly"); // weekly, monthly, yearly
    const [loading, setLoading] = useState(true);
    const [weeklyData, setWeeklyData] = useState(null);
    const [monthlyData, setMonthlyData] = useState(null);

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");

            if (view === "weekly") {
                const response = await fetch("http://localhost:5000/api/progress/analytics/weekly", {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    },
                });
                const data = await response.json();
                if (data.success) {
                    setWeeklyData(data.analytics);
                }
            } else if (view === "monthly") {
                const response = await fetch("http://localhost:5000/api/progress/analytics/monthly", {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    },
                });
                const data = await response.json();
                if (data.success) {
                    setMonthlyData(data.analytics);
                }
            }
        } catch (error) {
            console.error("Error fetching analytics:", error);
        }
        setLoading(false);
    }, [view]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const formatTime = (totalMinutes) => {
        if (!totalMinutes || totalMinutes === 0) return "0 min";

        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.round(totalMinutes % 60);

        if (hours === 0) {
            return `${minutes} min`;
        } else if (minutes === 0) {
            return `${hours}h`;
        } else {
            return `${hours}h ${minutes}m`;
        }
    };

    const getMaxValue = (data) => {
        if (!data) return 100;
        const values = Object.values(data);
        const max = Math.max(...values);
        return max > 0 ? max : 100;
    };

    const renderWeeklyView = () => {
        if (!weeklyData) return null;

        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const maxTime = getMaxValue(weeklyData.dailyData);

        return (
            <div className="analytics-content">
                {/* Total Time Card */}
                <div className="time-card">
                    <div className="time-label">TOTAL TIME INVESTED</div>
                    <div className="time-value">
                        {formatTime(weeklyData.totalTime)}
                        <span className="time-change">This Week</span>
                    </div>
                    <div className="time-meta">
                        <span className="meta-badge">● Active Learning</span>
                        <span className="meta-text">Keep it up!</span>
                    </div>
                </div>

                {/* Weekly Bar Chart */}
                <div className="chart-container">
                    <div className="bar-chart">
                        {days.map(day => (
                            <div key={day} className="bar-wrapper">
                                <div className="bar-column">
                                    <div
                                        className="bar"
                                        style={{
                                            height: `${(weeklyData.dailyData[day] / maxTime) * 100}%`,
                                        }}
                                    ></div>
                                </div>
                                <div className="bar-label">{day}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Progress by Subject and Time Distribution */}
                <div className="analytics-grid">
                    <div className="progress-section">
                        <div className="section-header-analytics">
                            <h3>Progress by Subject</h3>
                            <button className="view-details-btn">View Details</button>
                        </div>
                        <div className="subject-progress-grid">
                            {weeklyData.subjectProgress.slice(0, 4).map((subject, index) => {
                                const icons = ['📐', '⚛️', '📚', '🧪'];
                                const colors = ['#2196F3', '#9C27B0', '#4CAF50', '#FF9800'];
                                const percentage = Math.round((subject.topicsCompleted / subject.totalTopics) * 100) || 0;

                                return (
                                    <div key={index} className="subject-progress-card">
                                        <div className="subject-header">
                                            <span className="subject-icon" style={{ color: colors[index] }}>
                                                {icons[index]}
                                            </span>
                                            <span className="subject-name">{subject.name}</span>
                                            <span className="subject-percentage">{percentage}%</span>
                                        </div>
                                        <div className="progress-bar-analytics">
                                            <div
                                                className="progress-fill-analytics"
                                                style={{
                                                    width: `${percentage}%`,
                                                    backgroundColor: colors[index]
                                                }}
                                            ></div>
                                        </div>
                                        <div className="subject-meta">
                                            {subject.topicsCompleted}/{subject.totalTopics} Topics completed this week
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="time-distribution-section">
                        <h3>Time Distribution</h3>
                        <div className="donut-chart-container">
                            <div className="donut-chart">
                                <div className="donut-center">
                                    <div className="donut-label">Top 5</div>
                                    <div className="donut-sublabel">Subjects</div>
                                </div>
                            </div>
                        </div>
                        <div className="distribution-legend">
                            {weeklyData.subjectProgress.slice(0, 4).map((subject, index) => {
                                const colors = ['#2196F3', '#9C27B0', '#4CAF50', '#FF9800'];

                                return (
                                    <div key={index} className="legend-item">
                                        <span className="legend-dot" style={{ backgroundColor: colors[index] }}></span>
                                        <span className="legend-name">{subject.name}</span>
                                        <span className="legend-value">{formatTime(subject.timeSpent)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderMonthlyView = () => {
        if (!monthlyData) return null;

        const weeks = ['WEEK 1', 'WEEK 2', 'WEEK 3', 'WEEK 4'];

        return (
            <div className="analytics-content">
                {/* Learning Consistency */}
                <div className="consistency-section">
                    <div className="consistency-left">
                        <div className="consistency-header">
                            <h3>Learning Consistency (Past 30 Days)</h3>
                            <span className="info-icon">ⓘ</span>
                        </div>
                        <div className="consistency-value">
                            <span className="consistency-percentage">{monthlyData.consistency}%</span>
                            <span className="consistency-label">Consistent</span>
                            <span className="consistency-change">+12% vs last month</span>
                        </div>

                        {/* Line Chart */}
                        <div className="line-chart">
                            <svg viewBox="0 0 500 150" className="line-chart-svg">
                                <path
                                    d={`M 0,${150 - monthlyData.weeklyData[0]} 
                                        L 125,${150 - monthlyData.weeklyData[1]} 
                                        L 250,${150 - monthlyData.weeklyData[2]} 
                                        L 375,${150 - monthlyData.weeklyData[3]} 
                                        L 500,${150 - monthlyData.weeklyData[3] * 0.8}`}
                                    fill="none"
                                    stroke="#2196F3"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="week-labels">
                                {weeks.map((week, i) => (
                                    <span key={i} className="week-label">{week}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="achievements-card">
                        <h3>Monthly Achievements</h3>
                        <div className="achievement-item">
                            <span className="achievement-icon">⏱️</span>
                            <div className="achievement-details">
                                <div className="achievement-label">Total Study Time</div>
                                <div className="achievement-value">
                                    {monthlyData.totalMinutesSpent
                                        ? formatTime(monthlyData.totalMinutesSpent)
                                        : '0 min'
                                    }
                                </div>
                            </div>
                        </div>
                        <div className="achievement-item">
                            <span className="achievement-icon">📚</span>
                            <div className="achievement-details">
                                <div className="achievement-label">Chapters Completed</div>
                                <div className="achievement-value">{monthlyData.chaptersCompleted} Chapters</div>
                            </div>
                        </div>
                        <div className="achievement-item">
                            <span className="achievement-icon">✨</span>
                            <div className="achievement-details">
                                <div className="achievement-label">AI Tutor Interactions</div>
                                <div className="achievement-value">{monthlyData.aiTutorQueries || 0} Queries</div>
                            </div>
                        </div>
                        <div className="goal-progress">
                            <div className="goal-label">Monthly Goal Progress</div>
                            <div className="goal-bar">
                                <div className="goal-fill" style={{ width: `${monthlyData.consistency}%` }}></div>
                            </div>
                            <div className="goal-percentage">{monthlyData.consistency}%</div>
                        </div>
                    </div>
                </div>

                {/* Subject Growth Analysis */}
                <div className="growth-section">
                    <div className="section-header-analytics">
                        <h3>Subject Growth Analysis</h3>
                        <button className="view-details-btn">View Detailed Log →</button>
                    </div>
                    <div className="growth-grid">
                        {monthlyData.subjectGrowth.map((subject, index) => {
                            const icons = ['📐', '🔬', '📖', '🌍'];
                            const colors = ['#2196F3', '#4CAF50', '#FF9800', '#00BCD4'];
                            const proficiency = subject.proficiency || 0;
                            const statusLabel = proficiency >= 80 ? 'Excellent' : proficiency >= 50 ? 'Good' : 'Keep Going';
                            const statusColor = proficiency >= 80 ? '#4CAF50' : proficiency >= 50 ? '#2196F3' : '#FF9800';

                            return (
                                <div key={index} className="growth-card">
                                    <div className="growth-header">
                                        <span className="growth-icon" style={{ backgroundColor: colors[index] }}>
                                            {icons[index]}
                                        </span>
                                        <div className="growth-badge" style={{ color: statusColor, borderColor: statusColor, border: '1px solid', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                                            {statusLabel}
                                        </div>
                                    </div>
                                    <h4 className="growth-subject-name">{subject.name}</h4>
                                    <p className="growth-subtitle">
                                        {subject.name === 'Mathematics' ? 'Algebra & Trigonometry' :
                                            subject.name === 'Science' ? 'Cell Biology & Genetics' :
                                                subject.name === 'English Literature' ? 'Classical Poetry Analysis' :
                                                    'Modern World History'}
                                    </p>
                                    <div className="proficiency-section">
                                        <div className="proficiency-label">PROFICIENCY</div>
                                        <div className="proficiency-bar">
                                            <div
                                                className="proficiency-fill"
                                                style={{
                                                    width: `${subject.proficiency}%`,
                                                    backgroundColor: colors[index]
                                                }}
                                            ></div>
                                        </div>
                                        <div className="proficiency-value">{subject.proficiency}%</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="analytics-container">
            <div className="analytics-header">
                <div className="header-left">
                    <button onClick={() => navigate('/dashboard')} className="back-btn-analytics">
                        ← Back
                    </button>
                    <div className="header-title-section">
                        <h1 className="analytics-title">
                            {view === 'weekly' ? 'Student Progress' : 'Monthly Progress'}
                        </h1>
                        <p className="analytics-subtitle">
                            {view === 'weekly'
                                ? 'Track your weekly learning journey and subject mastery'
                                : `Detailed overview of your grade ${user?.class?.split(' ')[1] || '10'} learning journey this month.`
                            }
                        </p>
                    </div>
                </div>
                <div className="header-right">
                    <div className="view-toggle">
                        <button
                            className={`toggle-btn ${view === 'weekly' ? 'active' : ''}`}
                            onClick={() => setView('weekly')}
                        >
                            Weekly
                        </button>
                        <button
                            className={`toggle-btn ${view === 'monthly' ? 'active' : ''}`}
                            onClick={() => setView('monthly')}
                        >
                            Monthly
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading-analytics">
                    <div className="spinner"></div>
                    <p>Loading analytics...</p>
                </div>
            ) : (
                <>
                    {view === 'weekly' && renderWeeklyView()}
                    {view === 'monthly' && renderMonthlyView()}
                </>
            )}
        </div>
    );
}

export default Analytics;
