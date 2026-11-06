const { gql } = require("apollo-server-express");

module.exports = gql`
  type NotificationItem {
    id: ID!
    type: String!
    title: String!
    body: String!
    entityType: String
    entityId: ID
    readAt: String
    createdAt: String!
  }

  type NotificationPreferences {
    bookingUpdates: Boolean!
    lessonReminders: Boolean!
    messages: Boolean!
    paymentUpdates: Boolean!
    feedbackNotifications: Boolean!
    emailNotifications: Boolean!
    reviews: Boolean!
    documentStatus: Boolean!
  }

  input NotificationPreferencesInput {
    bookingUpdates: Boolean
    lessonReminders: Boolean
    messages: Boolean
    paymentUpdates: Boolean
    feedbackNotifications: Boolean
    emailNotifications: Boolean
    reviews: Boolean
    documentStatus: Boolean
  }

  type FavoriteInstructor {
    id: ID!
    createdAt: String!
    instructor: Instructor!
  }

  type BookingEventItem {
    id: ID!
    bookingId: ID!
    slotId: ID
    eventType: String!
    actorId: ID
    actorRole: String
    fromState: String
    toState: String
    occurredAt: String!
  }

  type StudentLearningTimelineItem {
    id: ID!
    bookingId: ID!
    eventType: String!
    title: String!
    actorRole: String
    fromState: String
    toState: String
    slotDate: String
    startTime: String
    endTime: String
    occurredAt: String!
  }

  type InstructorStudentDetail {
    student: StudentInfo!
    totalLessons: Int!
    completedLessons: Int!
    upcomingLessons: Int!
    historyBookings: [StudentBooking!]!
  }

  extend type Query {
    notifications(limit: Int, unreadOnly: Boolean): [NotificationItem!]!
    unreadNotificationCount: Int!
    notificationPreferences: NotificationPreferences!
    favoriteInstructors: [FavoriteInstructor!]!
    isInstructorFavorite(instructorId: ID!): Boolean!
    getBookingDetail(bookingId: ID!): StudentBooking!
    getBookingTimeline(bookingId: ID!): [BookingEventItem!]!
    getStudentLearningTimeline(limit: Int): [StudentLearningTimelineItem!]!
    getInstructorStudentDetail(studentId: ID!): InstructorStudentDetail!
  }

  extend type Mutation {
    markNotificationRead(notificationId: ID!): NotificationItem!
    markAllNotificationsRead: Int!
    saveInstructor(instructorId: ID!): FavoriteInstructor!
    unsaveInstructor(instructorId: ID!): Boolean!
    updateNotificationPreferences(input: NotificationPreferencesInput!): NotificationPreferences!
  }
`;
