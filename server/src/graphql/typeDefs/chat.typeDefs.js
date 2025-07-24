const { gql } = require("apollo-server-express");

const chatTypeDefs = gql`
  interface User {
    firstName: String!
    lastName: String!
    email: String!
    role: UserRole
    profileImage: String
  }

  type Student implements User {
    _id: ID!
    firstName: String!
    lastName: String!
    email: String!
    role: UserRole
    profileImage: String
    location: String
    experience: String
    lessonHoursLeft: String
  }

  type Instructor implements User {
    _id: ID!
    firstName: String!
    lastName: String!
    email: String!
    role: UserRole
    profileImage: String
    location: String
    experience: String
    carName: String
    transmissionType: String
  }

  type Admin implements User {
    _id: ID!
    firstName: String!
    lastName: String!
    email: String!
    role: UserRole
    profileImage: String
    adminLevel: String
  }

  type Conversation {
    _id: ID!
    participants: [User!]!
    createdAt: String!
  }

  type Message {
    _id: ID!
    content: String!
    sender: User!
    receiver: User!
    conversationId: ID!
    createdAt: String!
  }

  type Query {
    getConversationsForUser(userId: ID!): [Conversation!]!
    getMessages(conversationId: ID!): [Message!]!
  }

  type Mutation {
    createConversation(participantIds: [ID!]!): Conversation!
    sendMessage(
      conversationId: ID!
      senderId: ID!
      receiverId: ID!
      content: String!
    ): Message!
  }

  type Subscription {
    messageSent(conversationId: ID!, receiverId: ID!): Message!
  }
`;

module.exports = chatTypeDefs;
