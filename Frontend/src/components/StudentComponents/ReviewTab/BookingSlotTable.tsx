import React from "react";

import { Eye, Plus, Edit, Trash2, ExternalLink, RefreshCw } from "lucide-react";
import { StudentBookingSlot } from "../../../types/ReviewTypes";
import { useNavigate } from "react-router-dom";

interface BookingSlotsTableProps {
  bookingSlots: StudentBookingSlot[];
  onAddReview: (slot: StudentBookingSlot, isFeedbackRating: boolean) => void;
  onEditReview: (slot: StudentBookingSlot) => void;
  onDeleteReview: (slot: StudentBookingSlot) => void;
  onShowReview: (slot: StudentBookingSlot) => void;
  onViewAllBookings?: () => void; // New prop for view all functionality
  refetchSlots?: () => void;
  refetchReviews?: () => void;
  isRefetching?: boolean;
  isFeedbackRating?: boolean;
}

const BookingSlotsTable: React.FC<BookingSlotsTableProps> = ({
  bookingSlots,
  onAddReview,
  onEditReview,
  onDeleteReview,
  onShowReview,
  refetchSlots,
  refetchReviews,
  isRefetching,
  isFeedbackRating,
}) => {
  const navigate = useNavigate();
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString: string) => {
    return new Date(`1970-01-01T${timeString}:00`).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const onViewAllBookings = () => {
    // Navigate to review display page with slot data
    navigate("/student-dashboard/allBookingSlots");
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
          onClick={() => onAddReview(slot, isFeedbackRating || false)}
          disabled={true}
          className="inline-flex items-center px-3 py-2 text-sm text-white bg-[#999999] rounded-md transition-colors"
        >
          <Plus size={16} className="mr-1" />
          Add Feedback
        </button>
      );
    }

    if (slot.isReviewed) {
      return (
        <div className="flex space-x-2">
          <button
            onClick={() => onShowReview(slot)}
            className="inline-flex items-center px-3 py-2 text-sm text-[#4DD0E1] bg-blue-50 rounded-md hover:bg-[#81d5ff5e] transition-colors"
          >
            <Eye size={16} className="mr-1" />
            Show Feedback
          </button>
          {/* <button
            onClick={() => onEditReview(slot)}
            className="inline-flex items-center px-3 py-1 text-sm text-yellow-600 bg-yellow-50 rounded-md hover:bg-yellow-100 transition-colors"
          >
            <Edit size={16} className="mr-1" />
            Edit
          </button>
          <button
            onClick={() => onDeleteReview(slot)}
            className="inline-flex items-center px-3 py-1 text-sm text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
          >
            <Trash2 size={16} className="mr-1" />
            Delete
          </button> */}
        </div>
      );
    }

    return (
      <button
        onClick={() => onAddReview(slot, isFeedbackRating || false)}
        className="inline-flex items-center px-3 py-2 text-sm text-white bg-[#4DD0E1] rounded-md hover:bg-[#38b5c5] transition-colors"
      >
        <Plus size={16} className="mr-1" />
        Add Feedback
      </button>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Booking Slots</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (refetchSlots) refetchSlots();
              if (refetchReviews) refetchReviews();
            }}
            title="Refresh Students"
            disabled={isRefetching}
            className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md shadow-sm text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRefetching ? (
              <svg
                className="animate-spin w-4 h-4 mr-2 text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4l4-4-4-4v4a8 8 0 00-8 8z"
                ></path>
              </svg>
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {isRefetching ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={onViewAllBookings}
            className="inline-flex items-center px-4 py-2 text-sm font-medium bg-[#4DD0E1] text-white rounded-md hover:bg-[#3285af] transition-colors"
          >
            View All
            <ExternalLink size={16} className="ml-2" />
          </button>
        </div>
      </div>
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
                Slot Status
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
            {bookingSlots.map((slot) => (
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
                  <div className="text-sm text-gray-900">
                    {formatDate(slot.dateOfBooking)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BookingSlotsTable;
