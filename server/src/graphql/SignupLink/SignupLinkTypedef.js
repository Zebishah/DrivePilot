// import { gql } from "apollo-server-express";
const { gql } = require("apollo-server-express");

const SignupLinkTypedef = gql`
  type SignupLink {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    token: String!
    signupDate: String!
    pending: Boolean!
    signupLink: String
  }

  type SignupToken {
    email: String!
    firstName: String!
    lastName: String!
    token: String!
    signupDate: String!
    pending: Boolean!
    error: String
    id: String
  }

  type DeleteResponse {
    success: Boolean!
    message: String
  }

  type Query {
    getAllSignupLinks: [SignupLink!]!
    getSignupTokenDetails(token: String!): SignupToken
  }

  type Mutation {
    createSignUpLink(
      firstName: String!
      lastName: String!
      email: String!
    ): SignupLink!
    deleteSignUpLink(id: ID!): DeleteResponse!
    updateSignupLinkStatus(id: ID!, pending: Boolean!): SignupLink!
  }
`;

// export default SignupLinkTypedef;
module.exports = SignupLinkTypedef;
