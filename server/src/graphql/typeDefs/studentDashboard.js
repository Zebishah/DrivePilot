const { gql } = require("apollo-server-express");

const studentDashboardTypeDefs = gql`
  type DashboardStats {
    totalLessons: Int
    bookedLessons: Int
    cancelledLessons: Int
    semiCancelledLessons: Int
    currentBookings: Int
    totalInstructors: Int
    remainingHours: String
  }

  type SlotLesson {
    lessonId: ID
    instructorId: ID
    instructorName: String
    date: String
    startTime: String
    endTime: String
    slotStatus: String
    isCompleted: Boolean
    isReviewed: Boolean
  }

  type Feedback {
    _id: ID
    lessonId: ID
    instructorId: ID
    studentId: ID
    instructorEmail: String
    feedbackTags: [String]
    hoursRemaining: String
    message: String
    createdAt: String
    updatedAt: String
  }

  type Query {
    getStudentDashboardStats(studentId: ID!): DashboardStats
    getStudentLesson(studentId: ID!): [SlotLesson]
    getStudentFeedbacks(studentId: ID!): [Feedback]
  }
`;
module.exports = studentDashboardTypeDefs;
