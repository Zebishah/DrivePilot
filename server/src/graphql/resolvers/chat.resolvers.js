const { PubSub, withFilter } = require("graphql-subscriptions");
const pubsub = new PubSub();
const MESSAGE_SENT = "MESSAGE_SENT";

const Conversation = require("../../models/Conversation");
const Message = require("../../models/Message");
const StudentBooking = require("../../models/StudentBooking");

const chatResolvers = {
  Query: {
    getConversationsForUser: async (_, { userId }) => {
      return await Conversation.find({ participants: userId }).populate({
        path: "participants",
        model: "UserBase",
        select: "_id firstName lastName email role profileImage",
        options: { discriminatorKey: true },
      });
    },

    getMessages: async (_, { conversationId }) => {
      return await Message.find({ conversationId })
        .sort({ createdAt: 1 })
        .populate("sender")
        .populate("receiver");
    },
  },

  Mutation: {
    createConversation: async (_, { participantIds }) => {
      const [user1, user2] = participantIds;

      const bookingExists = await StudentBooking.findOne({
        $or: [
          { studentId: user1, instructorId: user2 },
          { studentId: user2, instructorId: user1 },
        ],
      });

      if (!bookingExists) {
        throw new Error("Conversation not allowed — no booking found.");
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

    sendMessage: async (
      _,
      { conversationId, senderId, receiverId, content }
    ) => {
      const message = await Message.create({
        conversationId,
        sender: senderId,
        receiver: receiverId,
        content,
      });

      const populatedMessage = await Message.findById(message._id)
        .populate("sender")
        .populate("receiver");

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
        (payload, variables) => {
          return (
            payload.messageSent.conversationId.toString() ===
              variables.conversationId &&
            payload.messageSent.receiver._id.toString() === variables.receiverId
          );
        }
      ),
    },
  },
};

module.exports = chatResolvers;
