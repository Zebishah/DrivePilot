const crypto = require("crypto");
const { enqueueEmailEvent } = require("./outboxService");

function digest(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, 24);
}

class ContactService {
  async sendContactEmail(contactData, supportEmail) {
    if (!supportEmail || !contactData?.email || !contactData?.name || !contactData?.description) {
      throw new Error("Contact data and support email are required.");
    }
    const submissionKey = digest(JSON.stringify({
      name: contactData.name,
      email: contactData.email,
      description: contactData.description,
      minute: Math.floor(Date.now() / 60000),
    }));
    await enqueueEmailEvent({
      eventType: "contact_form_submitted",
      aggregateType: "CONTACT_FORM",
      aggregateId: submissionKey,
      dedupeKey: `contact-admin:${submissionKey}`,
      to: supportEmail,
      template: "contact_admin",
      data: {
        name: String(contactData.name).slice(0, 200),
        email: String(contactData.email).slice(0, 320),
        description: String(contactData.description).slice(0, 10000),
      },
    });
    await enqueueEmailEvent({
      eventType: "contact_form_confirmation",
      aggregateType: "CONTACT_FORM",
      aggregateId: submissionKey,
      dedupeKey: `contact-confirmation:${submissionKey}`,
      to: contactData.email,
      template: "contact_confirmation",
      data: { name: String(contactData.name).slice(0, 200) },
    });
    return { success: true, message: "Your message was queued for delivery." };
  }
}

module.exports = new ContactService();
