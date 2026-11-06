const { gql } = require("apollo-server-express");

// Type definitions
const AdminAnalyticsTypeDefs = gql`
  enum FilterType {
    LAST_WEEK
    THIS_WEEK
    LAST_MONTH
    THIS_MONTH
    LAST_YEAR
    THIS_YEAR
    LAST_6_MONTHS
    CUSTOM
  }

  input AnalyticsFilterInput {
    instructorIds: [ID]
    filterType: FilterType
    fromDate: String # YYYY-MM-DD
    toDate: String # YYYY-MM-DD
  }

  type OverallStats {
    totalRegistrations: Int
    studentRegistrations: Int
    instructorRegistrations: Int
    totalLessonsBooked: Int
    upcomingLessonsBooked: Int
    completedLessonsBooked: Int
    reviewsGiven: Int
    lessonAttendance: Int
    attendanceRate: Float
    averageReservedHoursPerStudent: Float
  }

  type ActiveUserDataPoint {
    time: String
    students: Int
    instructors: Int
  }

  type RevenueDataPoint {
    time: String
    averageRevenue: Float
  }

  type BookingDataPoint {
    time: String
    averageBookings: Float
  }

  type EarningDataPoint {
    time: String
    totalEarnings: Float
  }

  type ConversionDataPoint {
    time: String
    visitors: Int
    registrations: Int
    rate: Float
  }

  type GraphData {
    activeUsers: [ActiveUserDataPoint]
    averageRevenuePerInstructor: [RevenueDataPoint]
    bookingsPerInstructor: [BookingDataPoint]
    totalEarnings: [EarningDataPoint]
    conversionRates: [ConversionDataPoint]
  }

  type AdminAnalytics {
    overallStats: OverallStats
    graphData: GraphData
  }
  type Instructor {
    _id: ID!
    firstName: String!
    lastName: String!
  }

  type Query {
    getAdminAnalytics(filter: AnalyticsFilterInput): AdminAnalytics
    getAllInstructors: [Instructor!]!
  }
`;

module.exports = AdminAnalyticsTypeDefs;
