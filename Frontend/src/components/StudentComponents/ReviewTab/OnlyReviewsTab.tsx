import React from "react";
import { StudentBookingSlot } from "../../../types/ReviewTypes";
import { useAuth } from "../../../context/AuthContext";
import { useBookingSlots } from "../../../hooks/ReviewSystem";
import { useStudentHoursProgress } from "../../../hooks/UseStudentHourProgress";
import {
  useDeleteReview,
  useInstructorReviews,
} from "../../../hooks/UseReview";
import { useNavigate } from "react-router-dom";
import StudentHoursProgressCard from "./StudentHourPercentage";
import BookingSlotsTable from "./BookingSlotTable";
import { NetworkStatus } from "@apollo/client";

const FeedBackAndRating: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.id || "";

  const {
    bookingSlots,
    loading: slotsLoading,
    refetch: refetchSlots,
  } = useBookingSlots();

  const { hoursProgress, loading: progressLoading } =
    useStudentHoursProgress(studentId);

  const {
    reviews,
    loading: reviewsLoading,
    refetch: refetchReviews,
    networkStatus,
  } = useInstructorReviews(studentId);

  const { deleteReview, loading: deleteLoading } = useDeleteReview();
  const isRefetching = networkStatus === NetworkStatus.refetch;
  const handleAddReview = (
    slot: StudentBookingSlot,
    isFeedbackRating: boolean
  ) => {
    // Navigate to review form page with slot data
    navigate("/student-dashboard/review-form", {
      state: {
        slot,
        isEdit: false,
        isFeedbackRating: isFeedbackRating,
      },
    });
  };

  const handleEditReview = (slot: StudentBookingSlot) => {
    // Navigate to review form page with slot data for editing
    navigate("/student-dashboard/review-form", {
      state: {
        slot,
        isEdit: true,
        isFeedbackRating: true,
      },
    });
  };

  const handleShowReview = (slot: StudentBookingSlot) => {
    // Navigate to review display page with slot data
    navigate("/student-dashboard/review-display", {
      state: {
        slot,
        isFeedbackRating: true,
      },
    });
  };

  const handleDeleteReview = async (slot: StudentBookingSlot) => {
    if (window.confirm("Are you sure you want to delete this review?")) {
      try {
        // You'll need to get the review ID somehow - perhaps from the slot data
        // or make an API call to get the review first
        const reviewId = slot.reviewId; // Assuming reviewId is available in slot

        if (reviewId) {
          await deleteReview({
            variables: { reviewId },
          });

          // Refresh data
          refetchSlots();
          refetchReviews();
        }
      } catch (error) {
        console.error("Error deleting review:", error);
        alert("Failed to delete review. Please try again.");
      }
    }
  };

  if (slotsLoading || progressLoading || reviewsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  console.log("hoursProgress:", hoursProgress);
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-8xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          Feedbacks And Ratings
        </h1>

        {/* Booking Slots Table */}
        <div className="mb-8">
          <BookingSlotsTable
            bookingSlots={bookingSlots}
            onAddReview={handleAddReview}
            onEditReview={handleEditReview}
            onDeleteReview={handleDeleteReview}
            onShowReview={handleShowReview}
            refetchSlots={refetchSlots}
            refetchReviews={refetchReviews}
            isRefetching={isRefetching}
            isFeedbackRating={false}
          />
        </div>
      </div>
    </div>
  );
};

export default FeedBackAndRating;
