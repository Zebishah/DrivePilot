import { gql } from "@apollo/client";

export const GET_MESSAGES = gql`
  query GetMessages($user1Id: ID!, $user2Id: ID!) {
    getMessages(user1Id: $user1Id, user2Id: $user2Id) {
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
    $senderId: ID!
    $receiverId: ID!
    $content: String!
    $senderModel: String!
    $receiverModel: String!
  ) {
    sendMessage(
      senderId: $senderId
      receiverId: $receiverId
      content: $content
      senderModel: $senderModel
      receiverModel: $receiverModel
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
  subscription messageSent($user1Id: ID!, $user2Id: ID!) {
    messageSent(user1Id: $user1Id, user2Id: $user2Id) {
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
