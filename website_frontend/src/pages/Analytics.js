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
                                <h2 className="card-title-lg">{dailyData.totalHours} <span className="unit">Hours</span></h2>
                            </div>
                            <div className="trend-badge positive">
                                <span className="arrow">↗</span> +12% vs avg
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
                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
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
                                    <div className="time-stat">{Math.floor(sub.timeSpent / 60)}h {sub.timeSpent % 60}m</div>
                                    <div className="status-stat">✨ AI Assistant active</div>
                                </div>
                            </div>
                        )) : (
                            <div className="no-data-placeholder">No subjects studied yet today. Start learning!</div>
                        )}
                        <div className="view-all-footer">
                            <button className="view-all-btn">+ View all {dailyData.subjects.length} subjects</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderWeekView = () => {
        if (!weeklyData) return null;

        const weekChartData = [
            { day: 'MON', actual: 120, goal: 150 },
            { day: 'TUE', actual: 180, goal: 150 },
            { day: 'WED', actual: 140, goal: 150 },
            { day: 'THU', actual: 200, goal: 150 },
            { day: 'FRI', actual: 90, goal: 150 },
            { day: 'SAT', actual: 60, goal: 120 },
            { day: 'SUN', actual: 30, goal: 120 },
        ];

        return (
            <div className="analytics-view-container week-view">
                <div className="week-header-stats">
                    <div className="stat-box-card">
                        <span className="box-label">Total Study Time</span>
                        <div className="box-value-row">
                            <span className="value">18h 45m</span>
                            <span className="trend positive">↗ 12%</span>
                        </div>
                    </div>
                    <div className="stat-box-card">
                        <span className="box-label">Daily Average</span>
                        <div className="box-value-row">
                            <span className="value">2h 40m</span>
                            <span className="target">Target: 3h</span>
                        </div>
                    </div>
                    <div className="stat-box-card">
                        <span className="box-label">Top Subject</span>
                        <div className="box-value-row">
                            <span className="value">Mathematics</span>
                            <span className="icon-sigma">Σ</span>
                        </div>
                    </div>
                </div>

                <div className="chart-card-full">
                    <div className="card-header-flex">
                        <h3 className="section-title">STUDY TIME PER DAY</h3>
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
                                <Tooltip cursor={{ fill: '#F9FAFB' }} />
                                <Bar dataKey="actual" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={30} />
                                <Bar dataKey="goal" fill="#E5E7EB" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="subject-distribution-section">
                    <h3 className="section-title">Subject Distribution</h3>
                    <div className="subject-cards-grid">
                        {[
                            { name: 'Mathematics', val: '4h 20m', change: '+25%', color: '#3B82F6', icon: 'Σ' },
                            { name: 'Science', val: '3h 15m', change: 'Stable', color: '#8B5CF6', icon: '⚛️' },
                            { name: 'English', val: '2h 45m', change: '-5%', color: '#F59E0B', icon: '📖' },
                            { name: 'History', val: '1h 45m', change: '+10%', color: '#10B981', icon: '🌍' }
                        ].map((s, i) => (
                            <div key={i} className="mini-subject-card">
                                <div className="mini-header">
                                    <div className="mini-icon" style={{ backgroundColor: `${s.color}20`, color: s.color }}>{s.icon}</div>
                                    <span className={`mini-trend ${s.change.includes('+') ? 'pos' : s.change.includes('-') ? 'neg' : 'stable'}`}>
                                        {s.change} vs last week
                                    </span>
                                </div>
                                <h4 className="mini-name">{s.name}</h4>
                                <div className="mini-value">{s.val} total</div>
                                <div className="mini-progress-track">
                                    <div className="mini-progress-fill" style={{ width: '70%', backgroundColor: s.color }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderMonthView = () => {
        if (!monthlyData) return null;

        const monthChartData = [
            { week: 'Week 1', value: 30, goal: 40 },
            { week: 'Week 2', value: 45, goal: 40 },
            { week: 'Week 3', value: 55, goal: 40 },
            { week: 'Week 4', value: 35, goal: 40 },
        ];

        return (
            <div className="analytics-view-container month-view">
                <div className="streak-banner-month">
                    <div className="banner-icon-box">
                        <span className="icon">🔥</span>
                    </div>
                    <div className="banner-content">
                        <span className="banner-label">CURRENT STUDY STREAK</span>
                        <h2 className="banner-title">12 Days Straight</h2>
                    </div>
                    <div className="banner-best">
                        <span className="best-label">PERSONAL BEST</span>
                        <span className="best-value">24 Days</span>
                    </div>
                </div>

                <div className="chart-card-full month-chart">
                    <div className="card-header-flex">
                        <h3 className="section-title">Weekly Aggregated Study Time</h3>
                        <div className="legend-item"><span className="dot blue"></span> Study Hours</div>
                    </div>

                    <div className="chart-wrapper-full">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={monthChartData}>
                                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                                <Tooltip cursor={{ fill: '#F9FAFB' }} />
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
                                <span className="val">42.5 hrs</span>
                                <span className="change pos">+5.2%</span>
                            </div>
                            <p className="subtext">Against previous month</p>
                        </div>
                    </div>
                    <div className="bottom-stat-card">
                        <div className="stat-info full-width">
                            <span className="label">TOP SUBJECTS</span>
                            <div className="mini-subject-row">
                                <div className="sub-line-item">
                                    <span className="name">Algebra</span>
                                    <div className="line-track"><div className="line-fill blue" style={{ width: '90%' }}></div></div>
                                    <span className="val">18h</span>
                                </div>
                                <div className="sub-line-item">
                                    <span className="name">Geometry</span>
                                    <div className="line-track"><div className="line-fill light-blue" style={{ width: '65%' }}></div></div>
                                    <span className="val">12h</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bottom-stat-card">
                        <div className="icon-circle blue">💬</div>
                        <div className="stat-info">
                            <span className="label">AI VOICE HELP</span>
                            <div className="val-row">
                                <span className="val">84 <span className="tag">Active</span></span>
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
                    {view === 'week' && (
                        <div className="streak-badge-mini">
                            🔥 STREAK <span className="val">12 Days</span>
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
