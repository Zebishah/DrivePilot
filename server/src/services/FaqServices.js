const { FaqModel } = require("../models/FAQ's");

class FaqService {
  async createFaq(question, answer, adminId) {
    return await FaqModel.create({ question, answer, adminId });
  }

  async getAllFaqs() {
    return await FaqModel.find();
  }

  async getFaqById(id) {
    return await FaqModel.findById(id);
  }

  async getFaqsByAdmin(adminId) {
    return await FaqModel.find({ adminId });
  }

  // New method to get FAQ by question + adminId
  async getFaqByQuestionAndAdmin(question, adminId) {
    return await FaqModel.findOne({ question, adminId });
  }

  async updateFaq(id, data) {
    return await FaqModel.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteFaq(id) {
    return await FaqModel.findByIdAndDelete(id);
  }
}

module.exports = new FaqService();
