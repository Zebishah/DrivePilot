const crypto = require("crypto");
const { Otp } = require("../models/User");
const SignupToken = require("../models/SignupLink");
const { enqueueEmailEvent } = require("../services/outboxService");

function digest(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, 24);
}

function idOf(value) {
  return value?._id?.toString?.() || value?.toString?.() || String(value || "");
}

function bookingEventType(type) {
  return {
    booking_created: "booking_confirmed",
    booking_cancelled: "booking_cancelled",
    booking_status_updated: "booking_status_updated",
    booking_rescheduled: "booking_rescheduled",
    booking_completed: "lesson_completed",
    booking_refunded: "refund_approved",
    payment_requires_action: "payment_requires_action",
    payment_failed: "payment_failed",
  }[type] || type || "booking_notification";
}

async function sendOtpEmail(email, value, type) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) throw new Error("Email recipient is required");

  if (["email_verification", "two_factor_auth"].includes(type)) {
    const otp = await Otp.findOne({ email: normalizedEmail, otp: value, type, status: "unused" }).sort({ createdAt: -1 }).select("_id").lean();
    if (!otp) throw new Error("OTP record must exist before notification enqueue");
    return enqueueEmailEvent({
      eventType: "otp_issued",
      aggregateType: "OTP",
      aggregateId: otp._id,
      dedupeKey: `otp:${otp._id}`,
      to: normalizedEmail,
      template: "otp",
      data: { type },
      references: { otpId: otp._id },
    });
  }

  if (type === "signupLinkCreation") {
    const signup = await SignupToken.findOne({ email: normalizedEmail, signupLink: value }).select("_id").lean();
    if (!signup) throw new Error("Signup link record must exist before notification enqueue");
    return enqueueEmailEvent({
      eventType: "signup_link_created",
      aggregateType: "SIGNUP_LINK",
      aggregateId: signup._id,
      dedupeKey: `signup-link:${signup._id}`,
      to: normalizedEmail,
      template: "signup_link",
      references: { signupTokenId: signup._id },
    });
  }

  const isWelcome = ["welcome_email_Student", "welcome_email_Instructor", "welcome_email"].includes(type);
  const eventType = isWelcome ? "welcome_email" : "instructor_verification_updated";
  return enqueueEmailEvent({
    eventType,
    aggregateType: "USER",
    aggregateId: normalizedEmail,
    dedupeKey: `${eventType}:${normalizedEmail}:${digest(value)}`,
    to: normalizedEmail,
    template: isWelcome ? "welcome" : "verification",
    data: isWelcome ? { name: value } : { status: value },
  });
}

async function sendBookingEmail(recipients, bookingData, type, options = {}) {
  const eventType = bookingEventType(type);
  const bookingId = idOf(bookingData?.id || bookingData?._id);
  const slots = (bookingData?.slots || []).map((slot) => ({
    id: idOf(slot?._id || slot?.id),
    date: slot?.date,
    startTime: slot?.startTime,
    endTime: slot?.endTime,
    status: slot?.status,
  }));
  const student = bookingData?.student || {};
  const instructor = bookingData?.instructor || {};
  const baseData = {
    status: bookingData?.status,
    slots,
    studentName: `${student.firstName || ""} ${student.lastName || ""}`.trim(),
    instructorName: `${instructor.firstName || ""} ${instructor.lastName || ""}`.trim(),
    reason: bookingData?.reason || null,
    actionUrl: bookingData?.completePaymentLink || undefined,
    templateTitle: {
      booking_created: "Booking confirmed",
      booking_cancelled: "Booking cancelled",
      booking_rescheduled: "Booking rescheduled",
      booking_refunded: "Refund approved",
      booking_completed: "Lesson completed",
      payment_requires_action: "Payment action required",
      payment_failed: "Payment failed",
    }[type],
  };
  const results = [];
  for (const recipient of recipients || []) {
    if (!recipient?.email) continue;
    const address = String(recipient.email).trim().toLowerCase();
    results.push(await enqueueEmailEvent({
      eventType,
      aggregateType: "BOOKING",
      aggregateId: bookingId || digest(JSON.stringify(baseData)),
      dedupeKey: `email:${eventType}:${bookingId}:${digest(`${address}:${JSON.stringify(slots)}:${bookingData?.status}`)}`,
      to: address,
      template: type === "payment_requires_action" || type === "payment_failed" ? "payment_alert" : type === "booking_refunded" ? "refund" : "booking",
      data: { ...baseData, recipientName: recipient.name, recipientRole: recipient.role },
      metadata: { role: recipient.role },
      session: options.session,
    }));
  }
  return results;
}

async function notifyBookingParties(bookingData, type, adminEmail = process.env.ADMIN_EMAIL, options = {}) {
  const recipients = [];
  if (bookingData?.studentId?.email) recipients.push({ email: bookingData.studentId.email, role: "student", name: `${bookingData.studentId.firstName || ""} ${bookingData.studentId.lastName || ""}`.trim() });
  if (bookingData?.instructorId?.email) recipients.push({ email: bookingData.instructorId.email, role: "instructor", name: `${bookingData.instructorId.firstName || ""} ${bookingData.instructorId.lastName || ""}`.trim() });
  if (adminEmail) recipients.push({ email: adminEmail, role: "admin", name: "Admin Team" });
  await sendBookingEmail(recipients, {
    id: bookingData?._id,
    status: bookingData?.status,
    slots: bookingData?.slots,
    reason: bookingData?.reason,
    student: bookingData?.studentId,
    instructor: bookingData?.instructorId,
  }, type, options);
  return true;
}

async function sendDocumentStatusEmail(recipients, documentData, type, options = {}) {
  const results = [];
  for (const recipient of recipients || []) {
    if (!recipient?.email) continue;
    const address = String(recipient.email).trim().toLowerCase();
    results.push(await enqueueEmailEvent({
      eventType: "document_status_updated",
      aggregateType: "INSTRUCTOR_DOCUMENT",
      aggregateId: idOf(documentData?._id || documentData?.id) || digest(address),
      dedupeKey: `document-status:${idOf(documentData?._id || documentData?.id)}:${documentData?.status}:${digest(address)}`,
      to: address,
      template: "document_status",
      data: { documentType: documentData?.documentType, status: documentData?.status, rejectionReason: documentData?.rejectionReason },
      metadata: { role: recipient.role, sourceType: type },
      session: options.session,
    }));
  }
  return results;
}

async function notifyDocumentStatusParties(documentData, instructorData, type, adminEmail = process.env.ADMIN_EMAIL, options = {}) {
  const recipients = [];
  if (instructorData?.email) recipients.push({ email: instructorData.email, role: "instructor", name: `${instructorData.firstName || ""} ${instructorData.lastName || ""}`.trim() });
  if (adminEmail) recipients.push({ email: adminEmail, role: "admin", name: "Admin Team" });
  await sendDocumentStatusEmail(recipients, { ...documentData, instructor: undefined }, type, options);
  return true;
}

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

module.exports = { generateOTP, sendOtpEmail, sendBookingEmail, notifyBookingParties, sendDocumentStatusEmail, notifyDocumentStatusParties };
