import { gql } from "@apollo/client";

export const CREATE_FEEDBACK = gql`
  mutation CreateFeedback($input: CreateFeedbackInput!) {
    createFeedback(input: $input) {
      _id
      lessonId
      instructorId
      instructorEmail
      feedbackTags
      title
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
      title
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
      title
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
