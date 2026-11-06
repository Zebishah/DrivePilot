const { gql } = require("apollo-server-express");

const chatTypeDefs = gql`
  enum UserRole {
    STUDENT
    INSTRUCTOR
    ADMIN
  }

  interface User {
    id: ID!
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
    conversationId: String!
    participants: [User!]!
    createdAt: String!
    updatedAt: String!
    lastMessage: Message
  }

  type Message {
    _id: ID!
    content: String!
    sender: User!
    receiver: User!
    conversationId: String!
    createdAt: String!
  }

  type Query {
    getMessages(user1Id: ID!, user2Id: ID!, limit: Int = 50, offset: Int = 0): [Message!]!
    getConversations: [Conversation!]!
  }

  type Mutation {
    sendMessage(
      senderId: ID!
      receiverId: ID!
      content: String!
      senderModel: String!
      receiverModel: String!
    ): Message
    createConversation(
      participant1Id: ID!
      participant2Id: ID!
      participant1Model: String!
      participant2Model: String!
    ): Conversation
  }

  type Subscription {
    messageSent(user1Id: ID!, user2Id: ID!): Message
  }
`;

module.exports = chatTypeDefs;
