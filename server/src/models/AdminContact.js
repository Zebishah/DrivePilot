const mongoose = require("mongoose");

const contactDetailSchema = new mongoose.Schema(
  {
    supportEmail: { type: String, required: true },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const ContactDetailModel = mongoose.model("ContactDetail", contactDetailSchema);

module.exports = { ContactDetailModel };
