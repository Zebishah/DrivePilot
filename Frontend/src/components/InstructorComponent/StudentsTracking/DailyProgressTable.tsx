import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Booking, Slot } from "../../../types/Student";
import { useMutation } from "@apollo/client";
import { CANCEL_BOOKING } from "../../../graphql/mutations/studentBooking";
import { UPDATE_SLOT_STATUS } from "../../../graphql/mutations/studentBooking";
import { toast } from "react-hot-toast";
import ConfirmationModal from "../../AdminComponents/ConfirmationModal";

type TabType = "upcoming" | "cancelled" | "history";

interface DailyProgressTableProps {
  upcomingBookings: Booking[];
  cancelledBookings: Booking[];
  historyBookings: Booking[];
  selectedTab: TabType;
  setSelectedTab: (tab: TabType) => void;
}

function getSlotEndTime(slot: { date: string; endTime: string }): number {
  return new Date(`${slot.date}T${slot.endTime}:00`).getTime();
}

export const DailyProgressTable: React.FC<DailyProgressTableProps> = ({
  upcomingBookings,
  cancelledBookings,
  historyBookings,
  selectedTab,
  setSelectedTab,
}) => {
  const [cancelBookingSlot, { loading: cancelling }] = useMutation(CANCEL_BOOKING);
  const [updateSlotStatus, { loading: updatingStatus }] = useMutation(UPDATE_SLOT_STATUS, {
    refetchQueries: ["GetStudentDashboardDetails"],
    awaitRefetchQueries: true,
  });
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

  const handleSetStatus = async (
    bookingId: string,
    slotId: string,
    status: "completed" | "missed"
  ) => {
    try {
      await updateSlotStatus({
        variables: {
          input: { bookingId, slotId, status },
        },
        refetchQueries: ["GetStudentDashboardDetails"],
      });
      toast.success(`Lesson marked as ${status}.`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update status.";
      toast.error(message);
    }
  };

  const countUpcoming = upcomingBookings.reduce(
    (acc, b) => acc + (b.slots?.length ?? 0),
    0
  );
  const countCancelled = cancelledBookings.reduce(
    (acc, b) => acc + (b.slots?.length ?? 0),
    0
  );
  const countHistory = historyBookings.reduce(
    (acc, b) => acc + (b.slots?.length ?? 0),
    0
  );

  type Row = { booking: Booking; slot: Slot; index: number };

  const sortedUpcoming = useMemo(() => {
    const rows: Row[] = [];
    upcomingBookings.forEach((booking) =>
      (booking.slots ?? []).forEach((slot, idx) => rows.push({ booking, slot, index: idx }))
    );
    rows.sort((a, b) => getSlotEndTime(b.slot) - getSlotEndTime(a.slot));
    return rows;
  }, [upcomingBookings]);

  const sortedCancelled = useMemo(() => {
    const rows: Row[] = [];
    cancelledBookings.forEach((booking) =>
      (booking.slots ?? []).forEach((slot, idx) => rows.push({ booking, slot, index: idx }))
    );
    rows.sort((a, b) => getSlotEndTime(b.slot) - getSlotEndTime(a.slot));
    return rows;
  }, [cancelledBookings]);

  const sortedHistory = useMemo(() => {
    const rows: Row[] = [];
    historyBookings.forEach((booking) =>
      (booking.slots ?? []).forEach((slot, idx) => rows.push({ booking, slot, index: idx }))
    );
    rows.sort((a, b) => getSlotEndTime(b.slot) - getSlotEndTime(a.slot));
    return rows;
  }, [historyBookings]);

  const formatDate = (slot: { date: string; startTime: string; endTime: string }) => {
    const d = new Date(slot.date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${d} ${slot.startTime} - ${slot.endTime}`;
  };

  // Only slots with status "completed" show as "Completed". Booked = "No Status Set Yet".
  const historyStatusLabel = (status: string) => {
    if (status === "booked") return "No Status Set Yet";
    if (status === "completed") return "Completed";
    if (status === "missed") return "Missed";
    return status;
  };

  const studentId =
    upcomingBookings[0]?.studentId ||
    cancelledBookings[0]?.studentId ||
    historyBookings[0]?.studentId;
  const studentIdStr =
    typeof studentId === "object" && studentId !== null && "_id" in studentId
      ? (studentId as { _id: string })._id
      : String(studentId ?? "");

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Booking Management
      </h3>

      <div className="flex space-x-1 mb-4">
        <button
          onClick={() => setSelectedTab("upcoming")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedTab === "upcoming"
              ? "bg-teal-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Upcoming ({countUpcoming})
        </button>
        <button
          onClick={() => setSelectedTab("cancelled")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedTab === "cancelled"
              ? "bg-teal-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Cancelled ({countCancelled})
        </button>
        <button
          onClick={() => setSelectedTab("history")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedTab === "history"
              ? "bg-teal-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          History ({countHistory})
        </button>
      </div>

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
                {selectedTab === "history" ? "Status" : "Progress"}
              </th>
              {selectedTab === "history" && (
                <>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">
                    Time slot
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">
                    Lesson price (CHF)
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">
                    Final Price (CHF)
                  </th>
                </>
              )}
              <th className="text-left py-3 px-4 font-medium text-gray-900">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {selectedTab === "upcoming" &&
              sortedUpcoming.map(({ booking, slot, index }) => (
                <tr key={`${booking._id}-${index}-${slot._id}`} className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-900">
                    Lesson {String(booking._id).slice(-1)}
                  </td>
                  <td className="py-4 px-4 text-gray-600">
                    {formatDate(slot)}
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Upcoming
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <button
                      type="button"
                      className="px-4 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 disabled:opacity-60"
                      onClick={() => openCancelModal(booking._id, slot._id)}
                      disabled={cancelling}
                    >
                      {cancelling ? "Cancelling..." : "Cancel"}
                    </button>
                  </td>
                </tr>
              ))}

            {selectedTab === "cancelled" &&
              sortedCancelled.map(({ booking, slot, index }) => (
                <tr key={`${booking._id}-${index}-${slot._id}`} className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-900">
                    Lesson {String(booking._id).slice(-1)}
                  </td>
                  <td className="py-4 px-4 text-gray-600">
                    {formatDate(slot)}
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Cancelled
                    </span>
                  </td>
                  <td className="py-4 px-4">—</td>
                </tr>
              ))}

            {selectedTab === "history" &&
              sortedHistory.map(({ booking, slot, index }) => {
                const isNoStatus = slot.status === "booked";
                const slotPrice =
                  slot.chargeAmount != null ? Number(slot.chargeAmount) : null;
                const finalPrice =
                  slot.instructorAmount != null
                    ? Number(slot.instructorAmount)
                    : booking.finalAmount != null && booking.slots?.length
                      ? Number(booking.finalAmount) / booking.slots.length
                      : null;
                return (
                  <tr key={`${booking._id}-${index}-${slot._id}`} className="border-b border-gray-100">
                    <td className="py-4 px-4 text-gray-900">
                      Lesson {String(booking._id).slice(-1)}
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      {formatDate(slot)}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isNoStatus
                            ? "bg-amber-100 text-amber-800"
                            : slot.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {historyStatusLabel(slot.status)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      {slot.startTime} – {slot.endTime}
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      {slotPrice != null ? slotPrice.toFixed(2) : "—"}
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      {finalPrice != null ? finalPrice.toFixed(2) : "—"}
                    </td>
                    <td className="py-4 px-4">
                      {isNoStatus ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="px-3 py-1.5 bg-teal-500 text-white rounded-md text-sm font-medium hover:bg-teal-600 disabled:opacity-60"
                            onClick={() =>
                              handleSetStatus(booking._id, slot._id, "completed")
                            }
                            disabled={updatingStatus}
                          >
                            Completed
                          </button>
                          <button
                            type="button"
                            className="px-3 py-1.5 bg-gray-500 text-white rounded-md text-sm font-medium hover:bg-gray-600 disabled:opacity-60"
                            onClick={() =>
                              handleSetStatus(booking._id, slot._id, "missed")
                            }
                            disabled={updatingStatus}
                          >
                            Missed
                          </button>
                        </div>
                      ) : slot.status === "completed" ? (
                        <Link
                          to={`/teacher-dashboard/feedbackForm/${booking._id}/${slot._id}/${studentIdStr}`}
                          className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors text-sm font-medium"
                        >
                          {slot.feedBackStatus === "completed"
                            ? "View Feedback"
                            : "Give Feedback"}
                        </Link>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {((selectedTab === "upcoming" && countUpcoming === 0) ||
        (selectedTab === "cancelled" && countCancelled === 0) ||
        (selectedTab === "history" && countHistory === 0)) && (
        <div className="text-center text-gray-500 py-8">
          No {selectedTab} lessons found
        </div>
      )}

      <ConfirmationModal
        isOpen={isCancelModalOpen}
        onClose={closeCancelModal}
        onConfirm={confirmCancel}
        title="Cancel upcoming lesson?"
        message="This will cancel the selected upcoming lesson. The student will be notified and may request a refund according to the platform policy."
        confirmText={cancelling ? "Cancelling..." : "Yes, cancel lesson"}
        cancelText="Keep lesson"
        variant="danger"
      />
    </div>
  );
};
