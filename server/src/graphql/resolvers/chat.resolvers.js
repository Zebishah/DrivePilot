const { PubSub, withFilter } = require("graphql-subscriptions");
const pubsub = new PubSub();
const MESSAGE_SENT = "MESSAGE_SENT";

const Conversation = require("../../models/Conversation");
const Message = require("../../models/Message");
const StudentBooking = require("../../models/StudentBooking");

const chatResolvers = {
  Query: {
    getMessages: async (_, { user1Id, user2Id }) => {
      const chatId = [user1Id, user2Id].sort().join("_");
      return await Message.find({ chatId })
        .sort({ createdAt: 1 })
        .populate("sender")
        .populate("receiver");
    },
  },

  Mutation: {
    sendMessage: async (_, { senderId, receiverId, content }) => {
      const participants = [senderId, receiverId].sort();
      const chatId = participants.join("_");

      const message = await Message.create({
        chatId,
        sender: senderId,
        receiver: receiverId,
        content,
      });

      const populatedMessage = await Message.findById(message._id)
        .populate("sender")
        .populate("receiver");

      console.log("📤 Message sent:", {
        chatId,
        senderId,
        receiverId,
        content,
      });

      console.log("Publishing to MESSAGE_SENT:", {
        messageSent: populatedMessage,
      });
      pubsub.publish(MESSAGE_SENT, {
        MessageSent: populatedMessage,
      });

      return populatedMessage;
    },
  },

  Subscription: {
    messageSent: {
      subscribe: withFilter(
        () => {
          console.log("📡 Subscribed to MESSAGE_SENT");
          return pubsub.asyncIterator(MESSAGE_SENT);
        },
        (payload, variables) => {
          console.log("📦 Payload received in filter:", payload);
          console.log("🔍 Filter vars:", variables);

          const { messageSent } = payload;
          if (!messageSent) return false;

          const participants = [variables.user1Id, variables.user2Id].sort();
          const subscriptionChatId = participants.join("_");
          const payloadChatId = messageSent.chatId;

          const messageMatches = payloadChatId === subscriptionChatId;
          const userInvolved =
            [
              String(messageSent.sender._id),
              String(messageSent.receiver._id),
            ].includes(variables.user1Id) &&
            [
              String(messageSent.sender._id),
              String(messageSent.receiver._id),
            ].includes(variables.user2Id);

          console.log("✅ messageMatches:", messageMatches);
          console.log("✅ userInvolved:", userInvolved);

          return messageMatches && userInvolved;
        }
      ),
      // ✅ Wrap message back into expected format
      resolve: (payload) => ({
        messageSent: payload.messageSent,
      }),
    },
  },
};

module.exports = chatResolvers;
