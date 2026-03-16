import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Booking } from "../../../types/Student";
import { useMutation } from "@apollo/client";
import { CANCEL_BOOKING } from "../../../graphql/mutations/studentBooking";
import { toast } from "react-hot-toast";
import ConfirmationModal from "../../AdminComponents/ConfirmationModal";

interface DailyProgressTableProps {
  completedBookings: Booking[];
  uncompletedBookings: Booking[];
  selectedTab: "completed" | "uncompleted";
  setSelectedTab: (tab: "completed" | "uncompleted") => void;
}

export const DailyProgressTable: React.FC<DailyProgressTableProps> = ({
  completedBookings,
  uncompletedBookings,
  selectedTab,
  setSelectedTab,
}) => {
  const [cancelBookingSlot, { loading: cancelling }] = useMutation(CANCEL_BOOKING);
  const [cancelTarget, setCancelTarget] = useState<{
    bookingId: string;
    slotId: string;
  } | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const handleCancel = async (bookingId: string, slotId: string) => {
    try {
      await cancelBookingSlot({
        variables: { bookingId, slotId },
        awaitRefetchQueries: true,
        refetchQueries: ["GetStudentDashboardDetails"],
      });
      toast.success("Lesson cancelled successfully.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to cancel lesson.";
      toast.error(message);
    }
  };
  const openCancelModal = (bookingId: string, slotId: string) => {
    setCancelTarget({ bookingId, slotId });
    setIsCancelModalOpen(true);
  };

  const closeCancelModal = () => {
    setIsCancelModalOpen(false);
    setCancelTarget(null);
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    await handleCancel(cancelTarget.bookingId, cancelTarget.slotId);
    closeCancelModal();
  };
  const totalCompletedSlots = completedBookings.reduce(
    (count, booking) => count + (booking.slots?.length || 0),
    0
  );
  const totalUncompletedSlots = uncompletedBookings.reduce(
    (count, booking) => count + (booking.slots?.length || 0),
    0
  );
  console.log("totalUncompletedSlots:", totalUncompletedSlots);
  return (
    <div className=" bg-white rounded-lg shadow-sm p-6 ">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Daily Progress
      </h3>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-4 ">
        <button
          onClick={() => setSelectedTab("completed")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedTab === "completed"
              ? "bg-teal-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Completed ({totalCompletedSlots})
        </button>
        <button
          onClick={() => setSelectedTab("uncompleted")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedTab === "uncompleted"
              ? "bg-teal-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Upcoming Bookings ({totalUncompletedSlots})
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto h-[40vh] overflow-y-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-900">
                Lesson Number
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">
                Date & Time
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">
                Progress
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {(selectedTab === "completed"
              ? completedBookings
              : uncompletedBookings
            ).flatMap((booking) =>
              booking.slots.map((slot, idx) => {
                const formattedDate = new Date(slot.date).toLocaleDateString(
                  "en-GB",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }
                );

                return (
                  <tr
                    key={`${booking._id}-${idx}`}
                    className="border-b border-gray-100"
                  >
                    <td className="py-4 px-4 text-gray-900">
                      Lesson {booking._id.charAt(booking._id.length - 1)}
                    </td>

                    <td className="py-4 px-4 text-gray-600">
                      {formattedDate} {slot.startTime} - {slot.endTime}
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedTab === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {selectedTab === "completed"
                          ? "Completed"
                          : "Upcoming"}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      {selectedTab === "completed" ? (
                        <Link
                          to={`/teacher-dashboard/feedbackForm/${booking._id}/${slot._id}/${booking.studentId._id}`}
                          className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors text-sm font-medium"
                        >
                          {slot.feedBackStatus !== "completed"
                            ? "Give Feedback"
                            : "View Feedback"}
                        </Link>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            className="px-4 py-2 bg-gray-500 text-white rounded-md text-sm font-medium"
                            disabled
                          >
                            Give Feedback
                          </button>
                          <button
                            type="button"
                            className="px-4 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 disabled:opacity-60"
                            onClick={() =>
                              openCancelModal(booking._id, slot._id)
                            }
                            disabled={cancelling}
                          >
                            {cancelling ? "Cancelling..." : "Cancel"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {((selectedTab === "completed" && completedBookings.length === 0) ||
        (selectedTab === "uncompleted" &&
          uncompletedBookings.length === 0)) && (
        <div className="text-center text-gray-500 -mt-40">
          No {selectedTab} lessons found
        </div>
      )}

      <ConfirmationModal
        isOpen={isCancelModalOpen}
        onClose={closeCancelModal}
        onConfirm={confirmCancel}
        title="Cancel upcoming lesson?"
        message="This will cancel the selected upcoming lesson. The student will then be able to request a refund according to the platform policy."
        confirmText={cancelling ? "Cancelling..." : "Yes, cancel lesson"}
        cancelText="Keep lesson"
        variant="danger"
      />
    </div>
  );
};
