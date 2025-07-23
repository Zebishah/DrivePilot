import { gql } from "@apollo/client";

export const CREATE_CONVERSATION = gql`
  mutation CreateConversation($participantIds: [ID!]!) {
    createConversation(participantIds: $participantIds) {
      _id
      participants {
        _id
        firstName
        lastName
        email
      }
    }
  }
`;

export const SEND_MESSAGE = gql`
  mutation SendMessage(
    $conversationId: ID!
    $senderId: ID!
    $content: String!
  ) {
    sendMessage(
      conversationId: $conversationId
      senderId: $senderId
      content: $content
    ) {
      _id
      content
      sender {
        _id
        firstName
        lastName
      }
      createdAt
    }
  }
`;

export const GET_MESSAGES = gql`
  query GetMessages($conversationId: ID!) {
    getMessages(conversationId: $conversationId) {
      _id
      content
      sender {
        _id
        firstName
        lastName
      }
      createdAt
    }
  }
`;

export const GET_CONVERSATIONS_FOR_USER = gql`
  query GetConversationsForUser($userId: ID!) {
    getConversationsForUser(userId: $userId) {
      _id
      participants {
        _id
        firstName
        lastName
        email
      }
    }
  }
`;

export const MESSAGE_SENT_SUBSCRIPTION = gql`
  subscription MessageSent($conversationId: ID!) {
    messageSent(conversationId: $conversationId) {
      _id
      content
      sender {
        _id
        firstName
        lastName
      }
      createdAt
    }
  }
`;

export const NEW_MESSAGE_SUBSCRIPTION = gql`
  subscription NewMessage($conversationId: ID!) {
    messageSent(conversationId: $conversationId) {
      _id
      content
      sender {
        _id
        firstName
        lastName
      }
      createdAt
    }
  }
`;
