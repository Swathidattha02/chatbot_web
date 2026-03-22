import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Menu, X, LogOut, LayoutDashboard, MessageCircle, Home, Mail } from "lucide-react";
import "../styles/Navbar.css";

function Navbar() {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);


    const handleLogout = () => {
        setIsMenuOpen(false);
        setIsUserMenuOpen(false);
        navigate("/logout-confirm");
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
        setIsUserMenuOpen(false);
    };

    const toggleUserMenu = () => {
        setIsUserMenuOpen(!isUserMenuOpen);
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                {/* Logo Section */}
                <Link to="/" className="navbar-logo">
                    <div className="logo-container">
                        <img src="/logo.png" alt="AI Avatar Logo" className="logo-img" />
                    </div>
                    <div className="logo-text-wrapper">
                        <span className="logo-text">AI Avatar</span>
                        <span className="logo-tagline">Smart Learning Platform</span>
                    </div>
                </Link>

                {/* Desktop Navigation */}
                <div className="navbar-menu">
                    <Link to="/" className="nav-link nav-item">
                        <Home size={18} />
                        <span>Home</span>
                    </Link>
                    <Link to="/contact" className="nav-link nav-item">
                        <Mail size={18} />
                        <span>Contact</span>
                    </Link>

                    {isAuthenticated ? (
                        <>
                            <Link
                                to={user?.role === "teacher" ? "/teacher/dashboard" : user?.role === "admin" ? "/admin/dashboard" : "/dashboard"}
                                className="nav-link nav-item"
                            >
                                <LayoutDashboard size={18} />
                                <span>Dashboard</span>
                            </Link>
                            <Link to="/chat" className="nav-link nav-item">
                                <MessageCircle size={18} />
                                <span>Chat</span>
                            </Link>

                            {/* User Menu */}
                            <div className="user-menu-wrapper">
                                <button
                                    className="user-menu-trigger"
                                    onClick={toggleUserMenu}
                                >
                                    <span className="user-avatar">{user?.name?.charAt(0) || "U"}</span>
                                    <span className="user-name">{user?.name}</span>
                                    <svg className={`arrow ${isUserMenuOpen ? 'open' : ''}`} width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>

                                {isUserMenuOpen && (
                                    <div className="user-menu-dropdown">
                                        <div className="menu-header">
                                            <span className="user-avatar-large">{user?.name?.charAt(0) || "U"}</span>
                                            <div>
                                                <p className="menu-user-name">{user?.name}</p>
                                                <p className="menu-user-role">{user?.role || "User"}</p>
                                            </div>
                                        </div>
                                        <hr className="menu-divider" />
                                        <button
                                            onClick={handleLogout}
                                            className="menu-logout"
                                        >
                                            <LogOut size={18} />
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="nav-link nav-item">
                                Login
                            </Link>
                            <Link to="/signup" className="btn-signup">
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <button className="mobile-menu-toggle" onClick={toggleMenu}>
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Navigation */}
            {isMenuOpen && (
                <div className="mobile-menu">
                    <Link to="/" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                        <Home size={18} />
                        Home
                    </Link>
                    <Link to="/contact" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                        <Mail size={18} />
                        Contact
                    </Link>

                    {isAuthenticated ? (
                        <>
                            <Link
                                to={user?.role === "teacher" ? "/teacher/dashboard" : user?.role === "admin" ? "/admin/dashboard" : "/dashboard"}
                                className="mobile-nav-link"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <LayoutDashboard size={18} />
                                Dashboard
                            </Link>
                            <Link
                                to="/chat"
                                className="mobile-nav-link"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <MessageCircle size={18} />
                                Chat
                            </Link>
                            <hr className="mobile-divider" />
                            <div className="mobile-user-info">
                                <span className="user-avatar">{user?.name?.charAt(0) || "U"}</span>
                                <div>
                                    <p className="mobile-user-name">{user?.name}</p>
                                    <p className="mobile-user-role">{user?.role || "User"}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="mobile-logout"
                            >
                                <LogOut size={18} />
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="mobile-nav-link"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Login
                            </Link>
                            <Link
                                to="/signup"
                                className="mobile-btn-signup"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>
            )}
        </nav>
    );
}

export default Navbar;
