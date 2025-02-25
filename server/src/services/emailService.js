// services/emailService.js

const nodemailer = require("nodemailer");

// Create a reusable transporter object
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Email templates
const emailTemplates = {
  passwordReset: (resetUrl) => ({
    subject: "Password Reset Request",
    html: `
      <h1>Password Reset</h1>
      <p>You requested a password reset for your account.</p>
      <p>Click the link below to reset your password. This link is valid for 1 hour.</p>
      <a href="${resetUrl}" style="padding: 10px 15px; background-color: #5FC2D3; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  }),

  // You can add more email templates here
  welcomeEmail: (userName) => ({
    subject: "Welcome to Our Platform",
    html: `
      <h1>Welcome, ${userName}!</h1>
      <p>Thank you for joining our platform. We're excited to have you with us!</p>
      <p>Get started by completing your profile and exploring our features.</p>
    `,
  }),

  accountVerification: (verificationUrl) => ({
    subject: "Verify Your Account",
    html: `
      <h1>Account Verification</h1>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verificationUrl}" style="padding: 10px 15px; background-color: #5FC2D3; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
    `,
  }),
};

/**
 * Send an email using a predefined template
 * @param {string} to - Recipient email address
 * @param {string} templateName - Name of the template to use
 * @param {Object} data - Data to be used in the template
 * @returns {Promise<Object>} - Email sending result
 */
const sendTemplateEmail = async (to, templateName, data) => {
  try {
    const transporter = createTransporter();
    const template = emailTemplates[templateName];

    if (!template) {
      throw new Error(`Email template "${templateName}" not found`);
    }

    const emailContent = template(data);

    const mailOptions = {
      from: `"${process.env.EMAIL_NAME || "DSP"}" <${process.env.EMAIL_FROM}>`,
      to: to,
      subject: emailContent.subject,
      html: emailContent.html,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send a custom email
 * @param {Object} mailOptions - Complete mail options object
 * @returns {Promise<Object>} - Email sending result
 */
const sendCustomEmail = async (mailOptions) => {
  try {
    const transporter = createTransporter();
    const defaultFrom = `"${process.env.EMAIL_NAME || "DSP"}" <${
      process.env.EMAIL_FROM
    }>`;

    const options = {
      from: defaultFrom,
      ...mailOptions,
    };

    const info = await transporter.sendMail(options);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

module.exports = {
  sendTemplateEmail,
  sendCustomEmail,
  emailTemplates,
};
