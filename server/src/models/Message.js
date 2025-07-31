const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      ref: "Conversation", // use ObjectId instead of plain string
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "senderModel", // dynamic referencing
      required: true,
    },
    senderModel: {
      type: String,
      required: true,
      enum: ["Student", "Instructor", "Admin"],
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "receiverModel",
      required: true,
    },
    receiverModel: {
      type: String,
      required: true,
      enum: ["Student", "Instructor", "Admin"],
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
