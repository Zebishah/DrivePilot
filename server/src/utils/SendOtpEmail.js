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
    host: process.env.DOMAIN_HOST,
    port: 587,
    secure: false, // true for port 465, false for 587
    auth: {
      user: process.env.DOMAIN_MAIL,
      pass: process.env.DOMAIN_PASS,
    },
  });

  await transporter.sendMail(mailOptions);
};

// New booking notification functions
const sendBookingEmail = async (recipients, bookingData, type) => {
  const transporter = nodemailer.createTransport({
    host: process.env.DOMAIN_HOST,
    port: 587,
    secure: false, // true for port 465, false for 587
    auth: {
      user: process.env.DOMAIN_MAIL,
      pass: process.env.DOMAIN_PASS,
    },
  });

  let subject = "";
  let message = "";

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeStr) => {
    const [hour, minute] = timeStr.split(":");
    const date = new Date();
    date.setHours(parseInt(hour), parseInt(minute));
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };
  console.log("bookingData", bookingData);
  // Generate slots HTML
  const slotsHtml = bookingData.slots
    .map(
      (slot) => `
    <div style="background-color: #f8f9fa; border-radius: 6px; padding: 15px; margin-bottom: 10px; border-left: 4px solid #3d5afe;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="color: #333; font-size: 16px;">${formatDate(slot.date)}</strong>
          <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}</p>
        </div>
        <span style="background-color: ${slot.status === "confirmed" ? "#28a745" : slot.status === "cancelled" ? "#dc3545" : "#ffc107"}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; text-transform: capitalize;">${slot.status}</span>
      </div>
    </div>
  `
    )
    .join("");

  switch (type) {
    case "booking_created":
      subject = "🎉 New Booking Confirmed - DSP";
      message = `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3d5afe; font-size: 24px; font-weight: 600; margin-bottom: 20px;">Driving School Platform</h1>
          </div>
          
          <div style="color: #333333; line-height: 1.6;">
            <h2 style="color: #28a745; font-size: 26px; font-weight: 700; margin-bottom: 25px; text-align: center;">🎉 Booking Confirmed!</h2>
            
            <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border-radius: 10px; padding: 25px; margin-bottom: 30px;">
              <h3 style="color: white; font-size: 18px; font-weight: 600; margin-bottom: 10px; text-align: center;">Booking ID: #${bookingData.id || "N/A"}</h3>
              <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px; text-align: center;">Your driving lesson has been successfully booked!</p>
            </div>
            
            <div style="background-color: #f7f9fc; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
              <h3 style="color: #3d5afe; font-size: 18px; margin-bottom: 20px;">📋 Booking Details</h3>
              
              <div style="margin-bottom: 20px;">
                <p style="margin-bottom: 8px;"><strong>Student:</strong> ${bookingData.student?.firstName || ""} ${bookingData.student?.lastName || ""}</p>
                <p style="margin-bottom: 8px;"><strong>Instructor:</strong> ${bookingData.instructor?.firstName || ""} ${bookingData.instructor?.lastName || ""}</p>
                <p style="margin-bottom: 8px;"><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">${bookingData.status || "Confirmed"}</span></p>
                <p style="margin-bottom: 8px;"><strong>Total Price:</strong> $${bookingData.totalAmount || "0"}</p>
                <p style="margin-bottom: 8px;"><strong>Final Price:</strong> $${bookingData.finalAmount || "0"}</p>
              </div>
              
              <h4 style="color: #3d5afe; font-size: 16px; margin-bottom: 15px;">📅 Scheduled Sessions:</h4>
              ${slotsHtml}
            </div>
            
            <div style="background-color: #e3f2fd; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
              <h4 style="color: #1976d2; margin-bottom: 15px;">📞 Address Information</h4>
              <p style="margin-bottom: 8px;"><strong>Student Address:</strong> ${bookingData.studentAddress || "N/A"}</p>
              <p style="margin-bottom: 0;"><strong>Instructor Address:</strong> ${bookingData.instructorAddress || "N/A"}</p>
            </div>
            
            <p style="margin-bottom: 25px; font-size: 16px;">Please ensure you're available at the scheduled times. For any changes or questions, contact support immediately.</p>
          </div>
          
          <div style="border-top: 1px solid #eaeaea; margin-top: 30px; padding-top: 20px; text-align: center; color: #777; font-size: 13px;">
            <p>&copy; ${new Date().getFullYear()} Driving School Platform. All rights reserved.</p>
          </div>
        </div>
      `;
      break;

    case "booking_cancelled":
      subject = "❌ Booking Cancelled - DSP";
      message = `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3d5afe; font-size: 24px; font-weight: 600; margin-bottom: 20px;">Driving School Platform</h1>
          </div>
          
          <div style="color: #333333; line-height: 1.6;">
            <h2 style="color: #dc3545; font-size: 26px; font-weight: 700; margin-bottom: 25px; text-align: center;">❌ Booking Cancelled</h2>
            
            <div style="background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%); border-radius: 10px; padding: 25px; margin-bottom: 30px;">
              <h3 style="color: white; font-size: 18px; font-weight: 600; margin-bottom: 10px; text-align: center;">Booking ID: #${bookingData.id || "N/A"}</h3>
              <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px; text-align: center;">This booking has been cancelled</p>
            </div>
            
            <div style="background-color: #f7f9fc; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
              <h3 style="color: #3d5afe; font-size: 18px; margin-bottom: 20px;">📋 Cancelled Booking Details</h3>
              
              <div style="margin-bottom: 20px;">
                <p style="margin-bottom: 8px;"><strong>Student:</strong> ${bookingData.student?.firstName || ""} ${bookingData.student?.lastName || ""}</p>
                <p style="margin-bottom: 8px;"><strong>Instructor:</strong> ${bookingData.instructor?.firstName || ""} ${bookingData.instructor?.lastName || ""}</p>
                <p style="margin-bottom: 8px;"><strong>Status:</strong> <span style="color: #dc3545; font-weight: bold;">${bookingData.status || "Cancelled"}</span></p>
                <p style="margin-bottom: 8px;"><strong>Cancellation Date:</strong> ${new Date().toLocaleDateString()}</p>
                ${bookingData.reason ? `<p style="margin-bottom: 8px;"><strong>Reason:</strong> ${bookingData.reason}</p>` : ""}
              </div>
              
              <h4 style="color: #3d5afe; font-size: 16px; margin-bottom: 15px;">📅 Cancelled Sessions:</h4>
              ${slotsHtml}
            </div>
            
            <p style="margin-bottom: 25px; font-size: 16px;">If you have any questions about this cancellation, please contact our support team.</p>
          </div>
          
          <div style="border-top: 1px solid #eaeaea; margin-top: 30px; padding-top: 20px; text-align: center; color: #777; font-size: 13px;">
            <p>&copy; ${new Date().getFullYear()} Driving School Platform. All rights reserved.</p>
          </div>
        </div>
      `;
      break;

    case "booking_status_updated":
      subject = "📝 Booking Status Updated - DSP";
      message = `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3d5afe; font-size: 24px; font-weight: 600; margin-bottom: 20px;">Driving School Platform</h1>
          </div>
          
          <div style="color: #333333; line-height: 1.6;">
            <h2 style="color: #ffc107; font-size: 26px; font-weight: 700; margin-bottom: 25px; text-align: center;">📝 Booking Status Updated</h2>
            
            <div style="background: linear-gradient(135deg, #ffc107 0%, #ffca28 100%); border-radius: 10px; padding: 25px; margin-bottom: 30px;">
              <h3 style="color: #333; font-size: 18px; font-weight: 600; margin-bottom: 10px; text-align: center;">Booking ID: #${bookingData.id || "N/A"}</h3>
              <p style="color: rgba(0,0,0,0.7); margin: 0; font-size: 16px; text-align: center;">Your booking status has been updated</p>
            </div>
            
            <div style="background-color: #f7f9fc; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
              <h3 style="color: #3d5afe; font-size: 18px; margin-bottom: 20px;">📋 Updated Booking Details</h3>
              
              <div style="margin-bottom: 20px;">
                <p style="margin-bottom: 8px;"><strong>Student:</strong> ${bookingData.student?.firstName || ""} ${bookingData.student?.lastName || ""}</p>
                <p style="margin-bottom: 8px;"><strong>Instructor:</strong> ${bookingData.instructor?.firstName || ""} ${bookingData.instructor?.lastName || ""}</p>
                <p style="margin-bottom: 8px;"><strong>New Status:</strong> <span style="color: #ffc107; font-weight: bold;">${bookingData.status || "Updated"}</span></p>
                <p style="margin-bottom: 8px;"><strong>Update Date:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              
              <h4 style="color: #3d5afe; font-size: 16px; margin-bottom: 15px;">📅 Session Details:</h4>
              ${slotsHtml}
            </div>
            
            <p style="margin-bottom: 25px; font-size: 16px;">Please review the updated status and contact support if you have any concerns.</p>
          </div>
          
          <div style="border-top: 1px solid #eaeaea; margin-top: 30px; padding-top: 20px; text-align: center; color: #777; font-size: 13px;">
            <p>&copy; ${new Date().getFullYear()} Driving School Platform. All rights reserved.</p>
          </div>
        </div>
      `;
      break;
  }

  // Send emails to all recipients
  const emailPromises = recipients.map((recipient) => {
    const mailOptions = {
      from: `"Drive School" <${process.env.EMAIL_USER}>`,
      to: recipient.email,
      subject: subject,
      html: message,
    };
    return transporter.sendMail(mailOptions);
  });

  try {
    await Promise.all(emailPromises);
    console.log(
      `Booking notification emails sent successfully to ${recipients.length} recipients`
    );
  } catch (error) {
    console.error("Error sending booking notification emails:", error);
    throw error;
  }
};
const sendDocumentStatusEmail = async (recipients, documentData, type) => {
  const transporter = nodemailer.createTransport({
    host: process.env.DOMAIN_HOST,
    port: 587,
    secure: false, // true for port 465, false for 587
    auth: {
      user: process.env.DOMAIN_MAIL,
      pass: process.env.DOMAIN_PASS,
    },
  });

  let subject = "";
  let message = "";

  const getStatusColor = (status) => {
    switch (status) {
      case "accepted":
        return "#28a745";
      case "rejected":
        return "#dc3545";
      case "pending":
        return "#ffc107";
      default:
        return "#6c757d";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "accepted":
        return "✅";
      case "rejected":
        return "❌";
      case "pending":
        return "⏳";
      default:
        return "📄";
    }
  };

  switch (type) {
    case "document_status_updated":
      const statusIcon = getStatusIcon(documentData.status);
      const statusColor = getStatusColor(documentData.status);

      subject = `${statusIcon} Document Status Updated - ${documentData.documentType} - DSP`;
      message = `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3d5afe; font-size: 24px; font-weight: 600; margin-bottom: 20px;">Driving School Platform</h1>
          </div>
          
          <div style="color: #333333; line-height: 1.6;">
            <h2 style="color: ${statusColor}; font-size: 26px; font-weight: 700; margin-bottom: 25px; text-align: center;">${statusIcon} Document Status Updated</h2>
            
            <div style="background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}cc 100%); border-radius: 10px; padding: 25px; margin-bottom: 30px;">
              <h3 style="color: white; font-size: 18px; font-weight: 600; margin-bottom: 10px; text-align: center;">Document ID: #${documentData.id || "N/A"}</h3>
              <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px; text-align: center;">Your document status has been updated to: <strong>${documentData.status.toUpperCase()}</strong></p>
            </div>
            
            <div style="background-color: #f7f9fc; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
              <h3 style="color: #3d5afe; font-size: 18px; margin-bottom: 20px;">📋 Document Details</h3>
              
              <div style="margin-bottom: 20px;">
                <p style="margin-bottom: 8px;"><strong>Instructor:</strong> ${documentData.instructor?.firstName || ""} ${documentData.instructor?.lastName || ""}</p>
                <p style="margin-bottom: 8px;"><strong>Email:</strong> ${documentData.instructor?.email || ""}</p>
                <p style="margin-bottom: 8px;"><strong>Document Type:</strong> ${documentData.documentType || "N/A"}</p>
                <p style="margin-bottom: 8px;"><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold; text-transform: capitalize;">${documentData.status || "N/A"}</span></p>
                <p style="margin-bottom: 8px;"><strong>Update Date:</strong> ${new Date().toLocaleDateString(
                  "en-US",
                  {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }
                )}</p>
                <p style="margin-bottom: 8px;"><strong>Update Time:</strong> ${new Date().toLocaleTimeString(
                  "en-US",
                  {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  }
                )}</p>
              </div>
              
              ${
                documentData.documentUrl
                  ? `
                <div style="background-color: #e3f2fd; border-radius: 6px; padding: 15px; margin-top: 15px;">
                  <p style="margin-bottom: 8px; color: #1976d2;"><strong>📎 Document Link:</strong></p>
                  <a href="${documentData.documentUrl}" target="_blank" style="color: #3d5afe; text-decoration: none; font-weight: 500;">View Document</a>
                </div>
              `
                  : ""
              }
            </div>
            
            ${
              documentData.status === "accepted"
                ? `
              <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                <h4 style="color: #155724; margin-bottom: 15px;">🎉 Congratulations!</h4>
                <p style="color: #155724; margin: 0;">Your document has been approved. You can now proceed with your instructor registration process.</p>
              </div>
            `
                : documentData.status === "rejected"
                  ? `
              <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                <h4 style="color: #721c24; margin-bottom: 15px;">⚠️ Document Rejected</h4>
                <p style="color: #721c24; margin: 0;">Your document has been rejected. Please review the requirements and resubmit a new document. Contact support if you need assistance.</p>
                ${documentData.rejectionReason ? `<p style="color: #721c24; margin: 10px 0 0 0;"><strong>Reason:</strong> ${documentData.rejectionReason}</p>` : ""}
              </div>
            `
                  : `
              <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                <h4 style="color: #856404; margin-bottom: 15px;">⏳ Under Review</h4>
                <p style="color: #856404; margin: 0;">Your document is currently under review. We'll notify you once the review is complete.</p>
              </div>
            `
            }
            
            <p style="margin-bottom: 25px; font-size: 16px;">If you have any questions about this status update, please contact our support team.</p>
          </div>
          
          <div style="border-top: 1px solid #eaeaea; margin-top: 30px; padding-top: 20px; text-align: center; color: #777; font-size: 13px;">
            <p>&copy; ${new Date().getFullYear()} Driving School Platform. All rights reserved.</p>
            <p style="margin-top: 10px;">
              <a href="mailto:${process.env.ADMIN_EMAIL || "support@drivingschool.com"}" style="color: #3d5afe; text-decoration: none;">Contact Support</a>
            </p>
          </div>
        </div>
      `;
      break;

    default:
      throw new Error(`Unknown email type: ${type}`);
  }

  // Send emails to all recipients
  const emailPromises = recipients.map((recipient) => {
    const mailOptions = {
      from: `"Driving School Platform" <${process.env.EMAIL_USER}>`,
      to: recipient.email,
      subject: subject,
      html: message,
    };
    return transporter.sendMail(mailOptions);
  });

  try {
    await Promise.all(emailPromises);
    console.log(
      `Document status notification emails sent successfully to ${recipients.length} recipients`
    );
  } catch (error) {
    console.error("Error sending document status notification emails:", error);
    throw error;
  }
};
// Function to notify all parties about booking events
const notifyBookingParties = async (
  bookingData,
  type,
  adminEmail = process.env.ADMIN_EMAIL
) => {
  try {
    const recipients = [];

    // Add student
    if (bookingData.studentId && bookingData.studentId.email) {
      recipients.push({
        email: bookingData.studentId.email,
        role: "student",
        name: `${bookingData.studentId.firstName} ${bookingData.studentId.lastName}`,
      });
    }

    // Add instructor
    if (bookingData.instructorId && bookingData.instructorId.email) {
      recipients.push({
        email: bookingData.instructorId.email,
        role: "instructor",
        name: `${bookingData.instructorId.firstName} ${bookingData.instructorId.lastName}`,
      });
    }

    // Add admin
    if (adminEmail) {
      recipients.push({
        email: adminEmail,
        role: "admin",
        name: "Admin Team",
      });
    }

    if (recipients.length > 0) {
      await sendBookingEmail(
        recipients,
        {
          id: bookingData._id,
          status: bookingData.status,
          slots: bookingData.slots,
          totalAmount: bookingData.totalAmount,
          finalAmount: bookingData.finalAmount,
          studentAddress: bookingData.studentId.homeAddress,
          instructorAddress: bookingData.instructorId.address,
          student: bookingData.studentId, // Changed from bookingData.studentId
          instructor: bookingData.instructorId, // Changed from bookingData.instructorId
          reason: bookingData.reason || null,
        },
        type
      );
    }

    return true;
  } catch (error) {
    console.error("Error in notifyBookingParties:", error);
    return false;
  }
};
const notifyDocumentStatusParties = async (
  documentData,
  instructorData,
  type,
  adminEmail = process.env.ADMIN_EMAIL
) => {
  try {
    const recipients = [];

    // Add instructor (always notify the instructor whose document status changed)
    if (instructorData && instructorData.email) {
      recipients.push({
        email: instructorData.email,
        role: "instructor",
        name: `${instructorData.firstName || ""} ${instructorData.lastName || ""}`.trim(),
      });
    }

    // Add admin (always notify admin about status changes)
    if (adminEmail) {
      recipients.push({
        email: adminEmail,
        role: "admin",
        name: "Admin Team",
      });
    }

    if (recipients.length > 0) {
      await sendDocumentStatusEmail(
        recipients,
        {
          id: documentData._id || documentData.id,
          documentType: documentData.documentType,
          documentUrl: documentData.documentUrl,
          status: documentData.status,
          instructor: instructorData,
          rejectionReason: documentData.rejectionReason || null,
        },
        type
      );
    }

    return true;
  } catch (error) {
    console.error("Error in notifyDocumentStatusParties:", error);
    return false;
  }
};

module.exports = {
  generateOTP,
  sendOtpEmail,
  sendBookingEmail,
  notifyBookingParties,
  sendDocumentStatusEmail, // New function
  notifyDocumentStatusParties, // New function
};
