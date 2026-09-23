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

const COLORS = {
  navy: "#111827",
  blue: "#7c3aed",
  cyan: "#38bdf8",
  ink: "#111827",
  muted: "#64748b",
  border: "#e2e8f0",
  canvas: "#f7f8fc",
  softBlue: "#faf5ff",
};

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

function statusLabel(value, fallback = "Updated") {
  return String(value || fallback).replace(/_/g, " ");
}

function button(label, url) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:8px;background:${COLORS.blue}"><a href="${escapeHtml(url)}" style="display:inline-block;padding:13px 20px;border-radius:8px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">${escapeHtml(label)}</a></td></tr></table>`;
}

function detailRow(label, value) {
  return `<tr><td style="padding:8px 0;color:${COLORS.muted};font-size:13px;vertical-align:top;width:34%">${escapeHtml(label)}</td><td style="padding:8px 0;color:${COLORS.ink};font-size:14px;font-weight:600;vertical-align:top">${value}</td></tr>`;
}

function infoCard(content) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;background:${COLORS.softBlue};border:1px solid #dbe5ff;border-radius:10px"><tr><td style="padding:16px 18px">${content}</td></tr></table>`;
}

function shell(title, body, { preheader = "" } = {}) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${COLORS.canvas};font-family:Arial,Helvetica,sans-serif;color:${COLORS.ink};-webkit-text-size-adjust:100%">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.canvas}">
      <tr><td align="center" style="padding:28px 12px 36px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px">
          <tr><td style="padding:4px 8px 18px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
              <td valign="middle" style="width:52px">
                <div style="width:42px;height:42px;border-radius:13px;background:${COLORS.navy};color:${COLORS.cyan};font-size:18px;font-weight:800;line-height:42px;text-align:center;letter-spacing:-1px">DSP</div>
              </td>
              <td valign="middle" style="padding-left:10px;color:${COLORS.navy};font-size:16px;font-weight:800;letter-spacing:.1px">
                DSP Marketplace<br><span style="color:${COLORS.muted};font-size:11px;font-weight:600;letter-spacing:.2px">Learn with confidence</span>
              </td>
            </tr></table>
          </td></tr>
          <tr><td style="background:#ffffff;border:1px solid ${COLORS.border};border-radius:14px;box-shadow:0 8px 28px rgba(17,26,53,.06);overflow:hidden">
            <div style="height:5px;background:${COLORS.cyan}"></div>
            <div style="padding:34px 38px 36px">
              <p style="margin:0 0 10px;color:${COLORS.blue};font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase">DSP Marketplace</p>
              <h1 style="margin:0;color:${COLORS.navy};font-size:27px;line-height:1.25;letter-spacing:-.4px">${escapeHtml(title)}</h1>
              <div style="margin-top:26px;color:${COLORS.ink};font-size:15px;line-height:1.65">${body}</div>
            </div>
          </td></tr>
          <tr><td align="center" style="padding:22px 12px 0;color:${COLORS.muted};font-size:11px;line-height:1.7">
            <p style="margin:0">A smarter way to plan every lesson.</p>
            <p style="margin:4px 0 0">This is an automated message from DSP Marketplace.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function otpShell(title, body) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f8fb;font-family:Arial,Helvetica,sans-serif;color:${COLORS.ink};-webkit-text-size-adjust:100%">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f8fb">
      <tr><td align="center" style="padding:28px 12px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
          <tr><td style="padding:4px 8px 18px;color:${COLORS.navy};font-size:16px;font-weight:800">DSP Marketplace</td></tr>
          <tr><td style="background:#ffffff;border:1px solid ${COLORS.border};border-radius:14px;overflow:hidden">
            <div style="height:4px;background:${COLORS.cyan}"></div>
            <div style="padding:32px 34px 34px">
              <p style="margin:0 0 10px;color:${COLORS.blue};font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase">DSP Marketplace</p>
              <h1 style="margin:0;color:${COLORS.navy};font-size:26px;line-height:1.25">${escapeHtml(title)}</h1>
              <div style="margin-top:24px;color:${COLORS.ink};font-size:15px;line-height:1.65">${body}</div>
            </div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function slotsText(slots = []) {
  return slots
    .map((slot) => `${formatDate(slot.date)} · ${formatTime(slot.startTime)}–${formatTime(slot.endTime)}`)
    .join("; ");
}

