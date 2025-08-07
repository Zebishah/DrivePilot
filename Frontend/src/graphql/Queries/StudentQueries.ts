import { gql } from "@apollo/client";

// ✅ Get all students (optional filter)
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
      lessonHoursLeft
      lessonStats {
        totalLessons
        totalLessonDurationInMinutes
        remainingLessonDurationInMinutes
      }
    }
  }
`;

// ✅ Get dashboard details of a student
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
          booked
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
          booked
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

// ✅ Get all bookings made by the student
export const GET_STUDENT_BOOKINGS = gql`
  query GetStudentBookings {
    getStudentBookings {
      _id
      instructorId {
        _id
        firstName
        lastName
        profileImage
      }
    }
  }
`;

export const GET_ALL_STUDENTS_ADMIN = gql`
  query AllStudentsWithLessonStats {
    allStudentsWithLessonStats {
      id
      firstName
      lastName
      email
      phone
      location
      address
      zipCode
      profileImage
      documents {
        documentType
        documentUrl
      }
      createdAt
      updatedAt
      dateOfBirth
      languagePreference
      isUserVerified
      remainingHours
      lastLesson
      totalLessons
      bookedLessons
      cancelledLessons
    }
  }
`;

export const DELETE_STUDENTS = gql`
  mutation DeleteStudents($studentIds: [ID!]!) {
    deleteStudents(studentIds: $studentIds) {
      success
      message
    }
  }
`;

// ✅ Get only completed bookings by student
export const GET_COMPLETED_STUDENT_BOOKINGS = gql`
  query GetCompletedStudentBookings {
    getCompletedStudentBookings {
      _id
      totalAmount
      finalAmount
      status
      createdAt
      updatedAt
      instructorId {
        _id
        firstName
        lastName
        email
        description
        profileImage
      }
      studentId {
        _id
        firstName
        lastName
        profileImage
      }
      slots {
        id
        date
        startTime
        endTime
        booked
        status
      }
      paymentMethod {
        type
        cardNumber
      }
      feedBackStatus
    }
  }
`;
