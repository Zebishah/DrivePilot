import { gql } from "@apollo/client";

export const SEND_MESSAGE = gql`
  mutation SendMessage(
    $conversationId: ID!
    $instructorId: ID!
    $content: String!
  ) {
    sendMessage(
      conversationId: $conversationId
      instructorId: $instructorId
      content: $content
    ) {
      _id
      content
      instructor {
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
