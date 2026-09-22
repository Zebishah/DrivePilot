import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Edit, Trash2, ArrowLeft, CheckCircle, X } from "lucide-react";
import { StudentBookingSlot } from "../../../types/ReviewTypes";
import {
  useDeleteReview,
  useReviewByLessonSlot,
} from "../../../hooks/UseReview";
import DashboardBackLink from "../../../components/dashboard/DashboardBackLink";
import { StarRating } from "./RatingComponent";

const ReviewDisplayPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { slot, showSuccessMessage, isFeedbackRating } = (location.state || {}) as {
    slot?: StudentBookingSlot;
    showSuccessMessage?: boolean;
    isFeedbackRating: boolean;
  };

  const [successVisible, setSuccessVisible] = useState(
    showSuccessMessage || false
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { deleteReview, loading: deleteLoading } = useDeleteReview();
  const {
    review: existingReview,
    loading: reviewLoading,
    refetch: refetchExistingReview,
  } = useReviewByLessonSlot(slot?.lessonId || "", slot?.slotId || "");

  useEffect(() => {
    if (slot) {
      refetchExistingReview();
    }
  }, [slot, refetchExistingReview]);

  useEffect(() => {
    if (successVisible) {
      const timer = setTimeout(() => {
        setSuccessVisible(false);
      }, 5000); // Hide success message after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [successVisible]);

  const handleEdit = () => {
    navigate("/student-dashboard/review-form", {
      state: {
        slot,
        isEdit: true,
      },
    });
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      if (existingReview) {
        await deleteReview({
          variables: { reviewId: existingReview._id },
        });

        // Navigate back to dashboard after successful deletion

        navigate(
          `${isFeedbackRating ? "/student-dashboard/Feedback" : "/student-dashboard/reviews"}`,
          {
            state: {
              message: "Feedback deleted successfully!",
            },
          }
        );
      }
    } catch (error) {
      console.error("Error deleting Feedback:", error);
      alert("Failed to delete Feedback. Please try again.");
    } finally {
      setShowDeleteModal(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
  };

  /**
   * Navigate back to the reviews page.
   */
  const handleBack = () => {
    navigate(
      `${isFeedbackRating ? "/student-dashboard/Feedback" : "/student-dashboard/reviews"}`
    );
  };

  if (!slot) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No slot information available</p>
          <button
            onClick={() =>
              navigate(
                `${isFeedbackRating ? "/student-dashboard/Feedback" : "/student-dashboard/reviews"}`
              )
            }
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (reviewLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Feedback...</p>
        </div>
      </div>
    );
  }

  if (!existingReview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            No Feedback found for this lesson
          </p>
          <div className="space-x-4">
            <button
              onClick={() =>
                navigate("/student-dashboard/review-form", {
                  state: {
                    slot,
                    isEdit: false,
                    isFeedbackRating,
                  },
                })
              }
              className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
            >
              Create Review
            </button>
            <button
              onClick={() =>
                navigate(
                  `${isFeedbackRating ? "/student-dashboard/Feedback" : "/student-dashboard/reviews"}`
                )
              }
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (date: string | number) => {
    const parsedDate = new Date(Number(date));
    return parsedDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="dsp-student-page dsp-student-review-page">
      <div className="dsp-student-page__content">
      <DashboardBackLink to={`${isFeedbackRating ? "/student-dashboard/Feedback" : "/student-dashboard/reviews"}`} label="Back to reviews" />
      <div className=" mx-auto mt-4">
        {/* Success Message */}
        {successVisible && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="text-green-500 mr-2" size={20} />
              <span className="text-green-800">
                Review submitted successfully!
              </span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-xl">
          {/* Header */}

          <div className="flex border-b border-gray-200 justify-between">
            <div className="p-6 ">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  Your review
                </h2>
              </div>
            </div>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <Link
                to={`${isFeedbackRating ? "/student-dashboard/Feedback" : "/student-dashboard/reviews"}`}
                className="inline-flex items-center px-4 py-2 text-sm font-medium bg-[#4DD0E1] text-white rounded-md hover:bg-[#3285af] transition-colors"
              >
                Edit review
                <Edit size={12} className="ml-2" />
              </Link>
            </div>
          </div>

          {/* Instructor Info */}
          <div className="flex w-full justify-between">
            <div className="p-6 ">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  {existingReview?.instructorId?.profileImage ? (
                    <img
                      src={existingReview?.instructorId?.profileImage}
                      alt={existingReview?.instructorId?.profileImage}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-bold text-lg">
                      {existingReview?.instructorName
                        ?.split(" ")
                        ?.map((n) => n[0])
                        .join("")}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {slot.instructorName}
                  </h3>
                  <p className="text-gray-600">Instructor</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4 pr-6">
              <button
                onClick={handleEdit}
                className="text-blue-600 hover:text-blue-800 transition-colors"
                title="Edit Review"
              >
                <Edit size={20} />
              </button>
              <button
                onClick={handleDeleteClick}
                disabled={deleteLoading}
                className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                title="Delete Review"
              >
                <Trash2 size={20} />
              </button>
              <button
                onClick={handleBack}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
            </div>
          </div>

          {/* Review Content */}
          <div className="p-6">
            <div className="border border-gray-200  rounded-lg p-6">
              {/* Star Rating */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Star Rating
                </h3>
                <StarRating
                  rating={existingReview.reviewRating || 0}
                  count={1}
                />
              </div>

              {/* Review Text */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Review
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {existingReview.reviewDescription}
                </p>
              </div>

              {/* Date Info */}
              <div className="mt-4 pt-4 border-gray-200">
                <div className="mt-4 pt-4  border-gray-200">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Posted: {formatDate(existingReview.createdAt)}</span>
                    {existingReview.updatedAt !== existingReview.createdAt && (
                      <span>
                        Updated: {formatDate(existingReview.updatedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex justify-between">
              <button
                onClick={handleBack}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Back to reviews
              </button>
              <div className="space-x-4">
                <button
                  onClick={handleEdit}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                >
                  Edit review
                </button>
                <button
                  onClick={handleDeleteClick}
                  disabled={deleteLoading}
                  className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  {deleteLoading ? "Deleting..." : "Delete review"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Delete review
              </h3>
              <button
                onClick={handleDeleteCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this review? This action cannot be
              undone.
            </p>

            <div className="flex justify-end space-x-4">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default ReviewDisplayPage;
