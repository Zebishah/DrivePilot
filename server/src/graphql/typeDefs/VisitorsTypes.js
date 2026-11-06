const { gql } = require("apollo-server-express");

// GraphQL Type Definitions
const VisitorTypeDefs = gql`
  type Visitor {
    id: ID!
    visitorId: String!
    ipAddress: String!
    userAgent: String!
    firstVisit: String!
    lastVisit: String!
    visitCount: Int!
    country: String
    city: String
    device: String
    browser: String
    isUniqueVisitor: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type VisitorStats {
    totalUniqueVisitors: Int!
    totalVisits: Int!
    todayVisitors: Int!
    thisWeekVisitors: Int!
    thisMonthVisitors: Int!
  }

  input VisitorInput {
    ipAddress: String
    userAgent: String!
    country: String
    city: String
    device: String
    browser: String
  }

  type Query {
    getVisitorStats: VisitorStats!
    getAllVisitors(limit: Int, offset: Int): [Visitor!]!
    getVisitorById(visitorId: String!): Visitor
  }

  type Mutation {
    recordVisitor(input: VisitorInput!): Visitor!
  }
`;

module.exports = VisitorTypeDefs;
