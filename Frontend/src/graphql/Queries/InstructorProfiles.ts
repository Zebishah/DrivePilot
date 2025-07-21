import { gql } from "@apollo/client";

export const GET_ALL_INSTRUCTORS = gql`
  query GetAllInstructors {
    allInstructors {
      _id
      firstName
      lastName
      email
      phone
      location
      address
      zipCode
      experience
      description
      gender
      carName
      transmissionType
      isUserVerified
      profileImage
      createdAt
      updatedAt
      documents {
        _id
        documentType
        documentUrl
        status
      }
    }
  }
`;
export const GET_ALL_INSTRUCTORS_DETAILS = gql`
  query GetAllInstructorsDetails {
    allInstructorsWithDetails {
      id
      firstName
      lastName
      email
      phone
      location
      address
      zipCode
      experience
      description
      gender
      carName
      lessonPrice
      studentCount
      transmissionType
      isUserVerified
      profileImage
      createdAt
      updatedAt
      documents {
        _id
        documentType
        documentUrl
        status
      }
    }
  }
`;
export const DELETE_INSTRUCTORS = gql`
  mutation DeleteInstructors($instructorIds: [ID!]!) {
    deleteInstructors(instructorIds: $instructorIds) {
      success
      message
    }
  }
`;
export const GET_TEACHER_PROFILE = gql`
  query GetTeacherProfile($id: ID!) {
    teacherProfile(id: $id) {
      _id
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
        _id
        documentType
        documentUrl
        status
      }
      dateOfBirth
      languagePreference
    }
  }
`;
