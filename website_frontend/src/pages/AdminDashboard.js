import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/AdminDashboard.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function AdminDashboard() {
    const navigate = useNavigate();
    const [admin, setAdmin] = useState(null);
    const [teachers, setTeachers] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview"); // overview | teachers | students

    // ── Guard: only admins may be here ───────────────────────────
    useEffect(() => {
        const stored = localStorage.getItem("user");
        const token = localStorage.getItem("token");
        if (!stored || !token) { navigate("/login"); return; }
        const u = JSON.parse(stored);
        if (u.role !== "admin") { navigate("/login"); return; }
        setAdmin(u);
    }, [navigate]);

    // ── Fetch teachers for this school ────────────────────────────
    const fetchTeachers = useCallback(async () => {
        if (!admin) return;
        try {
            const res = await fetch(`${API_BASE}/schools/${admin._id}/teachers`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            const data = await res.json();
            if (data.success) setTeachers(data.teachers);
        } catch { }
    }, [admin]);

    useEffect(() => {
        if (admin) {
            fetchTeachers();
            setLoading(false);
        }
    }, [admin, fetchTeachers]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    if (loading || !admin) {
        return (
            <div className="admin-loading">
                <div className="admin-spinner"></div>
                <p>Loading Admin Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            {/* ── Sidebar ─────────────────────────────── */}
            <aside className="admin-sidebar">
                <div className="admin-logo">
                    <span className="admin-logo-icon">🏫</span>
                    <div>
                        <div className="admin-logo-title">Admin Panel</div>
                        <div className="admin-logo-sub">{admin.schoolName}</div>
                    </div>
                </div>

                <nav className="admin-nav">
                    {[
                        { id: "overview", icon: "📊", label: "Overview" },
                        { id: "teachers", icon: "👩‍🏫", label: "Teachers" },
                        { id: "students", icon: "🎓", label: "Students" },
                    ].map((item) => (
                        <button
                            key={item.id}
                            className={`admin-nav-item ${activeTab === item.id ? "active" : ""}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            <span>{item.icon}</span>
                            {item.label}
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

            {/* ── Main Content ─────────────────────────── */}
            <main className="admin-main">
                {/* Header */}
                <div className="admin-main-header">
                    <div>
                        <h1 className="admin-page-title">
                            {activeTab === "overview" && "Dashboard Overview"}
                            {activeTab === "teachers" && "Manage Teachers"}
                            {activeTab === "students" && "Manage Students"}
                        </h1>
                        <p className="admin-page-sub">{admin.schoolName} · Admin Portal</p>
                    </div>
                </div>

                {/* ── Overview Tab ─────────────────────── */}
                {activeTab === "overview" && (
                    <div className="admin-overview">
                        {/* Stat cards */}
                        <div className="admin-stats-grid">
                            <div className="admin-stat-card blue">
                                <div className="admin-stat-icon">👩‍🏫</div>
                                <div className="admin-stat-value">{teachers.length}</div>
                                <div className="admin-stat-label">Total Teachers</div>
                            </div>
                            <div className="admin-stat-card purple">
                                <div className="admin-stat-icon">🏫</div>
                                <div className="admin-stat-value">{admin.classes?.length || 5}</div>
                                <div className="admin-stat-label">Classes</div>
                            </div>
                            <div className="admin-stat-card green">
                                <div className="admin-stat-icon">📚</div>
                                <div className="admin-stat-value">6</div>
                                <div className="admin-stat-label">Subjects</div>
                            </div>
                            <div className="admin-stat-card orange">
                                <div className="admin-stat-icon">🎓</div>
                                <div className="admin-stat-value">{students.length || "—"}</div>
                                <div className="admin-stat-label">Students</div>
                            </div>
                        </div>

                        {/* Admin Info */}
                        <div className="admin-info-card">
                            <h3>🏫 School Information</h3>
                            <div className="admin-info-grid">
                                <div className="admin-info-row">
                                    <span className="admin-info-label">School Name</span>
                                    <span className="admin-info-value">{admin.schoolName}</span>
                                </div>
                                <div className="admin-info-row">
                                    <span className="admin-info-label">School Slug</span>
                                    <span className="admin-info-value">{admin.schoolSlug}</span>
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

                        {/* Quick actions */}
                        <div className="admin-quick-actions">
                            <h3>Quick Actions</h3>
                            <div className="admin-actions-grid">
                                <button className="admin-action-btn" onClick={() => setActiveTab("teachers")}>
                                    <span>👩‍🏫</span>
                                    <span>View Teachers</span>
                                </button>
                                <button className="admin-action-btn" onClick={() => setActiveTab("students")}>
                                    <span>🎓</span>
                                    <span>View Students</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Teachers Tab ─────────────────────── */}
                {activeTab === "teachers" && (
                    <div className="admin-table-section">
                        <div className="admin-table-header">
                            <h3>All Teachers ({teachers.length})</h3>
                        </div>
                        {teachers.length === 0 ? (
                            <div className="admin-empty">
                                <div className="admin-empty-icon">👩‍🏫</div>
                                <h3>No teachers registered yet</h3>
                                <p>Teachers can register themselves from the Signup page.</p>
                            </div>
                        ) : (
                            <div className="admin-table-wrap">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Name</th>
                                            <th>Class</th>
                                            <th>Section</th>
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
                                                <td>Class {t.assignedClass}</td>
                                                <td>Section {t.assignedSection}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Students Tab ─────────────────────── */}
                {activeTab === "students" && (
                    <div className="admin-empty">
                        <div className="admin-empty-icon">🎓</div>
                        <h3>Student list coming soon</h3>
                        <p>Students are linked to teachers by class & section.</p>
                    </div>
                )}
            </main>
        </div>
    );
}

export default AdminDashboard;
