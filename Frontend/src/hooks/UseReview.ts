import { useMutation, useQuery } from "@apollo/client";
import {
  CREATE_REVIEW,
  DELETE_REVIEW,
  GET_ALL_STUDENT_BOOKING_SLOTS,
  GET_INSTRUCTOR_REVIEWS,
  GET_REVIEW_BY_LESSON_SLOT,
  GET_STUDENT_REVIEWS,
  UPDATE_REVIEW,
} from "../graphql/Queries/ReviewQueries";
import { Review } from "../types/ReviewTypes";
import useAuth from "./useAuth";

export const useInstructorReviews = (instructorId: string) => {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useQuery(GET_INSTRUCTOR_REVIEWS, {
    variables: { instructorId },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const studentId = user?._id || "";
  return {
    reviews: (data?.getInstructorReviews as Review[]) || [],
    loading,
    error,
    refetch,
  };
};

export const useStudentReviews = (studentId: string) => {
  const { data, loading, error, refetch } = useQuery(GET_STUDENT_REVIEWS, {
    variables: { studentId },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  return {
    reviews: (data?.getStudentReviews as Review[]) || [],
    loading,
    error,
    refetch,
  };
};

export const useReviewByLessonSlot = (lessonId: string, slotId: string) => {
  const { data, loading, error, refetch } = useQuery(
    GET_REVIEW_BY_LESSON_SLOT,
    {
      variables: { lessonId, slotId },
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );

  return {
    review: data?.getReviewByLessonSlot as Review,
    loading,
    error,
    refetch,
  };
};

export const useCreateReview = () => {
  const [createReview, { loading, error }] = useMutation(CREATE_REVIEW, {
    refetchQueries: [
      { query: GET_ALL_STUDENT_BOOKING_SLOTS },
      { query: GET_INSTRUCTOR_REVIEWS },
    ],
  });

  return { createReview, loading, error };
};

export const useUpdateReview = () => {
  const [updateReview, { loading, error }] = useMutation(UPDATE_REVIEW, {
    refetchQueries: [
      { query: GET_ALL_STUDENT_BOOKING_SLOTS },
      { query: GET_INSTRUCTOR_REVIEWS },
    ],
  });

  return { updateReview, loading, error };
};

export const useDeleteReview = () => {
  const [deleteReview, { loading, error }] = useMutation(DELETE_REVIEW, {
    refetchQueries: [
      { query: GET_ALL_STUDENT_BOOKING_SLOTS },
      { query: GET_INSTRUCTOR_REVIEWS },
    ],
  });

  return { deleteReview, loading, error };
};
