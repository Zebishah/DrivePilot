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
      address
      zipCode
      documents {
        documentType
        documentUrl
      }
      fatherName
      dateOfBirth
      languagePreference
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
      address
      zipCode
      documents {
        documentType
        documentUrl
      }
      fatherName
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
      }
    }
  }
`;