const { gql } = require("apollo-server-express");

const chatTypeDefs = gql`
  type Conversation {
    _id: ID!
    participants: [User!]!
    createdAt: String!
  }

  type Message {
    _id: ID!
    content: String!
    createdAt: String!
  }

  type Query {
    getConversationsForUser(userId: ID!): [Conversation!]!
    getMessages(conversationId: ID!): [Message!]!
  }

  type Mutation {
    createConversation(participantIds: [ID!]!): Conversation!
    sendMessage(conversationId: ID!, senderId: ID!, content: String!): Message!
  }

  type Subscription {
    messageSent(conversationId: ID!): Message!
  }
`;

module.exports = chatTypeDefs;
