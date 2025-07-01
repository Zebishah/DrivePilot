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

  const { user } = useAuth();
  const { lessonId } = useParams<{ lessonId: string }>();
  const { studentId } = useParams<{ studentId: string }>();

  const navigate = useNavigate();
  const { data, loading: isStudentLoading } = useQuery(
    GET_STUDENT_LESSON_HOURS,
    {
      variables: { studentId },
      skip: !studentId,
      fetchPolicy: "network-only",
    }
  );

  useEffect(() => {
    if (data?.getStudentLessonHours?.lessonHoursLeft) {
      setFormData((prev) => ({
        ...prev,
        hoursRemaining: data.getStudentLessonHours.lessonHoursLeft,
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
    if (formData.skills.length === 0) {
      toast.error("Please select at least one skill");
      return false;
    }
    if (!formData.hoursRemaining.trim()) {
      toast.error("Please enter the number of hours remaining");
      return false;
    }
    if (!formData.pointsToWorkOn.trim()) {
      toast.error("Please enter points to work on for the next lesson");
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!user || !lessonId || !validateForm()) return;

    try {
      const input = {
        lessonId,
        instructorId: user.id,
        instructorEmail: user.email,
        feedbackTags: formData.skills,
        hoursRemaining: formData.hoursRemaining,
        message: formData.pointsToWorkOn,
      };

      await createFeedback({
        variables: { input },
        refetchQueries: [
          { query: GET_FEEDBACK_BY_LESSON_ID, variables: { lessonId } },
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
