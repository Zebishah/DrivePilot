const { gql } = require("apollo-server-express");

const instructorTypeDefs = gql`
  type InstructorDetails {
    degree: String
    car: String
    type: String
    rate: String
  }

  type Slot {
    startTime: String!
    endTime: String!
    date: String!
    booked: Boolean
  }

  type HourlySlot {
    id: String!
    startTime: String!
    endTime: String!
    date: String!
    booked: Boolean
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
    startDate: String!
    endDate: String!
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
