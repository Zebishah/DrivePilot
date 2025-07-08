const { gql } = require("apollo-server-express");

const studentTypeDefs = gql`
  type Document {
    documentType: String!
    documentUrl: String!
  }
  interface User {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    role: UserRole
    isProfileComplete: Boolean!
    isUserVerified: Boolean
    isUserAuthenticated: Boolean
    authProvider: AuthProvider!
    createdAt: String!
    updatedAt: String!
  }
  enum status {
    available
    booked
    cancelled
  }
  type Slot {
    date: String!
    startTime: String!
    endTime: String!
    booked: Boolean
    status: status
  }

  type PaymentMethod {
    type: String!
    cardNumber: String
  }

  type StudentLesson {
    _id: ID!
    studentId: ID!
    instructorId: ID!
    slots: [Slot!]!
    totalAmount: Float!
    paymentMethod: PaymentMethod!
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  type LessonBookingHistory {
    lessonBooked: String!
    bookingDate: String!
    payment: Float!
    status: String!
    endDate: String!
  }
  type StudentProfile {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    phone: String
    location: String
    fatherName: String
    description: String
    profileImage: String
    homeAddress: String
    zipCode: String
    documents: [Document!]
    dateOfBirth: String
    languagePreference: [String] # Changed from String to [String]
  }
  type Document {
    documentType: String!
    documentUrl: String!
  }

  type PaymentInfo {
    isPaid: Boolean!
    paymentDate: String
  }
  type LessonStats {
    totalLessons: Int!
    totalLessonDurationInMinutes: Int
    remainingLessonDurationInMinutes: Int
  }
  type Student {
    _id: ID!
    firstName: String!
    lastName: String!
    email: String!
    role: UserRole!
    isProfileComplete: Boolean!
    isUserVerified: Boolean!
    isUserAuthenticated: Boolean!
    authProvider: AuthProvider!
    createdAt: String!
    updatedAt: String!
    homeAddress: String
    location: String
    zipCode: String
    documents: [Document!]
    paymentInfo: PaymentInfo
    description: String
    experience: String
    phone: String
    fatherName: String
    profileImage: String
    dateOfBirth: String
    lessonHoursLeft: String
    languagePreference: [String!]
    lessonStats: LessonStats
  }

  type StudentProgress {
    student: StudentInfo!
    statistics: StudentStatistics!
    chartData: [ChartDataPoint!]!
    bookings: StudentBookings!
  }

  type StudentInfo {
    _id: ID!
    firstName: String!
    lastName: String!
    email: String!
    profileImage: String
    location: String
    description: String
  }

  type StudentStatistics {
    totalBookedLessons: Int!
    totalLessonHours: Float!
    completedLessons: Int!
    upcomingLessons: Int!
  }

  type ChartDataPoint {
    date: String!
    lessons: Int!
  }

  type StudentBookings {
    completed: [BookingDetail!]!
    upcoming: [BookingDetail!]!
  }

  type BookingDetail {
    _id: ID!
    studentId: ID!
    instructorId: InstructorInfo!
    slots: [SlotDetail!]!
    totalAmount: Float!
    totalHours: Float!
    status: String!
    createdAt: String!
    updatedAt: String!
    feedBackStatus: String
    bookerProfileImage: String
  }

  type InstructorInfo {
    _id: ID!
    firstName: String!
    lastName: String!
    email: String!
    description: String
    profileImage: String
  }

  type SlotDetail {
    _id: ID!
    date: String!
    startTime: String!
    endTime: String!
    booked: Boolean
    status: status
  }

  enum SortOrder {
    RECENT_TO_OLDEST
    OLDEST_TO_RECENT
    A_TO_Z_ORDER
    Z_TO_A_ORDER
    REMAINING_HOURS
  }

  input StudentFilter {
    sortBy: SortOrder
    isProfileComplete: Boolean
    isUserVerified: Boolean
    authProvider: String
    location: String
  }

  type StudentHoursInfo {
    studentId: ID!
    name: String!
    lessonHoursLeft: String
  }

  extend type Query {
    me: User
    studentProfile: StudentProfile
    getStudentLessonHours(studentId: ID!): StudentHoursInfo!
    getAllStudents(filter: StudentFilter): [Student!]!
    getStudentProgress(studentId: ID!): StudentProgress!
    getStudentLessons(studentId: ID!): [StudentLesson]
    getStudentLessonHistory(studentId: ID!): [LessonBookingHistory]
  }
`;

module.exports = studentTypeDefs;
