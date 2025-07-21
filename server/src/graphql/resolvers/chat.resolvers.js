const { PubSub } = require("graphql-subscriptions");
const pubsub = new PubSub();

const MESSAGE_SENT = "MESSAGE_SENT";

const Conversation = require("../../models/Conversation");
const Message = require("../../models/Message");
const User = require("../../models/User");

const chatResolvers = {
  Query: {
    getConversationsForUser: async (_, { userId }) => {
      return await Conversation.find({ participants: userId }).populate(
        "participants"
      );
    },
    getMessages: async (_, { conversationId }) => {
      return await Message.find({ conversationId }).populate("sender");
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
      subscribe: (_, { conversationId }) => pubsub.asyncIterator(MESSAGE_SENT),
    },
  },
};

module.exports = chatResolvers;
