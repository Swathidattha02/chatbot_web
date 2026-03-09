import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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

    const token = localStorage.getItem("token");
    const authHeader = { Authorization: `Bearer ${token}` };

    // ── Guard ────────────────────────────────────────────────────────────────────
    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (!stored || !token) { navigate("/login"); return; }
        const u = JSON.parse(stored);
        if (u.role !== "admin") { navigate("/login"); return; }
        setAdmin(u);
    }, [navigate, token]);

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
                showMsg(`✅ ${teacherName} approved successfully!`);
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
            if (data.success) { showMsg(`❌ ${teacherName} rejected.`); fetchPendingTeachers(); }
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
                showMsg(`🗑️ ${teacherName} permanently deleted.`);
                fetchTeachers(); fetchPendingTeachers();
            } else { showMsg(data.message || "Delete failed."); }
        } catch { showMsg("Delete failed. Try again."); }
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
                showMsg(`🗑️ ${studentName} permanently deleted.`);
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
        { id: "overview", icon: "📊", label: "Overview" },
        { id: "approvals", icon: "🔔", label: "Approvals", badge: pendingTeachers.length },
        { id: "teachers", icon: "👩‍🏫", label: "Teachers" },
        { id: "students", icon: "🎓", label: "Students" },
    ];

    return (
        <div className="admin-dashboard">
            {/* ── Sidebar ──────────────────────────────────────── */}
            <aside className="admin-sidebar">
                <div className="admin-logo">
                    <span className="admin-logo-icon">🏫</span>
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
                        <div className="admin-avatar-mini">🏫</div>
                        <div>
                            <div className="admin-name-mini">{admin.name}</div>
                            <div className="admin-email-mini">{admin.email}</div>
                        </div>
                    </div>
                    <button className="admin-logout-btn" onClick={handleLogout}>
                        🚪 Logout
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
                                <div className="admin-stat-icon">👩‍🏫</div>
                                <div className="admin-stat-value">{teachers.length}</div>
                                <div className="admin-stat-label">Total Teachers</div>
                            </div>
                            <div className="admin-stat-card purple">
                                <div className="admin-stat-icon">🎓</div>
                                <div className="admin-stat-value">{students.length}</div>
                                <div className="admin-stat-label">Total Students</div>
                            </div>
                            <div className="admin-stat-card green">
                                <div className="admin-stat-icon">📚</div>
                                <div className="admin-stat-value">6</div>
                                <div className="admin-stat-label">Subjects</div>
                            </div>
                            <div className="admin-stat-card orange">
                                <div className="admin-stat-icon">🔔</div>
                                <div className="admin-stat-value">{pendingTeachers.length}</div>
                                <div className="admin-stat-label">Pending Approvals</div>
                            </div>
                        </div>

                        <div className="admin-info-card">
                            <h3>🏫 School Information</h3>
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
                                    <span>👩‍🏫</span><span>Manage Teachers</span>
                                </button>
                                <button className="admin-action-btn" onClick={() => setActiveTab("students")}>
                                    <span>🎓</span><span>Manage Students</span>
                                </button>
                                <button className="admin-action-btn" onClick={() => setActiveTab("approvals")}>
                                    <span>🔔</span><span>Pending Approvals {pendingTeachers.length > 0 && `(${pendingTeachers.length})`}</span>
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
                                <div className="admin-empty-icon">✅</div>
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
                                                        <div className="admin-avatar-sm">👩‍🏫</div>
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
                                                            ✅ Approve
                                                        </button>
                                                        <button className="admin-reject-btn" onClick={() => handleReject(t._id, t.name)}>
                                                            ❌ Reject
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
                                <div className="admin-empty-icon">👩‍🏫</div>
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
                                                        <div className="admin-avatar-sm">👩‍🏫</div>
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
                                                        🗑️ Delete
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
                                    🎓 All Classes
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
                                            <div className="admin-drill-icon">📚</div>
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
                                            <div className="admin-drill-icon">📍</div>
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
                                        <div className="admin-empty-icon">🎓</div>
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
                                                                <div className="admin-avatar-sm">🎓</div>
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
                                                                🗑️ Delete
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
                        <div className="admin-modal-icon">👋</div>
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
        </div>
    );
}

export default AdminDashboard;
