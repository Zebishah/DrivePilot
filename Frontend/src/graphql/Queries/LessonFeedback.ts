import { gql } from "@apollo/client";

export const CREATE_FEEDBACK = gql`
  mutation CreateFeedback($input: CreateFeedbackInput!) {
    createFeedback(input: $input) {
      _id
      lessonId
      bookingId
      instructorId
      instructorEmail
      feedbackTags
      hoursRemaining
      message
      createdAt
    }
  }
`;

export const GET_FEEDBACK_BY_LESSON_ID = gql`
  query GetFeedbackByLessonId($lessonId: ID!) {
    getFeedbackByLessonId(lessonId: $lessonId) {
      _id
      lessonId
      instructorId
      instructorEmail
      feedbackTags
      hoursRemaining
      message
      createdAt
    }
  }
`;
export const UPDATE_FEEDBACK = gql`
  mutation UpdateFeedback($input: UpdateFeedbackInput!) {
    updateFeedback(input: $input) {
      _id
      lessonId
      instructorId
      instructorEmail
      feedbackTags
      hoursRemaining
      message
      createdAt
    }
  }
`;

export const DELETE_FEEDBACK = gql`
  mutation DeleteFeedback($feedbackId: ID!) {
    deleteFeedback(feedbackId: $feedbackId)
  }
`;
export const GET_STUDENT_LESSON_HOURS = gql`
  query GetStudentLessonHours($studentId: ID!) {
    getStudentLessonHours(studentId: $studentId) {
      studentId
      name
      lessonHoursLeft
    }
  }
`;

export const GET_STUDENT_FEEDBACKS_LIST = gql`
  query GetStudentFeedbacksList($studentId: ID!) {
    getStudentFeedbacks(studentId: $studentId) {
      _id
      lessonId
      bookingId
      instructorId
      instructorEmail
      instructorName
      instructorProfileImage
      feedbackTags
      hoursRemaining
      message
      createdAt
      updatedAt
    }
  }
`;

export const GET_ALL_FEEDBACKS = gql`
  query GetAllFeedbacks {
    getAllFeedbacks {
      _id
      lessonId
      bookingId
      instructorId
      studentId
      instructorEmail
      feedbackTags
      hoursRemaining
      message
      createdAt
    }
  }
`;
