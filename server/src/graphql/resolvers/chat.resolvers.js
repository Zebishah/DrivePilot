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

        // Ensure createdAt is an ISO string
        const formattedMessages = messages.map((msg) => ({
          ...msg.toObject(),
          _id: msg._id.toString(),
          createdAt: msg.createdAt.toISOString(),
          sender: {
            ...msg.sender.toObject(),
            _id: msg.sender._id.toString(),
            name: `${msg.sender.firstName} ${msg.sender.lastName}`,
          },
          receiver: {
            ...msg.receiver.toObject(),
            _id: msg.receiver._id.toString(),
            name: `${msg.receiver.firstName} ${msg.receiver.lastName}`,
          },
        }));

        console.log(
          `📥 Fetched messages for conversation ${conversationId}:`,
          formattedMessages.length
        );
        return formattedMessages;
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
          senderModel,
          receiverModel,
          content,
        });

        const populatedMessage = await Message.findById(message._id)
          .populate({ path: "sender", model: senderModel })
          .populate({ path: "receiver", model: receiverModel });

        if (!populatedMessage) {
          throw new Error("Failed to populate message");
        }

        const messagePayload = {
          ...populatedMessage.toObject(),
          _id: populatedMessage._id.toString(),
          createdAt: populatedMessage.createdAt.toISOString(),
          sender: {
            ...populatedMessage.sender.toObject(),
            _id: populatedMessage.sender._id.toString(),
            name: `${populatedMessage.sender.firstName} ${populatedMessage.sender.lastName}`,
          },
          receiver: {
            ...populatedMessage.receiver.toObject(),
            _id: populatedMessage.receiver._id.toString(),
            name: `${populatedMessage.receiver.firstName} ${populatedMessage.receiver.lastName}`,
          },
        };

        console.log("📤 Message sent:", {
          conversationId,
          senderId,
          receiverId,
          senderModel,
          receiverModel,
          content,
          createdAt: messagePayload.createdAt,
        });

        pubsub.publish(MESSAGE_SENT, {
          messageSent: messagePayload,
        });

        return messagePayload;
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
          console.log("📡 Subscribed to MESSAGE_SENT");
          return pubsub.asyncIterator(MESSAGE_SENT);
        },
        (payload, variables) => {
          const { messageSent } = payload;
          if (!messageSent) {
            console.error("❌ Invalid subscription payload:", payload);
            return false;
          }

          const participants = [variables.user1Id, variables.user2Id].sort();
          const subscriptionConversationId = participants.join("_");
          const payloadConversationId = messageSent.conversationId;

          const messageMatches =
            payloadConversationId === subscriptionConversationId;
          const userInvolved =
            [messageSent.sender._id, messageSent.receiver._id].includes(
              variables.user1Id
            ) &&
            [messageSent.sender._id, messageSent.receiver._id].includes(
              variables.user2Id
            );

          console.log(
            `📡 Subscription check: messageMatches=${messageMatches}, userInvolved=${userInvolved}`
          );
          return messageMatches && userInvolved;
        }
      ),
      resolve: (payload) => {
        console.log(
          "📡 Resolving messageSent subscription:",
          payload.messageSent
        );
        return {
          messageSent: {
            ...payload.messageSent,
            createdAt: payload.messageSent.createdAt, // Already ISO string
          },
        };
      },
    },
  },
};

module.exports = chatResolvers;
