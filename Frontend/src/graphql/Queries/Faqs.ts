import { gql } from "@apollo/client";

export const GET_ALL_FAQS = gql`
  query GetAllFaqs {
    getAllFaqs {
      _id
      question
      answer
      adminId
      createdAt
      updatedAt
    }
  }
`;

export const GET_FAQS_BY_ADMIN = gql`
  query GetFaqsByAdmin($adminId: ID!) {
    getFaqsByAdmin(adminId: $adminId) {
      _id
      question
      answer
      adminId
      createdAt
      updatedAt
    }
  }
`;

export const GET_FAQ_BY_ID = gql`
  query GetFaqById($id: ID!) {
    getFaqById(id: $id) {
      _id
      question
      answer
      adminId
      createdAt
      updatedAt
    }
  }
`;
