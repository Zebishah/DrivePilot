import nodemailer from "nodemailer";
export const generateOTP = () => Math.floor(1000 + Math.random() * 9000);

export const sendOtpEmail = async (email, otp, type) => {
  let subject = "";
  let message = "";

  if (type === "email_verification") {
    subject = "Your Email Verification OTP";
    message = `<p>Your OTP for <strong>email verification</strong> is: <strong>${otp}</strong></p>`;
  } else if (type === "two_factor_auth") {
    subject = "Your Two-Factor Authentication Code";
    message = `<p>Your <strong>2FA code</strong> is: <strong>${otp}</strong></p>`;
  } else {
    subject = "Your One-Time Password";
    message = `<p>Your OTP is: <strong>${otp}</strong></p>`;
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
