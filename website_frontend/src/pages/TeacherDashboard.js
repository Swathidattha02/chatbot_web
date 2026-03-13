import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
    BookOpen, FileText, Search, CheckCircle, XCircle, 
    Star, BarChart3, AlertTriangle, Calendar, Download,
    TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
    Inbox, LogOut, Eye
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../styles/TeacherDashboard.css";
import ViolationTable from "../components/ViolationTable";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const SUBJECTS = ["Mathematics", "Science", "Social Studies", "Telugu", "English", "Hindi"];

function TeacherDashboard() {
    const navigate = useNavigate();
    const [teacher, setTeacher] = useState(null);
    const [stats, setStats] = useState(null);
    const [students, setStudents] = useState([]);
    const [pendingStudents, setPendingStudents] = useState([]);
    const [quizResults, setQuizResults] = useState([]);
    const [violations, setViolations] = useState([]);
    const [violationStats, setViolationStats] = useState(null);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("dashboard"); // dashboard | pending | quizzes
    const [actionMsg, setActionMsg] = useState("");
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    // View controls
    const [view, setView] = useState("Daily"); // Daily | Weekly | Monthly
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const studentsPerPage = 10;

    // Get stored teacher from localStorage
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token");

    const fetchDashboard = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE}/teacher/dashboard`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data.success) {
                setTeacher(res.data.teacher);
                setStats(res.data.stats);
                setStudents(res.data.students);
                setFiltered(res.data.students);
            } else {
                // Use fallback demo data if backend unavailable
                loadDemoData();
            }
        } catch (err) {
            if (err.response?.status === 401) {
                navigate("/login");
            } else {
                loadDemoData();
            }
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, navigate]);

    const fetchPendingStudents = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/teacher/pending-students`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data.success) setPendingStudents(res.data.students);
        } catch { }
    }, [token]);

    const fetchQuizResults = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/quiz/class-results`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data.success) setQuizResults(res.data.quizzes);
        } catch { }
    }, [token]);

    const fetchViolations = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/teacher/violations`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data.success) {
                setViolations(res.data.violations);
                setViolationStats(res.data.stats);
            }
        } catch { }
    }, [token]);

    const handleApproveStudent = async (studentId, studentName) => {
        try {
            const res = await axios.post(`${API_BASE}/teacher/approve-student/${studentId}`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data.success) {
                setActionMsg(
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <CheckCircle size={16} color="#10b981" /> {studentName} approved!
                    </span>
                );
                fetchPendingStudents();
                fetchDashboard();
                setTimeout(() => setActionMsg(""), 4000);
            }
        } catch { setActionMsg("Action failed."); }
    };

    const handleRejectStudent = async (studentId, studentName) => {
        const reason = window.prompt(`Reason for rejecting ${studentName}:`) || "Not approved by class teacher.";
        try {
            const res = await axios.post(`${API_BASE}/teacher/reject-student/${studentId}`, { reason }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data.success) {
                setActionMsg(
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <XCircle size={16} color="#ef4444" /> {studentName} rejected.
                    </span>
                );
                fetchPendingStudents();
                setTimeout(() => setActionMsg(""), 4000);
            }
        } catch { setActionMsg("Action failed."); }
    };

    const loadDemoData = () => {
        const demoTeacher = {
            name: storedUser.name || "Mr. Sharma",
            schoolName: storedUser.schoolName || "Global Public School",
            assignedClass: storedUser.assignedClass || "10",
            assignedSection: storedUser.assignedSection || "A",
        };

        const demoStudents = [
            {
                _id: "1", name: "Aditya Rao", rollNumber: "10101", totalCompletion: 91,
                subjectProgress: {
                    "Mathematics": { chapter: "Sets & Relations", completion: 95 },
                    "Science": { chapter: "Refraction", completion: 88 },
                    "Social Studies": { chapter: "Indian Economy", completion: 100 },
                    "Telugu": { chapter: "Vemana Satakam", completion: 92 },
                    "English": { chapter: "Julius Caesar", completion: 85 },
                    "Hindi": { chapter: "Gully Danda", completion: 90 },
                },
            },
            {
                _id: "2", name: "Sneha Reddy", rollNumber: "10102", totalCompletion: 82,
                subjectProgress: {
                    "Mathematics": { chapter: "Sets & Relations", completion: 78 },
                    "Science": { chapter: "Refraction", completion: 82 },
                    "Social Studies": { chapter: "Indian Economy", completion: 75 },
                    "Telugu": { chapter: "Vemana Satakam", completion: 88 },
                    "English": { chapter: "Julius Caesar", completion: 90 },
                    "Hindi": { chapter: "Gully Danda", completion: 80 },
                },
            },
            {
                _id: "3", name: "Vikram Singh", rollNumber: "10103", totalCompletion: 51,
                subjectProgress: {
                    "Mathematics": { chapter: "Sets & Relations", completion: 45 },
                    "Science": { chapter: "Refraction", completion: 52 },
                    "Social Studies": { chapter: "Indian Economy", completion: 60 },
                    "Telugu": { chapter: "Vemana Satakam", completion: 48 },
                    "English": { chapter: "Julius Caesar", completion: 55 },
                    "Hindi": { chapter: "Gully Danda", completion: 50 },
                },
            },
            {
                _id: "4", name: "Priya Sharma", rollNumber: "10104", totalCompletion: 76,
                subjectProgress: {
                    "Mathematics": { chapter: "Sets & Relations", completion: 80 },
                    "Science": { chapter: "Refraction", completion: 74 },
                    "Social Studies": { chapter: "Indian Economy", completion: 82 },
                    "Telugu": { chapter: "Vemana Satakam", completion: 70 },
                    "English": { chapter: "Julius Caesar", completion: 78 },
                    "Hindi": { chapter: "Gully Danda", completion: 72 },
                },
            },
            {
                _id: "5", name: "Rahul Mehta", rollNumber: "10105", totalCompletion: 65,
                subjectProgress: {
                    "Mathematics": { chapter: "Sets & Relations", completion: 62 },
                    "Science": { chapter: "Refraction", completion: 70 },
                    "Social Studies": { chapter: "Indian Economy", completion: 65 },
                    "Telugu": { chapter: "Vemana Satakam", completion: 60 },
                    "English": { chapter: "Julius Caesar", completion: 68 },
                    "Hindi": { chapter: "Gully Danda", completion: 65 },
                },
            },
        ];

        const classAvg = Math.round(demoStudents.reduce((s, st) => s + st.totalCompletion, 0) / demoStudents.length);

        setTeacher(demoTeacher);
        setStats({
            topPerformer: demoStudents[0],
            classAverage: classAvg,
            atRiskCount: demoStudents.filter((s) => s.totalCompletion < 60).length,
            totalStudents: demoStudents.length,
        });
        setStudents(demoStudents);
        setFiltered(demoStudents);
    };

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }
        fetchDashboard();
        fetchPendingStudents();
        fetchQuizResults();
    }, [fetchDashboard, fetchPendingStudents, fetchQuizResults, token, navigate]);

    // Search filter
    useEffect(() => {
        const q = searchQuery.toLowerCase();
        setFiltered(
            students.filter(
                (s) =>
                    s.name.toLowerCase().includes(q) ||
                    (s.rollNumber && s.rollNumber.toLowerCase().includes(q))
            )
        );
        setCurrentPage(1);
    }, [searchQuery, students]);

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    const handleExportData = () => {
        if (!filtered || filtered.length === 0) {
            alert("No data available to export.");
            return;
        }

        // CSV Header
        const headers = ["Student Name", "Roll Number", ...SUBJECTS, "Total Completion (%)"];
        
        // CSV Rows
        const rows = filtered.map(student => {
            const subjectPct = SUBJECTS.map(subj => {
                const data = student.subjectProgress?.[subj];
                return data ? `${data.completion}%` : "0%";
            });
            return [
                `"${student.name}"`,
                `"${student.rollNumber || "N/A"}"`,
                ...subjectPct.map(v => `"${v}"`),
                `"${student.totalCompletion}%"`
            ];
        });

        // Combine Header and Rows
        const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
        
        // Create Blob and Download
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Student_Progress_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getInitials = (name) =>
        name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();

    const getCompletionColor = (pct) => {
        if (pct >= 85) return "#16a34a";
        if (pct >= 60) return "#2563eb";
        return "#dc2626";
    };

    const getTotalColor = (pct) => {
        if (pct >= 85) return "#16a34a";
        if (pct >= 60) return "#1a202c";
        return "#dc2626";
    };

    // Pagination
    const totalPages = Math.ceil(filtered.length / studentsPerPage);
    const paginated = filtered.slice(
        (currentPage - 1) * studentsPerPage,
        currentPage * studentsPerPage
    );

    if (loading) {
        return (
            <div className="td-loading">
                <div className="td-spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    const avatarColors = [
        "#e0f2fe", "#dcfce7", "#fef9c3", "#fce7f3",
        "#ede9fe", "#fee2e2", "#f0fdf4", "#fff7ed",
    ];

    return (
        <div className="td-container">
            {/* ── Top Navbar ─────────────────────────────────────── */}
            <header className="td-navbar">
                <div className="td-navbar-left">
                    <div className="td-school-logo"><BookOpen size={24} color="#4f46e5" /></div>
                    <div>
                        <div className="td-school-name">
                            {teacher?.schoolName || "School"}
                        </div>
                        <div className="td-class-info">
                            Class {teacher?.assignedClass}-{teacher?.assignedSection} •{" "}
                            Academic Year 2023-24
                        </div>
                    </div>
                </div>

                <nav className="td-nav-links">
                    <button
                        className={`td-nav-link ${activeTab === "dashboard" ? "active" : ""}`}
                        onClick={() => setActiveTab("dashboard")}
                    >Dashboard</button>
                    <button
                        className={`td-nav-link ${activeTab === "pending" ? "active" : ""}`}
                        onClick={() => setActiveTab("pending")}
                        style={{ position: "relative" }}
                    >
                        Student Approvals
                        {pendingStudents.length > 0 && (
                            <span className="td-pending-badge">{pendingStudents.length}</span>
                        )}
                    </button>
                    <button
                        className={`td-nav-link ${activeTab === "quizzes" ? "active" : ""}`}
                        onClick={() => { setActiveTab("quizzes"); fetchQuizResults(); }}
                        style={{ position: "relative", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                        <FileText size={16} /> Quiz Results
                        {quizResults.length > 0 && (
                            <span className="td-pending-badge" style={{ background: "#6366f1" }}>{quizResults.length}</span>
                        )}
                    </button>
                    <button
                        className={`td-nav-link ${activeTab === "violations" ? "active" : ""}`}
                        onClick={() => { setActiveTab("violations"); fetchViolations(); }}
                        style={{ position: "relative", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                        <Eye size={16} /> Violations
                        {violationStats?.last24h > 0 && (
                            <span className="td-pending-badge" style={{ background: "#ef4444" }}>{violationStats.last24h}</span>
                        )}
                    </button>
                </nav>

                <div className="td-search-bar">
                    <span><Search size={16} color="#94a3b8" /></span>
                    <input
                        type="text"
                        placeholder="Search student name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="td-teacher-info" onClick={handleLogout} title="Click to logout">
                    <div>
                        <div className="td-teacher-name">{teacher?.name || storedUser.name}</div>
                        <div className="td-teacher-role">CLASS TEACHER</div>
                    </div>
                    <div className="td-teacher-avatar">
                        {getInitials(teacher?.name || storedUser.name || "T")}
                    </div>
                </div>
            </header>

            <main className="td-main">
                {/* ── Pending Students Tab ─────────────────────────── */}
                {activeTab === "pending" && (
                    <div className="td-pending-section">
                        <h2 className="td-section-title">Pending Student Approvals</h2>
                        <p className="td-section-subtitle">
                            Students from Class {teacher?.assignedClass}-{teacher?.assignedSection} waiting for your approval.
                        </p>
                        {actionMsg && <div className="td-action-msg">{actionMsg}</div>}
                        {pendingStudents.length === 0 ? (
                            <div className="td-empty" style={{ textAlign: "center", padding: "40px 0" }}>
                                <CheckCircle size={48} color="#10b981" style={{ marginBottom: "16px" }} />
                                <h3>No pending approvals</h3>
                                <p>All student registrations have been reviewed!</p>
                            </div>
                        ) : (
                            <div className="td-table-wrapper">
                                <table className="td-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Roll No.</th>
                                            <th>Class</th>
                                            <th>Applied On</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingStudents.map((s) => (
                                            <tr key={s._id} className="td-row">
                                                <td className="td-student-cell">
                                                    <div className="td-student-info">
                                                        <div className="td-avatar" style={{ background: "#dbeafe" }}>
                                                            {s.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="td-student-name">{s.name}</div>
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: "13px", color: "#64748b" }}>{s.email}</td>
                                                <td>{s.rollNumber || "—"}</td>
                                                <td>{s.class} / {s.section}</td>
                                                <td style={{ fontSize: "12px", color: "#94a3b8" }}>
                                                    {new Date(s.createdAt).toLocaleDateString()}
                                                </td>
                                                <td>
                                                    <div style={{ display: "flex", gap: "8px" }}>
                                                        <button
                                                            className="td-approve-btn"
                                                            onClick={() => handleApproveStudent(s._id, s.name)}
                                                            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                                                        ><CheckCircle size={14} /> Approve</button>
                                                        <button
                                                            className="td-reject-btn"
                                                            onClick={() => handleRejectStudent(s._id, s.name)}
                                                            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                                                        ><XCircle size={14} /> Reject</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Dashboard Tab ────────────────────────────────── */}
                {activeTab === "dashboard" && (
                    <div className="td-stats-row">
                        {/* Top Performer */}
                        <div className="td-stat-card td-stat-green">
                            <div className="td-stat-label">
                                {view === "Daily" ? "TOP PERFORMER" : "TOP PERFORMER (WEEKLY)"}
                            </div>
                            <div className="td-stat-icon td-icon-green"><Star size={24} color="#f59e0b" /></div>
                            <div className="td-stat-value">
                                {stats?.topPerformer
                                    ? `${stats.topPerformer.name} (${stats.topPerformer.totalCompletion}%)`
                                    : "—"}
                            </div>
                        </div>

                        {/* Class Average */}
                        <div className="td-stat-card td-stat-blue">
                            <div className="td-stat-label">CLASS AVERAGE</div>
                            <div className="td-stat-icon td-icon-blue"><BarChart3 size={24} color="#3b82f6" /></div>
                            <div className="td-stat-value">{stats?.classAverage ?? 0}%</div>
                        </div>

                        {/* At Risk */}
                        <div className="td-stat-card td-stat-red">
                            <div className="td-stat-label">AT RISK STUDENTS</div>
                            <div className="td-stat-icon td-icon-red"><AlertTriangle size={24} color="#ef4444" /></div>
                            <div className="td-stat-value">{stats?.atRiskCount ?? 0} Students</div>
                        </div>
                    </div>
                )}

                {activeTab === "dashboard" && (
                    <>
                        {/* ── Progress Table Header ────────────────────────── */}
                        <div className="td-table-header-row">
                            <div>
                                <h2 className="td-section-title">
                                    {view === "Daily"
                                        ? "Daily Progress Tracker"
                                        : view === "Weekly"
                                            ? "Weekly Performance"
                                            : "Monthly Overview"}
                                </h2>
                                <p className="td-section-subtitle">
                                    {view === "Daily"
                                        ? `Real-time chapter completion for today.`
                                        : view === "Weekly"
                                            ? "Aggregated progress for this week."
                                            : "Monthly aggregated progress data."}
                                </p>
                            </div>

                            <div className="td-controls">
                                {/* View Toggle */}
                                <div className="td-view-toggle">
                                    {["Daily", "Weekly", "Monthly"].map((v) => (
                                        <button
                                            key={v}
                                            className={`td-toggle-btn ${view === v ? "active" : ""}`}
                                            onClick={() => setView(v)}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>

                                {/* Date */}
                                <div className="td-date-picker">
                                    <Calendar size={16} />{" "}
                                    <DatePicker
                                        selected={selectedDate}
                                        onChange={(date) => setSelectedDate(date)}
                                        dateFormat="dd MMM yyyy"
                                        className="td-custom-react-datepicker"
                                        maxDate={new Date()}
                                    />
                                </div>

                                {/* Export */}
                                <button 
                                    className="td-export-btn" 
                                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                                    onClick={handleExportData}
                                >
                                    <Download size={16} /> Export
                                </button>
                            </div>
                        </div>

                        {/* ── Table ───────────────────────────────────────── */}
                        <div className="td-table-wrapper">
                            <table className="td-table">
                                <thead>
                                    <tr>
                                        <th className="td-th-name">STUDENT NAME</th>
                                        {SUBJECTS.map((s) => (
                                            <th key={s} className="td-th-subj">
                                                {s.toUpperCase()}
                                            </th>
                                        ))}
                                        <th className="td-th-total">
                                            {view === "Daily" ? "TOTAL" : "AVG COMPLETION"}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((student, idx) => (
                                        <tr key={student._id} className="td-row">
                                            {/* Student Name */}
                                            <td className="td-student-cell">
                                                <div className="td-student-info">
                                                    <div
                                                        className="td-avatar"
                                                        style={{
                                                            background:
                                                                avatarColors[idx % avatarColors.length],
                                                        }}
                                                    >
                                                        {getInitials(student.name)}
                                                    </div>
                                                    <div>
                                                        <div className="td-student-name">
                                                            {student.name}
                                                        </div>
                                                        <div className="td-student-roll">
                                                            Roll: {student.rollNumber || "—"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Subject columns */}
                                            {SUBJECTS.map((subj) => {
                                                const data = student.subjectProgress?.[subj] || {
                                                    chapter: "-",
                                                    completion: 0,
                                                };
                                                return (
                                                    <td key={subj} className="td-subj-cell">
                                                        <div className="td-chapter-name">
                                                            {data.chapter}
                                                        </div>
                                                        <div className="td-progress-bar-wrap">
                                                            <div
                                                                className="td-progress-bar-fill"
                                                                style={{
                                                                    width: `${data.completion}%`,
                                                                    background: getCompletionColor(
                                                                        data.completion
                                                                    ),
                                                                }}
                                                            />
                                                        </div>
                                                        <span
                                                            className="td-pct"
                                                            style={{
                                                                color: getCompletionColor(data.completion),
                                                            }}
                                                        >
                                                            {data.completion}%
                                                        </span>
                                                    </td>
                                                );
                                            })}

                                            {/* Total */}
                                            <td className="td-total-cell">
                                                <span
                                                    className="td-total-pct"
                                                    style={{ color: getTotalColor(student.totalCompletion) }}
                                                >
                                                    {student.totalCompletion}%
                                                </span>
                                                <span
                                                    className="td-trend"
                                                    style={{
                                                        color:
                                                            student.totalCompletion >= 60
                                                                ? "#16a34a"
                                                                : "#dc2626",
                                                        display: "inline-flex",
                                                        alignItems: "center"
                                                    }}
                                                >
                                                    {student.totalCompletion >= 60 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {filtered.length === 0 && (
                                <div className="td-empty">No students found.</div>
                            )}
                        </div>

                        {/* ── Pagination ──────────────────────────────────── */}
                        <div className="td-pagination">
                            <span className="td-showing">
                                Showing {paginated.length} of {filtered.length} students
                            </span>
                            <div className="td-pages">
                                <button
                                    className="td-page-btn"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                    <button
                                        key={p}
                                        className={`td-page-btn ${currentPage === p ? "active" : ""}`}
                                        onClick={() => setCurrentPage(p)}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <button
                                    className="td-page-btn"
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* ── Quiz Results Tab ──────────────────────────────── */}
                {activeTab === "quizzes" && (
                    <div className="td-pending-section">
                        <div className="td-pending-header">
                            <h2 className="td-section-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <FileText size={24} color="#6366f1" />
                                Quiz Results — Class {teacher?.assignedClass}-{teacher?.assignedSection}
                            </h2>
                            <p className="td-section-subtitle">All quiz attempts by your students</p>
                        </div>

                        {quizResults.length === 0 ? (
                            <div className="td-empty" style={{ padding: "3rem", textAlign: "center" }}>
                                <div style={{ marginBottom: "16px" }}><Inbox size={48} color="#94a3b8" /></div>
                                <h3>No quiz results yet</h3>
                                <p>Results will appear here once students take quizzes.</p>
                            </div>
                        ) : (
                            <div className="td-table-wrap">
                                <table className="td-student-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Student</th>
                                            <th>Subject</th>
                                            <th>Chapter</th>
                                            <th>Score</th>
                                            <th>%</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {quizResults.map((q, i) => (
                                            <tr key={q._id}>
                                                <td>{i + 1}</td>
                                                <td>
                                                    <div className="td-student-name-cell">
                                                        <div className="td-student-avatar" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                                                            {(q.studentName || "S").charAt(0).toUpperCase()}
                                                        </div>
                                                        <span>{q.studentName || "—"}</span>
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: "13px" }}>{q.subjectName}</td>
                                                <td style={{ fontSize: "13px", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.chapterName}</td>
                                                <td style={{ fontWeight: 700 }}>{q.score}/{q.totalQ}</td>
                                                <td style={{ fontWeight: 700, color: q.percentage >= 60 ? "#16a34a" : "#dc2626" }}>{q.percentage}%</td>
                                                <td>
                                                    <span style={{
                                                        padding: "4px 10px", borderRadius: "100px",
                                                        fontSize: "11px", fontWeight: 700,
                                                        background: q.passed ? "#dcfce7" : "#fee2e2",
                                                        color: q.passed ? "#15803d" : "#b91c1c",
                                                        display: "inline-flex", alignItems: "center", gap: "4px"
                                                    }}>
                                                        {q.passed ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                                        {q.passed ? "Passed" : "Failed"}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: "12px", color: "#94a3b8" }}>
                                                    {new Date(q.lastAttempt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Violations Tab ──────────────────────────────── */}
                {activeTab === "violations" && (
                    <div className="td-pending-section">
                        <div className="td-pending-header">
                            <h2 className="td-section-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <Eye size={24} color="#ef4444" />
                                Focus Violations — Class {teacher?.assignedClass}-{teacher?.assignedSection}
                            </h2>
                            <p className="td-section-subtitle">Monitoring focus violations by your students</p>
                        </div>

                        {/* Violation Stats Cards */}
                        {violationStats && (
                            <div className="td-stats-row" style={{ marginBottom: "20px" }}>
                                <div className="td-stat-card td-stat-red">
                                    <div className="td-stat-label">TOTAL VIOLATIONS</div>
                                    <div className="td-stat-icon td-icon-red"><AlertTriangle size={24} color="#ef4444" /></div>
                                    <div className="td-stat-value">{violationStats.totalViolations}</div>
                                </div>
                                <div className="td-stat-card td-stat-orange" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)" }}>
                                    <div className="td-stat-label">LAST 24 HOURS</div>
                                    <div className="td-stat-icon" style={{ background: "#fed7aa" }}><Eye size={24} color="#f97316" /></div>
                                    <div className="td-stat-value">{violationStats.last24h}</div>
                                </div>
                                <div className="td-stat-card td-stat-blue">
                                    <div className="td-stat-label">TOP OFFENDER</div>
                                    <div className="td-stat-icon td-icon-blue"><BarChart3 size={24} color="#3b82f6" /></div>
                                    <div className="td-stat-value">
                                        {violationStats.byUser?.[0]?._id || "None"} ({violationStats.byUser?.[0]?.count || 0})
                                    </div>
                                </div>
                            </div>
                        )}

                        {violations.length === 0 ? (
                            <div className="td-empty" style={{ padding: "3rem", textAlign: "center" }}>
                                <div style={{ marginBottom: "16px" }}><CheckCircle size={48} color="#10b981" /></div>
                                <h3>No violations recorded</h3>
                                <p>All students are focused during sessions!</p>
                            </div>
                        ) : (
                            <ViolationTable violations={violations} showUser={true} />
                        )}
                    </div>
                )}
            </main>

            {/* ── Custom Professional Logout Modal ──────────────── */}
            {showLogoutModal && (
                <div className="td-modal-overlay">
                    <div className="td-confirm-modal">
                        <div className="td-modal-icon"><LogOut size={48} color="#f59e0b" /></div>
                        <h2 className="td-modal-title">Already leaving?</h2>
                        <p className="td-modal-text">
                            Are you sure you want to log out of the Teacher Portal?
                            Your dashboard state is saved and ready for your return.
                        </p>
                        <div className="td-modal-actions">
                            <button
                                className="td-modal-btn cancel"
                                onClick={() => setShowLogoutModal(false)}
                            >
                                Stay Back
                            </button>
                            <button
                                className="td-modal-btn confirm"
                                onClick={confirmLogout}
                            >
                                Yes, Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

export default TeacherDashboard;
