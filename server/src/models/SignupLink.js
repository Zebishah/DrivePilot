const mongoose = require("mongoose");

const signupTokenSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  token: { type: String, required: true, unique: true },
  signupDate: { type: Date, default: Date.now },
  pending: { type: Boolean, default: true },
  signupLink: { type: String, required: true },
});

module.exports = mongoose.model("SignupToken", signupTokenSchema);
