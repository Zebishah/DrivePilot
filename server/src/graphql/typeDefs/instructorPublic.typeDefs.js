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
    coordinates: Coordinates
    details: InstructorDetails
    carName: String
    transmissionType: String
    gender: String
    availability: [InstructorAvailability!]
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
    gender: [String]
    transmissionType: String
    availableDates: [String!]
  }

  enum AvailabilityStatus {
    available
    booked
    cancelled
  }

  type InstructorAvailability {
    _id: ID!
    date: String!
    startTime: String!
    endTime: String!
    status: AvailabilityStatus
  }

  type InstructorTariff {
    _id: ID!
    lessonFee: Float!
    bulkPackages: [BulkLessonPackage]
    packageDiscount: Float
    discountStartDate: String
    discountEndDate: String
  }

  type BulkLessonPackage {
    lessons: Int!
    cost: Float!
    startDate: String! # ISO date
    endDate: String! # ISO date
  }

  type InstructorPublicProfile {
    instructor: Instructor!
    tariff: InstructorTariff
    availability: [InstructorAvailability!]
  }

  type Query {
    getNearbyInstructors(
      filter: InstructorFilterInput
      offset: Int = 0
    ): InstructorPaginationResult
    getInstructorPublicProfile(id: ID!): InstructorPublicProfile
  }
`;

module.exports = instructorTypeDefs;
