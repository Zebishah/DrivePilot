const { ContactDetailModel } = require("../models/AdminContact");

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

      // Send email notification
      await EmailService.sendContactFormEmail({
        name,
        email,
        description,
        submittedAt: new Date(),
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
