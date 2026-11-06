import React, { useState } from "react";
import { AlertTriangle, Calendar, Clock, User } from "lucide-react";
import { StudentBooking } from "../../types/AdminBookingShowcase";
import { AdminButton } from "../admin/AdminPrimitives";
import { AdminModal } from "../admin/AdminModal";

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
    <AdminModal open={isOpen} onClose={onClose} title="Cancel lesson" subtitle="This change will update the booking status." size="md" closeOnBackdrop={!isSubmitting} closeOnEscape={!isSubmitting} footer={<><AdminButton variant="secondary" onClick={onClose} disabled={isSubmitting}>Keep lesson</AdminButton><AdminButton variant="danger" onClick={handleSubmit} disabled={!reason.trim() || isSubmitting} icon={AlertTriangle}>{isSubmitting ? "Cancelling..." : "Cancel lesson"}</AdminButton></>}>
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
    </AdminModal>
  );
};

export default CancelBookingModal;
