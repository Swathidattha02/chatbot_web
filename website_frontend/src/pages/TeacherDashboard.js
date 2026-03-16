import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { 
    BookOpen, FileText, Search, CheckCircle, XCircle, 
    Star, BarChart3, AlertTriangle, Calendar, Download,
    TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
    Inbox, LogOut, Eye, Upload, Megaphone, Trash2, Plus, AlertCircle, Loader
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../styles/TeacherDashboard.css";
import ViolationTable from "../components/ViolationTable";
import { getSubjectsForClass } from "../config/syllabus";
import dashboardService from "../services/dashboardService";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

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
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("dashboard"); // dashboard | pending | quizzes
    const [actionMsg, setActionMsg] = useState("");
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    
    // Class materials state
    const [materials, setMaterials] = useState([]);
    const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);
    const [materialForm, setMaterialForm] = useState({ title: "", description: "", type: "document", file: null });

    // View controls
    const [view, setView] = useState("Daily"); // Daily | Weekly | Monthly
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const studentsPerPage = 10;

    // Quiz filters
    const [quizSearchQuery, setQuizSearchQuery] = useState("");
    const [quizFilterSubject, setQuizFilterSubject] = useState("All");
    const [quizFilterStatus, setQuizFilterStatus] = useState("All");
    const [quizCurrentPage, setQuizCurrentPage] = useState(1);
    const quizzesPerPage = 10;

    // Get stored teacher from localStorage
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token");

    // Calculate SUBJECTS dynamically from syllabus based on teacher's assigned class
    const getTeacherSubjects = () => {
        if (teacher?.assignedClass) {
            const normalizedClass = `Class ${teacher.assignedClass}`;
            const classSubjects = getSubjectsForClass(normalizedClass);
            return classSubjects.map(s => s.name);
        }
        // Fallback during loading or if teacher data unavailable
        return ["Mathematics", "Science", "Biology", "Social Studies", "Telugu", "English", "Hindi"];
    };

    const SUBJECTS = getTeacherSubjects();

    // ─── FETCH ALL DASHBOARD DATA ────────────────────────────────────────────
    const loadDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await dashboardService.fetchTeacherDashboardBatch();

            console.log("📊 Teacher Dashboard Data:", {
                teacher: result.data.dashboard?.teacher,
                stats: result.data.dashboard?.stats,
                studentsCount: result.data.dashboard?.students?.length,
                students: result.data.dashboard?.students,
                pendingCount: result.data.pendingStudents?.students?.length,
                quizzesCount: result.data.quizResults?.quizzes?.length,
                violationsCount: result.data.violations?.violations?.length
            });

            if (result.data.dashboard?.success) {
                setTeacher(result.data.dashboard.teacher);
                setStats(result.data.dashboard.stats);
                setStudents(result.data.dashboard.students);
                setFiltered(result.data.dashboard.students);
            }

            if (result.data.pendingStudents?.success) {
                setPendingStudents(result.data.pendingStudents.students || []);
            }

            if (result.data.quizResults?.success) {
                setQuizResults(result.data.quizResults.quizzes || []);
            }

            if (result.data.violations?.success) {
                setViolations(result.data.violations.violations || []);
                setViolationStats(result.data.violations.stats || null);
            }

            // Check for critical errors
            if (!result.data.dashboard) {
                setError("Failed to load dashboard. Please refresh the page.");
            }
        } catch (err) {
            console.error("Dashboard load error:", err);
            
            if (err.message?.includes("Authentication")) {
                navigate("/login");
            } else {
                setError(err.message || "Failed to load dashboard data. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    // ─── REFRESH DASHBOARD DATA ──────────────────────────────────────────────
    const refreshData = useCallback(async () => {
        dashboardService.invalidateCache();
        await loadDashboardData();
    }, [loadDashboardData]);

    const fetchMaterials = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/class-materials/teacher`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data.success) setMaterials(res.data.materials);
        } catch { }
    }, [token]);

    const handleUploadMaterial = async (e) => {
        e.preventDefault();
        if (!materialForm.title) return alert("Please provide a title.");
        
        setIsUploadingMaterial(true);
        try {
            const formData = new FormData();
            formData.append("title", materialForm.title);
            formData.append("description", materialForm.description);
            formData.append("type", materialForm.type);
            if (materialForm.type === "document" && materialForm.file) {
                formData.append("file", materialForm.file);
            }

            const res = await axios.post(`${API_BASE}/class-materials/upload`, formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data" 
                },
            });

            if (res.data.success) {
                setActionMsg(
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <CheckCircle size={16} color="#10b981" /> {materialForm.type === 'document' ? 'Document uploaded!' : 'Announcement posted!'}
                    </span>
                );
                setMaterialForm({ title: "", description: "", type: "document", file: null });
                fetchMaterials();
                setTimeout(() => setActionMsg(""), 4000);
            }
        } catch (err) {
            alert(err.response?.data?.message || "Upload failed");
        } finally {
            setIsUploadingMaterial(false);
        }
    };

    const handleDeleteMaterial = async (id) => {
        if (!window.confirm("Delete this material?")) return;
        try {
            const res = await axios.delete(`${API_BASE}/class-materials/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data.success) {
                fetchMaterials();
            }
        } catch { alert("Delete failed"); }
    };

    // ─── APPROVE STUDENT ─────────────────────────────────────────────────────
    const handleApproveStudent = async (studentId, studentName) => {
        try {
            const result = await dashboardService.approveStudent(studentId);

            if (result.success) {
                setActionMsg(
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <CheckCircle size={16} color="#10b981" /> {studentName} approved!
                    </span>
                );
                refreshData();
                setTimeout(() => setActionMsg(""), 4000);
            }
        } catch (err) {
            setActionMsg(err.message || "Action failed.");
            setTimeout(() => setActionMsg(""), 4000);
        }
    };

    // ─── REJECT STUDENT ──────────────────────────────────────────────────────
    const handleRejectStudent = async (studentId, studentName) => {
        const reason = window.prompt(`Reason for rejecting ${studentName}:`) || "Not approved by class teacher.";

        try {
            const result = await dashboardService.rejectStudent(studentId, reason);

            if (result.success) {
                setActionMsg(
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <XCircle size={16} color="#ef4444" /> {studentName} rejected.
                    </span>
                );
                refreshData();
                setTimeout(() => setActionMsg(""), 4000);
            }
        } catch (err) {
            setActionMsg(err.message || "Action failed.");
            setTimeout(() => setActionMsg(""), 4000);
        }
    };

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }
        loadDashboardData();
    }, [loadDashboardData, token, navigate]);

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

    const formatDurationMinutes = (ms) => {
        if (!ms || ms === 0) return "0m";
        const minutes = Math.floor(ms / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    // Quiz helpers
    const getPercentageColor = (pct) => {
        if (pct >= 70) return { bg: "#dcfce7", text: "#15803d" };
        if (pct >= 40) return { bg: "#fef9c3", text: "#854d0e" };
        return { bg: "#fee2e2", text: "#b91c1c" };
    };

    const computeQuizStats = useCallback(() => {
        if (!quizResults || quizResults.length === 0) {
            return {
                totalAttempts: 0,
                avgScore: 0,
                passRate: 0,
                failedCount: 0,
            };
        }
        const totalAttempts = quizResults.length;
        const avgScore = Math.round(
            quizResults.reduce((sum, q) => sum + (q.percentage || 0), 0) / totalAttempts
        );
        const passedCount = quizResults.filter((q) => q.passed).length;
        const passRate = Math.round((passedCount / totalAttempts) * 100);
        const failedCount = totalAttempts - passedCount;
        return { totalAttempts, avgScore, passRate, failedCount };
    }, [quizResults]);

    const getFilteredQuizResults = useCallback(() => {
        if (!quizResults) return [];
        return quizResults.filter((q) => {
            const matchesSearch =
                !quizSearchQuery ||
                (q.studentName && q.studentName.toLowerCase().includes(quizSearchQuery.toLowerCase()));
            const matchesSubject =
                quizFilterSubject === "All" ||
                (q.subjectName && q.subjectName === quizFilterSubject);
            const matchesStatus =
                quizFilterStatus === "All" ||
                (quizFilterStatus === "Passed" && q.passed) ||
                (quizFilterStatus === "Failed" && !q.passed);
            return matchesSearch && matchesSubject && matchesStatus;
        });
    }, [quizResults, quizSearchQuery, quizFilterSubject, quizFilterStatus]);

    const filteredQuizzes = getFilteredQuizResults();
    const quizStats = computeQuizStats();
    const quizTotalPages = Math.ceil(filteredQuizzes.length / quizzesPerPage);
    const paginatedQuizzes = filteredQuizzes.slice(
        (quizCurrentPage - 1) * quizzesPerPage,
        quizCurrentPage * quizzesPerPage
    );

    const quizSubjects = quizResults
        ? Array.from(new Set(quizResults.map((q) => q.subjectName).filter(Boolean)))
        : [];

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

    // ─── ERROR STATE ──────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="td-container">
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "100vh",
                    gap: "20px",
                    padding: "20px",
                    backgroundColor: "#f8fafc"
                }}>
                    <AlertCircle size={64} color="#ef4444" />
                    <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#1e293b" }}>
                        Unable to Load Dashboard
                    </h1>
                    <p style={{ color: "#64748b", maxWidth: "500px", textAlign: "center" }}>
                        {error}
                    </p>
                    <button
                        onClick={refreshData}
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
                        <Loader size={16} /> Retry
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
                        onClick={() => setActiveTab("quizzes")}
                        style={{ position: "relative", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                        <FileText size={16} /> Quiz Results
                        {quizResults.length > 0 && (
                            <span className="td-pending-badge" style={{ background: "#6366f1" }}>{quizResults.length}</span>
                        )}
                    </button>
                    <button
                        className={`td-nav-link ${activeTab === "violations" ? "active" : ""}`}
                        onClick={() => setActiveTab("violations")}
                        style={{ position: "relative", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                        <Eye size={16} /> Violations
                        {violationStats?.last24h > 0 && (
                            <span className="td-pending-badge" style={{ background: "#ef4444" }}>{violationStats.last24h}</span>
                        )}
                    </button>
                    <button
                        className={`td-nav-link ${activeTab === "materials" ? "active" : ""}`}
                        onClick={() => { setActiveTab("materials"); fetchMaterials(); }}
                        style={{ display: "flex", alignItems: "center", gap: "6px" }}
                    >
                        <Upload size={16} /> Materials
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

                {/* ── Class Materials Tab ─────────────────────────── */}
                {activeTab === "materials" && (
                    <div className="td-materials-section">
                        <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{ background: "#4f46e5", color: "white", padding: "8px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Upload size={20} />
                                </div>
                                <h2 className="td-section-title" style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>
                                    Class Materials & Announcements
                                </h2>
                            </div>
                            <p className="td-section-subtitle" style={{ marginLeft: "44px", marginTop: "4px" }}>Share important documents and post announcements for Class {teacher?.assignedClass || "—"}-{teacher?.assignedSection || "—"}.</p>
                        </div>

                        {actionMsg && <div className="td-action-msg" style={{ marginBottom: "16px" }}>{actionMsg}</div>}

                        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) 1.5fr", gap: "20px", alignItems: "start" }}>
                            {/* Upload Form */}
                            <div className="td-materials-card" style={{ padding: "16px" }}>
                                <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Plus size={16} color="#4f46e5" /> New Upload / Post
                                </h3>
                                <form onSubmit={handleUploadMaterial}>
                                    <div style={{ marginBottom: "12px" }}>
                                        <label className="td-materials-label" style={{ marginBottom: "6px" }}>CONTENT TYPE</label>
                                        <div className="td-type-toggle-group" style={{ marginBottom: "0px" }}>
                                            <button 
                                                type="button" 
                                                className={`td-type-toggle-btn ${materialForm.type === 'document' ? 'active' : ''}`}
                                                onClick={() => setMaterialForm({...materialForm, type: 'document'})}
                                            >
                                                <FileText size={16} /> Document
                                            </button>
                                            <button 
                                                type="button" 
                                                className={`td-type-toggle-btn ${materialForm.type === 'announcement' ? 'active' : ''}`}
                                                onClick={() => setMaterialForm({...materialForm, type: 'announcement'})}
                                            >
                                                <Megaphone size={16} /> Announcement
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: "12px" }}>
                                        <label className="td-materials-label" style={{ marginBottom: "6px" }}>TITLE</label>
                                        <input 
                                            type="text" 
                                            className="td-materials-input" 
                                            placeholder="e.g., Mathematics Notes"
                                            value={materialForm.title}
                                            onChange={(e) => setMaterialForm({...materialForm, title: e.target.value})}
                                            required
                                            style={{ padding: "10px 14px" }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: "12px" }}>
                                        <label className="td-materials-label" style={{ marginBottom: "6px" }}>DESCRIPTION / MESSAGE</label>
                                        <textarea 
                                            className="td-materials-input" 
                                            placeholder="Provide context..."
                                            style={{ minHeight: "80px", resize: "none", padding: "10px 14px" }}
                                            value={materialForm.description}
                                            onChange={(e) => setMaterialForm({...materialForm, description: e.target.value})}
                                        />
                                    </div>

                                    {materialForm.type === "document" && (
                                        <div style={{ marginBottom: "16px" }}>
                                            <label className="td-materials-label" style={{ marginBottom: "6px" }}>UPLOAD FILE</label>
                                            <label className="td-materials-file-label" style={{ padding: "16px" }}>
                                                <div style={{ background: "#eff6ff", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    <Upload size={14} color="#3b82f6" />
                                                </div>
                                                <div style={{ fontSize: "12px", fontWeight: 600 }}>
                                                    {materialForm.file ? materialForm.file.name : "Select file"}
                                                </div>
                                                <div style={{ fontSize: "11px", opacity: 0.7 }}>
                                                    Maximum size: 20MB
                                                </div>
                                                <input 
                                                    type="file" 
                                                    onChange={(e) => setMaterialForm({...materialForm, file: e.target.files[0]})}
                                                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                                    style={{ display: "none" }}
                                                />
                                            </label>
                                        </div>
                                    )}

                                    <button 
                                        type="submit" 
                                        disabled={isUploadingMaterial}
                                        className="td-materials-submit-btn"
                                        style={{ padding: "12px" }}
                                    >
                                        {isUploadingMaterial ? (
                                            <>Uploading...</>
                                        ) : materialForm.type === 'document' ? (
                                            <><Upload size={16} /> Upload Document</>
                                        ) : (
                                            <><Megaphone size={16} /> Post Announcement</>
                                        )}
                                    </button>
                                </form>
                            </div>

                            {/* Recent Materials List */}
                            <div className="td-materials-card" style={{ padding: "0", display: "flex", flexDirection: "column" }}>
                                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <h3 style={{ fontSize: "15px", fontWeight: 700 }}>Recently Shared</h3>
                                    <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px" }}>
                                        {materials?.length || 0} ITEMS
                                    </div>
                                </div>
                                <div style={{ flex: 1, maxHeight: "550px", overflowY: "auto", padding: "16px" }}>
                                    {!materials || materials.length === 0 ? (
                                        <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
                                            <div style={{ background: "#f8fafc", width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                                                <Inbox size={28} />
                                            </div>
                                            <p style={{ fontWeight: 600 }}>No materials shared yet.</p>
                                            <p style={{ fontSize: "13px", opacity: 0.7 }}>Items you share will appear here.</p>
                                        </div>
                                    ) : (
                                        materials.map((m) => (
                                            <div key={m._id} className="td-material-item">
                                                <div style={{ display: "flex", gap: "16px" }}>
                                                    <div className="td-material-item-icon" style={{ 
                                                        background: m.type === 'document' ? "#eff6ff" : "#fff7ed"
                                                    }}>
                                                        {m.type === 'document' ? <FileText size={20} color="#3b82f6" /> : <Megaphone size={20} color="#f59e0b" />}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: "14px", color: "#1e293b" }}>{m.title}</div>
                                                        <div style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 8px", lineHeight: "1.5" }}>{m.description}</div>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                            <div className="td-material-badge" style={{ 
                                                                background: m.type === 'document' ? "#dbeafe" : "#ffedd5",
                                                                color: m.type === 'document' ? "#1e40af" : "#9a3412"
                                                            }}>
                                                                {m.type}
                                                            </div>
                                                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                                                                {new Date(m.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: "flex", gap: "8px" }}>
                                                    {m.type === 'document' && (
                                                        <a 
                                                            href={`${API_BASE}/class-materials/download/${m._id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ background: "#eff6ff", padding: "8px", borderRadius: "8px", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                                                            title="Download file"
                                                        >
                                                            <Download size={16} />
                                                        </a>
                                                    )}
                                                    <button 
                                                        onClick={() => handleDeleteMaterial(m._id)}
                                                        style={{ background: "#fff1f2", border: "none", cursor: "pointer", padding: "8px", borderRadius: "8px", color: "#e11d48", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                                                        title="Delete material"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
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
                    <div className="td-quiz-section">
                        {/* Header */}
                        <div className="td-quiz-header">
                            <h2 className="td-section-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <FileText size={24} color="#6366f1" />
                                Quiz Results — Class {teacher?.assignedClass}-{teacher?.assignedSection}
                            </h2>
                            <p className="td-section-subtitle">Comprehensive analytics of your students' quiz performance</p>
                        </div>

                        {quizResults.length === 0 ? (
                            <div className="td-empty" style={{ padding: "3rem", textAlign: "center", background: "#ffffff", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                                <div style={{ marginBottom: "16px" }}><Inbox size={48} color="#94a3b8" /></div>
                                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#1a202c", marginBottom: "8px" }}>No quiz results yet</h3>
                                <p style={{ color: "#64748b", fontSize: "0.95rem" }}>Results will appear here once students take quizzes.</p>
                            </div>
                        ) : (
                            <>
                                {/* ── Summary Stats Cards ──────────────────────────────── */}
                                <div className="td-quiz-stats-row">
                                    <div className="td-quiz-stat-card">
                                        <div className="td-quiz-stat-label">Total Attempts</div>
                                        <div className="td-quiz-stat-icon" style={{ background: "#dbeafe" }}>
                                            <BarChart3 size={22} color="#3b82f6" />
                                        </div>
                                        <div className="td-quiz-stat-value">{quizStats.totalAttempts}</div>
                                    </div>

                                    <div className="td-quiz-stat-card">
                                        <div className="td-quiz-stat-label">Average Score</div>
                                        <div className="td-quiz-stat-icon" style={{ background: "#dcfce7" }}>
                                            <TrendingUp size={22} color="#16a34a" />
                                        </div>
                                        <div className="td-quiz-stat-value">{quizStats.avgScore}%</div>
                                    </div>

                                    <div className="td-quiz-stat-card">
                                        <div className="td-quiz-stat-label">Pass Rate</div>
                                        <div className="td-quiz-stat-icon" style={{ background: "#fef9c3" }}>
                                            <CheckCircle size={22} color="#ea8c55" />
                                        </div>
                                        <div className="td-quiz-stat-value">{quizStats.passRate}%</div>
                                    </div>

                                    <div className="td-quiz-stat-card">
                                        <div className="td-quiz-stat-label">Failed Students</div>
                                        <div className="td-quiz-stat-icon" style={{ background: "#fee2e2" }}>
                                            <AlertTriangle size={22} color="#ef4444" />
                                        </div>
                                        <div className="td-quiz-stat-value">{quizStats.failedCount}</div>
                                    </div>
                                </div>

                                {/* ── Controls: Search & Filters ──────────────────────── */}
                                <div className="td-quiz-controls">
                                    <div className="td-quiz-search">
                                        <Search size={16} color="#94a3b8" />
                                        <input
                                            type="text"
                                            placeholder="Search by student name..."
                                            value={quizSearchQuery}
                                            onChange={(e) => {
                                                setQuizSearchQuery(e.target.value);
                                                setQuizCurrentPage(1);
                                            }}
                                            className="td-quiz-search-input"
                                        />
                                    </div>

                                    <div className="td-quiz-filters">
                                        <select
                                            value={quizFilterSubject}
                                            onChange={(e) => {
                                                setQuizFilterSubject(e.target.value);
                                                setQuizCurrentPage(1);
                                            }}
                                            className="td-quiz-select"
                                        >
                                            <option value="All">All Subjects</option>
                                            {quizSubjects.map((subj) => (
                                                <option key={subj} value={subj}>
                                                    {subj}
                                                </option>
                                            ))}
                                        </select>

                                        <select
                                            value={quizFilterStatus}
                                            onChange={(e) => {
                                                setQuizFilterStatus(e.target.value);
                                                setQuizCurrentPage(1);
                                            }}
                                            className="td-quiz-select"
                                        >
                                            <option value="All">All Results</option>
                                            <option value="Passed">Passed</option>
                                            <option value="Failed">Failed</option>
                                        </select>
                                    </div>
                                </div>

                                {/* ── Table ───────────────────────────────────────── */}
                                <div className="td-quiz-table-wrapper">
                                    <table className="td-quiz-table">
                                        <thead>
                                            <tr>
                                                <th className="td-quiz-th-rank">#</th>
                                                <th className="td-quiz-th-student">Student</th>
                                                <th className="td-quiz-th-subject">Subject</th>
                                                <th className="td-quiz-th-chapter">Chapter</th>
                                                <th className="td-quiz-th-score">Score</th>
                                                <th className="td-quiz-th-percentage">Performance</th>
                                                <th className="td-quiz-th-status">Status</th>
                                                <th className="td-quiz-th-date">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedQuizzes.map((q, idx) => {
                                                return (
                                                    <tr key={q._id} className="td-quiz-row">
                                                        <td className="td-quiz-rank">{(quizCurrentPage - 1) * quizzesPerPage + idx + 1}</td>
                                                        <td className="td-quiz-student">
                                                            <div className="td-quiz-student-cell">
                                                                <div className="td-quiz-avatar">
                                                                    {(q.studentName || "S").charAt(0).toUpperCase()}
                                                                </div>
                                                                <span>{q.studentName || "—"}</span>
                                                            </div>
                                                        </td>
                                                        <td className="td-quiz-subject">{q.subjectName}</td>
                                                        <td className="td-quiz-chapter" title={q.chapterName}>
                                                            {q.chapterName}
                                                        </td>
                                                        <td className="td-quiz-score">{q.score}/{q.totalQ}</td>
                                                        <td className="td-quiz-percentage">
                                                            <div className="td-quiz-progress-wrap">
                                                                <div className="td-quiz-progress-bar">
                                                                    <div
                                                                        className="td-quiz-progress-fill"
                                                                        style={{
                                                                            width: `${q.percentage}%`,
                                                                            background:
                                                                                q.percentage >= 70
                                                                                    ? "#16a34a"
                                                                                    : q.percentage >= 40
                                                                                        ? "#f59e0b"
                                                                                        : "#ef4444",
                                                                        transition: "width 0.4s ease",
                                                                        borderRadius: "6px",
                                                                        height: "100%",
                                                                    }}
                                                                />
                                                                </div>
                                                                <span className="td-quiz-pct">{q.percentage}%</span>
                                                            </div>
                                                        </td>
                                                        <td className="td-quiz-status">
                                                            <span
                                                                className="td-quiz-badge"
                                                                style={{
                                                                    background: q.passed ? "#dcfce7" : "#fee2e2",
                                                                    color: q.passed ? "#15803d" : "#b91c1c",
                                                                }}
                                                            >
                                                                {q.passed ? (
                                                                    <CheckCircle size={14} />
                                                                ) : (
                                                                    <XCircle size={14} />
                                                                )}
                                                                {q.passed ? "Passed" : "Failed"}
                                                            </span>
                                                        </td>
                                                        <td className="td-quiz-date">
                                                            {new Date(q.lastAttempt).toLocaleDateString()}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* ── Pagination ──────────────────────────────────── */}
                                <div className="td-quiz-pagination">
                                    <span className="td-quiz-showing">
                                        Showing {paginatedQuizzes.length > 0 ? (quizCurrentPage - 1) * quizzesPerPage + 1 : 0} to {(quizCurrentPage - 1) * quizzesPerPage + paginatedQuizzes.length} of{" "}
                                        {filteredQuizzes.length} results
                                    </span>
                                    <div className="td-quiz-pages">
                                        <button
                                            className="td-quiz-page-btn"
                                            onClick={() => setQuizCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={quizCurrentPage === 1}
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        {Array.from({ length: quizTotalPages }, (_, i) => i + 1).map((p) => (
                                            <button
                                                key={p}
                                                className={`td-quiz-page-btn ${quizCurrentPage === p ? "active" : ""}`}
                                                onClick={() => setQuizCurrentPage(p)}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                        <button
                                            className="td-quiz-page-btn"
                                            onClick={() => setQuizCurrentPage((p) => Math.min(quizTotalPages, p + 1))}
                                            disabled={quizCurrentPage === quizTotalPages}
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </>
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
                            <div>
                                <div style={{ marginBottom: '20px', padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
                                    <p style={{ margin: 0, color: '#166534', fontSize: '12px' }}>
                                        ℹ️ <strong>Focus Activity Log:</strong> Shows when students left the study page, when they returned, and how long they were away.
                                    </p>
                                </div>
                                <ViolationTable violations={violations} showUser={true} activityLogView={true} />
                            </div>
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
