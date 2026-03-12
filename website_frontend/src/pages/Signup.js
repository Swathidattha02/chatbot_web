import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { 
    AlertTriangle, Globe, Mic, Clock, Target, 
    GraduationCap, Users, User, Lock, Building2, 
    EyeOff, Eye, CheckCircle, Mail 
} from "lucide-react";
import "../styles/AuthNew.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function Signup() {
    const [activeRole, setActiveRole] = useState("student");
    const navigate = useNavigate();
    const { signup } = useAuth();

    // Common fields
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [rollNumber, setRollNumber] = useState("");

    // Dropdown data
    const [schools, setSchools] = useState([]);
    const [selectedSchool, setSelectedSchool] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedSection, setSelectedSection] = useState("");
    const [teachers, setTeachers] = useState([]);
    const [selectedTeacher, setSelectedTeacher] = useState("");

    // UI state
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [pendingInfo, setPendingInfo] = useState(null); // { schoolName, name }

    const schoolObj = schools.find((s) => s._id === selectedSchool);
    const availableClasses = schoolObj ? schoolObj.classes : [];
    const availableSections =
        schoolObj && selectedClass ? schoolObj.sectionsPerClass[selectedClass] || [] : [];

    // Lock body scroll when showing the pending page
    useEffect(() => {
        if (pendingInfo) {
            document.body.style.overflow = "hidden";
            document.documentElement.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
            document.documentElement.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
            document.documentElement.style.overflow = "";
        };
    }, [pendingInfo]);



    // Load schools
    useEffect(() => {
        axios.get(`${API_BASE}/schools`).then((res) => {
            if (res.data.success) setSchools(res.data.schools);
        }).catch(() => { });
    }, []);

    // Load teachers
    useEffect(() => {
        if (activeRole === "student" && selectedSchool && selectedClass && selectedSection) {
            axios
                .get(`${API_BASE}/schools/${selectedSchool}/teachers`, {
                    params: { class: selectedClass, section: selectedSection },
                })
                .then((res) => {
                    if (res.data.success) setTeachers(res.data.teachers);
                })
                .catch(() => setTeachers([]));
        } else {
            setTeachers([]);
            setSelectedTeacher("");
        }
    }, [selectedSchool, selectedClass, selectedSection, activeRole]);

    const resetFields = () => {
        setName(""); setEmail(""); setPhone(""); setPassword("");
        setConfirmPassword(""); setSelectedSchool(""); setSelectedClass("");
        setSelectedSection(""); setSelectedTeacher(""); setRollNumber("");
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (password !== confirmPassword) { setError("Passwords do not match"); return; }
        if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
        setLoading(true);

        try {
            if (activeRole === "student") {
                const result = await signup(name, email, password, `Class ${selectedClass}`, phone, {
                    section: selectedSection,
                    schoolId: selectedSchool,
                    classTeacherId: selectedTeacher,
                    rollNumber,
                });
                if (result.success && result.pending) {
                    // Show pending approval screen for student
                    setPendingInfo({
                        name,
                        role: "student",
                        schoolName: schoolObj?.name || "your school",
                        assignedClass: selectedClass,
                        assignedSection: selectedSection,
                        approver: "your class teacher",
                    });
                } else if (result.success) {
                    navigate("/dashboard");
                } else {
                    setError(result.message || "Registration failed");
                }
            } else {
                const res = await axios.post(`${API_BASE}/auth/teacher/register`, {
                    name, email, phone, password,
                    schoolId: selectedSchool,
                    assignedClass: selectedClass,
                    assignedSection: selectedSection,
                });
                if (res.data.success && res.data.pending) {
                    // Show pending approval screen for teacher
                    setPendingInfo({
                        name,
                        role: "teacher",
                        schoolName: res.data.teacher?.schoolName || schoolObj?.name || "your school",
                        assignedClass: selectedClass,
                        assignedSection: selectedSection,
                        approver: "school admin",
                    });
                } else setError(res.data.message || "Registration failed");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Registration failed. Please try again.");
        }
        setLoading(false);
    };

    // ── Pending Approval Screen ───────────────────────────────────
    if (pendingInfo) {
        const isStudent = pendingInfo.role === "student";
        return (
            <div className="pending-approval-page">
                <div className="pending-approval-card">
                    {/* Status badge */}
                    <div className="pending-status-badge">
                        ● Pending Approval
                    </div>

                    <h2>Registration Submitted!</h2>
                    <p className="pending-greeting">
                        Hi <strong>{pendingInfo.name}</strong> — your {isStudent ? "student" : "teacher"} account is under review.
                    </p>

                    <p className="pending-desc">
                        <strong>{pendingInfo.schoolName}</strong> &nbsp;·&nbsp;
                        Class {pendingInfo.assignedClass} &nbsp;/&nbsp; Section {pendingInfo.assignedSection}
                    </p>

                    <div className="pending-steps">
                        <div className="pending-step">
                            <span className="pending-step-icon">
                                {isStudent ? <Users size={20} color="#667eea" /> : <Building2 size={20} color="#764ba2" />}
                            </span>
                            <span>Your <strong>{pendingInfo.approver}</strong> will review and approve your account.</span>
                        </div>
                        <div className="pending-step">
                            <span className="pending-step-icon"><CheckCircle size={20} color="#10b981" /></span>
                            <span>Once approved, log in with your email and password.</span>
                        </div>
                        <div className="pending-step">
                            <span className="pending-step-icon"><Mail size={20} color="#f59e0b" /></span>
                            <span>Contact your {pendingInfo.approver} if it takes too long.</span>
                        </div>
                    </div>

                    <a href="/login" className="pending-login-btn">Go to Login →</a>
                </div>
            </div>
        );
    }

    return (
        <div className="signup-page">
            {/* ── LEFT PANEL ─────────────────────────────────────── */}
            <div className="signup-left">
                <div className="signup-left-inner">
                    <div className="signup-badge">✨ AI-POWERED LEARNING</div>

                    <h1 className="signup-left-title">
                        Learn Smarter<br />
                        <span className="signup-left-highlight">with AI</span>
                    </h1>

                    <p className="signup-left-desc">
                        Unlock a personalized educational journey with our advanced AI tutor,{" "}
                        <strong>designed</strong> to help you excel in every <strong>subject</strong>.
                    </p>

                    <ul className="signup-features">
                        <li>
                            <div className="feature-icon"><Globe size={20} color="#4f46e5" /></div>
                            <div>
                                <strong>Multilingual Support</strong>
                                <p>Explains complex topics in your preferred language for better understanding.</p>
                            </div>
                        </li>
                        <li>
                            <div className="feature-icon"><Mic size={20} color="#ec4899" /></div>
                            <div>
                                <strong>Voice Interaction</strong>
                                <p>Hear clear, spoken explanations of any chapter, making learning accessible.</p>
                            </div>
                        </li>
                        <li>
                            <div className="feature-icon"><Clock size={20} color="#f59e0b" /></div>
                            <div>
                                <strong>24/7 Availability</strong>
                                <p>Get instant help with your doubts, anytime, anywhere, without waiting.</p>
                            </div>
                        </li>
                        <li>
                            <div className="feature-icon"><Target size={20} color="#10b981" /></div>
                            <div>
                                <strong>Personalized Learning</strong>
                                <p>Tailored explanations for grades 6–10 based on individual learning pace.</p>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>

            {/* ── RIGHT PANEL ─────────────────────────────────────── */}
            <div className="signup-right">
                <div className="signup-right-inner">
                    {/* Header */}
                    <div className="signup-form-header">
                        <h2>Create Account</h2>
                        <p>Select your role and fill in your details to get started.</p>
                    </div>

                    {/* Role Tabs */}
                    <div className="role-tabs">
                        <button
                            className={`role-tab ${activeRole === "student" ? "active" : ""}`}
                            onClick={() => { setActiveRole("student"); resetFields(); }}
                            type="button"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                        >
                            <GraduationCap size={16} /> I am a Student
                        </button>
                        <button
                            className={`role-tab ${activeRole === "teacher" ? "active" : ""}`}
                            onClick={() => { setActiveRole("teacher"); resetFields(); }}
                            type="button"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                        >
                            <Users size={16} /> I am a Teacher
                        </button>
                    </div>

                    {error && (
                        <div className="auth-error">
                            <AlertTriangle size={16} /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="signup-form">
                        {/* ── Personal Information ── */}
                        <div className="form-section-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="section-icon"><User size={16} color="#64748b" /></span> Personal Information
                        </div>

                        <div className="form-row-2">
                            <div className="form-field">
                                <label>Full Name</label>
                                <input type="text" placeholder="e.g. Alex Johnson"
                                    value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>
                            <div className="form-field">
                                <label>Email Address</label>
                                <input type="email" placeholder="alex@school.com"
                                    value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>
                        </div>

                        <div className="form-row-2">
                            <div className="form-field">
                                <label>Phone Number</label>
                                <input type="tel" placeholder="+1 (555) 000-0000"
                                    value={phone} onChange={(e) => setPhone(e.target.value)} />
                            </div>
                            {activeRole === "student" && (
                                <div className="form-field">
                                    <label>Roll Number</label>
                                    <input type="text" placeholder="e.g. 202401"
                                        value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} />
                                </div>
                            )}
                        </div>

                        {/* ── Security ── */}
                        <div className="form-section-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="section-icon"><Lock size={16} color="#64748b" /></span> Security
                        </div>

                        <div className="form-row-2">
                            <div className="form-field">
                                <label>Password</label>
                                <div className="pw-wrap">
                                    <input type={showPassword ? "text" : "password"}
                                        placeholder="Min. 8 characters"
                                        value={password} onChange={(e) => setPassword(e.target.value)}
                                        required minLength="6" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div className="form-field">
                                <label>Confirm Password</label>
                                <div className="pw-wrap">
                                    <input type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Repeat password"
                                        value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                        required minLength="6" />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── Academic Details ── */}
                        <div className="form-section-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="section-icon"><Building2 size={16} color="#64748b" /></span> Academic Details
                        </div>

                        <div className="form-field form-full">
                            <label>School Name</label>
                            <select value={selectedSchool}
                                onChange={(e) => { setSelectedSchool(e.target.value); setSelectedClass(""); setSelectedSection(""); }}
                                required>
                                <option value="">Select your school</option>
                                {schools.map((s) => (
                                    <option key={s._id} value={s._id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-row-2">
                            <div className="form-field">
                                <label>Grade / Class</label>
                                <select value={selectedClass}
                                    onChange={(e) => { setSelectedClass(e.target.value); setSelectedSection(""); }}
                                    required disabled={!selectedSchool}>
                                    <option value="">Select Grade</option>
                                    {availableClasses.map((c) => (
                                        <option key={c} value={c}>Class {c}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-field">
                                <label>Section</label>
                                <select value={selectedSection}
                                    onChange={(e) => setSelectedSection(e.target.value)}
                                    required disabled={!selectedClass}>
                                    <option value="">Select Section</option>
                                    {availableSections.map((s) => (
                                        <option key={s} value={s}>Section {s}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {activeRole === "student" && (
                            <div className="form-field form-full">
                                <label>Class Teacher</label>
                                <select value={selectedTeacher}
                                    onChange={(e) => setSelectedTeacher(e.target.value)}
                                    disabled={!selectedSection}>
                                    <option value="">Select your Class Teacher</option>
                                    {teachers.map((t) => (
                                        <option key={t._id} value={t._id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button type="submit" className="signup-submit-btn" disabled={loading}>
                            {loading ? "Creating Account..." : "Create Account"}
                        </button>
                    </form>

                    <div className="signup-footer-link">
                        Already have an account? <Link to="/login">Log in here.</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Signup;
