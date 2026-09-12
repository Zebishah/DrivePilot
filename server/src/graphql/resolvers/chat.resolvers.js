const { PubSub, withFilter } = require("graphql-subscriptions");
const pubsub = new PubSub();

const MESSAGE_SENT = "MESSAGE_SENT";

const Conversation = require("../../models/Conversation");
const Message = require("../../models/Message");
const StudentBooking = require("../../models/studentBooking.model");
const { User } = require("../../models/User");
const {
  identityId,
  requireAuthenticatedUser,
} = require("../../utils/authorization");

async function requireConversationAccess(user, user1Id, user2Id) {
  const authenticatedUser = requireAuthenticatedUser(user);
  const participantIds = [String(user1Id), String(user2Id)];
  if (
    authenticatedUser.role !== "Admin" &&
    !participantIds.includes(identityId(authenticatedUser))
  ) {
    throw new Error("Not authorized to access this conversation");
  }

  if (authenticatedUser.role === "Admin") return authenticatedUser;

  const [first, second] = participantIds;
  const isParticipantInBooking = await StudentBooking.exists({
    $or: [
      { studentId: first, instructorId: second },
      { studentId: second, instructorId: first },
    ],
    status: { $ne: "cancelled" },
  });
  if (!isParticipantInBooking) {
    throw new Error("Not authorized to access this conversation");
  }
  return authenticatedUser;
}

const chatResolvers = {
  Query: {
    getMessages: async (_, { user1Id, user2Id, limit = 50, offset = 0 }, { user }) => {
      try {
        await requireConversationAccess(user, user1Id, user2Id);
        const conversationId = [user1Id, user2Id].sort().join("_");
        const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
        const safeOffset = Math.max(Number(offset) || 0, 0);

        const messages = await Message.find({ conversationId })
          .sort({ createdAt: -1, _id: -1 })
          .skip(safeOffset)
          .limit(safeLimit)
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

        console.log("[Chat] Messages fetched", formattedMessages.length);
        return formattedMessages.reverse();
      } catch (error) {
        console.error("❌ Error in getMessages:", error.message);
        throw new Error("Failed to fetch messages.");
      }
    },
  },

  Mutation: {
    sendMessage: async (
      _,
      { senderId, receiverId, content, senderModel, receiverModel },
      { user },
    ) => {
      try {
        const authenticatedUser = requireAuthenticatedUser(user);
        if (String(senderId) !== identityId(authenticatedUser)) {
          throw new Error("Sender identity must match the authenticated user");
        }
        if (typeof content !== "string" || content.trim().length === 0) {
          throw new Error("Message content is required");
        }
        if (content.length > 5000) {
          throw new Error("Message content must be 5000 characters or fewer");
        }
        if (senderModel !== authenticatedUser.role) {
          throw new Error("Sender model does not match the authenticated user");
        }
        if (!["Student", "Instructor", "Admin"].includes(receiverModel)) {
          throw new Error("Invalid receiver model");
        }
        const receiver = await User.findById(receiverId).select("role").lean();
        if (!receiver || receiver.role !== receiverModel) {
          throw new Error("Receiver not found");
        }
        await requireConversationAccess(user, senderId, receiverId);
        const participants = [senderId, receiverId].sort();
        const conversationId = participants.join("_");

        const message = await Message.create({
          conversationId,
          sender: senderId,
          receiver: receiverId,
          senderModel,
          receiverModel,
          content: content.trim(),
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

        console.log("[Chat] Message sent");

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
      subscribe: async (_, variables, context, info) => {
        await requireConversationAccess(
          context.user,
          variables.user1Id,
          variables.user2Id,
        );
        return withFilter(
          () => pubsub.asyncIterator(MESSAGE_SENT),
          (payload, filterVariables) => {
          const { messageSent } = payload;
          if (!messageSent) {
            console.error("[Chat] Invalid subscription payload");
            return false;
          }

          const participants = [filterVariables.user1Id, filterVariables.user2Id].sort();
          const subscriptionConversationId = participants.join("_");
          const payloadConversationId = messageSent.conversationId;

          const messageMatches =
            payloadConversationId === subscriptionConversationId;
          const userInvolved =
            [messageSent.sender._id, messageSent.receiver._id].includes(
              filterVariables.user1Id
            ) &&
            [messageSent.sender._id, messageSent.receiver._id].includes(
              filterVariables.user2Id
            );

          return messageMatches && userInvolved;
          },
        )(_, variables, context, info);
      },
      resolve: (payload) => {
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
