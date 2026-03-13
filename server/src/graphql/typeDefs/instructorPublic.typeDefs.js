const { gql } = require("apollo-server-express");

const instructorTypeDefs = gql`
  type InstructorDetails {
    degree: String
    car: String
    type: String
    rate: String
    discountStartDate: String
    discountEndDate: String
    lessonDiscount: String
  }

  enum AvailabilityStatus {
    available
    booked
    cancelled
    missed
    completed
    refund
  }

  type InstructorAvailability {
    id: ID!
    date: String!
    status: AvailabilityStatus
    availableSlots: [InstructorSlot!]! # ✅ changed from slots → availableSlots
  }

  type InstructorSlot {
    id: ID
    date: String!
    startTime: String!
    endTime: String!
    booked: Boolean
    status: AvailabilityStatus
  }

  type HourlySlot {
    id: ID!
    date: String!
    startTime: String!
    endTime: String!
    booked: Boolean
    status: AvailabilityStatus
    originalSlotId: ID!
  }

  type Instructor {
    _id: ID!
    firstName: String!
    lastName: String!
    email: String!
    location: String
    address: String
    description: String
    averageRating: Float
    totalReviews: String
    reviewsCount: Int
    experience: String
    verificationStatus: String
    phone: String
    rating: Float
    profileImage: String
    languagePreference: [String!]!
    coordinates: Coordinates
    details: InstructorDetails
    carName: String
    transmissionType: String
    gender: String
    availability: [InstructorAvailability!]
    isPaymentReady: Boolean!
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

  type InstructorTariff {
    _id: ID!
    lessonFee: Float!
    bulkPackages: [BulkLessonPackage]
    packageDiscount: Float
    lessonDiscount: Float
    FinalPricePerLesson: Float
    discountStartDate: String
    discountEndDate: String
  }

  type BulkLessonPackage {
    title: String!
    lessons: Int!
    cost: Float!
    packageDiscount: Float!
    PackageEndDate: String
    finalPackagePrice: Float!
    studentSave: Float!
  }

  type InstructorPublicProfile {
    instructor: Instructor!
    averageRating: Float
    reviewsCount: Int
    tariff: InstructorTariff
    availability: [InstructorAvailability!]!
  }

  type InstructorAnalytics {
    totalStudents: Int!
    activeBookings: Int!
    totalEarnings: Float!
    lastBooking: StudentBookingNew
    recentBookings: [StudentBookingNew!]!
    averageLessonsPerStudent: Float!
    cancellationRate: Float!
    attendanceRate: Float!
    instructor: Instructor!
  }

  type StudentBookingNew {
    _id: ID!
    studentId: UserNew
    instructorId: Instructor
    slots: [SlotNew]
    totalAmount: Float
    finalAmount: Float
    status: String
    createdAt: String
    updatedAt: String
    studentTotalLessons: Int
    studentLocation: String
  }

  type SlotNew {
    date: String
    startTime: String
    endTime: String
    booked: Boolean
    review: Boolean
    status: String
  }

  type UserNew {
    _id: ID!
    firstName: String
    lastName: String
    email: String
    profileImage: String
  }

  type Query {
    getNearbyInstructors(
      filter: InstructorFilterInput
      offset: Int = 0
    ): InstructorPaginationResult
    getInstructorAnalytics(instructorId: ID!): InstructorAnalytics!
    getInstructorPublicProfile(id: ID!): InstructorPublicProfile
  }
`;

module.exports = instructorTypeDefs;
