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
