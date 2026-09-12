const crypto = require("crypto");
const { ContactDetailModel } = require("../models/AdminContact");
const { enqueueEmailEvent } = require("./outboxService");

function submissionDigest(name, email, description) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ name, email, description }))
    .digest("hex")
    .slice(0, 24);
}

class ContactDetailService {
  async createContactDetail(supportEmail, adminId) {
    return await ContactDetailModel.create({ supportEmail, adminId });
  }

  async getAllContactDetails() {
    return await ContactDetailModel.find();
  }

  async getContactDetailByAdminId(adminId) {
    return await ContactDetailModel.findOne({ adminId });
  }

  async updateContactDetail(id, data) {
    return await ContactDetailModel.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteContactDetail(id) {
    return await ContactDetailModel.findByIdAndDelete(id);
  }
  async submitContactForm(name, email, description) {
    try {
      // Save contact to database
      // const contact = new Contact({
      //   name,
      //   email,
      //   description,
      //   createdAt: new Date(),
      //   updatedAt: new Date(),
      // });

      // const savedContact = await contact.save();

      const submissionKey = submissionDigest(name, email, description);
      await enqueueEmailEvent({
        eventType: "contact_form_submitted",
        aggregateType: "CONTACT_FORM",
        aggregateId: submissionKey,
        dedupeKey: `contact-legacy:${submissionKey}`,
        to: process.env.ADMIN_EMAIL,
        template: "contact_admin",
        data: { name, email, description },
      });

      return {
        success: true,
        message:
          "Contact form submitted successfully! We'll get back to you soon.",
      };
    } catch (error) {
      console.error("Error submitting contact form:", error);
      return {
        success: false,
        message: "Failed to submit contact form. Please try again later.",
      };
    }
  }
}

module.exports = new ContactDetailService();
