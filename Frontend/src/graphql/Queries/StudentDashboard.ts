import { gql } from "@apollo/client";

export const GET_STUDENT_DASHBOARD_STATS = gql`
  query GetStudentDashboardStats($studentId: ID!) {
    getStudentDashboardStats(studentId: $studentId) {
      totalLessons
      bookedLessons
      cancelledLessons
      semiCancelledLessons
      currentBookings
      totalInstructors
      remainingHours
    }
  }
`;

export const GET_STUDENT_LESSONS = gql`
  query GetStudentLesson($studentId: ID!) {
    getStudentLesson(studentId: $studentId) {
      lessonId
      instructorId
      instructorName
      date
      startTime
      endTime
      slotStatus
      isCompleted
      isReviewed
    }
  }
`;

export const GET_STUDENT_FEEDBACKS = gql`
  query GetStudentFeedbacks($studentId: ID!) {
    getStudentFeedbacks(studentId: $studentId) {
      _id
      lessonId
      instructorId
      studentId
      instructorEmail
      feedbackTags
      hoursRemaining
      message
      createdAt
      updatedAt
    }
  }
`;