function slotDetails(slots = []) {
  if (!slots.length) return "";
  return infoCard(`<p style="margin:0 0 6px;color:${COLORS.navy};font-size:12px;font-weight:800;letter-spacing:.6px;text-transform:uppercase">Lesson schedule</p>${slots.map((slot) => `<p style="margin:7px 0 0;color:${COLORS.ink};font-size:14px">${formatDate(slot.date)}<br><span style="color:${COLORS.muted}">${formatTime(slot.startTime)} – ${formatTime(slot.endTime)}</span></p>`).join("")}`);
}

function bookingTemplate(data = {}) {
  const actionUrl = trustedFrontendUrl(data.actionUrl, "/student-dashboard/book");
  const status = statusLabel(data.status, "updated");
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
  const details = [
    data.instructorName ? detailRow("Instructor", escapeHtml(data.instructorName)) : "",
    data.studentName ? detailRow("Student", escapeHtml(data.studentName)) : "",
    data.reason ? detailRow("Note", escapeHtml(data.reason)) : "",
  ].filter(Boolean).join("");
  return {
    subject: title,
    text,
    html: shell(title, `<p style="margin:0 0 18px">Hello ${escapeHtml(data.recipientName || "there")},</p><p style="margin:0 0 16px">Your lesson booking is <strong style="color:${COLORS.blue}">${escapeHtml(status)}</strong>.</p>${details ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px">${details}</table>` : ""}${slotDetails(data.slots)}<div style="margin-top:24px">${button("Open your dashboard", actionUrl)}</div>`, { preheader: `Your lesson booking is ${status}.` }),
  };
}

function renderEmailTemplate(template, data = {}) {
  if (["booking", "payment_alert", "reminder", "refund"].includes(template)) {
    return bookingTemplate(data);
  }
  if (template === "otp") {
    const isSignIn = data.type === "two_factor_auth";
    const title = isSignIn ? "Your DSP Marketplace sign-in code" : "Your DSP Marketplace verification code";
    const codeLabel = isSignIn ? "Your sign-in code" : "Your verification code";
    const otp = String(data.otp ?? "");
    return {
      subject: title,
      text: `DSP Marketplace\n\n${codeLabel}: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, you can safely ignore this email.`,
      html: otpShell(title, `<p style="margin:0 0 16px">${escapeHtml(codeLabel)}:</p><div style="margin:20px 0;background:${COLORS.softBlue};border:1px solid #dbe5ff;border-radius:10px;padding:18px;text-align:center"><p style="margin:0;color:${COLORS.navy};font-size:32px;line-height:1.2;font-weight:800;letter-spacing:9px">${escapeHtml(otp)}</p></div><p style="margin:0;color:${COLORS.muted};font-size:13px">This code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>`),
      tracking: { trackOpens: false, trackClicks: false },
    };
  }
  if (template === "welcome") {
    const name = data.name || "there";
    return {
      subject: "Welcome to DSP Marketplace",
      text: `Welcome ${name}. Your account is ready to use.`,
      html: shell("Welcome to DSP Marketplace", `<p style="margin:0 0 16px">Welcome ${escapeHtml(name)} — we’re glad you’re here.</p><p style="margin:0">Your account is ready to use. Find the right instructor, keep your schedule in one place, and make every lesson count.</p>`, { preheader: "Your DSP Marketplace account is ready." }),
    };
  }
  if (template === "verification") {
    const status = statusLabel(data.status);
    return {
      subject: "Instructor verification update",
      text: `Your instructor verification status is ${data.status || "updated"}.`,
      html: shell("Instructor verification update", `<p style="margin:0 0 16px">Your instructor verification status has been updated.</p>${infoCard(`<p style="margin:0;color:${COLORS.muted};font-size:12px;text-transform:uppercase;letter-spacing:.6px">Current status</p><p style="margin:6px 0 0;color:${COLORS.navy};font-weight:800;font-size:18px">${escapeHtml(status)}</p>`)}`, { preheader: `Your instructor verification is ${status}.` }),
    };
  }
  if (template === "signup_link") {
    const link = trustedFrontendUrl(data.signupLink, "/signup");
    return {
      subject: "Your instructor signup link",
      text: `Complete your instructor signup here: ${link}`,
      html: shell("Complete your signup", `<p style="margin:0 0 16px">Your instructor invitation is ready. Use the secure link below to finish creating your account.</p><div style="margin-top:24px">${button("Continue signup", link)}</div><p style="margin:22px 0 0;color:${COLORS.muted};font-size:13px">If you were not expecting this invitation, you can ignore this email.</p>`, { preheader: "Your DSP instructor invitation is ready." }),
    };
  }
  if (template === "password_reset") {
    const link = trustedFrontendUrl(data.resetUrl, "/auth/reset-password");
    return {
      subject: "Password reset instructions",
      text: `Reset your password within one hour: ${link}`,
      html: shell("Reset your password", `<p style="margin:0 0 16px">We received a request to reset your DSP Marketplace password.</p><p style="margin:0">This secure link is valid for one hour.</p><div style="margin-top:24px">${button("Reset password", link)}</div><p style="margin:22px 0 0;color:${COLORS.muted};font-size:13px">If you did not request a reset, no action is needed.</p>`, { preheader: "Your DSP password reset link is ready." }),
    };
  }
  if (template === "document_status") {
    const title = "Document status updated";
    const status = statusLabel(data.status);
    return {
      subject: title,
      text: `Your ${data.documentType || "document"} status is ${data.status}.`,
      html: shell(title, `<p style="margin:0 0 16px">Your ${escapeHtml(data.documentType || "document")} has been reviewed.</p>${infoCard(`<p style="margin:0;color:${COLORS.muted};font-size:12px;text-transform:uppercase;letter-spacing:.6px">Review status</p><p style="margin:6px 0 0;color:${COLORS.navy};font-weight:800;font-size:18px">${escapeHtml(status)}</p>`)}${data.rejectionReason ? `<p style="margin:0">Reason: ${escapeHtml(data.rejectionReason)}</p>` : ""}`, { preheader: `Your ${data.documentType || "document"} status is ${status}.` }),
    };
  }
  if (template === "payout") {
    const title = "Payout completed";
    return {
      subject: title,
      text: `Your payout of CHF ${data.amount} for the lesson on ${data.lessonDate} has been completed.`,
      html: shell(title, `<p style="margin:0 0 16px">Your instructor payout has been completed successfully.</p>${infoCard(`<p style="margin:0;color:${COLORS.muted};font-size:12px;text-transform:uppercase;letter-spacing:.6px">Payout amount</p><p style="margin:6px 0 0;color:${COLORS.navy};font-weight:800;font-size:24px">CHF ${escapeHtml(data.amount)}</p><p style="margin:8px 0 0;color:${COLORS.muted};font-size:13px">Lesson date: ${formatDate(data.lessonDate)}</p>`)}`, { preheader: `Your CHF ${data.amount} DSP payout is complete.` }),
    };
  }
  if (template === "contact_admin") {
    const title = "New contact form submission";
    return {
      subject: title,
      text: `From: ${data.name} <${data.email}>\n\n${data.description}`,
      html: shell(title, `<p style="margin:0 0 16px"><strong>From:</strong> ${escapeHtml(data.name)} &lt;${escapeHtml(data.email)}&gt;</p>${infoCard(`<p style="margin:0;white-space:pre-line">${escapeHtml(data.description)}</p>`)}`),
    };
  }
  if (template === "contact_confirmation") {
    return {
      subject: "We received your message",
      text: `Thanks ${data.name}. We received your message and will respond soon.`,
      html: shell("Thanks for contacting us", `<p style="margin:0 0 16px">Thanks ${escapeHtml(data.name)} — your message reached the DSP team.</p><p style="margin:0">We’ll review it and respond as soon as possible.</p>`, { preheader: "The DSP team received your message." }),
    };
  }
  if (template === "custom") {
    const subject = safeSubject(data.subject);
    return {
      subject,
      text: String(data.text || ""),
      html: shell(subject, `<p style="margin:0;white-space:pre-line">${escapeHtml(data.text || "")}</p>`),
    };
  }
  throw Object.assign(new Error(`Unknown email template: ${template}`), { code: "EMAIL_TEMPLATE_INVALID", retryable: false });
}

module.exports = { escapeHtml, renderEmailTemplate };
