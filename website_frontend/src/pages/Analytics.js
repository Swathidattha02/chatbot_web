import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
    Clock,
    Flame,
    Calendar,
    TrendingUp,
    MapPin,
    BookOpen,
    CheckCircle2,
    Download,
    X,
    ChevronLeft,
    ChevronRight,
    MessageCircle,
    Ruler,
    Atom,
    Search
} from "lucide-react";
import "../styles/Analytics.css";
import CustomCalendar from "../components/CustomCalendar";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function Analytics() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [view, setView] = useState("day"); // day, week, month
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const pickerRef = useRef(null);

    // Data states
    const [dailyData, setDailyData] = useState(null);
    const [weeklyData, setWeeklyData] = useState(null);
    const [monthlyData, setMonthlyData] = useState(null);

    const fetchDailyAnalytics = useCallback(async (date) => {
        try {
            const token = localStorage.getItem("token");
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const response = await fetch(`${API_BASE_URL}/progress/analytics/daily?date=${dateStr}`, {
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
            const response = await fetch(`${API_BASE_URL}/progress/analytics/weekly`, {
                headers: { "Authorization": `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) setWeeklyData(data.analytics);
        } catch (error) {
            console.error("Error fetching weekly analytics:", error);
        }
    }, []);

    const fetchMonthlyAnalytics = useCallback(async (date) => {
        try {
            const token = localStorage.getItem("token");
            const m = date.getMonth() + 1;
            const y = date.getFullYear();
            const response = await fetch(`${API_BASE_URL}/progress/analytics/monthly?month=${m}&year=${y}`, {
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
            else if (view === "month") await fetchMonthlyAnalytics(selectedDate);
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
                                <TrendingUp size={12} /> Dynamic
                            </div>
                        </div>

                        <div className="chart-wrapper-h">
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={dailyData.hourlyData}>
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={30}>
                                        {dailyData.hourlyData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.value > 0 ? "#1e1b4b" : "#F0F0F0"} />
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
                                <Flame size={32} color="#f59e0b" />
                            </div>
                            <h2 className="streak-value">{dailyData.streak} Day Streak!</h2>
                            <p className="streak-text">Keep it up, you're on fire!</p>

                            <div className="shoutout-card">
                                <div className="quote-icon"><MapPin size={16} /></div>
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
                        <h3 className="section-title"><BookOpen size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Today's Learning Activity</h3>
                    </div>

                    <div className="subjects-list">
                        {console.log("Daily Subjects Data:", dailyData.subjects)}
                        {dailyData.subjects.length > 0 ? dailyData.subjects.map((sub, i) => (
                            <div
                                key={i}
                                className="subject-row-item"
                                title={sub.sessions && sub.sessions.length > 0
                                    ? `Study Sessions:\n${sub.sessions.map(s => `• ${s.startTime}${s.endTime ? ` to ${s.endTime}` : ''} (${Math.round(s.duration)} min)`).join('\n')}`
                                    : 'No session details'}
                            >
                                <div className="subject-icon-box" style={{ backgroundColor: i % 2 === 0 ? '#E8F0FE' : '#F3E8FF' }}>
                                    {i % 2 === 0 ? <Ruler size={18} color="#1e1b4b" /> : <Atom size={18} color="#4f46e5" />}
                                </div>
                                <div className="subject-info-main">
                                    <h4 className="sub-name">{sub.name}</h4>
                                    <p className="sub-detail">{sub.chapterName}</p>
                                </div>
                                <div className="subject-stats">
                                    {sub.sessions && sub.sessions.length > 0 && (() => {
                                        // Get the earliest start time and latest end time
                                        const firstSession = sub.sessions[0];
                                        const lastSession = sub.sessions[sub.sessions.length - 1];

                                        // If endTime is not available, calculate it from startTime + duration
                                        let endTimeDisplay = lastSession.endTime;
                                        if (!endTimeDisplay && lastSession.startTime) {
                                            // This is a fallback - ideally all sessions should have endTime
                                            endTimeDisplay = lastSession.startTime;
                                        }

                                        return (
                                            <div className="session-time-display">
                                                <span className="time-label"><Clock size={12} /> Session:</span>
                                                <span className="time-value">
                                                    {firstSession.startTime} - {endTimeDisplay || 'Unknown'}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                    <div className="time-stat">{Math.floor(sub.timeSpent / 60)}h {Math.round(sub.timeSpent % 60)}m</div>
                                    <div className={`status-stat ${sub.status === 'Completed' ? 'status-done' : 'status-ongoing'}`}>
                                        {sub.status === 'Completed' ? <><CheckCircle2 size={12} /> Completed</> : <><Clock size={12} /> In Progress</>}
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
        const subjects = weeklyData.subjectProgress || [];

        // Activity Levels for Heatmap
        const getActivityLevel = (minutes) => {
            if (minutes <= 0) return 'level-0';
            if (minutes < 30) return 'level-1';
            if (minutes < 60) return 'level-2';
            return 'level-3';
        };

        return (
            <div className="analytics-view-container week-view">
                <div className="week-header-stats">
                    <div className="stat-box-card">
                        <span className="box-label">Total Study Time</span>
                        <div className="box-value-row">
                            <span className="value">
                                {Math.floor(weeklyData.totalTime / 60)}h {Math.round(weeklyData.totalTime % 60)}m
                            </span>
                            <span className="trend positive"><TrendingUp size={12} /> Dynamic</span>
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
                        <span className="box-label">Current Streak</span>
                        <div className="box-value-row">
                            <span className="value">{weeklyData.streak} Days</span>
                            <span className="fire-icon-mini"><Flame size={16} color="#f59e0b" /></span>
                        </div>
                    </div>
                </div>

                <div className="chart-card-full heatmap-card">
                    <div className="card-header-flex">
                        <div>
                            <h3 className="section-title">Learning Activity</h3>
                            <p className="section-subtitle">Subjects vs Last 7 Days</p>
                        </div>
                        <div className="heatmap-legend">
                            <span>Less</span>
                            <div className="legend-cells">
                                <div className="legend-cell level-0"></div>
                                <div className="legend-cell level-1"></div>
                                <div className="legend-cell level-2"></div>
                                <div className="legend-cell level-3"></div>
                            </div>
                            <span>More</span>
                        </div>
                    </div>

                    <div className="heatmap-container-scroll">
                        <div className="heatmap-grid">
                            <div className="heatmap-header-row">
                                <div className="subject-label-empty"></div>
                                {daysOrder.map(day => (
                                    <div key={day} className="day-label">{day}</div>
                                ))}
                            </div>

                            {subjects.length > 0 ? subjects.map((sub, i) => (
                                <div key={i} className="heatmap-row">
                                    <div className="subject-label" title={sub.name}>{sub.name}</div>
                                    {daysOrder.map(day => {
                                        const minutes = sub.dailyBreakdown?.[day] || 0;
                                        return (
                                            <div
                                                key={day}
                                                className={`heatmap-cell ${getActivityLevel(minutes)}`}
                                                title={`${sub.name} - ${day}: ${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`}
                                            >
                                                {minutes > 0 && <span className="cell-value">{Math.round(minutes)}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )) : (
                                <div className="no-data-placeholder">Not enough data to show activity heatmap.</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="subject-distribution-section">
                    <h3 className="section-title">Weekly Growth</h3>
                    <div className="subject-cards-grid">
                        {subjects.map((s, i) => (
                            <div key={i} className="mini-subject-card">
                                <div className="mini-header">
                                    <div className="mini-icon" style={{ backgroundColor: '#eef2ff', color: '#1e1b4b' }}><BookOpen size={16} /></div>
                                    <span className="mini-trend pos">
                                        {Math.round((s.topicsCompleted / s.totalTopics) * 100) || 0}% Mastery
                                    </span>
                                </div>
                                <h4 className="mini-name">{s.name}</h4>
                                <div className="mini-value">{Math.floor(s.timeSpent / 60)}h {Math.round(s.timeSpent % 60)}m active</div>
                                <div className="mini-progress-track">
                                    <div className="mini-progress-fill" style={{ width: `${(s.topicsCompleted / s.totalTopics) * 100}%`, backgroundColor: '#1e1b4b' }}></div>
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

        const monthChartData = (monthlyData.weeklyData || []).map((val, i) => ({
            week: `Week ${i + 1}`,
            value: Math.round(val),
            goal: 600 // 10 hours per week goal (in minutes)
        }));

        return (
            <div className="analytics-view-container month-view">
                <div className="streak-banner-month">
                    <div className="banner-icon-box">
                        <Flame size={32} color="#fff" />
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
                                <Bar dataKey="value" fill="#1e1b4b" radius={[6, 6, 0, 0]} barSize={60} />
                                <Bar dataKey="goal" fill="#eef2ff" radius={[6, 6, 0, 0]} barSize={60} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="month-bottom-stats">
                    <div className="bottom-stat-card">
                        <div className="icon-circle gray"><Clock size={20} /></div>
                        <div className="stat-info">
                            <span className="label">TOTAL HOURS</span>
                            <div className="val-row">
                                <span className="val">{monthlyData.totalTime}h {monthlyData.totalMinutes}m</span>
                                <span className="change pos"><TrendingUp size={12} /> Dynamic</span>
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
                                        <div className="line-track"><div className={`line-fill ${i === 0 ? 'navy' : 'indigo'}`} style={{ width: `${sub.proficiency}%`, backgroundColor: i === 0 ? '#1e1b4b' : '#4f46e5' }}></div></div>
                                        <span className="val">{sub.proficiency}%</span>
                                    </div>
                                ))}
                                {(!monthlyData.subjectGrowth || monthlyData.subjectGrowth.length === 0) && <p className="subtext">No data yet</p>}
                            </div>
                        </div>
                    </div>
                    <div className="bottom-stat-card">
                        <div className="icon-circle blue"><MessageCircle size={20} /></div>
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

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                setIsPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDateChange = (date) => {
        setSelectedDate(date);
        setIsPickerOpen(false);
    };

    const triggerDatePicker = () => {
        setIsPickerOpen(!isPickerOpen);
    };

    return (
        <div className="analytics-page-wrapper">
            <div className="analytics-nav-header">
                <div className="nav-left">
                    <button onClick={() => navigate('/dashboard')} className="analytics-back-btn"><ChevronLeft size={20} /> Back</button>
                    <div className="view-selector-tabs">
                        <button className={`tab-btn ${view === 'day' ? 'active' : ''}`} onClick={() => setView('day')}>Day</button>
                        <button className={`tab-btn ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>Week</button>
                        <button className={`tab-btn ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>Month</button>
                    </div>
                </div>

                <div className="nav-center" ref={pickerRef}>
                    {view === 'day' && (
                        <div className="date-picker-control">
                            <button className="date-nav-btn" onClick={handlePreviousDay} title="Previous Day"><ChevronLeft size={16} /></button>
                            <div className="current-date-display" onClick={triggerDatePicker} title="Select specific date">
                                <Calendar size={18} style={{ color: '#6366f1', marginRight: '8px' }} />
                                {formatDate(selectedDate)}
                                <Search size={14} style={{ marginLeft: '10px', opacity: 0.5 }} />
                            </div>
                            <button className="date-nav-btn" onClick={handleNextDay} title="Next Day"><ChevronRight size={16} /></button>

                            {isPickerOpen && (
                                <CustomCalendar
                                    selectedDate={selectedDate}
                                    onDateSelect={handleDateChange}
                                    onClose={() => setIsPickerOpen(false)}
                                    type="date"
                                />
                            )}
                        </div>
                    )}
                    {view === 'month' && (
                        <div className="date-picker-control month-picker-mode">
                            <div className="current-date-display" onClick={triggerDatePicker} title="Select specific month">
                                <Calendar size={18} style={{ color: '#6366f1', marginRight: '8px' }} />
                                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                <Search size={14} style={{ marginLeft: '10px', opacity: 0.5 }} />
                            </div>

                            {isPickerOpen && (
                                <CustomCalendar
                                    selectedDate={selectedDate}
                                    onDateSelect={handleDateChange}
                                    onClose={() => setIsPickerOpen(false)}
                                    type="month"
                                />
                            )}
                        </div>
                    )}
                    {view === 'week' && (
                        <h1 className="analytics-main-title">My Progress</h1>
                    )}
                </div>

                <div className="nav-right">
                    {(view === 'month' || view === 'day') && (
                        <div className="search-hint">Click date to search</div>
                    )}
                    {view === 'month' && (
                        <button className="download-report-btn"><Download size={16} /> Download Report</button>
                    )}
                    {view === 'week' && weeklyData && (
                        <div className="streak-badge-mini">
                            <Flame size={14} color="#f59e0b" style={{ marginRight: '4px' }} /> STREAK <span className="val">{weeklyData.streak || 0} Days</span>
                        </div>
                    )}
                    {view === 'day' && (
                        <button onClick={() => navigate('/dashboard')} className="close-analytics-btn"><X size={20} title="Close" /></button>
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
