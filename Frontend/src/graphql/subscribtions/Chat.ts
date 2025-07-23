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
