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
  enum status {
    available
    booked
    cancelled
  }
  type Slot {
    startTime: String!
    endTime: String!
    date: String!
    booked: Boolean
    status: status
  }

  type HourlySlot {
    id: String!
    startTime: String!
    endTime: String!
    date: String!
    booked: Boolean
    status: status
    originalSlotId: ID
  }

  type InstructorAvailability {
    _id: ID!
    date: String!
    startTime: String!
    endTime: String!
    booked: Boolean # Changed from Boolean to Boolean (nullable)
    status: AvailabilityStatus
    slots: [Slot!]
    hourlySlots: [HourlySlot!]
  }

  enum AvailabilityStatus {
    available
    booked
    cancelled
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
