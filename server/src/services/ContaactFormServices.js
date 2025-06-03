// services/ContactService.js

const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

class ContactService {
  constructor() {
    // Configure your email transport
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.DOMAIN_MAIL,
        pass: process.env.DOMAIN_PASS,
      },
    });
  }

  // Generate HTML email template
  generateEmailTemplate(contactData) {
    const { name, email, description } = contactData;

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Form Submission</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
        }
        
        .container {
          max-width: 600px;
          margin: 20px auto;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        .header {
          background: linear-gradient(135deg, #4DD0E1 0%, #26C6DA 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        
        .header h1 {
          font-size: 28px;
          margin-bottom: 10px;
          font-weight: 600;
        }
        
        .header p {
          font-size: 16px;
          opacity: 0.9;
        }
        
        .content {
          padding: 40px 30px;
        }
        
        .form-group {
          margin-bottom: 25px;
          border-bottom: 1px solid #eee;
          padding-bottom: 20px;
        }
        
        .form-group:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }
        
        .label {
          font-weight: 600;
          color: #555;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          display: block;
        }
        
        .value {
          font-size: 16px;
          color: #333;
          background: #f8f9fa;
          padding: 12px 15px;
          border-radius: 8px;
          border-left: 4px solid #4DD0E1;
        }
        
        .description {
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        
        .footer {
          background: #f8f9fa;
          padding: 20px 30px;
          text-align: center;
          border-top: 1px solid #eee;
        }
        
        .footer p {
          color: #666;
          font-size: 14px;
        }
        
        .timestamp {
          color: #999;
          font-size: 12px;
          margin-top: 10px;
        }
        
        .icon {
          width: 24px;
          height: 24px;
          margin-right: 10px;
          vertical-align: middle;
        }
        
        .contact-info {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }
        
        @media (max-width: 600px) {
          .container {
            margin: 10px;
            border-radius: 8px;
          }
          
          .header, .content, .footer {
            padding: 20px;
          }
          
          .header h1 {
            font-size: 24px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📧 New Contact Form Submission</h1>
          <p>You have received a new message from your website contact form</p>
        </div>
        
        <div class="content">
          <div class="form-group">
            <span class="label">👤 Full Name</span>
            <div class="value">${name}</div>
          </div>
          
          <div class="form-group">
            <span class="label">📧 Email Address</span>
            <div class="value">
              <a href="mailto:${email}" style="color: #4DD0E1; text-decoration: none;">${email}</a>
            </div>
          </div>
          
          <div class="form-group">
            <span class="label">📝 Message/Description</span>
            <div class="value description">${description}</div>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>📅 Received:</strong> ${new Date().toLocaleString()}</p>
          <p class="timestamp">This email was automatically generated from your website contact form.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  async sendContactEmail(contactData, supportEmail) {
    if (!supportEmail) {
      throw new Error("Contact data and support email are required.");
    }
    try {
      const { name, email, description } = contactData;

      // Email to admin
      const adminMailOptions = {
        from: `"${name}" <${process.env.EMAIL_USER}>`,
        to: supportEmail,
        subject: `New Contact Form Submission from ${name}`,
        html: this.generateEmailTemplate(contactData),
        replyTo: email,
      };

      // Auto-reply to user
      const userMailOptions = {
        from: `"Your Company" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Thank you for contacting us!",
        html: this.generateAutoReplyTemplate(name),
      };

      // Send both emails
      await Promise.all([
        this.transporter.sendMail(adminMailOptions),
        this.transporter.sendMail(userMailOptions),
      ]);

      return {
        success: true,
        message: "Email sent successfully! We'll get back to you soon.",
      };
    } catch (error) {
      console.error("Error sending contact email:", error);
      return {
        success: false,
        message: "Failed to send email. Please try again later.",
      };
    }
  }

  generateAutoReplyTemplate(name) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank You for Contacting Us</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
          margin: 0;
          padding: 20px;
        }
        
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        .header {
          background: linear-gradient(135deg, #4DD0E1 0%, #26C6DA 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
        }
        
        .content {
          padding: 40px 30px;
          text-align: center;
        }
        
        .content h2 {
          color: #333;
          margin-bottom: 20px;
        }
        
        .content p {
          margin-bottom: 15px;
          font-size: 16px;
        }
        
        .footer {
          background: #f8f9fa;
          padding: 20px 30px;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✨ Thank You!</h1>
        </div>
        
        <div class="content">
          <h2>Hi ${name}!</h2>
          <p>Thank you for reaching out to us. We've received your message and appreciate you taking the time to contact us.</p>
          <p>Our team will review your inquiry and get back to you within 24-48 hours.</p>
          <p>If you have any urgent questions, please don't hesitate to contact us directly.</p>
        </div>
        
        <div class="footer">
          <p>Best regards,<br>Your Company Team</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  // Test email configuration
  async testEmailConfig() {
    try {
      await this.transporter.verify();
      console.log("✅ Email configuration is valid");
      return true;
    } catch (error) {
      console.error("❌ Email configuration error:", error);
      return false;
    }
  }
}

module.exports = new ContactService();
