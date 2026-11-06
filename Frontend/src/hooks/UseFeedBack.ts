import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useAuth } from "../context/AuthContext";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FeedbackData, ViewMode } from "../types/LessonFeedback";
import {
  CREATE_FEEDBACK,
  UPDATE_FEEDBACK,
  DELETE_FEEDBACK,
  GET_FEEDBACK_BY_LESSON_ID,
  GET_STUDENT_LESSON_HOURS,
} from "../graphql/Queries/LessonFeedback";
import { GET_BOOKING_DETAIL } from "../graphql/Queries/productCapabilities";

type ValidationErrors = Partial<Record<"skills" | "hoursRemaining" | "pointsToWorkOn", string>>;

export const useFeedback = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("create");
  const [formData, setFormData] = useState<FeedbackData>({
    skills: [],
    hoursRemaining: "",
    pointsToWorkOn: "",
  });
  const [originalFormData, setOriginalFormData] = useState<FeedbackData | null>(
    null
  );
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const { user } = useAuth();
  const { lessonId } = useParams<{ lessonId: string }>();
  const { bookingId } = useParams<{ bookingId: string }>();
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const {
    data: bookingData,
    loading: bookingLoading,
    error: bookingError,
    refetch: refetchBooking,
  } = useQuery(GET_BOOKING_DETAIL, {
    variables: { bookingId },
    skip: !bookingId,
    fetchPolicy: "network-only",
  });
  const { data, loading: isStudentLoading } = useQuery(
    GET_STUDENT_LESSON_HOURS,
    {
      variables: { studentId },
      skip: !studentId,
      fetchPolicy: "network-only",
    }
  );

  useEffect(() => {
    if (data?.getStudentLessonHours?.lessonHoursLeft !== undefined && data?.getStudentLessonHours?.lessonHoursLeft !== null) {
      setFormData((prev) => ({
        ...prev,
        hoursRemaining: String(data.getStudentLessonHours.lessonHoursLeft),
      }));
    }
  }, [data]);
  // Mutations
  const [createFeedback, { loading: createLoading }] =
    useMutation(CREATE_FEEDBACK);
  const [updateFeedback, { loading: updateLoading }] =
    useMutation(UPDATE_FEEDBACK);
  const [deleteFeedback, { loading: deleteLoading }] =
    useMutation(DELETE_FEEDBACK);

  // Query
  const { loading: feedbackLoading } = useQuery(GET_FEEDBACK_BY_LESSON_ID, {
    variables: { lessonId },
    skip: !lessonId,
    onCompleted: (data) => {
      if (data?.getFeedbackByLessonId) {
        const feedback = data.getFeedbackByLessonId;
        const feedbackFormData = {
          skills: feedback.feedbackTags || [],
          hoursRemaining: formData.hoursRemaining || "",
          pointsToWorkOn: feedback.message || "",
        };

        setOriginalFormData(feedbackFormData);
        setFormData(feedbackFormData);
        setFeedbackId(feedback._id);
        setViewMode("view");
      }
    },
    fetchPolicy: "network-only",
  });

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    if (formData.skills.length === 0) {
      errors.skills = "Select at least one skill practiced in this lesson.";
    }
    if (!formData.hoursRemaining.trim()) {
      errors.hoursRemaining = "Enter the remaining learning hours.";
    } else if (!Number.isFinite(Number(formData.hoursRemaining)) || Number(formData.hoursRemaining) < 0) {
      errors.hoursRemaining = "Enter a valid number of hours (0 or more).";
    }
    if (!formData.pointsToWorkOn.trim()) {
      errors.pointsToWorkOn = "Add guidance for the student's next lesson.";
    }
    setValidationErrors(errors);
    const firstError = Object.values(errors)[0];
    if (firstError) toast.error(firstError);
    return Object.keys(errors).length === 0;
  };

  const clearValidationError = (field: keyof ValidationErrors) => {
    setValidationErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const handleCreate = async () => {
    if (!user || !lessonId || !validateForm()) return;

    try {
      const input = {
        lessonId,
        bookingId,
        instructorId: user.id,
        studentId,
        instructorEmail: user.email,
        feedbackTags: formData.skills,
        hoursRemaining: formData.hoursRemaining,
        message: formData.pointsToWorkOn,
      };

      await createFeedback({
        variables: { input },
        refetchQueries: [
          {
            query: GET_FEEDBACK_BY_LESSON_ID,
            variables: { lessonId, bookingId },
          },
        ],
        awaitRefetchQueries: true,
      });

      toast.success("Feedback submitted successfully!");
      navigate("/teacher-dashboard/feedback");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Error submitting feedback. Please try again.");
    }
  };

  const handleUpdate = async () => {
    if (!feedbackId || !validateForm()) return;

    try {
      const input = {
        feedbackId,
        feedbackTags: formData.skills,
        instructorId: user?.id,
        studentId,
        hoursRemaining: formData.hoursRemaining,
        message: formData.pointsToWorkOn,
      };

      await updateFeedback({
        variables: { input },
        refetchQueries: [
          { query: GET_FEEDBACK_BY_LESSON_ID, variables: { lessonId } },
        ],
        awaitRefetchQueries: true,
      });

      toast.success("Feedback updated successfully!");
      navigate("/teacher-dashboard/feedback");
    } catch (error) {
      console.error("Error updating feedback:", error);
      toast.error("Error updating feedback. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!feedbackId) return;

    try {
      await deleteFeedback({
        variables: { feedbackId },
        refetchQueries: [
          { query: GET_FEEDBACK_BY_LESSON_ID, variables: { lessonId } },
        ],
        awaitRefetchQueries: true,
      });

      toast.success("Feedback deleted successfully!");
      navigate("/teacher-dashboard/feedback");
    } catch (error) {
      console.error("Error deleting feedback:", error);
      toast.error("Error deleting feedback. Please try again.");
    }
  };

  const handleEdit = () => setViewMode("edit");
  const handleCancelEdit = () => {
    if (originalFormData) {
      setFormData(originalFormData);
    }
    setViewMode("view");
  };
  const handleCancel = () => navigate("/teacher-dashboard/feedback");

  return {
    // State
    viewMode,
    formData,
    feedbackId,
    setFormData,
    validationErrors,
    clearValidationError,
    booking: bookingData?.getBookingDetail,
    bookingLoading,
    bookingError,
    refetchBooking,
    isStudentLoading: isStudentLoading,
    // Loading states
    isLoading: feedbackLoading,
    isSubmitting: createLoading || updateLoading,
    isDeleting: deleteLoading,

    // Actions
    handleCreate,
    handleUpdate,
    handleDelete,
    handleEdit,
    handleCancelEdit,
    handleCancel,
    studentId,
  };
};
