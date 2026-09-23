import { gql } from "@apollo/client";

export const GET_ALL_STUDENT_BOOKING_SLOTS = gql`
  query GetAllStudentBookingSlots {
    getAllStudentBookingSlots {
      lessonNumber
      lessonId
      instructorName
      instructorId
      studentId
      dateOfBooking
      slotStatus
      profileImage
      isCompleted
      isReviewed
      slotId
      slotDetails {
        date
        startTime
        endTime
        status
      }
    }
  }
`;
export const GET_INSTRUCTOR_REVIEWS = gql`
  query GetInstructorReviews($instructorId: ID!) {
    getInstructorReviews(instructorId: $instructorId) {
      _id
      reviewStatus
      reviewRating
      reviewDescription
      studentId {
        _id
        firstName
        lastName
        profileImage
      }
      instructorId {
        _id
        firstName
        lastName
        profileImage
      }
      lessonId
      slotId
      createdAt
      updatedAt
    }
  }
`;

export const GET_ALL_REVIEWS = gql`
  query GetAllReviews {
    getAllReviews {
      _id
      reviewStatus
      reviewRating
      reviewDescription
      studentId { _id firstName lastName profileImage }
      instructorId { _id firstName lastName profileImage }
      lessonId
      slotId
      createdAt
      updatedAt
    }
  }
`;

// Get specific review by lesson and slot
export const GET_REVIEW_BY_LESSON_SLOT = gql`
  query GetReviewByLessonSlot($lessonId: ID!, $slotId: String!) {
    getReviewByLessonSlot(lessonId: $lessonId, slotId: $slotId) {
      _id
      reviewStatus
      reviewRating
      reviewDescription
      studentId {
        _id
        firstName
        lastName
        profileImage
      }
      instructorId {
        _id
        firstName
        lastName
        profileImage
      }
      lessonId
      slotId
      createdAt
      updatedAt
    }
  }
`;

// Get all reviews by a specific student
export const GET_STUDENT_REVIEWS = gql`
  query GetStudentReviews($studentId: ID!) {
    getStudentReviews(studentId: $studentId) {
      _id
      reviewStatus
      reviewRating
      reviewDescription
      studentId {
        _id
        firstName
        lastName
        profileImage
      }
      instructorId {
        _id
        firstName
        lastName
        profileImage
      }
      lessonId
      slotId
      createdAt
      updatedAt
    }
  }
`;

// 2. GraphQL Mutations
// Create a new review
export const CREATE_REVIEW = gql`
  mutation CreateReview($input: CreateReviewInput!) {
    createReview(input: $input) {
      _id
      reviewStatus
      reviewRating
      reviewDescription
      studentId {
        _id
        firstName
        lastName
        profileImage
      }
      instructorId {
        _id
        firstName
        lastName
        profileImage
      }
      lessonId
      slotId
      createdAt
      updatedAt
    }
  }
`;

// Update an existing review
export const UPDATE_REVIEW = gql`
  mutation UpdateReview($reviewId: ID!, $input: UpdateReviewInput!) {
    updateReview(reviewId: $reviewId, input: $input) {
      _id
      reviewStatus
      reviewRating
      reviewDescription
      studentId {
        _id
        firstName
        lastName
        profileImage
      }
      instructorId {
        _id
        firstName
        lastName
        profileImage
      }
      lessonId
      slotId
      createdAt
      updatedAt
    }
  }
`;

// Delete a review
export const DELETE_REVIEW = gql`
  mutation DeleteReview($reviewId: ID!) {
    deleteReview(reviewId: $reviewId) {
      success
      message
    }
  }
`;
export const GET_STUDENT_HOURS_PROGRESS = gql`
  query GetStudentHoursProgress($studentId: ID!) {
    getStudentHoursProgress(studentId: $studentId) {
      totalRequiredHours
      completedHours
      remainingHours
      studentInfo {
        _id
        firstName
        lastName
        email
        profileImage
        lessonHoursLeft
      }
      bookingsBreakdown {
        totalBookings
        completedBookings
        pendingBookings
        totalBookedSlots
        completedSlots
        pendingSlots
      }
    }
  }
`;
