import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
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

    const schoolObj = schools.find((s) => s._id === selectedSchool);
    const availableClasses = schoolObj ? schoolObj.classes : [];
    const availableSections =
        schoolObj && selectedClass ? schoolObj.sectionsPerClass[selectedClass] || [] : [];

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
                if (result.success) navigate("/dashboard");
                else setError(result.message || "Registration failed");
            } else {
                const res = await axios.post(`${API_BASE}/auth/teacher/register`, {
                    name, email, phone, password,
                    schoolId: selectedSchool,
                    assignedClass: selectedClass,
                    assignedSection: selectedSection,
                });
                if (res.data.success) {
                    localStorage.setItem("token", res.data.token);
                    localStorage.setItem("user", JSON.stringify(res.data.user));
                    navigate("/teacher/dashboard");
                } else setError(res.data.message || "Registration failed");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Registration failed. Please try again.");
        }
        setLoading(false);
    };

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
                            <div className="feature-icon">🌐</div>
                            <div>
                                <strong>Multilingual Support</strong>
                                <p>Explains complex topics in your preferred language for better understanding.</p>
                            </div>
                        </li>
                        <li>
                            <div className="feature-icon">🎙️</div>
                            <div>
                                <strong>Voice Interaction</strong>
                                <p>Hear clear, spoken explanations of any chapter, making learning accessible.</p>
                            </div>
                        </li>
                        <li>
                            <div className="feature-icon">🕐</div>
                            <div>
                                <strong>24/7 Availability</strong>
                                <p>Get instant help with your doubts, anytime, anywhere, without waiting.</p>
                            </div>
                        </li>
                        <li>
                            <div className="feature-icon">🎯</div>
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
                        >
                            🎓 I am a Student
                        </button>
                        <button
                            className={`role-tab ${activeRole === "teacher" ? "active" : ""}`}
                            onClick={() => { setActiveRole("teacher"); resetFields(); }}
                            type="button"
                        >
                            👩‍🏫 I am a Teacher
                        </button>
                    </div>

                    {error && (
                        <div className="auth-error">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="signup-form">
                        {/* ── Personal Information ── */}
                        <div className="form-section-label">
                            <span className="section-icon">👤</span> Personal Information
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
                        <div className="form-section-label">
                            <span className="section-icon">🔒</span> Security
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
                                        {showPassword ? "🙈" : "👁️"}
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
                                        {showConfirmPassword ? "🙈" : "👁️"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── Academic Details ── */}
                        <div className="form-section-label">
                            <span className="section-icon">🏫</span> Academic Details
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
