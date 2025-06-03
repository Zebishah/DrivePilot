const { gql } = require("apollo-server-express");

const contactDetailTypeDefs = gql`
  type ContactDetail {
    _id: ID
    supportEmail: String
    adminId: ID
    createdAt: String
    updatedAt: String
  }

  input ContactInput {
    name: String
    email: String
    description: String
  }

  type ContactResponse {
    success: Boolean!
    message: String!
  }

  type Query {
    getAllContactDetails: [ContactDetail]
    getMyContactDetail: ContactDetail
  }

  type Mutation {
    createContactDetail(supportEmail: String!): ContactDetail
    updateContactDetail(id: ID!, supportEmail: String): ContactDetail
    deleteContactDetail(id: ID!): ContactDetail
    sendContactEmail(input: ContactInput!): ContactResponse
  }
`;

module.exports = contactDetailTypeDefs;
