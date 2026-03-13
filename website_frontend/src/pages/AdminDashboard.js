import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
    Eye, EyeOff, LayoutDashboard, Bell, Users, GraduationCap, 
    Building2, Settings, LogOut, BookOpen, CheckCircle, 
    XCircle, Trash2, MapPin, Hand, Lock, Key, ShieldAlert,
    ArrowRight
} from "lucide-react";
import ViolationTable from "../components/ViolationTable";
import "../styles/AdminDashboard.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function AdminDashboard() {
    const navigate = useNavigate();
    const [admin, setAdmin] = useState(null);
    const [teachers, setTeachers] = useState([]);
    const [pendingTeachers, setPendingTeachers] = useState([]);
    const [pendingStudents, setPendingStudents] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");
    const [actionMsg, setActionMsg] = useState("");
    const [studentFilter, setStudentFilter] = useState({ class: "", section: "" });
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showApprovalPopup, setShowApprovalPopup] = useState(false);
    const [hasShownApprovalPopup, setHasShownApprovalPopup] = useState(false);
    const [showChangePW, setShowChangePW] = useState(false);
    const [isFirstLoginModal, setIsFirstLoginModal] = useState(false);
    const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [pwLoading, setPwLoading] = useState(false);
    const [pwError, setPwError] = useState("");
    const [showOldPw, setShowOldPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [violations, setViolations] = useState([]);
    const [violationStats, setViolationStats] = useState(null);

    const token = localStorage.getItem("token");
    const authHeader = { Authorization: `Bearer ${token}` };

    // ── Guard ────────────────────────────────────────────────────────────────────
    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (!stored || !token) { navigate("/login"); return; }
        const u = JSON.parse(stored);
        if (u.role !== "admin") { navigate("/login"); return; }
        setAdmin(u);
        if (u.isFirstLogin && !showChangePW) {
            setIsFirstLoginModal(true);
            setShowChangePW(true);
        }
    }, [navigate, token, showChangePW]);

    // ── Fetch helpers ────────────────────────────────────────────────────────────
    const fetchTeachers = useCallback(async () => {
        if (!admin) return;
        try {
            const res = await fetch(`${API_BASE}/schools/${admin._id}/teachers`, { headers: authHeader });
            const data = await res.json();
            if (data.success) setTeachers(data.teachers);
        } catch { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [admin]);

    const fetchPendingTeachers = useCallback(async () => {
        if (!admin) return;
        try {
            const res = await fetch(`${API_BASE}/admin/pending-teachers`, { headers: authHeader });
            const data = await res.json();
            if (data.success) setPendingTeachers(data.teachers);
        } catch { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [admin]);

    const fetchStudents = useCallback(async () => {
        if (!admin) return;
        try {
            const res = await fetch(`${API_BASE}/admin/students`, { headers: authHeader });
            const data = await res.json();
            if (data.success) setStudents(data.students);
        } catch { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [admin]);

    const fetchPendingStudents = useCallback(async () => {
        if (!admin) return;
        try {
            const res = await fetch(`${API_BASE}/admin/pending-students`, { headers: authHeader });
            const data = await res.json();
            if (data.success) setPendingStudents(data.students);
        } catch { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [admin]);

    const fetchViolations = useCallback(async () => {
        if (!admin) return;
        try {
            const res = await fetch(`${API_BASE}/violations`, { headers: authHeader });
            const data = await res.json();
            if (data.violations) setViolations(data.violations);
        } catch { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [admin]);

    const fetchViolationStats = useCallback(async () => {
        if (!admin) return;
        try {
            const res = await fetch(`${API_BASE}/stats`, { headers: authHeader });
            const data = await res.json();
            if (data.totalViolations !== undefined) setViolationStats(data);
        } catch { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [admin]);

    useEffect(() => {
        if (admin) {
            fetchTeachers();
            fetchPendingTeachers();
            fetchPendingStudents();
            fetchStudents();
            fetchViolations();
            fetchViolationStats();
            setLoading(false);
        }
    }, [admin, fetchTeachers, fetchPendingTeachers, fetchPendingStudents, fetchStudents, fetchViolations, fetchViolationStats]);

    useEffect(() => {
        if (!hasShownApprovalPopup && (pendingTeachers.length > 0 || pendingStudents.length > 0)) {
            setShowApprovalPopup(true);
            setHasShownApprovalPopup(true);
        }
    }, [pendingTeachers.length, pendingStudents.length, hasShownApprovalPopup]);

    // ── Show action message ──────────────────────────────────────────────────────
    const showMsg = (msg) => {
        setActionMsg(msg);
        setTimeout(() => setActionMsg(""), 4000);
    };

    // ── Approve / Reject teacher ─────────────────────────────────────────────────
    const handleApprove = async (teacherId, teacherName) => {
        try {
            const res = await fetch(`${API_BASE}/admin/approve-teacher/${teacherId}`, {
                method: "POST", headers: authHeader,
            });
            const data = await res.json();
            if (data.success) {
                showMsg(
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <CheckCircle size={16} color="#10b981" /> {teacherName} approved successfully!
                    </span>
                );
                fetchPendingTeachers(); fetchTeachers();
            }
        } catch { showMsg("Action failed. Try again."); }
    };

    const handleReject = async (teacherId, teacherName) => {
        const reason = window.prompt(`Reason for rejecting ${teacherName} (optional):`) || "Not approved by school admin.";
        try {
            const res = await fetch(`${API_BASE}/admin/reject-teacher/${teacherId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeader },
                body: JSON.stringify({ reason }),
            });
            const data = await res.json();
                if (data.success) { 
                    showMsg(
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <XCircle size={16} color="#ef4444" /> {teacherName} rejected.
                        </span>
                    ); 
                    fetchPendingTeachers(); 
                }
        } catch { showMsg("Action failed. Try again."); }
    };

    // ── Delete teacher ────────────────────────────────────────────────────────── 
    const handleDeleteTeacher = async (teacherId, teacherName) => {
        if (!window.confirm(`⚠️ Permanently delete ${teacherName}? This cannot be undone.`)) return;
        try {
            const res = await fetch(`${API_BASE}/admin/delete-teacher/${teacherId}`, {
                method: "DELETE", headers: authHeader,
            });
            const data = await res.json();
            if (data.success) {
                showMsg(
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <Trash2 size={16} color="#ef4444" /> {teacherName} permanently deleted.
                    </span>
                );
                fetchTeachers(); fetchPendingTeachers();
            } else { showMsg(data.message || "Delete failed."); }
        } catch { showMsg("Delete failed. Try again."); }
    };

    // ── Approve / Reject student ─────────────────────────────────────────────────
    const handleApproveStudent = async (studentId, studentName) => {
        try {
            const res = await fetch(`${API_BASE}/admin/approve-student/${studentId}`, {
                method: "POST", headers: authHeader,
            });
            const data = await res.json();
            if (data.success) {
                showMsg(
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <CheckCircle size={16} color="#10b981" /> {studentName} approved successfully!
                    </span>
                );
                fetchPendingStudents(); fetchStudents();
            }
        } catch { showMsg("Action failed. Try again."); }
    };

    const handleRejectStudent = async (studentId, studentName) => {
        const reason = window.prompt(`Reason for rejecting ${studentName} (optional):`) || "Not approved by school admin.";
        try {
            const res = await fetch(`${API_BASE}/admin/reject-student/${studentId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeader },
                body: JSON.stringify({ reason }),
            });
            const data = await res.json();
                if (data.success) { 
                    showMsg(
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <XCircle size={16} color="#ef4444" /> {studentName} rejected.
                        </span>
                    ); 
                    fetchPendingStudents(); 
                }
        } catch { showMsg("Action failed. Try again."); }
    };

    // ── Delete student ────────────────────────────────────────────────────────── 
    const handleDeleteStudent = async (studentId, studentName) => {
        if (!window.confirm(`⚠️ Permanently delete ${studentName}? This cannot be undone.`)) return;
        try {
            const res = await fetch(`${API_BASE}/admin/delete-student/${studentId}`, {
                method: "DELETE", headers: authHeader,
            });
            const data = await res.json();
            if (data.success) {
                showMsg(
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <Trash2 size={16} color="#ef4444" /> {studentName} permanently deleted.
                    </span>
                );
                fetchStudents();
            } else { showMsg(data.message || "Delete failed."); }
        } catch { showMsg("Delete failed. Try again."); }
    };

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    const handleViewStudents = (cls, sec) => {
        setStudentFilter({ class: cls, section: sec });
        setActiveTab("students");
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPwError("");
        if (pwForm.newPassword !== pwForm.confirmPassword) {
            setPwError("New passwords do not match!");
            return;
        }
        if (pwForm.newPassword.length < 6) {
            setPwError("Password must be at least 6 characters!");
            return;
        }

        setPwLoading(true);
        try {
            const res = await fetch(`${API_BASE}/admin/change-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeader },
                body: JSON.stringify({
                    currentPassword: pwForm.currentPassword,
                    newPassword: pwForm.newPassword
                }),
            });
            const data = await res.json();
            if (data.success) {
                showMsg(
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <CheckCircle size={16} color="#10b981" /> Password updated successfully!
                    </span>
                );
                setShowChangePW(false);
                setIsFirstLoginModal(false);
                setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });

                // Update local storage
                const stored = JSON.parse(localStorage.getItem("user"));
                stored.isFirstLogin = false;
                localStorage.setItem("user", JSON.stringify(stored));
                setAdmin(stored);
            } else {
                setPwError(data.message || "Failed to update password.");
            }
        } catch {
            setPwError("Network error. Please try again.");
        }
        setPwLoading(false);
    };

    const filteredStudents = students.filter(s => {
        const matchClass = studentFilter.class ? s.class === `Class ${studentFilter.class}` : true;
        const matchSection = studentFilter.section ? s.section === studentFilter.section : true;
        return matchClass && matchSection;
    });

    // ── Status badge colour ──────────────────────────────────────────────────────
    const statusBadge = (status) => {
        const cfg = {
            approved: { bg: "#dcfce7", color: "#15803d", label: "Approved" },
            pending: { bg: "#fef9c3", color: "#a16207", label: "Pending" },
            rejected: { bg: "#fee2e2", color: "#b91c1c", label: "Rejected" },
        }[status] || { bg: "#f1f5f9", color: "#64748b", label: status };
        return (
            <span style={{
                background: cfg.bg, color: cfg.color,
                padding: "2px 10px", borderRadius: "100px",
                fontSize: "11px", fontWeight: 700,
            }}>{cfg.label}</span>
        );
    };

    if (loading || !admin) {
        return (
            <div className="admin-loading">
                <div className="admin-spinner"></div>
                <p>Loading Admin Dashboard...</p>
            </div>
        );
    }

    const NAV = [
        { id: "overview", icon: <LayoutDashboard size={20} />, label: "Overview" },
        { id: "approvals", icon: <Bell size={20} />, label: "Approvals", badge: pendingTeachers.length },
        { id: "teachers", icon: <Users size={20} />, label: "Teachers" },
        { id: "students", icon: <GraduationCap size={20} />, label: "Students" },
        { id: "monitoring", icon: <ShieldAlert size={20} />, label: "Monitoring" },
    ];

    return (
        <div className="admin-dashboard">
            {/* ── Sidebar ──────────────────────────────────────── */}
            <aside className="admin-sidebar">
                <div className="admin-logo">
                    <span className="admin-logo-icon"><Building2 size={28} color="white" /></span>
                    <div>
                        <div className="admin-logo-title">Admin Panel</div>
                        <div className="admin-logo-sub">{admin.schoolName}</div>
                    </div>
                </div>

                <nav className="admin-nav">
                    {NAV.map((item) => (
                        <button
                            key={item.id}
                            className={`admin-nav-item ${activeTab === item.id ? "active" : ""}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            <span>{item.icon}</span>
                            {item.label}
                            {item.badge > 0 && (
                                <span className="admin-nav-badge">{item.badge}</span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="admin-sidebar-footer">
                    <div className="admin-profile-mini">
                        <div className="admin-avatar-mini"><Building2 size={20} /></div>
                        <div className="admin-profile-info">
                            <div className="admin-name-mini">{admin.name}</div>
                            <div className="admin-email-mini">{admin.email}</div>
                            <button className="admin-profile-link" onClick={() => { setPwError(""); setShowChangePW(true); }}>
                                <Settings size={14} /> Change Password
                            </button>
                        </div>
                    </div>
                    <button className="admin-logout-btn" onClick={handleLogout}>
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </aside>

            {/* ── Main Content ──────────────────────────────────── */}
            <main className="admin-main">
                {/* Header */}
                <div className="admin-main-header">
                    <div>
                        <h1 className="admin-page-title">
                            {activeTab === "overview" && "Dashboard Overview"}
                            {activeTab === "approvals" && "Pending Approvals"}
                            {activeTab === "teachers" && "Manage Teachers"}
                            {activeTab === "students" && "Manage Students"}
                            {activeTab === "monitoring" && "Focus Monitoring"}
                        </h1>
                        <p className="admin-page-sub">{admin.schoolName} · Admin Portal</p>
                    </div>
                </div>

                {/* Global action message */}
                {actionMsg && <div className="admin-action-msg">{actionMsg}</div>}

                {/* ── Overview Tab ────────────────────────────────── */}
                {activeTab === "overview" && (
                    <div className="admin-overview">
                        <div className="admin-stats-grid">
                            <div className="admin-stat-card blue">
                                <div className="admin-stat-icon"><Users size={28} color="#667eea" /></div>
                                <div className="admin-stat-value">{teachers.length}</div>
                                <div className="admin-stat-label">Total Teachers</div>
                            </div>
                            <div className="admin-stat-card purple">
                                <div className="admin-stat-icon"><GraduationCap size={28} color="#764ba2" /></div>
                                <div className="admin-stat-value">{students.length}</div>
                                <div className="admin-stat-label">Total Students</div>
                            </div>
                            <div className="admin-stat-card green">
                                <div className="admin-stat-icon"><BookOpen size={28} color="#10b981" /></div>
                                <div className="admin-stat-value">6</div>
                                <div className="admin-stat-label">Subjects</div>
                            </div>
                            <div className="admin-stat-card orange">
                                <div className="admin-stat-icon"><Bell size={28} color="#f59e0b" /></div>
                                <div className="admin-stat-value">{pendingTeachers.length + pendingStudents.length}</div>
                                <div className="admin-stat-label">Pending Approvals</div>
                            </div>
                        </div>

                        <div className="admin-info-card">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Building2 size={20} /> School Information
                            </h3>
                            <div className="admin-info-grid">
                                <div className="admin-info-row">
                                    <span className="admin-info-label">School Name</span>
                                    <span className="admin-info-value">{admin.schoolName}</span>
                                </div>
                                <div className="admin-info-row">
                                    <span className="admin-info-label">Admin Email</span>
                                    <span className="admin-info-value">{admin.email}</span>
                                </div>
                                <div className="admin-info-row">
                                    <span className="admin-info-label">Classes Managed</span>
                                    <span className="admin-info-value">
                                        {(admin.classes || [6, 7, 8, 9, 10]).map((c) => `Class ${c}`).join(", ")}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="admin-quick-actions">
                            <h3>Quick Actions</h3>
                            <div className="admin-actions-grid">
                                <button className="admin-action-btn" onClick={() => setActiveTab("teachers")}>
                                    <span><Users size={18} /></span><span>Manage Teachers</span>
                                </button>
                                <button className="admin-action-btn" onClick={() => setActiveTab("students")}>
                                    <span><GraduationCap size={18} /></span><span>Manage Students</span>
                                </button>
                                <button className="admin-action-btn" onClick={() => setActiveTab("approvals")}>
                                    <span><Bell size={18} /></span><span>Pending Approvals {(pendingTeachers.length + pendingStudents.length) > 0 && `(${pendingTeachers.length + pendingStudents.length})`}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Approvals Tab ─────────────────────────────────── */}
                {activeTab === "approvals" && (
                    <div className="admin-table-section">
                        {/* ── TEACHER APPROVALS ── */}
                        <div className="admin-table-header">
                            <h3>Pending Teacher Registrations ({pendingTeachers.length})</h3>
                        </div>
                        {pendingTeachers.length === 0 ? (
                            <div className="admin-empty" style={{ padding: '20px', marginBottom: '32px' }}>
                                <div className="admin-empty-icon"><CheckCircle size={48} color="#10b981" /></div>
                                <h3>No pending teacher approvals</h3>
                                <p>All teacher registrations have been reviewed.</p>
                            </div>
                        ) : (
                            <div className="admin-table-wrap">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Phone</th>
                                            <th>Class</th>
                                            <th>Section</th>
                                            <th>Applied</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingTeachers.map((t, i) => (
                                            <tr key={t._id}>
                                                <td>{i + 1}</td>
                                                <td>
                                                    <div className="admin-teacher-name">
                                                        <div className="admin-avatar-sm"><Users size={16} color="#4f46e5" /></div>
                                                        {t.name}
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: "13px", color: "#64748b" }}>{t.email}</td>
                                                <td style={{ fontSize: "13px" }}>{t.phone || "—"}</td>
                                                <td>Class {t.assignedClass}</td>
                                                <td>Section {t.assignedSection}</td>
                                                <td style={{ fontSize: "12px", color: "#94a3b8" }}>
                                                    {new Date(t.createdAt).toLocaleDateString()}
                                                </td>
                                                <td>
                                                    <div className="admin-approval-btns">
                                                        <button 
                                                            className="admin-approve-btn" 
                                                            onClick={() => handleApprove(t._id, t.name)}
                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                        >
                                                            <CheckCircle size={14} /> Approve
                                                        </button>
                                                        <button 
                                                            className="admin-reject-btn" 
                                                            onClick={() => handleReject(t._id, t.name)}
                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                        >
                                                            <XCircle size={14} /> Reject
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* ── STUDENT APPROVALS ── */}
                        <div className="admin-table-header" style={{ marginTop: '24px' }}>
                            <h3>Pending Student Registrations ({pendingStudents.length})</h3>
                        </div>
                        {pendingStudents.length === 0 ? (
                            <div className="admin-empty" style={{ padding: '20px' }}>
                                <div className="admin-empty-icon"><CheckCircle size={48} color="#10b981" /></div>
                                <h3>No pending student approvals</h3>
                                <p>All student registrations have been reviewed.</p>
                            </div>
                        ) : (
                            <div className="admin-table-wrap">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Class & Section</th>
                                            <th>Roll No.</th>
                                            <th>Applied</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingStudents.map((s, i) => (
                                            <tr key={s._id}>
                                                <td>{i + 1}</td>
                                                <td>
                                                    <div className="admin-teacher-name">
                                                        <div className="admin-avatar-sm"><GraduationCap size={16} color="#4f46e5" /></div>
                                                        {s.name}
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: "13px", color: "#64748b" }}>{s.email}</td>
                                                <td>Class {s.class.replace('Class ', '')} - Sec {s.section}</td>
                                                <td>{s.rollNumber || "—"}</td>
                                                <td style={{ fontSize: "12px", color: "#94a3b8" }}>
                                                    {new Date(s.createdAt).toLocaleDateString()}
                                                </td>
                                                <td>
                                                    <div className="admin-approval-btns">
                                                        <button 
                                                            className="admin-approve-btn" 
                                                            onClick={() => handleApproveStudent(s._id, s.name)}
                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                        >
                                                            <CheckCircle size={14} /> Approve
                                                        </button>
                                                        <button 
                                                            className="admin-reject-btn" 
                                                            onClick={() => handleRejectStudent(s._id, s.name)}
                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                        >
                                                            <XCircle size={14} /> Reject
                                                        </button>
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

                {/* ── Teachers Tab ───────────────────────────────────── */}
                {activeTab === "teachers" && (
                    <div className="admin-table-section">
                        <div className="admin-table-header">
                            <h3>All Teachers ({teachers.length})</h3>
                        </div>
                        {teachers.length === 0 ? (
                            <div className="admin-empty">
                                <div className="admin-empty-icon"><Users size={48} color="#64748b" /></div>
                                <h3>No teachers registered yet</h3>
                                <p>Teachers can register from the Signup page.</p>
                            </div>
                        ) : (
                            <div className="admin-table-wrap">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Phone</th>
                                            <th>Class</th>
                                            <th>Section</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teachers.map((t, i) => (
                                            <tr key={t._id}>
                                                <td>{i + 1}</td>
                                                <td>
                                                    <div className="admin-teacher-name">
                                                        <div className="admin-avatar-sm"><Users size={16} color="#4f46e5" /></div>
                                                        {t.name}
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: "13px", color: "#64748b" }}>{t.email}</td>
                                                <td style={{ fontSize: "13px" }}>{t.phone || "—"}</td>
                                                <td>
                                                    <button
                                                        className="admin-link-btn"
                                                        onClick={() => handleViewStudents(t.assignedClass, "")}
                                                    >
                                                        Class {t.assignedClass}
                                                    </button>
                                                </td>
                                                <td>
                                                    <button
                                                        className="admin-link-btn"
                                                        onClick={() => handleViewStudents(t.assignedClass, t.assignedSection)}
                                                    >
                                                        Section {t.assignedSection}
                                                    </button>
                                                </td>
                                                <td>{statusBadge(t.status || "approved")}</td>
                                                <td>
                                                    <button
                                                        className="admin-delete-btn"
                                                        onClick={() => handleDeleteTeacher(t._id, t.name)}
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                    >
                                                        <Trash2 size={14} /> Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Students Tab ───────────────────────────────────── */}
                {activeTab === "students" && (
                    <div className="admin-students-drilldown">
                        <div className="admin-drilldown-header">
                            <div className="admin-drilldown-path">
                                <button
                                    className={`admin-path-step ${!studentFilter.class ? "active" : ""}`}
                                    onClick={() => setStudentFilter({ class: "", section: "" })}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <GraduationCap size={16} /> All Classes
                                </button>
                                {studentFilter.class && (
                                    <>
                                        <span className="admin-path-sep">/</span>
                                        <button
                                            className={`admin-path-step ${!studentFilter.section ? "active" : ""}`}
                                            onClick={() => setStudentFilter({ ...studentFilter, section: "" })}
                                        >
                                            Class {studentFilter.class}
                                        </button>
                                    </>
                                )}
                                {studentFilter.section && (
                                    <>
                                        <span className="admin-path-sep">/</span>
                                        <button className="admin-path-step active">
                                            Section {studentFilter.section}
                                        </button>
                                    </>
                                )}
                            </div>
                            <h3 className="admin-drilldown-title">
                                {!studentFilter.class && "Select a Class to View Students"}
                                {studentFilter.class && !studentFilter.section && `Select a Section for Class ${studentFilter.class}`}
                                {studentFilter.class && studentFilter.section && `Students in Class ${studentFilter.class} - Section ${studentFilter.section}`}
                            </h3>
                        </div>

                        {/* Level 0: Class Selection */}
                        {!studentFilter.class && (
                            <div className="admin-drilldown-grid">
                                {[6, 7, 8, 9, 10].map((c) => {
                                    const count = students.filter(s => s.class === `Class ${c}`).length;
                                    return (
                                        <button
                                            key={c}
                                            className="admin-drill-card"
                                            onClick={() => setStudentFilter({ class: c.toString(), section: "" })}
                                        >
                                            <div className="admin-drill-icon"><BookOpen size={36} color="#4f46e5" /></div>
                                            <div className="admin-drill-name">Class {c}</div>
                                            <div className="admin-drill-count">{count} Students</div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Level 1: Section Selection */}
                        {studentFilter.class && !studentFilter.section && (
                            <div className="admin-drilldown-grid">
                                {["A", "B", "C", "D"].map((s) => {
                                    const count = students.filter(
                                        st => st.class === `Class ${studentFilter.class}` && st.section === s
                                    ).length;
                                    return (
                                        <button
                                            key={s}
                                            className="admin-drill-card secondary"
                                            onClick={() => setStudentFilter({ ...studentFilter, section: s })}
                                        >
                                            <div className="admin-drill-icon"><MapPin size={36} color="#764ba2" /></div>
                                            <div className="admin-drill-name">Section {s}</div>
                                            <div className="admin-drill-count">{count} Students</div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Level 2: Student Table */}
                        {studentFilter.class && studentFilter.section && (
                            <div className="admin-table-section">
                                {filteredStudents.length === 0 ? (
                                    <div className="admin-empty">
                                        <div className="admin-empty-icon"><GraduationCap size={48} color="#64748b" /></div>
                                        <h3>No students found</h3>
                                        <p>No students have registered for this specific class and section yet.</p>
                                    </div>
                                ) : (
                                    <div className="admin-table-wrap">
                                        <table className="admin-table">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Name</th>
                                                    <th>Email</th>
                                                    <th>Roll No.</th>
                                                    <th>Status</th>
                                                    <th>Registered</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredStudents.map((s, i) => (
                                                    <tr key={s._id}>
                                                        <td>{i + 1}</td>
                                                        <td>
                                                            <div className="admin-teacher-name">
                                                                <div className="admin-avatar-sm"><GraduationCap size={16} color="#4f46e5" /></div>
                                                                {s.name}
                                                            </div>
                                                        </td>
                                                        <td style={{ fontSize: "13px", color: "#64748b" }}>{s.email}</td>
                                                        <td>{s.rollNumber || "—"}</td>
                                                        <td>{statusBadge(s.status)}</td>
                                                        <td style={{ fontSize: "12px", color: "#94a3b8" }}>
                                                            {new Date(s.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td>
                                                            <button
                                                                className="admin-delete-btn"
                                                                onClick={() => handleDeleteStudent(s._id, s.name)}
                                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                            >
                                                                <Trash2 size={14} /> Delete
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Monitoring Tab ──────────────────────────────────── */}
                {activeTab === "monitoring" && (
                    <div>
                        {violationStats && (
                            <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                <div className="admin-stat-card blue">
                                    <div className="admin-stat-icon"><ShieldAlert size={28} color="#667eea" /></div>
                                    <div className="admin-stat-value">{violationStats.totalViolations}</div>
                                    <div className="admin-stat-label">Total Violations</div>
                                </div>
                                <div className="admin-stat-card orange">
                                    <div className="admin-stat-icon"><Bell size={28} color="#f59e0b" /></div>
                                    <div className="admin-stat-value">{violationStats.last24h}</div>
                                    <div className="admin-stat-label">Last 24 Hours</div>
                                </div>
                                {violationStats.byReason?.map((r) => (
                                    <div className="admin-stat-card purple" key={r._id}>
                                        <div className="admin-stat-value">{r.count}</div>
                                        <div className="admin-stat-label" style={{ textTransform: 'capitalize' }}>
                                            {(r._id || 'unknown').replace(/_/g, ' ')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {violationStats?.byUser && violationStats.byUser.length > 0 && (
                            <div className="admin-info-card">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Users size={20} /> Top Violators
                                </h3>
                                <div className="admin-info-grid">
                                    {violationStats.byUser.slice(0, 5).map((u) => (
                                        <div className="admin-info-row" key={u._id}>
                                            <span className="admin-info-label">{u._id}</span>
                                            <span className="admin-info-value">
                                                {u.count} violations • {u.totalDuration ? Math.floor(u.totalDuration / (1000 * 60)) : 0}m
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="admin-table-section">
                            <div className="admin-table-header">
                                <h3>Focus Activity Log - Recent Violations</h3>
                            </div>
                            <ViolationTable violations={violations} showUser={true} activityLogView={true} />
                        </div>
                    </div>
                )}
            </main>

            {/* ── Custom Professional Logout Modal ──────────────── */}
            {showLogoutModal && (
                <div className="admin-modal-overlay">
                    <div className="admin-confirm-modal">
                        <div className="admin-modal-icon"><Hand size={48} color="#f59e0b" /></div>
                        <h2 className="admin-modal-title">Confirm Logout</h2>
                        <p className="admin-modal-text">
                            Are you sure you want to log out of the Admin Portal?
                            Your current session will be safely terminated.
                        </p>
                        <div className="admin-modal-actions">
                            <button
                                className="admin-modal-btn cancel"
                                onClick={() => setShowLogoutModal(false)}
                            >
                                Stay Logged In
                            </button>
                            <button
                                className="admin-modal-btn confirm"
                                onClick={confirmLogout}
                            >
                                Yes, Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ── Pending Approvals Notification Modal ──────────────── */}
            {showApprovalPopup && (
                <div className="admin-modal-overlay">
                    <div className="admin-confirm-modal admin-approval-popup">
                        <div className="admin-popup-icon-wrapper">
                            <div className="admin-modal-icon"><Bell size={32} /></div>
                            <div className="admin-icon-ring"></div>
                        </div>
                        
                        <h2 className="admin-modal-title">Action Required</h2>
                        <p className="admin-modal-text">
                            You have pending registrations awaiting your review! Keep your school data up to date.
                        </p>

                        <div className="admin-popup-stats">
                            {pendingTeachers.length > 0 && (
                                <div className="admin-popup-stat-item teachers">
                                    <span className="stat-count">{pendingTeachers.length}</span>
                                    <span className="stat-label">Pending Teacher(s)</span>
                                </div>
                            )}
                            {pendingStudents.length > 0 && (
                                <div className="admin-popup-stat-item students">
                                    <span className="stat-count">{pendingStudents.length}</span>
                                    <span className="stat-label">Pending Student(s)</span>
                                </div>
                            )}
                        </div>

                        <div className="admin-modal-actions horizontal">
                            <button className="admin-popup-btn secondary" onClick={() => setShowApprovalPopup(false)}>
                                Dismiss
                            </button>
                            <button className="admin-popup-btn primary" onClick={() => {
                                setShowApprovalPopup(false);
                                setActiveTab("approvals");
                            }}>
                                Review Now <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Change Password Modal ────────────────────── */}
            {showChangePW && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal change-pw-modal">
                        <div className="admin-modal-header">
                            <h2>
                                {isFirstLoginModal ? <Lock size={24} color="#f59e0b" /> : <Key size={24} color="#1e1b4b" />} 
                                {isFirstLoginModal ? "Security Setup" : "Change Password"}
                            </h2>
                            {!isFirstLoginModal && (
                                <button className="admin-modal-close" onClick={() => setShowChangePW(false)}>✕</button>
                            )}
                        </div>
                        <div className="admin-modal-body">
                            {isFirstLoginModal && (
                                <p className="admin-modal-desc">
                                    Welcome! Because this is your first time logging in, please change your temporary password to secure your school's data.
                                </p>
                            )}
                            <form onSubmit={handleChangePassword} className="admin-modal-form">
                                <div className="admin-form-group">
                                    <label>Old Password</label>
                                    <div className="admin-password-field">
                                        <input
                                            type={showOldPw ? "text" : "password"}
                                            placeholder="Enter current password"
                                            value={pwForm.currentPassword}
                                            onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                                            required
                                        />
                                        <button 
                                            type="button" 
                                            className="admin-toggle-pw" 
                                            onClick={() => setShowOldPw(!showOldPw)}
                                        >
                                            {showOldPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="admin-form-group">
                                    <label>New Password</label>
                                    <div className="admin-password-field">
                                        <input
                                            type={showNewPw ? "text" : "password"}
                                            placeholder="Minimum 6 characters"
                                            value={pwForm.newPassword}
                                            onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                                            required
                                        />
                                        <button 
                                            type="button" 
                                            className="admin-toggle-pw" 
                                            onClick={() => setShowNewPw(!showNewPw)}
                                        >
                                            {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="admin-form-group">
                                    <label>Confirm New Password</label>
                                    <div className="admin-password-field">
                                        <input
                                            type={showConfirmPw ? "text" : "password"}
                                            placeholder="Repeat new password"
                                            value={pwForm.confirmPassword}
                                            onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                                            required
                                        />
                                        <button 
                                            type="button" 
                                            className="admin-toggle-pw" 
                                            onClick={() => setShowConfirmPw(!showConfirmPw)}
                                        >
                                            {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {pwError && <div className="admin-form-error">{pwError}</div>}

                                <div className="admin-modal-footer">
                                    {!isFirstLoginModal && (
                                        <button
                                            type="button"
                                            className="admin-btn secondary"
                                            onClick={() => setShowChangePW(false)}
                                            disabled={pwLoading}
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className={`admin-btn primary ${isFirstLoginModal ? "full" : ""}`}
                                        disabled={pwLoading}
                                    >
                                        {pwLoading ? "Updating..." : "Update Password →"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;
