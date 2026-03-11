import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    Bell,
    Users,
    GraduationCap,
    Settings,
    LogOut,
    School,
    Layers,
    X,
    Lock,
    ShieldCheck,
    CheckCircle2,
    XCircle,
    Trash2,
    BookOpen,
    MapPin,
    GraduationCap as StudentIcon,
    UserCircle
} from "lucide-react";
import "../styles/AdminDashboard.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function AdminDashboard() {
    const navigate = useNavigate();
    const [admin, setAdmin] = useState(null);
    const [teachers, setTeachers] = useState([]);
    const [pendingTeachers, setPendingTeachers] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");
    const [actionMsg, setActionMsg] = useState("");
    const [studentFilter, setStudentFilter] = useState({ class: "", section: "" });
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showChangePW, setShowChangePW] = useState(false);
    const [isFirstLoginModal, setIsFirstLoginModal] = useState(false);
    const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [pwLoading, setPwLoading] = useState(false);
    const [pwError, setPwError] = useState("");

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

    useEffect(() => {
        if (admin) {
            fetchTeachers();
            fetchPendingTeachers();
            fetchStudents();
            setLoading(false);
        }
    }, [admin, fetchTeachers, fetchPendingTeachers, fetchStudents]);

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
                showMsg(<><CheckCircle2 size={16} /> {teacherName} approved successfully!</>);
                fetchPendingTeachers(); fetchTeachers();
            }
        } catch { showMsg(<><XCircle size={16} /> Action failed. Try again.</>); }
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
            if (data.success) { showMsg(<><XCircle size={16} /> {teacherName} rejected.</>); fetchPendingTeachers(); }
        } catch { showMsg(<><XCircle size={16} /> Action failed. Try again.</>); }
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
                showMsg(<><Trash2 size={16} /> {teacherName} permanently deleted.</>);
                fetchTeachers(); fetchPendingTeachers();
            } else { showMsg(<><XCircle size={16} /> {data.message || "Delete failed."}</>); }
        } catch { showMsg(<><XCircle size={16} /> Delete failed. Try again.</>); }
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
                showMsg(<><Trash2 size={16} /> {studentName} permanently deleted.</>);
                fetchStudents();
            } else { showMsg(<><XCircle size={16} /> {data.message || "Delete failed."}</>); }
        } catch { showMsg(<><XCircle size={16} /> Delete failed. Try again.</>); }
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
                showMsg(<><CheckCircle2 size={16} /> Password updated successfully!</>);
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
        { id: "overview", icon: <LayoutDashboard size={18} />, label: "Overview" },
        { id: "approvals", icon: <Bell size={18} />, label: "Approvals", badge: pendingTeachers.length },
        { id: "teachers", icon: <Users size={18} />, label: "Teachers" },
        { id: "students", icon: <GraduationCap size={18} />, label: "Students" },
    ];

    return (
        <div className="admin-dashboard">
            {/* ── Sidebar ──────────────────────────────────────── */}
            <aside className="admin-sidebar">
                <div className="admin-logo">
                    <span className="admin-logo-icon"><School size={32} color="#fff" /></span>
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
                        <div className="admin-avatar-mini"><Users size={20} color="#fff" /></div>
                        <div className="admin-profile-info">
                            <div className="admin-name-mini">{admin.name}</div>
                            <div className="admin-email-mini">{admin.email}</div>
                            <button className="admin-profile-link" onClick={() => { setPwError(""); setShowChangePW(true); }}>
                                <Settings size={12} /> Change Password
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
                                <div className="admin-stat-icon"><Layers size={28} color="#10b981" /></div>
                                <div className="admin-stat-value">6</div>
                                <div className="admin-stat-label">Subjects</div>
                            </div>
                            <div className="admin-stat-card orange">
                                <div className="admin-stat-icon"><Bell size={28} color="#f59e0b" /></div>
                                <div className="admin-stat-value">{pendingTeachers.length}</div>
                                <div className="admin-stat-label">Pending Approvals</div>
                            </div>
                        </div>

                        <div className="admin-info-card">
                            <h3><School size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> School Information</h3>
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
                                    <span><UserCircle size={20} color="#6366f1" /></span><span>Manage Teachers</span>
                                </button>
                                <button className="admin-action-btn" onClick={() => setActiveTab("students")}>
                                    <span><StudentIcon size={20} color="#ec4899" /></span><span>Manage Students</span>
                                </button>
                                <button className="admin-action-btn" onClick={() => setActiveTab("approvals")}>
                                    <span><Bell size={20} color="#f59e0b" /></span><span>Pending Approvals {pendingTeachers.length > 0 && `(${pendingTeachers.length})`}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Approvals Tab ─────────────────────────────────── */}
                {activeTab === "approvals" && (
                    <div className="admin-table-section">
                        <div className="admin-table-header">
                            <h3>Pending Teacher Registrations ({pendingTeachers.length})</h3>
                        </div>
                        {pendingTeachers.length === 0 ? (
                            <div className="admin-empty">
                                <div className="admin-empty-icon"><CheckCircle2 size={48} color="#10b981" /></div>
                                <h3>No pending approvals</h3>
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
                                                        <div className="admin-avatar-sm"><UserCircle size={16} color="#6366f1" /></div>
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
                                                        <button className="admin-approve-btn" onClick={() => handleApprove(t._id, t.name)}>
                                                            <CheckCircle2 size={14} /> Approve
                                                        </button>
                                                        <button className="admin-reject-btn" onClick={() => handleReject(t._id, t.name)}>
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
                                <div className="admin-empty-icon"><UserCircle size={48} color="#6366f1" /></div>
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
                                                        <div className="admin-avatar-sm"><UserCircle size={16} color="#6366f1" /></div>
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
                                >
                                    <StudentIcon size={14} style={{ marginRight: '4px' }} /> All Classes
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
                                            <div className="admin-drill-icon"><BookOpen size={24} color="#6366f1" /></div>
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
                                            <div className="admin-drill-icon"><MapPin size={24} color="#ec4899" /></div>
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
                                        <div className="admin-empty-icon"><StudentIcon size={48} color="#94a3b8" /></div>
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
                                                                <div className="admin-avatar-sm"><StudentIcon size={16} color="#ec4899" /></div>
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
            </main>

            {/* ── Custom Professional Logout Modal ──────────────── */}
            {showLogoutModal && (
                <div className="admin-modal-overlay">
                    <div className="admin-confirm-modal">
                        <div className="admin-modal-icon"><LogOut size={48} color="#ef4444" /></div>
                        <h2 className="admin-modal-title">Confirm Logout</h2>
                        <p className="admin-modal-text">Are you sure you want to sign out from the Admin Panel?
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
            {/* ── Change Password Modal ────────────────────── */}
            {showChangePW && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal change-pw-modal">
                        <div className="admin-modal-header">
                            <h2>{isFirstLoginModal ? <><ShieldCheck size={24} color="#1e1b4b" /> Security Setup</> : <><Lock size={24} color="#1e1b4b" /> Change Password</>}</h2>
                            {!isFirstLoginModal && (
                                <button className="admin-modal-close" onClick={() => setShowChangePW(false)}><X size={18} /></button>
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
                                    <input
                                        type="password"
                                        placeholder="Enter current password"
                                        value={pwForm.currentPassword}
                                        onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="admin-form-group">
                                    <label>New Password</label>
                                    <input
                                        type="password"
                                        placeholder="Minimum 6 characters"
                                        value={pwForm.newPassword}
                                        onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="admin-form-group">
                                    <label>Confirm New Password</label>
                                    <input
                                        type="password"
                                        placeholder="Repeat new password"
                                        value={pwForm.confirmPassword}
                                        onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                                        required
                                    />
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
