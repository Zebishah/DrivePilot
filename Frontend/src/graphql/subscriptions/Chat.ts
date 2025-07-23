// graphql/subscriptions/Chat.ts
import { gql } from "@apollo/client";

export const NEW_MESSAGE_SUBSCRIPTION = gql`
  subscription MessageSent($conversationId: ID!) {
    messageSent(conversationId: $conversationId) {
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

export const MESSAGE_RECEIVED_SUBSCRIPTION = gql`
  subscription OnMessageReceived($conversationId: ID!) {
    messageReceived(conversationId: $conversationId) {
      _id
      content
      createdAt
      sender {
        _id
        name
        role
      }
    }
  }
`;
