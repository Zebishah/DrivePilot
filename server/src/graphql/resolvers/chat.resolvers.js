const { PubSub, withFilter } = require("graphql-subscriptions");
const pubsub = new PubSub();

const MESSAGE_SENT = "MESSAGE_SENT";

const Conversation = require("../../models/Conversation");
const Message = require("../../models/Message");
const StudentBooking = require("../../models/StudentBooking");

const chatResolvers = {
  Query: {
    getMessages: async (_, { user1Id, user2Id }) => {
      try {
        const conversationId = [user1Id, user2Id].sort().join("_");

        const messages = await Message.find({ conversationId })
          .sort({ createdAt: 1 })
          .populate("sender")
          .populate("receiver");

        return messages;
      } catch (error) {
        console.error("❌ Error in getMessages:", error.message);
        throw new Error("Failed to fetch messages.");
      }
    },
  },

  Mutation: {
    sendMessage: async (
      _,
      { senderId, receiverId, content, senderModel, receiverModel }
    ) => {
      try {
        const participants = [senderId, receiverId].sort();
        const conversationId = participants.join("_");

        const message = await Message.create({
          conversationId,
          sender: senderId,
          receiver: receiverId,
          senderModel, // ✅ ADD THIS
          receiverModel, // ✅ AND THIS
          content,
        });

        const populatedMessage = await Message.findById(message._id)
          .populate({ path: "sender", model: senderModel })
          .populate({ path: "receiver", model: receiverModel });

        pubsub.publish(MESSAGE_SENT, {
          messageSent: populatedMessage,
        });

        return populatedMessage;
      } catch (error) {
        console.error("❌ Error in sendMessage:", error.message);
        throw new Error("Failed to send message.");
      }
    },
  },

  Subscription: {
    messageSent: {
      subscribe: withFilter(
        () => {
          return pubsub.asyncIterator(MESSAGE_SENT);
        },
        (payload, variables) => {
          const { messageSent } = payload;
          if (!messageSent) return false;

          const participants = [variables.user1Id, variables.user2Id].sort();
          const subscriptionconversationId = participants.join("_");
          const payloadconversationId = messageSent.conversationId;

          const messageMatches =
            payloadconversationId === subscriptionconversationId;
          const userInvolved =
            [
              messageSent.sender._id.toString(),
              messageSent.receiver._id.toString(),
            ].includes(variables.user1Id) &&
            [
              messageSent.sender._id.toString(),
              messageSent.receiver._id.toString(),
            ].includes(variables.user2Id);

          return messageMatches && userInvolved;
        }
      ),
      resolve: (payload) => ({
        messageSent: payload.messageSent,
      }),
    },
  },
};

module.exports = chatResolvers;
