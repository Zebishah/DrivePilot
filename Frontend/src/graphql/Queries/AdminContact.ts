import { gql } from "@apollo/client";

export const GET_ALL_CONTACT_DETAILS = gql`
  query GetAllContactDetails {
    getAllContactDetails {
      _id
      supportEmail
      adminId
      createdAt
      updatedAt
    }
  }
`;

export const GET_MY_CONTACT_DETAIL = gql`
  query GetMyContactDetail {
    getMyContactDetail {
      _id
      supportEmail
      adminId
      createdAt
      updatedAt
    }
  }
`;
