import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import {
    GraduationCap,
    UserRound,
    School,
    Mail,
    Lock,
    Eye,
    EyeOff,
    AlertCircle,
    ArrowRight
} from "lucide-react";
import "../styles/AuthNew.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function Login() {
    const [activeRole, setActiveRole] = useState("student"); // student | teacher | admin
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (activeRole === "student") {
                const result = await login(email, password);
                if (result.success) {
                    navigate("/dashboard");
                } else {
                    setError(result.message || "Invalid credentials");
                }
            } else if (activeRole === "teacher") {
                const res = await axios.post(`${API_BASE}/auth/teacher/login`, { email, password });
                if (res.data.success) {
                    localStorage.setItem("token", res.data.token);
                    localStorage.setItem("user", JSON.stringify(res.data.user));
                    navigate("/teacher/dashboard");
                } else {
                    setError(res.data.message || "Invalid credentials");
                }
            } else if (activeRole === "admin") {
                const res = await axios.post(`${API_BASE}/auth/admin/login`, { email, password });
                if (res.data.success) {
                    localStorage.setItem("token", res.data.token);
                    localStorage.setItem("user", JSON.stringify(res.data.user));
                    navigate("/admin/dashboard");
                } else {
                    setError(res.data.message || "Invalid credentials");
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || "Login failed. Please try again.");
        }

        setLoading(false);
    };

    const roleIcons = {
        student: <GraduationCap size={18} />,
        teacher: <UserRound size={18} />,
        admin: <School size={18} />
    };

    return (
        <div className="auth-new-container">
            <div className="auth-new-card login-card">
                {/* Header */}
                <div className="auth-new-header">
                    <h1>Welcome Back</h1>
                    <p>Access your personalized learning portal.</p>
                </div>

                {/* Role Tabs */}
                <div className="role-tabs">
                    {["student", "teacher", "admin"].map((role) => (
                        <button
                            key={role}
                            className={`role-tab ${activeRole === role ? "active" : ""}`}
                            onClick={() => { setActiveRole(role); setError(""); }}
                            type="button"
                        >
                            {roleIcons[role]} {role.charAt(0).toUpperCase() + role.slice(1)}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="auth-error">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-new-form">
                    {/* Email */}
                    <div className="form-group-new full-width">
                        <label>Email Address</label>
                        <div className="input-with-icon">
                            <span className="input-icon"><Mail size={18} /></span>
                            <input
                                type="email"
                                placeholder="name@school.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="form-group-new full-width">
                        <div className="label-row">
                            <label>Password</label>
                            <a href="#forgot" className="forgot-link">Forgot password?</a>
                        </div>
                        <div className="password-field">
                            <span className="input-icon"><Lock size={18} /></span>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="toggle-pw"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                        {loading ? "Signing in..." : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>Sign In <ArrowRight size={18} /></div>}
                    </button>
                </form>

                <div className="auth-new-footer">
                    Don't have an account?{" "}
                    <Link to="/signup">Sign up instead</Link>
                </div>
            </div>
        </div>
    );
}

export default Login;
