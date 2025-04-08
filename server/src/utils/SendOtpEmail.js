import nodemailer from "nodemailer";
export const generateOTP = () => Math.floor(1000 + Math.random() * 9000);

export const sendOtpEmail = async (email, otp, type) => {
  let subject = "";
  let message = "";

  if (type === "email_verification") {
    subject = "Verify Your Email Address";
    message = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://yourdomain.com/logo.png" alt="Driving School Platform" style="max-height: 60px;" />
      </div>
      <div style="color: #333333; line-height: 1.6;">
        <h1 style="color: #4a6ee0; font-size: 24px; font-weight: 600; margin-bottom: 20px; text-align: center;">Verify Your Email Address</h1>
        <p style="margin-bottom: 25px; font-size: 16px;">Thank you for signing up! Please use the verification code below to complete your registration:</p>
        <div style="background-color: #f7f9fc; border-radius: 6px; padding: 20px; text-align: center; margin-bottom: 25px;">
          <p style="font-size: 14px; color: #666; margin-bottom: 10px;">Your verification code is:</p>
          <p style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4a6ee0; margin: 0;">${otp}</p>
        </div>
        <p style="margin-bottom: 25px; font-size: 16px;">This code will expire in 10 minutes. If you didn't request this verification, please ignore this email.</p>
      </div>
      <div style="border-top: 1px solid #eaeaea; margin-top: 30px; padding-top: 20px; text-align: center; color: #999; font-size: 13px;">
        <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
        <p>If you have any questions, please contact our support team.</p>
      </div>
    </div>
  `;
  } else if (type === "two_factor_auth") {
    subject = "Your Security Authentication Code";
    message = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://yourdomain.com/logo.png" alt="Driving School Platform" style="max-height: 60px;" />
      </div>
      <div style="color: #333333; line-height: 1.6;">
        <h1 style="color: #2e7d32; font-size: 24px; font-weight: 600; margin-bottom: 20px; text-align: center;">Two-Factor Authentication</h1>
        <p style="margin-bottom: 25px; font-size: 16px;">We've received a login request for your account. To complete the authentication process, please use the following security code:</p>
        <div style="background-color: #f1f8e9; border-radius: 6px; padding: 20px; text-align: center; margin-bottom: 25px;">
          <p style="font-size: 14px; color: #666; margin-bottom: 10px;">Your 2FA code is:</p>
          <p style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2e7d32; margin: 0;">${otp}</p>
        </div>
        <p style="margin-bottom: 25px; font-size: 16px;">This code will expire in 5 minutes. If you didn't attempt to log in, please secure your account immediately.</p>
      </div>
      <div style="border-top: 1px solid #eaeaea; margin-top: 30px; padding-top: 20px; text-align: center; color: #999; font-size: 13px;">
        <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
        <p>This is an automated message, please do not reply.</p>
      </div>
    </div>
  `;
  }
  const mailOptions = {
    from: `"Drive School" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html: `${message}<p>This OTP is valid for 10 minutes.</p>`,
  };
  const transporter = nodemailer.createTransport({
    host: process.env.DOMAIN_HOST, // Use the correct SMTP host
    port: 587, // SMTP port (587 is common for TLS)
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.DOMAIN_MAIL, // Your email address
      pass: process.env.DOMAIN_PASS, // Your app password
    },
  });

  await transporter.sendMail(mailOptions);
};
