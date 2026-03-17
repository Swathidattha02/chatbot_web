import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Mail, Phone } from "lucide-react";
import "../styles/Footer.css";

function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-grid">
                    {/* ... (rest of the sections) */}
                    <div className="footer-section company-info">
                        <div className="footer-logo">
                            <img src="/logo.png" alt="AI Avatar Logo" className="footer-logo-img" />
                            <span className="logo-text">AI Avatar Tutor</span>
                        </div>
                        <p className="company-description">
                            Empowering learners worldwide with cutting-edge AI technology.
                            Our mission is to make personalized education accessible to everyone.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className="footer-section">
                        <h4 className="footer-title">Quick Links</h4>
                        <ul className="footer-links">
                            <li><Link to="/">Home</Link></li>
                            <li><Link to="/dashboard">Dashboard</Link></li>
                            <li><Link to="/chat">AI Chat</Link></li>
                            <li><Link to="/signup">Get Started</Link></li>
                        </ul>
                    </div>

                    {/* Contact Details */}
                    <div className="footer-section contact-info" id="contact-info">
                        <h4 className="footer-title">Contact Us</h4>
                        <ul className="contact-list">
                            <li>
                                <span className="contact-icon"><MapPin size={16} /></span>
                                <span>9-135/1,Kamavarapukota,Eluru,Andhra Pradesh,534426,India</span>
                            </li>
                            <li>
                                <span className="contact-icon"><Mail size={16} /></span>
                                <a href="mailto:info@yugantaai.com">info@yugantaai.com</a>
                            </li>
                            <li>
                                <span className="contact-icon"><Phone size={16} /></span>
                                <a href="tel:+918978946421">+91 8978946421</a>
                            </li>
                        </ul>
                    </div>

                    {/* Social & Website */}
                    <div className="footer-section">
                        <h4 className="footer-title">Connect With Us</h4>
                        <div className="social-links">
                            <a href="https://www.linkedin.com/company/yugantaai/" target="_blank" rel="noopener noreferrer" className="social-link linkedin">
                                LinkedIn
                            </a>
                            <a href="https://yugantaai.com/" target="_blank" rel="noopener noreferrer" className="social-link website">
                                Company Website
                            </a>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>&copy; {currentYear} AI Avatar Tutor. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
