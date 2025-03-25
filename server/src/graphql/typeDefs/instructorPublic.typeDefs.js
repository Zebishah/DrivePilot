// src/graphql/typeDefs/instructor.typeDefs.js
const { gql } = require("apollo-server-express");

const instructorTypeDefs = gql`
  type InstructorDetails {
    degree: String
    car: String
    type: String
    rate: String
  }

  type Instructor {
    _id: ID!
    firstName: String!
    lastName: String!
    email: String!
    location: String
    address: String
    description: String
    experience: String
    phone: String
    rating: Float
    imageUrl: String
    coordinates: [Float]
    details: InstructorDetails
  }

  type InstructorPaginationResult {
    instructors: [Instructor!]!
    totalCount: Int!
    hasMore: Boolean!
  }

  input InstructorFilterInput {
    city: String
    priceMin: Float
    priceMax: Float
    transmission: String
    minRating: Float
    areaRadius: Float
    coordinates: [Float]
  }

  type Query {
    getNearbyInstructors(
      filter: InstructorFilterInput
      limit: Int = 5
      offset: Int = 0
    ): InstructorPaginationResult
  }
`;

module.exports = instructorTypeDefs;
