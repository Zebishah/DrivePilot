const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "participantModel", // dynamic model based on role (Student, Instructor, Admin)
        required: true,
      },
    ],
    participantModel: [
      {
        type: String,
        required: true,
        enum: ["Student", "Instructor", "Admin"], // Match your GraphQL schema
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);
