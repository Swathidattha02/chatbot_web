import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Home.css";

function Home() {
    const { isAuthenticated } = useAuth();

    return (
        <div className="home-container">
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content">
                    <div className="hero-badge">
                        <span className="badge-icon">✨</span>
                        <span>AI-Powered Learning Assistant</span>
                    </div>

                    <h1 className="hero-title">
                        Meet Your Personal
                        <span className="gradient-text"> AI Avatar Tutor</span>
                    </h1>

                    <p className="hero-subtitle">
                        Experience the future of learning with our interactive 3D AI avatar.
                        Get personalized help, instant answers, and engaging conversations
                        in multiple languages.
                    </p>

                    <div className="hero-buttons">
                        {isAuthenticated ? (
                            <>
                                <Link to="/chat" className="btn btn-primary">
                                    Start Chatting
                                    <span className="btn-icon">→</span>
                                </Link>
                                <Link to="/dashboard" className="btn btn-secondary">
                                    Go to Dashboard
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link to="/signup" className="btn btn-primary">
                                    Get Started Free
                                    <span className="btn-icon">→</span>
                                </Link>
                                <Link to="/login" className="btn btn-secondary">
                                    Sign In
                                </Link>
                            </>
                        )}
                    </div>

                    <div className="hero-stats">
                        <div className="stat-item">
                            <div className="stat-number">10K+</div>
                            <div className="stat-label">Active Users</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-number">50K+</div>
                            <div className="stat-label">Conversations</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-number">5+</div>
                            <div className="stat-label">Languages</div>
                        </div>
                    </div>
                </div>

                <div className="hero-visual">
                    <div className="avatar-preview">
                        <div className="avatar-glow"></div>
                        <div className="avatar-placeholder">
                            <span className="avatar-icon">🤖</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <div className="section-header">
                    <h2 className="section-title">Why Choose Our AI Avatar?</h2>
                    <p className="section-subtitle">
                        Powerful features designed to enhance your learning experience
                    </p>
                </div>

                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">🎯</div>
                        <h3 className="feature-title">Interactive 3D Avatar</h3>
                        <p className="feature-description">
                            Engage with a lifelike 3D avatar that responds with natural
                            gestures and expressions
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">🌍</div>
                        <h3 className="feature-title">Multi-Language Support</h3>
                        <p className="feature-description">
                            Communicate in your preferred language - English, Hindi, Telugu,
                            and more
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">🧠</div>
                        <h3 className="feature-title">AI-Powered Responses</h3>
                        <p className="feature-description">
                            Get intelligent, context-aware answers powered by advanced AI
                            technology
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">🎤</div>
                        <h3 className="feature-title">Voice Interaction</h3>
                        <p className="feature-description">
                            Speak naturally and hear responses with realistic text-to-speech
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">📚</div>
                        <h3 className="feature-title">Document Q&A</h3>
                        <p className="feature-description">
                            Upload documents and ask questions to get instant, accurate
                            answers
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">💾</div>
                        <h3 className="feature-title">Chat History</h3>
                        <p className="feature-description">
                            Access your previous conversations anytime, anywhere
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="cta-content">
                    <h2 className="cta-title">Ready to Transform Your Learning?</h2>
                    <p className="cta-subtitle">
                        Join thousands of learners already using our AI avatar tutor
                    </p>
                    {!isAuthenticated && (
                        <Link to="/signup" className="btn btn-primary btn-large">
                            Start Your Free Trial
                            <span className="btn-icon">→</span>
                        </Link>
                    )}
                </div>
            </section>
        </div>
    );
}

export default Home;
