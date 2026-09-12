const crypto = require("crypto");
const { User } = require("../models/User");
const { enqueueEmailEvent } = require("./outboxService");

function digest(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, 24);
}

async function sendTemplateEmail(to, templateName, data) {
  if (templateName !== "passwordReset") {
    throw new Error(`Unsupported email template: ${templateName}`);
  }
  const user = await User.findOne({ email: String(to).trim().toLowerCase() }).select("_id").lean();
  if (!user) throw new Error("Email recipient not found");
  return enqueueEmailEvent({
    eventType: "password_reset",
    aggregateType: "USER",
    aggregateId: user._id,
    dedupeKey: `password-reset:${user._id}:${digest(data)}`,
    to,
    template: "password_reset",
    references: { passwordResetUserId: user._id },
  });
}

async function sendCustomEmail(mailOptions) {
  if (!mailOptions?.to || !mailOptions?.subject || !mailOptions?.html) {
    throw new Error("Email message is incomplete");
  }
  return enqueueEmailEvent({
    eventType: "custom_email",
    aggregateType: "NOTIFICATION",
    aggregateId: digest(`${mailOptions.to}:${mailOptions.subject}`),
    dedupeKey: `custom-email:${digest(JSON.stringify({ to: mailOptions.to, subject: mailOptions.subject, html: mailOptions.html }))}`,
    to: mailOptions.to,
    template: "custom",
    data: { subject: mailOptions.subject, html: mailOptions.html, text: mailOptions.text || "" },
  });
}

module.exports = { sendTemplateEmail, sendCustomEmail };
