import React, { useState } from "react";
import {
  ArrowLeft,
  Eye,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
} from "lucide-react";
import { StudentBookingSlot } from "../../../types/ReviewTypes";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useBookingSlots } from "../../../hooks/ReviewSystem";
import { useStudentHoursProgress } from "../../../hooks/UseStudentHourProgress";
import {
  useDeleteReview,
  useInstructorReviews,
} from "../../../hooks/UseReview";

interface AllBookingSlotsPageProps {
  bookingSlots: StudentBookingSlot[];
  onAddReview: (slot: StudentBookingSlot) => void;
  onEditReview: (slot: StudentBookingSlot) => void;
  onDeleteReview: (slot: StudentBookingSlot) => void;
  onShowReview: (slot: StudentBookingSlot) => void;
  onGoBack: () => void;
}

const AllBookingSlotsPage: React.FC<AllBookingSlotsPageProps> = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");
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
  } = useInstructorReviews(studentId);

  const { deleteReview, loading: deleteLoading } = useDeleteReview();

  const handleAddReview = (slot: StudentBookingSlot) => {
    // Navigate to review form page with slot data
    navigate("/student-dashboard/review-form", {
      state: {
        slot,
        isEdit: false,
      },
    });
  };
  const onGoBack = () => {
    navigate("/student-dashboard/Feedback");
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
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString: string) => {
    return new Date(`1970-01-01T${timeString}:00`).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (slot: StudentBookingSlot) => {
    if (slot.isCompleted) {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          Completed
        </span>
      );
    }
    return (
      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
        Pending
      </span>
    );
  };

  const getActionButtons = (slot: StudentBookingSlot) => {
    if (!slot.isCompleted) {
      return (
        <button
          onClick={() => handleAddReview(slot)}
          disabled={true}
          className="inline-flex items-center px-3 py-2 text-sm text-white bg-[#999999] rounded-md transition-colors"
        >
          <Plus size={16} className="mr-1" />
          Write review
        </button>
      );
    }

    if (slot.isReviewed) {
      return (
        <div className="flex space-x-2">
          <button
            onClick={() => handleShowReview(slot)}
            className="inline-flex items-center px-3 py-2 text-sm text-[#4DD0E1] bg-blue-50 rounded-md hover:bg-[#81d5ff5e] transition-colors"
          >
            <Eye size={16} className="mr-1" />
            View review
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() => handleAddReview(slot)}
        className="inline-flex items-center px-3 py-2 text-sm text-white bg-[#4DD0E1] rounded-md hover:bg-[#38b5c5] transition-colors"
      >
        <Plus size={16} className="mr-1" />
        Write review
      </button>
    );
  };

  // Filter booking slots based on search and filters
  const filteredSlots = bookingSlots.filter((slot) => {
    const matchesSearch =
      slot.lessonNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slot.instructorName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "completed" && slot.isCompleted) ||
      (statusFilter === "pending" && !slot.isCompleted);

    const matchesReview =
      reviewFilter === "all" ||
      (reviewFilter === "reviewed" && slot.isReviewed) ||
      (reviewFilter === "pending" && !slot.isReviewed);

    return matchesSearch && matchesStatus && matchesReview;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className=" mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onGoBack}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft size={16} className="mr-2" />
                Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                All Booking Slots
              </h1>
            </div>
            <div className="text-sm text-gray-500">
              {filteredSlots.length} of {bookingSlots.length} slots
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search by lesson or instructor..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Filter size={16} className="text-gray-400" />
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={reviewFilter}
                onChange={(e) => setReviewFilter(e.target.value)}
              >
                <option value="all">All Reviews</option>
                <option value="reviewed">Reviewed</option>
                <option value="pending">Review Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lesson
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Instructor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Feedback Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSlots.length > 0 ? (
                  filteredSlots.map((slot) => (
                    <tr
                      key={`${slot.lessonId}-${slot.slotId}`}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {slot.lessonNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {slot.instructorName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar size={14} className="mr-1 text-gray-400" />
                          {formatDate(slot.dateOfBooking)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Clock size={14} className="mr-1 text-gray-400" />
                          {formatTime(slot.slotDetails.startTime)} -{" "}
                          {formatTime(slot.slotDetails.endTime)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(slot)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {slot.isReviewed ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            Reviewed
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {getActionButtons(slot)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <Search
                          size={48}
                          className="mx-auto mb-4 text-gray-300"
                        />
                        <p className="text-lg font-medium">
                          No booking slots found
                        </p>
                        <p className="text-sm">
                          Try adjusting your search criteria
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllBookingSlotsPage;
