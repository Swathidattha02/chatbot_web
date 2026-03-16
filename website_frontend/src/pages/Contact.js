import React from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';
import '../styles/Contact.css';

function Contact() {
    return (
        <div className="contact-page-wrapper">
            {/* Contact Info Section */}
            <div className="contact-container">
                <h1 className="contact-main-title">Get In Touch</h1>
                <p className="contact-main-subtitle">Have questions or feedback? We're here to help!</p>

                <div className="contact-cards-grid">
                    {/* Mobile Card */}
                    <div className="contact-card">
                        <div className="card-icon-wrapper mobile">
                            <Phone size={36} />
                        </div>
                        <div className="card-content">
                            <h3 className="card-title">Mobile</h3>
                            <p className="card-timing">Monday to Friday, 10 AM to 06 PM</p>
                            <p className="card-detail">Tollfree : 8978946421</p>
                        </div>
                    </div>

                    {/* Email Card */}
                    <div className="contact-card">
                        <div className="card-icon-wrapper email">
                            <Mail size={36} />
                        </div>
                        <div className="card-content">
                            <h3 className="card-title">Email</h3>
                            <p className="card-detail">
                                <a href="mailto:info@yugantaai.com">info@yugantaai.com</a>
                            </p>
                        </div>
                    </div>

                    {/* Location Card */}
                    <div className="contact-card">
                        <div className="card-icon-wrapper location">
                            <MapPin size={36} />
                        </div>
                        <div className="card-content">
                            <h3 className="card-title">Location</h3>
                            <p className="card-detail">
                                Yuganta AI,<br />
                                Kamavarapukota, Eluru<br />
                                Andhra Pradesh, India
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Map Section */}
            <div className="contact-map-wrapper">
                <h2 className="contact-map-heading">Find Us</h2>
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
