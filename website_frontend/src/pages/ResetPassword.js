import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import "../styles/AuthNew.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function ResetPassword() {
    const { role, token } = useParams();
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            return setError("Passwords do not match");
        }

        if (password.length < 6) {
            return setError("Password must be at least 6 characters");
        }

        setLoading(true);
        setError("");

        try {
            let endpoint = `${API_BASE}/auth/reset-password/${token}`;
            if (role === "teacher") endpoint = `${API_BASE}/auth/teacher/reset-password/${token}`;
            else if (role === "admin") endpoint = `${API_BASE}/auth/admin/reset-password/${token}`;

            const res = await axios.put(endpoint, { password, role });

            if (res.data.success) {
                setSuccess(true);
                setTimeout(() => {
                    navigate("/login");
                }, 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Invalid or expired token. Please request a new link.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-new-container">
            <div className="auth-new-card login-card">
                <div className="auth-new-header">
                    <h1>Set New Password</h1>
                    <p>Enter your new secure password for your {role} account.</p>
                </div>

                {success ? (
                    <div className="auth-success-state">
                        <div className="success-icon-wrapper">
                            <CheckCircle size={48} color="#10b981" />
                        </div>
                        <h3>Password Updated!</h3>
                        <p>Your password has been reset successfully. Redirecting you to login...</p>
                        <Link to="/login" className="auth-submit-btn" style={{ textDecoration: 'none', textAlign: 'center', marginTop: '1rem' }}>
                            Login Now
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="auth-new-form">
                        {error && (
                            <div className="auth-error">
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        <div className="form-group-new full-width">
                            <label>New Password</label>
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

                        <div className="form-group-new full-width">
                            <label>Confirm New Password</label>
                            <div className="password-field">
                                <span className="input-icon"><Lock size={16} /></span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            {loading ? "Updating..." : "Update Password"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default ResetPassword;
