import { gql } from "@apollo/client";

export const CREATE_FAQ = gql`
  mutation CreateFaq($question: String!, $answer: String!, $adminId: ID!) {
    createFaq(question: $question, answer: $answer, adminId: $adminId) {
      _id
      question
      answer
      adminId
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_FAQ = gql`
  mutation UpdateFaq($id: ID!, $question: String, $answer: String) {
    updateFaq(id: $id, question: $question, answer: $answer) {
      _id
      question
      answer
      adminId
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_FAQ = gql`
  mutation DeleteFaq($id: ID!) {
    deleteFaq(id: $id) {
      _id
      question
      answer
      adminId
      createdAt
      updatedAt
    }
  }
`;
