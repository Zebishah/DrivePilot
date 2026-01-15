const { gql } = require("apollo-server-express");

const typeDefs = gql`
  enum TeacherAvailabilityStatus {
    available
    booked
    cancelled
    missed
    completed
    refund
  }

  type TeacherSlot {
    id: ID!
    date: String!
    startTime: String!
    endTime: String!
    booked: Boolean!
    status: TeacherAvailabilityStatus!
  }

  type TeacherAvailability {
    id: ID!
    date: String!
    status: TeacherAvailabilityStatus!
    availableSlots: [TeacherSlot!]!
    slots: [TeacherSlot!]
  }

  input TeacherAvailabilityInput {
    date: String!
    startTime: String!
    endTime: String!
    status: TeacherAvailabilityStatus
  }

  type Query {
    teacherAvailability(month: String!): [TeacherAvailability!]!
  }

  type Mutation {
    addAvailabilitySlot(input: TeacherAvailabilityInput!): TeacherAvailability!
    deleteAvailabilitySlot(id: ID!): Boolean!
  }
`;

module.exports = typeDefs;
