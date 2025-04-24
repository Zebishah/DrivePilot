const nodemailer = require("nodemailer");
const generateOTP = () => Math.floor(1000 + Math.random() * 9000);

const sendOtpEmail = async (email, otp, type) => {
  let subject = "";
  let message = "";

  if (type === "email_verification") {
    subject = "Verify Your Email Address";
    message = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #4a6ee0; font-size: 24px; font-weight: 600; margin-bottom: 20px; text-align: center;">Driving School Platform</h1>
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
        <p>&copy; ${new Date().getFullYear()} Driving School Platform. All rights reserved.</p>
        <p>If you have any questions, please contact our support team.</p>
      </div>
    </div>
  `;
  } else if (type === "two_factor_auth") {
    subject = "Your Security Authentication Code";
    message = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
       <h1 style="color: #2e7d32; font-size: 24px; font-weight: 600; margin-bottom: 20px; text-align: center;">Driving School Platform</h1>
      </div>
      <div style="color: #333333; line-height: 1.6;">
        <h1 style="color: #2e7d32; font-size: 24px; font-weight: 600; margin-bottom: 20px; text-align: center;">Two-Factor Authentication</h1>
        <p style="margin-bottom: 25px; font-size: 16px;">We've received a login request for your account. To complete the authentication process, please use the following security code:</p>
        <div style="background-color: #f1f8e9; border-radius: 6px; padding: 20px; text-align: center; margin-bottom: 25px;">
          <p style="font-size: 14px; color: #666; margin-bottom: 10px;">Your 2FA code is:</p>
          <p style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2e7d32; margin: 0;">${otp}</p>
        </div>
        <p style="margin-bottom: 25px; font-size: 16px;">This code will expire in 10 minutes. If you didn't attempt to log in, please secure your account immediately.</p>
      </div>
      <div style="border-top: 1px solid #eaeaea; margin-top: 30px; padding-top: 20px; text-align: center; color: #999; font-size: 13px;">
        <p>&copy; ${new Date().getFullYear()} Driving School Platform. All rights reserved.</p>
          <p>If you have any questions, please contact our support team.</p>
      </div>
    </div>
  `;
  } else if (type === "welcome_email") {
    subject = "Welcome to Your Driving Journey with DSP!";
    message = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
      <div style="text-align: center; margin-bottom: 25px;">
        <img src="https://yourdomain.com/logo.png" alt="Driving School Platform" style="max-height: 70px;" />
      </div>
      
      <div style="color: #333333; line-height: 1.6;">
        <h1 style="color: #3d5afe; font-size: 28px; font-weight: 700; margin-bottom: 20px; text-align: center;">Welcome to Your Driving Journey!</h1>
        
        <div style="background: linear-gradient(135deg, #3d5afe 0%, #536dfe 100%); border-radius: 10px; padding: 25px; margin-bottom: 30px;">
          <h2 style="color: white; font-size: 20px; font-weight: 600; margin-bottom: 15px; text-align: center;">Your Account is Now Active</h2>
          <p style="color: rgba(255,255,255,0.9); margin-bottom: 0; font-size: 16px; text-align: center;">Thank you for choosing our Driving School Platform. We're excited to help you on your path to becoming a confident and skilled driver!</p>
        </div>
        
        <p style="margin-bottom: 20px; font-size: 16px;">Dear ${otp},</p>
        
        <p style="margin-bottom: 20px; font-size: 16px;">Welcome to our driving community! We're thrilled to have you on board and can't wait to support you throughout your learning journey. Your account has been successfully created and is ready to use.</p>
        
        <div style="background-color: #f7f9fc; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h3 style="color: #3d5afe; font-size: 18px; margin-bottom: 15px;">Get Started in 3 Simple Steps:</h3>
          <ol style="padding-left: 20px; margin-bottom: 0;">
            <li style="margin-bottom: 12px;"><strong>Complete your profile</strong> - Add your personal details and preferences</li>
            <li style="margin-bottom: 12px;"><strong>Browse available courses</strong> - Find the perfect learning path for your needs</li>
            <li style="margin-bottom: 0;"><strong>Book your first lesson</strong> - Get behind the wheel with our expert instructors</li>
          </ol>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${
            process.env.Frontend_URL
          }auth/signin" style="display: inline-block; background-color: #3d5afe; color: white; font-weight: bold; padding: 14px 30px; text-decoration: none; border-radius: 50px; font-size: 16px; transition: all 0.3s ease; box-shadow: 0 4px 10px rgba(61,90,254,0.3);">Log In to Your Account</a>
        </div>
        
        <p style="margin-bottom: 20px; font-size: 16px;">Our platform offers:</p>
        <ul style="padding-left: 20px; margin-bottom: 25px;">
          <li style="margin-bottom: 10px;">Flexible scheduling for lessons</li>
          <li style="margin-bottom: 10px;">Comprehensive learning materials</li>
          <li style="margin-bottom: 10px;">Progress tracking and feedback</li>
          <li style="margin-bottom: 10px;">Expert instructors with years of experience</li>
        </ul>
        
        <p style="margin-bottom: 25px; font-size: 16px;">If you have any questions or need assistance, our support team is always here to help. Simply reply to this email or contact us through our website.</p>
        
        <p style="margin-bottom: 25px; font-size: 16px;">We look forward to being part of your driving success story!</p>
        
        <p style="margin-bottom: 10px; font-size: 16px;">Safe driving,</p>
        <p style="font-size: 16px; font-weight: 600; color: #3d5afe; margin-bottom: 0;">The DSP Team</p>
      </div>
      
      <div style="border-top: 1px solid #eaeaea; margin-top: 30px; padding-top: 20px; text-align: center; color: #777; font-size: 13px;">
        <div style="margin-bottom: 15px;">
          <a href="#" style="display: inline-block; margin: 0 8px;"><img src="https://yourdomain.com/facebook-icon.png" alt="Facebook" style="height: 24px; width: 24px;"></a>
          <a href="#" style="display: inline-block; margin: 0 8px;"><img src="https://yourdomain.com/instagram-icon.png" alt="Instagram" style="height: 24px; width: 24px;"></a>
          <a href="#" style="display: inline-block; margin: 0 8px;"><img src="https://yourdomain.com/twitter-icon.png" alt="Twitter" style="height: 24px; width: 24px;"></a>
        </div>
        <p style="margin-bottom: 8px;">&copy; ${new Date().getFullYear()} Driving School Platform. All rights reserved.</p>
        <div style="margin: 15px 0;">
          <a href="#" style="color: #3d5afe; text-decoration: none; margin: 0 10px;">Help Center</a>
          <a href="#" style="color: #3d5afe; text-decoration: none; margin: 0 10px;">Privacy Policy</a>
          <a href="#" style="color: #3d5afe; text-decoration: none; margin: 0 10px;">Terms of Service</a>
        </div>
        <p style="margin-top: 15px;">You received this email because you signed up for an account on our Driving School Platform.</p>
      </div>
    </div>
  `;
  } else if (type === "signupLinkCreation") {
    subject = "Welcome to DSP Admin Panel - Set Up Your Account";
    message = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://domain.com/logo.png" alt="DSP Admin Panel" style="max-height: 70px;" />
      </div>
      <div style="color: #333333; line-height: 1.6;">
        <h1 style="color: #3d5afe; font-size: 26px; font-weight: 700; margin-bottom: 25px; text-align: center;">Welcome to the DSP Admin Panel</h1>
        
        <p style="margin-bottom: 25px; font-size: 16px; text-align: center;">We're excited to have you join our administrative team! Your expertise will be invaluable to our platform's success.</p>
        
        <div style="background: linear-gradient(to right, #3d5afe, #536dfe); border-radius: 8px; padding: 25px; text-align: center; margin-bottom: 30px;">
          <p style="font-size: 16px; color: rgba(255,255,255,0.9); margin-bottom: 15px;">Please create your password using the following link:</p>
          <a href="${otp}" style="display: inline-block; background-color: white; color: #3d5afe; font-weight: bold; padding: 14px 28px; text-decoration: none; border-radius: 50px; font-size: 16px; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">Set Up Your Account</a>
        </div>
        
        <p style="margin-bottom: 15px; font-size: 16px;">This link is all Yours now. If you need assistance, please contact our support team.</p>
        
        <div style="background-color: #f7f9fc; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h3 style="color: #3d5afe; font-size: 18px; margin-bottom: 15px;">What to expect as an admin:</h3>
          <ul style="padding-left: 20px; margin-bottom: 0;">
            <li style="margin-bottom: 10px;">Comprehensive dashboard access</li>
            <li style="margin-bottom: 10px;">Student and instructor management tools</li>
            <li style="margin-bottom: 10px;">Scheduling and booking oversight</li>
            <li style="margin-bottom: 0;">Reporting and analytics features</li>
          </ul>
        </div>
        
        <p style="margin-bottom: 25px; font-size: 16px; text-align: center;">We look forward to your contribution to our driving school platform!</p>
      </div>
      
      <div style="border-top: 1px solid #eaeaea; margin-top: 30px; padding-top: 20px; text-align: center; color: #777; font-size: 13px;">
        <p style="margin-bottom: 8px;">&copy; ${new Date().getFullYear()} Driving School Platform. All rights reserved.</p>
        <div style="margin: 15px 0;">
          <a href="#" style="color: #3d5afe; text-decoration: none; margin: 0 10px;">Help Center</a>
          <a href="#" style="color: #3d5afe; text-decoration: none; margin: 0 10px;">Privacy Policy</a>
          <a href="#" style="color: #3d5afe; text-decoration: none; margin: 0 10px;">Terms of Service</a>
        </div>
        <p style="margin-top: 15px;">If you didn't request this email, please disregard it or contact support.</p>
      </div>
    </div>
  `;
  }
  const mailOptions = {
    from: `"Drive School" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html: message,
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
module.exports = { generateOTP, sendOtpEmail };
