import { gql } from "@apollo/client";

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
        name
        email
      }
      createdAt
    }
  }
`;

export const CREATE_CONVERSATION = gql`
  mutation CreateConversation($participantIds: [ID!]!) {
    createConversation(participantIds: $participantIds) {
      _id
      participants {
        _id
        name
        email
      }
    }
  }
`;
