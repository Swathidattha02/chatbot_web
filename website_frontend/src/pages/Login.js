import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { GraduationCap, Users, Building2, AlertTriangle, Mail, Lock, Eye, EyeOff, Shield, Lock as LockCheck, Zap } from "lucide-react";
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
            const result = await login(email, password, activeRole);
            if (result.success) {
                if (activeRole === "student") navigate("/");
                else if (activeRole === "teacher") navigate("/teacher/dashboard");
                else if (activeRole === "admin") navigate("/admin/dashboard");
            } else {
                setError(result.message || "Invalid credentials");
            }
        } catch (err) {
            setError(err.message || "Login failed. Please try again.");
        }

        setLoading(false);
    };

    const roleIcons = { 
        student: <GraduationCap size={16} />, 
        teacher: <Users size={16} />, 
        admin: <Building2 size={16} /> 
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
                    <div className="auth-error auth-error-animated">
                        <AlertTriangle size={16} /> 
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-new-form">
                    {/* Email */}
                    <div className="form-group-new full-width">
                        <label>Email Address</label>
                        <div className="input-with-icon">
                            <span className="input-icon"><Mail size={16} /></span>
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
                            <Link to={`/forgot-password?role=${activeRole}`} className="forgot-link">Forgot password?</Link>
                        </div>
                        <div className="password-field">
                            <span className="input-icon"><Lock size={16} /></span>
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
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Signing in...
                            </>
                        ) : (
                            'Sign In →'
                        )}
                    </button>
                </form>

                <div className="auth-new-footer">
                    Don't have an account?{" "}
                    <Link to="/signup">Sign up instead</Link>
                </div>

                <div className="trust-badges">
                    <div className="trust-badge">
                        <Shield size={14} />
                        <span>Secure Login</span>
                    </div>
                    <div className="trust-badge">
                        <LockCheck size={14} />
                        <span>Privacy Protected</span>
                    </div>
                    <div className="trust-badge">
                        <Zap size={14} />
                        <span>24/7 Support</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;
