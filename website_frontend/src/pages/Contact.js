import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import emailjs from '@emailjs/browser';
import '../styles/Contact.css';

function Contact() {
    const navigate = useNavigate();
    const formRef = useRef();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        school: '',
        class: '',
        phone: '',
        message: ''
    });

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', message: '' });

        try {
            // ⚠️ IMPORTANT: Replace these with your actual EmailJS credentials
            // Get them from: https://dashboard.emailjs.com/
            const serviceId = 'service_nr0vae9';      // Replace with your Service ID from EmailJS
            const templateId = 'template_18v9ekd';    // Replace with your Template ID from EmailJS
            const publicKey = '_0tbqJC4zBncFlvsV';      // Replace with your Public Key from EmailJS

            // Check if credentials are configured
            if (serviceId === 'YOUR_SERVICE_ID' || templateId === 'YOUR_TEMPLATE_ID' || publicKey === 'YOUR_PUBLIC_KEY') {
                setStatus({
                    type: 'error',
                    message: '⚙️ EmailJS is not configured yet. Please contact the administrator or email directly at swathidatthapasupuleti02@gmail.com'
                });
                setLoading(false);
                return;
            }

            const templateParams = {
                from_name: formData.name,
                from_email: formData.email,
                school: formData.school,
                class: formData.class,
                phone: formData.phone,
                message: formData.message,
                to_email: 'swathidatthapasupuleti02@gmail.com'
            };

            await emailjs.send(
                serviceId,
                templateId,
                templateParams,
                publicKey
            );

            setStatus({
                type: 'success',
                message: '✅ Message sent successfully! We\'ll get back to you soon.'
            });

            // Reset form
            setFormData({
                name: '',
                email: '',
                school: '',
                class: '',
                phone: '',
                message: ''
            });

            // Redirect after 3 seconds
            setTimeout(() => {
                navigate('/dashboard');
            }, 3000);

        } catch (error) {
            console.error('EmailJS Error:', error);

            let errorMessage = '❌ Failed to send message. ';

            if (error.status === 400) {
                errorMessage += 'EmailJS configuration error. Please email us directly at swathidatthapasupuleti02@gmail.com';
            } else if (error.status === 412) {
                errorMessage += 'Please check your internet connection and try again.';
            } else {
                errorMessage += 'Please try again or email us directly at swathidatthapasupuleti02@gmail.com';
            }

            setStatus({
                type: 'error',
                message: errorMessage
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="contact-page-wrapper">
            <div className="contact-container">
                <div className="contact-header">
                    <h1 className="contact-title">Get In Touch</h1>
                    <p className="contact-subtitle">
                        Have questions or feedback? We'd love to hear from you!
                    </p>
                </div>

                <div className="contact-content">
                    <div className="contact-info-section">
                        <div className="info-card">
                            <div className="info-icon">📧</div>
                            <h3>Email Us</h3>
                            <p>swathidatthapasupuleti02@gmail.com</p>
                        </div>
                        <div className="info-card">
                            <div className="info-icon">💬</div>
                            <h3>Quick Response</h3>
                            <p>We typically respond within 24 hours</p>
                        </div>
                        <div className="info-card">
                            <div className="info-icon">🎓</div>
                            <h3>Student Support</h3>
                            <p>Dedicated help for all learners</p>
                        </div>
                    </div>

                    <div className="contact-form-section">
                        <div className="email-info-banner">
                            <div className="banner-icon">💌</div>
                            <div className="banner-text">
                                <strong>Direct Email:</strong> swathidatthapasupuleti02@gmail.com
                            </div>
                        </div>

                        <form ref={formRef} onSubmit={handleSubmit} className="contact-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="name">Full Name *</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Enter your name"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="email">Email Address *</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="your.email@example.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="school">School Name *</label>
                                    <input
                                        type="text"
                                        id="school"
                                        name="school"
                                        value={formData.school}
                                        onChange={handleChange}
                                        placeholder="Your school name"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="class">Class/Grade *</label>
                                    <select
                                        id="class"
                                        name="class"
                                        value={formData.class}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Select your class</option>
                                        <option value="6">Class 6</option>
                                        <option value="7">Class 7</option>
                                        <option value="8">Class 8</option>
                                        <option value="9">Class 9</option>
                                        <option value="10">Class 10</option>
                                        <option value="11">Class 11</option>
                                        <option value="12">Class 12</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="phone">Phone Number *</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="+91 XXXXX XXXXX"
                                    pattern="[0-9+\s-]+"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="message">Your Message *</label>
                                <textarea
                                    id="message"
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    placeholder="Tell us how we can help you..."
                                    rows="6"
                                    required
                                ></textarea>
                            </div>

                            {status.message && (
                                <div className={`status-message ${status.type}`}>
                                    {status.message}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="submit-btn"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-small"></span>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <span>Send Message</span>
                                        <span className="send-icon">📤</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Contact;
