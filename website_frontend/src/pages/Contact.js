import React, { useState } from 'react';
import { Phone, Mail, MapPin, Send, MessageSquare, Clock, Globe } from 'lucide-react';
import '../styles/Contact.css';

function Contact() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [status, setStatus] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setStatus('sending');
        // Simulate API call
        setTimeout(() => {
            setStatus('success');
            setFormData({ name: '', email: '', subject: '', message: '' });
            setTimeout(() => setStatus(''), 3000);
        }, 1500);
    };

    return (
        <div className="contact-page-wrapper">
            {/* Hero Section */}
            <div className="contact-hero">
                <div className="contact-hero-content">
                    <h1 className="contact-main-title">Get In Touch</h1>
                    <p className="contact-main-subtitle">Have questions or feedback? Our team is here to support your learning journey.</p>
                </div>
            </div>

            <div className="contact-container">
                <div className="contact-content-grid">
                    {/* Contact Info Column */}
                    <div className="contact-info-column">
                        <div className="contact-cards-stack">
                            {/* Mobile Card */}
                            <div className="contact-card-v2">
                                <div className="card-icon-v2 mobile">
                                    <Phone size={24} />
                                </div>
                                <div className="card-text-v2">
                                    <h3>Mobile</h3>
                                    <p>Tollfree: 8978946421</p>
                                    <span>Mon-Fri, 10 AM - 6 PM</span>
                                </div>
                            </div>

                            {/* Email Card */}
                            <div className="contact-card-v2">
                                <div className="card-icon-v2 email">
                                    <Mail size={24} />
                                </div>
                                <div className="card-text-v2">
                                    <h3>Email</h3>
                                    <a href="mailto:info@yugantaai.com">info@yugantaai.com</a>
                                    <span>24/7 Support Response</span>
                                </div>
                            </div>

                            {/* Location Card */}
                            <div className="contact-card-v2">
                                <div className="card-icon-v2 location">
                                    <MapPin size={24} />
                                </div>
                                <div className="card-text-v2">
                                    <h3>Location</h3>
                                    <p>Yuganta AI, Kamavarapukota, Eluru</p>
                                    <span>Andhra Pradesh, India</span>
                                </div>
                            </div>
                        </div>

                        {/* Additional Info */}
                        <div className="contact-extra-info">
                            <div className="info-item">
                                <Clock className="info-icon" size={20} />
                                <div>
                                    <h4>Business Hours</h4>
                                    <p>Monday - Saturday: 9:00 AM - 7:00 PM</p>
                                </div>
                            </div>
                            <div className="info-item">
                                <Globe className="info-icon" size={20} />
                                <div>
                                    <h4>Global Support</h4>
                                    <p>Available in multiple languages</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form Column */}
                    <div className="contact-form-column">
                        <div className="contact-form-card">
                            <div className="form-header">
                                <MessageSquare size={24} />
                                <h2>Send us a Message</h2>
                            </div>
                            <form onSubmit={handleSubmit} className="contact-form">
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input 
                                        type="text" 
                                        name="name" 
                                        value={formData.name} 
                                        onChange={handleChange} 
                                        placeholder="Enter your name" 
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input 
                                        type="email" 
                                        name="email" 
                                        value={formData.email} 
                                        onChange={handleChange} 
                                        placeholder="Enter your email" 
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Subject</label>
                                    <input 
                                        type="text" 
                                        name="subject" 
                                        value={formData.subject} 
                                        onChange={handleChange} 
                                        placeholder="What is this about?" 
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Message</label>
                                    <textarea 
                                        name="message" 
                                        value={formData.message} 
                                        onChange={handleChange} 
                                        placeholder="Tell us how we can help..." 
                                        rows="5" 
                                        required 
                                    ></textarea>
                                </div>
                                <button type="submit" className={`submit-btn ${status}`} disabled={status === 'sending'}>
                                    {status === 'sending' ? 'Sending...' : status === 'success' ? 'Sent!' : (
                                        <>
                                            <span>Send Message</span>
                                            <Send size={18} />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Map Section */}
            <div className="contact-map-wrapper">
                <div className="map-heading-v2">
                    <MapPin className="map-pin-icon" size={24} />
                    <h2>Visit Our Office</h2>
                </div>
                <div className="contact-map-section">
                    <iframe
                        title="Yuganta AI Location"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen=""
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3823.8326644441644!2d79.13487632346904!3d14.410576073605548!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a4d5e5e5e5e5e5d%3A0x5e5e5e5e5e5e5e5e!2sKamavarapukota%2C%20Eluru%2C%20Andhra%20Pradesh!5e0!3m2!1sen!2sin!4v1234567890"
                    ></iframe>
                </div>
            </div>
        </div>
    );
}

export default Contact;
