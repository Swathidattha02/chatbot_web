import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import "../styles/Analytics.css";

function Analytics() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [view, setView] = useState("day"); // day, week, month
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Data states
    const [dailyData, setDailyData] = useState(null);
    const [weeklyData, setWeeklyData] = useState(null);
    const [monthlyData, setMonthlyData] = useState(null);

    const fetchDailyAnalytics = useCallback(async (date) => {
        try {
            const token = localStorage.getItem("token");
            const dateStr = date.toISOString().split('T')[0];
            const response = await fetch(`http://localhost:5000/api/progress/analytics/daily?date=${dateStr}`, {
                headers: { "Authorization": `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) setDailyData(data.analytics);
        } catch (error) {
            console.error("Error fetching daily analytics:", error);
        }
    }, []);

    const fetchWeeklyAnalytics = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch("http://localhost:5000/api/progress/analytics/weekly", {
                headers: { "Authorization": `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) setWeeklyData(data.analytics);
        } catch (error) {
            console.error("Error fetching weekly analytics:", error);
        }
    }, []);

    const fetchMonthlyAnalytics = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch("http://localhost:5000/api/progress/analytics/monthly", {
                headers: { "Authorization": `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) setMonthlyData(data.analytics);
        } catch (error) {
            console.error("Error fetching monthly analytics:", error);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        const load = async () => {
            if (view === "day") await fetchDailyAnalytics(selectedDate);
            else if (view === "week") await fetchWeeklyAnalytics();
            else if (view === "month") await fetchMonthlyAnalytics();
            setLoading(false);
        };
        load();
    }, [view, selectedDate, fetchDailyAnalytics, fetchWeeklyAnalytics, fetchMonthlyAnalytics]);

    const handlePreviousDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() - 1);
        setSelectedDate(newDate);
    };

    const handleNextDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + 1);
        setSelectedDate(newDate);
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const renderDayView = () => {
        if (!dailyData) return null;

        return (
            <div className="analytics-view-container day-view">
                <div className="top-row">
                    <div className="chart-card daily-time-card">
                        <div className="card-header-flex">
                            <div>
                                <span className="card-subtitle">DAILY STUDY TIME</span>
                                <h2 className="card-title-lg">{dailyData.totalHours} <span className="unit">Hours</span> {dailyData.totalMinutes} <span className="unit">Min</span></h2>
                            </div>
                            <div className="trend-badge positive">
                                <span className="arrow">↗</span> Dynamic
                            </div>
                        </div>

                        <div className="chart-wrapper-h">
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={dailyData.hourlyData}>
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {dailyData.hourlyData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.value > 0 ? "#7B9FE8" : "#F0F0F0"} />
                                        ))}
                                    </Bar>
                                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#999' }} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        formatter={(value) => [`${value}m`, 'Time Spent']}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="side-card streak-card">
                        <div className="streak-content">
                            <div className="streak-icon-bg">
                                <span className="fire-icon">🔥</span>
                            </div>
                            <h2 className="streak-value">{dailyData.streak} Day Streak!</h2>
                            <p className="streak-text">Keep it up, you're on fire!</p>

                            <div className="shoutout-card">
                                <div className="quote-icon">📍</div>
                                <p className="shoutout-text">
                                    "Great job, {user?.name || 'Explorer'}! You've stayed consistent with your targets today."
                                </p>
                            </div>

                            <button className="share-btn">Share Progress</button>
                        </div>
                    </div>
                </div>

                <div className="subjects-studied-section">
                    <div className="section-header-flex">
                        <h3 className="section-title"><span className="icon">📖</span> Subjects Studied Today</h3>
                    </div>

                    <div className="subjects-list">
                        {dailyData.subjects.length > 0 ? dailyData.subjects.map((sub, i) => (
                            <div key={i} className="subject-row-item">
                                <div className="subject-icon-box" style={{ backgroundColor: i % 2 === 0 ? '#E8F0FE' : '#F3E8FF' }}>
                                    {i % 2 === 0 ? '📐' : '⚛️'}
                                </div>
                                <div className="subject-info-main">
                                    <h4 className="sub-name">{sub.name}</h4>
                                    <p className="sub-detail">{sub.chapterName}</p>
                                </div>
                                <div className="subject-stats">
                                    <div className="time-stat">{Math.floor(sub.timeSpent / 60)}h {Math.round(sub.timeSpent % 60)}m</div>
                                    <div className={`status-stat ${sub.status === 'Completed' ? 'status-done' : 'status-ongoing'}`}>
                                        {sub.status === 'Completed' ? '✅ Completed' : '⏳ In Progress'}
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="no-data-placeholder">No subjects studied yet today. Start learning!</div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderWeekView = () => {
        if (!weeklyData) return null;

        const daysOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const weekChartData = daysOrder.map(day => ({
            day,
            actual: Math.round(weeklyData.dailyData[day] || 0),
            goal: 120
        }));

        return (
            <div className="analytics-view-container week-view">
                <div className="week-header-stats">
                    <div className="stat-box-card">
                        <span className="box-label">Total Study Time</span>
                        <div className="box-value-row">
                            <span className="value">
                                {Math.floor(weeklyData.totalTime / 60)}h {Math.round(weeklyData.totalTime % 60)}m
                            </span>
                            <span className="trend positive">↗ Dynamic</span>
                        </div>
                    </div>
                    <div className="stat-box-card">
                        <span className="box-label">Daily Average</span>
                        <div className="box-value-row">
                            <span className="value">
                                {Math.floor((weeklyData.totalTime / 7) / 60)}h {Math.round((weeklyData.totalTime / 7) % 60)}m
                            </span>
                            <span className="target">Target: 2h</span>
                        </div>
                    </div>
                    <div className="stat-box-card">
                        <span className="box-label">Top Subject</span>
                        <div className="box-value-row">
                            <span className="value">
                                {weeklyData.subjectProgress?.sort((a, b) => b.timeSpent - a.timeSpent)[0]?.name || 'N/A'}
                            </span>
                            <span className="icon-sigma">Σ</span>
                        </div>
                    </div>
                </div>

                <div className="chart-card-full">
                    <div className="card-header-flex">
                        <h3 className="section-title">STUDY TIME PER DAY (MINUTES)</h3>
                        <div className="legend-flex">
                            <div className="legend-item"><span className="dot blue"></span> Actual</div>
                            <div className="legend-item"><span className="dot light"></span> Goal</div>
                        </div>
                    </div>

                    <div className="chart-wrapper-full">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={weekChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                                <YAxis hide />
                                <Tooltip cursor={{ fill: '#F9FAFB' }} formatter={(value) => [`${value}m`, 'Time']} />
                                <Bar dataKey="actual" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={30} />
                                <Bar dataKey="goal" fill="#E5E7EB" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="subject-distribution-section">
                    <h3 className="section-title">Subject Performance</h3>
                    <div className="subject-cards-grid">
                        {weeklyData.subjectProgress?.map((s, i) => (
                            <div key={i} className="mini-subject-card">
                                <div className="mini-header">
                                    <div className="mini-icon" style={{ backgroundColor: '#E8F0FE', color: '#3B82F6' }}>📚</div>
                                    <span className={`mini-trend pos`}>
                                        {Math.round((s.topicsCompleted / s.totalTopics) * 100) || 0}% Done
                                    </span>
                                </div>
                                <h4 className="mini-name">{s.name}</h4>
                                <div className="mini-value">{Math.floor(s.timeSpent / 60)}h {Math.round(s.timeSpent % 60)}m total</div>
                                <div className="mini-progress-track">
                                    <div className="mini-progress-fill" style={{ width: `${(s.topicsCompleted / s.totalTopics) * 100}%`, backgroundColor: '#3B82F6' }}></div>
                                </div>
                            </div>
                        ))}
                        {(!weeklyData.subjectProgress || weeklyData.subjectProgress.length === 0) && (
                            <div className="no-data-placeholder">No subject data for this week.</div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderMonthView = () => {
        if (!monthlyData) return null;

        const monthChartData = (monthlyData.weeklyData || []).map((val, i) => ({
            week: `Week ${i + 1}`,
            value: Math.round(val),
            goal: 600 // 10 hours per week goal (in minutes)
        }));

        return (
            <div className="analytics-view-container month-view">
                <div className="streak-banner-month">
                    <div className="banner-icon-box">
                        <span className="icon">🔥</span>
                    </div>
                    <div className="banner-content">
                        <span className="banner-label">CURRENT STUDY STREAK</span>
                        <h2 className="banner-title">{monthlyData.streak} Days Straight</h2>
                    </div>
                    <div className="banner-best">
                        <span className="best-label">PERSONAL BEST</span>
                        <span className="best-value">{monthlyData.personalBest || 0} Days</span>
                    </div>
                </div>

                <div className="chart-card-full month-chart">
                    <div className="card-header-flex">
                        <h3 className="section-title">Weekly Aggregate (Minutes)</h3>
                        <div className="legend-item"><span className="dot blue"></span> Study Minutes</div>
                    </div>

                    <div className="chart-wrapper-full">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={monthChartData}>
                                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                                <Tooltip cursor={{ fill: '#F9FAFB' }} formatter={(value) => [`${value}m`, 'Time']} />
                                <Bar dataKey="value" fill="#2563EB" radius={[6, 6, 0, 0]} barSize={60} />
                                <Bar dataKey="goal" fill="#DBEAFE" radius={[6, 6, 0, 0]} barSize={60} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="month-bottom-stats">
                    <div className="bottom-stat-card">
                        <div className="icon-circle gray">⏱️</div>
                        <div className="stat-info">
                            <span className="label">TOTAL HOURS</span>
                            <div className="val-row">
                                <span className="val">{monthlyData.totalTime}h {monthlyData.totalMinutes}m</span>
                                <span className="change pos">↗ Dynamic</span>
                            </div>
                            <p className="subtext">Against previous month</p>
                        </div>
                    </div>
                    <div className="bottom-stat-card">
                        <div className="stat-info full-width">
                            <span className="label">TOP SUBJECTS</span>
                            <div className="mini-subject-row">
                                {monthlyData.subjectGrowth?.sort((a, b) => b.proficiency - a.proficiency).slice(0, 2).map((sub, i) => (
                                    <div key={i} className="sub-line-item">
                                        <span className="name">{sub.name}</span>
                                        <div className="line-track"><div className={`line-fill ${i === 0 ? 'blue' : 'light-blue'}`} style={{ width: `${sub.proficiency}%` }}></div></div>
                                        <span className="val">{sub.proficiency}%</span>
                                    </div>
                                ))}
                                {(!monthlyData.subjectGrowth || monthlyData.subjectGrowth.length === 0) && <p className="subtext">No data yet</p>}
                            </div>
                        </div>
                    </div>
                    <div className="bottom-stat-card">
                        <div className="icon-circle blue">💬</div>
                        <div className="stat-info">
                            <span className="label">AI ASSISTANT</span>
                            <div className="val-row">
                                <span className="val">{monthlyData.aiTutorQueries} <span className="tag">Queries</span></span>
                            </div>
                            <p className="subtext">Queries solved this month</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="analytics-page-wrapper">
            <div className="analytics-nav-header">
                <div className="nav-left">
                    <div className="view-selector-tabs">
                        <button className={`tab-btn ${view === 'day' ? 'active' : ''}`} onClick={() => setView('day')}>Day</button>
                        <button className={`tab-btn ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>Week</button>
                        <button className={`tab-btn ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>Month</button>
                    </div>
                </div>

                <div className="nav-center">
                    {view === 'day' && (
                        <div className="date-picker-control">
                            <button className="date-nav-btn" onClick={handlePreviousDay}>‹</button>
                            <div className="current-date-display">
                                <span className="calendar-icon">📅</span>
                                {formatDate(selectedDate)}
                            </div>
                            <button className="date-nav-btn" onClick={handleNextDay}>›</button>
                        </div>
                    )}
                    {(view === 'week' || view === 'month') && (
                        <h1 className="analytics-main-title">{view === 'week' ? 'My Progress' : 'Monthly Progress'}</h1>
                    )}
                </div>

                <div className="nav-right">
                    {view === 'month' && (
                        <button className="download-report-btn">📥 Download Report</button>
                    )}
                    {view === 'week' && weeklyData && (
                        <div className="streak-badge-mini">
                            🔥 STREAK <span className="val">{weeklyData.streak || 0} Days</span>
                        </div>
                    )}
                    {view === 'day' && (
                        <button onClick={() => navigate('/dashboard')} className="close-analytics-btn">✕</button>
                    )}
                </div>
            </div>

            <div className="analytics-body-content">
                {loading ? (
                    <div className="loading-container-analytics">
                        <div className="spinner-analytics"></div>
                        <p>Crunching your learning data...</p>
                    </div>
                ) : (
                    <>
                        {view === 'day' && renderDayView()}
                        {view === 'week' && renderWeekView()}
                        {view === 'month' && renderMonthView()}
                    </>
                )}
            </div>
        </div>
    );
}

export default Analytics;
