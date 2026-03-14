const nodemailer = require("nodemailer");

/**
 * Send email using nodemailer
 * @param {Object} options - { email, subject, message }
 */
const sendEmail = async (options) => {
    // Create transporter
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    // Define email options
    const mailOptions = {
        from: `AI Avatar Learning <${process.env.EMAIL_USERNAME}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
    };

    // Send email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
