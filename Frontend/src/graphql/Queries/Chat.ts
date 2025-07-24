import { gql } from "@apollo/client";

export const GET_MESSAGES = gql`
  query GetMessages($conversationId: ID!, $senderId: ID!) {
    getMessages(conversationId: $conversationId, senderId: $senderId) {
      _id
      content
      conversationId
      createdAt
      sender {
        __typename
        ... on Student {
          _id
          firstName
          lastName
          email
          profileImage
          role
        }
        ... on Instructor {
          _id
          firstName
          lastName
          email
          profileImage
          role
        }
      }
      receiver {
        __typename
        ... on Student {
          _id
          firstName
          lastName
          email
          profileImage
          role
        }
        ... on Instructor {
          _id
          firstName
          lastName
          email
          profileImage
          role
        }
      }
    }
  }
`;

export const SEND_MESSAGE = gql`
  mutation SendMessage(
    $conversationId: ID!
    $senderId: ID!
    $receiverId: ID!
    $content: String!
  ) {
    sendMessage(
      conversationId: $conversationId
      senderId: $senderId
      receiverId: $receiverId
      content: $content
    ) {
      _id
      content
      conversationId
      createdAt
      sender {
        __typename
        ... on Student {
          _id
          firstName
          lastName
          email
          profileImage
          role
        }
        ... on Instructor {
          _id
          firstName
          lastName
          email
          profileImage
          role
        }
      }
      receiver {
        __typename
        ... on Student {
          _id
          firstName
          lastName
          email
          profileImage
          role
        }
        ... on Instructor {
          _id
          firstName
          lastName
          email
          profileImage
          role
        }
      }
    }
  }
`;

export const NEW_MESSAGE_SUBSCRIPTION = gql`
  subscription OnMessageSent($conversationId: ID!, $senderId: ID!) {
    messageSent(conversationId: $conversationId, senderId: $senderId) {
      _id
      content
      conversationId
      createdAt
      sender {
        __typename
        ... on Student {
          _id
          firstName
          lastName
          email
          profileImage
          role
        }
        ... on Instructor {
          _id
          firstName
          lastName
          email
          profileImage
          role
        }
      }
      receiver {
        __typename
        ... on Student {
          _id
          firstName
          lastName
          email
          profileImage
          role
        }
        ... on Instructor {
          _id
          firstName
          lastName
          email
          profileImage
          role
        }
      }
    }
  }
`;
