const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type AvailabilitySlot {
    id: ID!
    date: String!
    startTime: String!
    endTime: String!
  }

  input AvailabilitySlotInput {
    date: String!
    startTime: String!
    endTime: String!
  }

  type Query {
    teacherAvailability(month: String!): [AvailabilitySlot!]!
  }

  type Mutation {
    addAvailabilitySlot(input: AvailabilitySlotInput!): AvailabilitySlot!
    deleteAvailabilitySlot(id: ID!): Boolean!
  }
`;

module.exports = typeDefs;