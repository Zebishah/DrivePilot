import { gql } from "@apollo/client";

// Query to fetch the teacher's profile
export const GET_TEACHER_PROFILE = gql`
  query GetTeacherProfile {
    teacherProfile {
      id
      firstName
      lastName
      email
      phone
      location
      experience
      description
      profileImage
      address
      zipCode
      documents {
        documentType
        documentUrl
        status
        createdAt
      }
      reviewRating
      reviewsCount
      dateOfBirth
      languagePreference
      onboardingStatus
      isActive
      stripeAccount {
        accountId
        chargesEnabled
        payoutsEnabled
        detailsSubmitted
        lastSyncedAt
      }
      stripeFinancialStatus {
        hasDisputes
        payoutsBlocked
        currentlyDueRequirements
        lastWebhookSync
      }
    }
  }
`;

export const CREATE_STRIPE_ACCOUNT = gql`
  mutation CreateStripeAccount {
    createStripeAccount {
      success
      message
      onboardingUrl
      onboardingStatus
    }
  }
`;

export const VERIFY_STRIPE_ONBOARDING = gql`
  mutation VerifyStripeOnboarding {
    verifyStripeOnboarding {
      success
      message
      onboardingStatus
      chargesEnabled
      payoutsEnabled
    }
  }
`;

export const REGENERATE_STRIPE_LINK = gql`
  mutation RegenerateStripeLink {
    regenerateStripeLink {
      success
      message
      onboardingUrl
    }
  }
`;

// Mutation to update the teacher's profile
export const UPDATE_TEACHER_PROFILE = gql`
  mutation UpdateTeacherProfile($input: UpdateInstructorProfileInput!) {
    updateTeacherProfile(input: $input) {
      id
      firstName
      lastName
      email
      phone
      location
      experience
      description
      profileImage
      address
      zipCode
      documents {
        documentType
        documentUrl
        status
      }

      dateOfBirth
      languagePreference
    }
  }
`;
export const UPDATE_STUDENT_PROFILE = gql`
  mutation UpdateStudentProfile($input: UpdateStudentProfileInput!) {
    updateStudentProfile(input: $input) {
      id
      firstName
      lastName
      email
      location
      phone
      homeAddress
      zipCode
      fatherName
      description
      profileImage
      documents {
        documentType
        documentUrl
      }
      dateOfBirth
      languagePreference
    }
  }
`;
// Mutation to update documents
export const UPDATE_TEACHER_DOCUMENTS = gql`
  mutation UpdateTeacherDocuments($documents: [DocumentInput!]!) {
    updateTeacherProfile(input: { documents: $documents }) {
      documents {
        documentType
        documentUrl
        status
      }
    }
  }
`;
export const GET_STUDENT_LESSON_HISTORY = gql`
  query GetStudentLessonHistory($studentId: ID!) {
    getStudentLessonHistory(studentId: $studentId) {
      lessonBooked
      bookingDate
      payment
      FinalPrice
      status
      endDate
      startTime
      instructorName
      endTime
      slotStatus
      bookingStatus
      instructorId
      slotId
      bookingId
    }
  }
`;
