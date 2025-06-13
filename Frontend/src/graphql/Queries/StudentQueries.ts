import { gql } from "@apollo/client";

export const GET_ALL_STUDENTS = gql`
  query GetAllStudents($filter: StudentFilter) {
    getAllStudents(filter: $filter) {
      _id
      firstName
      lastName
      email
      role
      isProfileComplete
      isUserVerified
      isUserAuthenticated
      authProvider
      createdAt
      updatedAt
      homeAddress
      location
      zipCode
      documents {
        documentType
        documentUrl
      }
      paymentInfo {
        isPaid
        paymentDate
      }
      description
      experience
      phone
      fatherName
      profileImage
      dateOfBirth
      languagePreference

      # ✅ New fields
      lessonStats {
        totalLessons
        totalLessonDurationInMinutes
        remainingLessonDurationInMinutes
      }
    }
  }
`;
// export const GET_STUDENT_DASHBOARD = gql`
//   query GetStudentDashboardDetails($studentId: ID!) {
//     getStudentDashboardDetails(studentId: $studentId) {
//       studentInfo {
//         _id
//         firstName
//         lastName
//         email
//         phone
//         profileImage
//         dateOfBirth
//         fatherName
//         description
//         homeAddress
//         location
//         zipCode
//         languagePreference
//       }
//       lessonStats {
//         totalLessons
//         totalLessonDurationInMinutes
//       }
//       graphStats {
//         date
//         lessonsBooked
//       }
//       completedBookings {
//         _id
//         slots {
//           date
//           startTime
//           endTime
//         }
//         totalAmount
//         createdAt
//         instructorId {
//           firstName
//           lastName
//           profileImage
//         }
//       }
//       uncompletedBookings {
//         _id
//         slots {
//           date
//           startTime
//           endTime
//         }
//         totalAmount
//         createdAt
//         instructorId {
//           firstName
//           lastName
//           profileImage
//         }
//       }
//     }
//   }
// `;
export const GET_STUDENT_DASHBOARD = gql`
  query GetStudentDashboardDetails($studentId: ID!) {
    getStudentDashboardDetails(studentId: $studentId) {
      studentInfo {
        _id
        firstName
        lastName
        email
        phone
        profileImage
        dateOfBirth
        fatherName
        description
        homeAddress
        location
        zipCode
        languagePreference
      }
      lessonStats {
        totalLessons
        totalLessonDurationInMinutes
      }
      graphStats {
        date
        lessonsBooked
      }
      completedBookings {
        _id
        studentId {
          _id
          firstName
          lastName
          email
          description
          profileImage
        }
        instructorId {
          _id
          firstName
          lastName
          email
          description
          profileImage
        }
        slots {
          date
          startTime
          endTime
        }
        totalAmount
        status
        createdAt
        updatedAt
        feedBackStatus
        profileImage
      }
      uncompletedBookings {
        _id
        studentId {
          _id
          firstName
          lastName
          email
          description
          profileImage
        }
        instructorId {
          _id
          firstName
          lastName
          email
          description
          profileImage
        }
        slots {
          date
          startTime
          endTime
        }
        totalAmount
        status
        createdAt
        updatedAt
        feedBackStatus
        profileImage
      }
    }
  }
`;
