import { gql } from "@apollo/client";

export const GET_CONVERSATIONS_FOR_USER = gql`
  query GetConversationsForUser($userId: ID!) {
    getConversationsForUser(userId: $userId) {
      _id
      participants {
        _id
        name
        email
      }
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
        name
        email
      }
      createdAt
    }
  }
`;
