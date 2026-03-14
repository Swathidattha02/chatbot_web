import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import "../styles/AuthNew.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function ForgotPassword() {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialRole = queryParams.get("role") || "student";

    const [email, setEmail] = useState("");
    const [role, setRole] = useState(initialRole);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        try {
            let endpoint = `${API_BASE}/auth/forgot-password`;
            if (role === "teacher") endpoint = `${API_BASE}/auth/teacher/forgot-password`;
            else if (role === "admin") endpoint = `${API_BASE}/auth/admin/forgot-password`;

            const res = await axios.post(endpoint, { email, role });

            if (res.data.success) {
                setMessage("Reset link has been sent to your email.");
                setSubmitted(true);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-new-container">
            <div className="auth-new-card login-card">
                <div className="auth-new-header">
                    <h1>Reset Password</h1>
                    <p>Enter your email to receive a password reset link.</p>
                </div>

                {submitted ? (
                    <div className="auth-success-state">
                        <div className="success-icon-wrapper">
                            <CheckCircle size={48} color="#10b981" />
                        </div>
                        <h3>Email Sent!</h3>
                        <p>{message}</p>
                        <p className="hint">Check your spam folder if you don't see it in your inbox.</p>
                        <Link to="/login" className="auth-submit-btn" style={{ textDecoration: 'none', textAlign: 'center', marginTop: '1rem' }}>
                            Back to Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="auth-new-form">
                        <div className="role-tabs" style={{ marginBottom: '1.5rem' }}>
                            {["student", "teacher", "admin"].map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    className={`role-tab ${role === r ? "active" : ""}`}
                                    onClick={() => setRole(r)}
                                >
                                    {r.charAt(0).toUpperCase() + r.slice(1)}
                                </button>
                            ))}
                        </div>

                        {error && (
                            <div className="auth-error">
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        <div className="form-group-new full-width">
                            <label>Email Address</label>
                            <div className="input-with-icon">
                                <span className="input-icon"><Mail size={16} /></span>
                                <input
                                    type="email"
                                    placeholder="Enter your registered email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            {loading ? "Sending..." : "Send Reset Link"}
                        </button>

                        <div className="auth-new-footer">
                            <Link to="/login" className="back-link">
                                <ArrowLeft size={14} /> Back to Login
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default ForgotPassword;
