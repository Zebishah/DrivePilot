import React, { useState } from "react";
import { X, AlertTriangle, Calendar, Clock, User } from "lucide-react";
import { StudentBooking } from "../../types/AdminBookingShowcase";

interface CancelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  booking: StudentBooking | null;
  slotId: string | null;
}

const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  booking,
  slotId,
}) => {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !booking || !slotId) return null;

  const selectedSlot = booking.slots.find((slot) => slot._id === slotId);
  if (!selectedSlot) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) return;

    setIsSubmitting(true);
    try {
      await onConfirm(reason);
      setReason("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-50 backdrop-blur-sm"
          onClick={onClose}
        />

        <div className="inline-block transform overflow-hidden rounded-xl bg-white text-left align-bottom shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
          <div className="bg-white px-6 pt-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 rounded-full bg-red-100 p-3">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Cancel Lesson
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors duration-150 p-1 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Lesson Details</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Student: {booking.studentId.firstName}{" "}
                    {booking.studentId.lastName}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Instructor: {booking.instructorId.firstName}{" "}
                    {booking.instructorId.lastName}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {formatDate(selectedSlot.date)}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {formatTime(selectedSlot.startTime)} -{" "}
                    {formatTime(selectedSlot.endTime)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label
                htmlFor="cancelReason"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Reason for cancellation *
              </label>
              <textarea
                id="cancelReason"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-150"
                placeholder="Please provide a reason for cancelling this lesson..."
                required
              />
            </div>

            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    <strong>Warning:</strong> This action will cancel the lesson
                    and update the booking status. The student will be notified
                    of the cancellation.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-3 space-y-reverse sm:space-y-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Keep Lesson
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!reason.trim() || isSubmitting}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Cancelling..." : "Cancel Lesson"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelBookingModal;
