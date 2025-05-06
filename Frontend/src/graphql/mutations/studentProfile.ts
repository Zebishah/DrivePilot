import { gql } from "@apollo/client";

// Query to fetch the teacher's profile
export const GET_STUDENT_PROFILE = gql`
  query GetStudentProfile {
    studentProfile {
      id
      firstName
      lastName
      email
      phone
      location
      description
      homeAddress
      zipCode
      documents {
        documentType
        documentUrl
      }
      fatherName
      dateOfBirth
      languagePreference
      profileImage
    }
  }
`;
