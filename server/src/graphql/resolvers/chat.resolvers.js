const { PubSub, withFilter } = require("graphql-subscriptions");
const pubsub = new PubSub();
const MESSAGE_SENT = "MESSAGE_SENT";

const Conversation = require("../../models/Conversation");
const Message = require("../../models/Message");
const StudentBooking = require("../../models/StudentBooking");

const chatResolvers = {
  Query: {
    getConversationsForUser: async (_, { userId }) => {
      const conversations = await Conversation.find({
        participants: userId,
      }).populate({
        path: "participants",
        model: "UserBase",
        select: "_id firstName lastName email role profileImage",
        options: { discriminatorKey: true },
      });

      return conversations;
    },

    getMessages: async (_, { conversationId }) => {
      const messages = await Message.find({ conversationId })
        .sort({ createdAt: 1 })
        .populate({
          path: "sender",
          model: "UserBase",
          select: "_id firstName lastName email role profileImage",
          options: { discriminatorKey: true },
        });

      return messages;
    },
  },

  Mutation: {
    createConversation: async (_, { participantIds }) => {
      const [user1, user2] = participantIds;

      // Check if booking exists between these two users
      const bookingExists = await StudentBooking.findOne({
        $or: [
          { studentId: user1, instructorId: user2 },
          { studentId: user2, instructorId: user1 },
        ],
      });

      if (!bookingExists) {
        throw new Error(
          "Conversation not allowed — no booking found between users."
        );
      }

      let conversation = await Conversation.findOne({
        participants: { $all: participantIds, $size: 2 },
      });

      if (!conversation) {
        conversation = new Conversation({ participants: participantIds });
        await conversation.save();
      }

      return await conversation.populate({
        path: "participants",
        model: "UserBase",
        select: "_id firstName lastName email role profileImage",
        options: { discriminatorKey: true },
      });
    },

    sendMessage: async (_, { conversationId, senderId, content }) => {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: senderId,
      });

      if (!conversation) {
        throw new Error("Sender is not a participant in this conversation.");
      }

      const message = new Message({
        conversationId,
        sender: senderId,
        content,
      });

      await message.save();

      const populatedMessage = await message.populate({
        path: "sender",
        model: "UserBase",
        select: "_id firstName lastName email role profileImage",
        options: { discriminatorKey: true },
      });

      pubsub.publish(MESSAGE_SENT, {
        messageSent: populatedMessage,
      });

      return populatedMessage;
    },
  },

  Subscription: {
    messageSent: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(MESSAGE_SENT),
        (payload, variables) =>
          payload.messageSent.conversationId.toString() ===
          variables.conversationId
      ),
    },
  },

  // User interface resolution using discriminator role
  User: {
    __resolveType(user) {
      if (!user || !user.role) return null;

      switch (user.role) {
        case "Student":
          return "Student";
        case "Instructor":
          return "Instructor";
        case "Admin":
          return "Admin";
        default:
          return null;
      }
    },
  },
};

module.exports = chatResolvers;
