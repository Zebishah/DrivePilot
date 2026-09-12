const FRONTEND_BASE = (
  process.env.FRONTEND_URL ||
  process.env.Frontend_URL ||
  "http://localhost:5173"
).replace(/\/$/, "");
const FRONTEND_ORIGIN = (() => {
  try {
    return new URL(FRONTEND_BASE).origin;
  } catch (_) {
    return "http://localhost:5173";
  }
})();

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeSubject(value, fallback = "Notification") {
  return String(value || fallback).replace(/[\r\n]+/g, " ").trim().slice(0, 200) || fallback;
}

function trustedFrontendUrl(value, fallbackPath) {
  try {
    const candidate = new URL(value || fallbackPath, FRONTEND_BASE);
    if (candidate.origin === FRONTEND_ORIGIN) return candidate.toString();
  } catch (_) {
    // Use the configured fallback below for malformed or untrusted URLs.
  }
  return new URL(fallbackPath, FRONTEND_BASE).toString();
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value || "");
  return escapeHtml(date.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }));
}

function formatTime(value) {
  const [hour, minute] = String(value || "00:00").split(":").map(Number);
  const date = new Date();
  date.setHours(hour || 0, minute || 0, 0, 0);
  return escapeHtml(date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }));
}

function shell(title, body) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#202124;max-width:640px;margin:0 auto;padding:24px"><h1 style="color:#3157d5">Driving School Platform</h1><h2>${escapeHtml(title)}</h2>${body}<hr><p style="color:#777;font-size:12px">This is an automated message from Driving School Platform.</p></body></html>`;
}

function slotsText(slots = []) {
  return slots
    .map((slot) => `${formatDate(slot.date)} · ${formatTime(slot.startTime)}–${formatTime(slot.endTime)}`)
    .join("; ");
}

function bookingTemplate(data = {}) {
  const actionUrl = trustedFrontendUrl(data.actionUrl, "/student-dashboard/book");
  const status = String(data.status || "updated").replace(/_/g, " ");
  const slotSummary = slotsText(data.slots);
  const title = safeSubject(data.templateTitle || `Booking ${status}`);
  const text = [
    `Hello ${data.recipientName || "there"},`,
    `Your lesson booking is ${status}.`,
    data.instructorName ? `Instructor: ${data.instructorName}.` : "",
    data.studentName ? `Student: ${data.studentName}.` : "",
    slotSummary ? `Schedule: ${slotSummary}.` : "",
    data.reason ? `Reason: ${data.reason}.` : "",
    actionUrl,
  ].filter(Boolean).join("\n");
  return {
    subject: title,
    text,
    html: shell(title, `<p>Hello ${escapeHtml(data.recipientName || "there")},</p><p>Your lesson booking is <strong>${escapeHtml(status)}</strong>.</p>${data.instructorName ? `<p>Instructor: ${escapeHtml(data.instructorName)}</p>` : ""}${data.studentName ? `<p>Student: ${escapeHtml(data.studentName)}</p>` : ""}${slotSummary ? `<p>Schedule: ${slotSummary}</p>` : ""}${data.reason ? `<p>Reason: ${escapeHtml(data.reason)}</p>` : ""}<p><a href="${escapeHtml(actionUrl)}">Open your dashboard</a></p>`),
  };
}

function renderEmailTemplate(template, data = {}) {
  if (template === "booking" || template === "payment_alert" || template === "reminder" || template === "refund") {
    return bookingTemplate(data);
  }
  if (template === "otp") {
    const title = data.type === "two_factor_auth" ? "Your sign-in code" : "Verify your email address";
    const otp = escapeHtml(data.otp);
    return {
      subject: title,
      text: `${title}\n\nYour one-time code is ${data.otp}. It expires in 10 minutes.`,
      html: shell(title, `<p>Your one-time code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${otp}</p><p>This code expires in 10 minutes.</p>`),
    };
  }
  if (template === "welcome") {
    const name = data.name || "there";
    return {
      subject: "Welcome to Driving School Platform",
      text: `Welcome ${name}. Your account is ready to use.`,
      html: shell("Welcome", `<p>Welcome ${escapeHtml(name)}. Your account is ready to use.</p>`),
    };
  }
  if (template === "verification") {
    const status = escapeHtml(data.status || "updated");
    return {
      subject: "Instructor verification update",
      text: `Your instructor verification status is ${data.status || "updated"}.`,
      html: shell("Instructor verification update", `<p>Your instructor verification status is <strong>${status}</strong>.</p>`),
    };
  }
  if (template === "signup_link") {
    const link = trustedFrontendUrl(data.signupLink, "/signup");
    return {
      subject: "Your instructor signup link",
      text: `Complete your instructor signup here: ${data.signupLink}`,
      html: shell("Complete your signup", `<p>Use the link below to finish creating your instructor account.</p><p><a href="${link}">Continue signup</a></p>`),
    };
  }
  if (template === "password_reset") {
    const link = trustedFrontendUrl(data.resetUrl, "/auth/reset-password");
    return {
      subject: "Password reset instructions",
      text: `Reset your password within one hour: ${data.resetUrl}`,
      html: shell("Password reset", `<p>Use the link below to reset your password. It is valid for one hour.</p><p><a href="${link}">Reset password</a></p>`),
    };
  }
  if (template === "document_status") {
    const title = "Document status updated";
    return {
      subject: title,
      text: `Your ${data.documentType || "document"} status is ${data.status}.`,
      html: shell(title, `<p>Your ${escapeHtml(data.documentType || "document")} status is <strong>${escapeHtml(data.status || "updated")}</strong>.</p>${data.rejectionReason ? `<p>Reason: ${escapeHtml(data.rejectionReason)}</p>` : ""}`),
    };
  }
  if (template === "payout") {
    const title = "Payout completed";
    return {
      subject: title,
      text: `Your payout of CHF ${data.amount} for the lesson on ${data.lessonDate} has been completed.`,
      html: shell(title, `<p>Your payout of <strong>CHF ${escapeHtml(data.amount)}</strong> for the lesson on ${formatDate(data.lessonDate)} has been completed.</p>`),
    };
  }
  if (template === "contact_admin") {
    const title = "New contact form submission";
    return {
      subject: title,
      text: `From: ${data.name} <${data.email}>\n\n${data.description}`,
      html: shell(title, `<p><strong>From:</strong> ${escapeHtml(data.name)} &lt;${escapeHtml(data.email)}&gt;</p><p>${escapeHtml(data.description).replace(/\n/g, "<br>")}</p>`),
    };
  }
  if (template === "contact_confirmation") {
    return {
      subject: "We received your message",
      text: `Thanks ${data.name}. We received your message and will respond soon.`,
      html: shell("Thanks for contacting us", `<p>Thanks ${escapeHtml(data.name)}. We received your message and will respond soon.</p>`),
    };
  }
  if (template === "custom") {
    const subject = safeSubject(data.subject);
    return {
      subject,
      text: String(data.text || ""),
      html: shell(subject, `<p>${escapeHtml(data.text || "")}</p>`),
    };
  }
  throw Object.assign(new Error(`Unknown email template: ${template}`), { code: "EMAIL_TEMPLATE_INVALID", retryable: false });
}

module.exports = { escapeHtml, renderEmailTemplate };
