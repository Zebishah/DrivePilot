const { PubSub, withFilter } = require("graphql-subscriptions");
const pubsub = new PubSub();

const MESSAGE_SENT = "MESSAGE_SENT";

const Conversation = require("../../models/Conversation");
const Message = require("../../models/Message");

const chatResolvers = {
  Query: {
    getConversationsForUser: async (_, { userId }) => {
      return await Conversation.find({ participants: userId }).populate(
        "participants"
      );
    },

    getMessages: async (_, { conversationId }) => {
      return await Message.find({ conversationId }).sort({ createdAt: 1 });
    },
  },

  Mutation: {
    createConversation: async (_, { participantIds }) => {
      const conversation = new Conversation({
        participants: participantIds,
      });
      await conversation.save();
      return conversation.populate("participants");
    },

    sendMessage: async (_, { conversationId, senderId, content }) => {
      const message = new Message({
        conversationId,
        sender: senderId,
        content,
      });

      await message.save();
      const populatedMessage = await message.populate("sender");

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
};

module.exports = chatResolvers;
