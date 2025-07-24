import React, { useState } from "react";
import {
  CreateReviewInput,
  StudentBookingSlot,
  UpdateReviewInput,
} from "../../../types/ReviewTypes";
import { useAuth } from "../../../context/AuthContext";
import { useBookingSlots } from "../../../hooks/ReviewSystem";
import { useStudentHoursProgress } from "../../../hooks/UseStudentHourProgress";
import {
  useCreateReview,
  useDeleteReview,
  useInstructorReviews,
  useReviewByLessonSlot,
  useUpdateReview,
} from "../../../hooks/UseReview";
import { useNavigate } from "react-router-dom";
import ProgressChart from "./ProgressChart";
import StudentHoursProgressCard from "./StudentHourPercentage";
import BookingSlotsTable from "./BookingSlotTable";
import { is } from "date-fns/locale";
import { NetworkStatus } from "@apollo/client";

const Dashboard: React.FC = () => {
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
  const handleAddReview = (slot: StudentBookingSlot) => {
    // Navigate to review form page with slot data
    navigate("/student-dashboard/review-form", {
      state: {
        slot,
        isEdit: false,
      },
    });
  };

  const handleEditReview = (slot: StudentBookingSlot) => {
    // Navigate to review form page with slot data for editing
    navigate("/student-dashboard/review-form", {
      state: {
        slot,
        isEdit: true,
      },
    });
  };

  const handleShowReview = (slot: StudentBookingSlot) => {
    // Navigate to review display page with slot data
    navigate("/student-dashboard/review-display", {
      state: {
        slot,
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-8xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          Learning Dashboard
        </h1>

        {/* Top Section - Chart and Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div>
            {hoursProgress && (
              <ProgressChart
                completedHours={hoursProgress.completedHours}
                remainingHours={hoursProgress.remainingHours}
                totalRequiredHours={hoursProgress.totalRequiredHours}
                studentInfo={hoursProgress.studentInfo}
              />
            )}
          </div>
          <div>
            {hoursProgress && (
              <StudentHoursProgressCard hoursProgress={hoursProgress} />
            )}
          </div>
        </div>

        {/* Booking Slots Table */}
        <div className="mb-8">
          <BookingSlotsTable
            bookingSlots={bookingSlots}
            onAddReview={handleAddReview}
            onEditReview={handleEditReview}
            onDeleteReview={handleDeleteReview}
            onShowReview={handleShowReview}
            refetch={refetchReviews}
            isRefetching={isRefetching}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
