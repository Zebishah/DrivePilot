import { gql } from "@apollo/client";

export const CREATE_CONTACT_DETAIL = gql`
  mutation CreateContactDetail($supportEmail: String!) {
    createContactDetail(supportEmail: $supportEmail) {
      _id
      supportEmail
      adminId
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_CONTACT_DETAIL = gql`
  mutation UpdateContactDetail($id: ID!, $supportEmail: String) {
    updateContactDetail(id: $id, supportEmail: $supportEmail) {
      _id
      supportEmail
      adminId
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_CONTACT_DETAIL = gql`
  mutation DeleteContactDetail($id: ID!) {
    deleteContactDetail(id: $id) {
      _id
      supportEmail
      adminId
      createdAt
      updatedAt
    }
  }
`;
export const SEND_CONTACT_EMAIL = gql`
  mutation SendContactEmail($input: ContactInput!) {
    sendContactEmail(input: $input) {
      success
      message
    }
  }
`;
