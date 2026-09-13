const test = require("node:test");
const assert = require("node:assert/strict");
const { escapeHtml, renderEmailTemplate } = require("./emailTemplates");

test("template rendering escapes user-controlled content in HTML", () => {
  const rendered = renderEmailTemplate("booking", {
    recipientName: "<script>alert(1)</script>",
    instructorName: 'Instructor "A" & Co.',
    reason: "<img src=x onerror=alert(1)>",
    actionUrl: "https://evil.example/dashboard?name=one&next=two",
  });

  assert.match(rendered.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(rendered.html, /<script>/);
  assert.doesNotMatch(rendered.html, /evil\.example/);
  assert.match(rendered.html, /&amp;/);
  assert.equal(escapeHtml("'quotes'"), "&#39;quotes&#39;");
});

test("supported templates return complete provider messages", () => {
  for (const [template, data] of [
    ["otp", { otp: "123456", type: "email_verification" }],
    ["welcome", { name: "Student" }],
    ["verification", { status: "approved" }],
    ["signup_link", { signupLink: "https://example.com/signup/token" }],
    ["password_reset", { resetUrl: "https://example.com/reset/token" }],
    ["document_status", { documentType: "license", status: "approved" }],
    ["payout", { amount: "75.00", lessonDate: "2026-09-13" }],
    ["contact_confirmation", { name: "Student" }],
  ]) {
    const rendered = renderEmailTemplate(template, data);
    assert.ok(rendered.subject);
    assert.ok(rendered.html);
    assert.ok(rendered.text);
  }
});

test("OTP templates identify and render a six-digit code", () => {
  const rendered = renderEmailTemplate("otp", {
    otp: "081305",
    type: "email_verification",
  });

  assert.match(rendered.text, /6-digit/);
  assert.match(rendered.text, /081305/);
  assert.match(rendered.html, /Your 6-digit verification code/);
  assert.match(rendered.html, /081305/);
});

test("all supported HTML templates use the DSP email shell", () => {
  for (const template of [
    "otp",
    "welcome",
    "verification",
    "signup_link",
    "password_reset",
    "document_status",
    "payout",
    "contact_admin",
    "contact_confirmation",
    "custom",
    "booking",
    "payment_alert",
    "reminder",
    "refund",
  ]) {
    const rendered = renderEmailTemplate(template, {
      otp: "123456",
      type: "email_verification",
      name: "Student",
      recipientName: "Student",
      status: "approved",
      templateTitle: "Booking confirmed",
      signupLink: "https://example.com/signup/token",
      resetUrl: "https://example.com/reset/token",
      actionUrl: "https://example.com/dashboard",
      documentType: "license",
      amount: "75.00",
      lessonDate: "2026-09-13",
      description: "A message",
      subject: "A subject",
      text: "A message",
      slots: [],
    });
    assert.match(rendered.html, /DSP Marketplace/);
    assert.match(rendered.html, /Learn with confidence/);
    assert.match(rendered.html, /automated message from DSP Marketplace/);
  }
});
