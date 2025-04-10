const { gql } = require('apollo-server-express');

const studentTypeDefs = gql`
  type StudentProfile {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    phone: String
    location: String
    description: String
    address: String
    zipCode: String
    fatherName: String
    dateOfBirth: String
    languagePreference: String
  }

  extend type Query {
    studentProfile: StudentProfile
  }
`;

module.exports = studentTypeDefs; 