import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client";
import {
  ChevronDown,
  Calendar,
  Clock,
  DollarSign,
  User,
  X,
  Loader2,
} from "lucide-react";
import {
  CancelBookingInput,
  StudentBooking,
  UpdateBookingStatusInput,
} from "../../types/AdminBookingShowcase";
import { GET_ALL_STUDENT_BOOKINGS } from "../../graphql/Queries/AdminBookingShowcase";
import {
  CANCEL_BOOKING_ADMIN,
  UPDATE_BOOKING_STATUS,
} from "../../graphql/mutations/AdminBookingsShowcase";
import toast from "react-hot-toast";

interface BookingsTableProps {
  className?: string;
}

// Status options (same as instructor: available, booked, completed, refund, cancelled, missed)
const SLOT_STATUS_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "booked", label: "Booked" },
  { value: "completed", label: "Completed" },
  { value: "refund", label: "Refund" },
  { value: "cancelled", label: "Cancelled" },
  { value: "missed", label: "Missed" },
];

// Status Dropdown Component
interface StatusDropdownProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const StatusDropdown: React.FC<StatusDropdownProps> = ({
  currentStatus,
  onStatusChange,
  isOpen,
  onToggle,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onToggle();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onToggle]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className="inline-flex items-center px-2 py-1 text-xs border border-gray-200 rounded-full bg-white hover:bg-gray-50"
      >
        Change status
        <ChevronDown
          className={`ml-1 h-3 w-3 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 rounded-md mt-1 w-36 bg-white border border-gray-200 shadow-lg z-50">
          <div className="py-1">
            {SLOT_STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onStatusChange(option.value)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                  option.value === currentStatus ? "bg-gray-50 font-medium" : ""
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// View Details Modal Component
interface ViewDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: StudentBooking | null;
}

const ViewDetailsModal: React.FC<ViewDetailsModalProps> = ({
  isOpen,
  onClose,
  booking,
}) => {
  if (!isOpen || !booking) return null;

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

        <div className="inline-block transform overflow-hidden rounded-xl bg-white text-left align-bottom shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle">
          <div className="bg-white px-6 pt-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Booking Details
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors duration-150 p-1 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Student Info */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Student Information
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    {booking.studentId.profileImage ? (
                      <img
                        className="h-10 w-10 rounded-full object-cover"
                        src={booking.studentId.profileImage}
                        alt=""
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">
                        {booking.studentId.firstName}{" "}
                        {booking.studentId.lastName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {booking.studentId.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructor Info */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Instructor Information
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    {booking.instructorId.profileImage ? (
                      <img
                        className="h-10 w-10 rounded-full object-cover"
                        src={booking.instructorId.profileImage}
                        alt=""
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-green-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">
                        {booking.instructorId.firstName}{" "}
                        {booking.instructorId.lastName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {booking.instructorId.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lesson Slots */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Lesson Slots</h4>
                <div className="space-y-2">
                  {booking.slots.map((slot) => (
                    <div key={slot._id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {formatDate(slot.date)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {formatTime(slot.startTime)} -{" "}
                              {formatTime(slot.endTime)}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            slot.status === "booked"
                              ? "bg-green-100 text-green-800"
                              : slot.status === "refund"
                                ? "bg-yellow-100 text-yellow-800"
                                : slot.status === "cancelled"
                                  ? "bg-red-100 text-red-800"
                                  : slot.status === "completed"
                                    ? "bg-blue-100 text-blue-800"
                                    : slot.status === "missed"
                                      ? "bg-orange-100 text-orange-800"
                                      : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {slot.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Info */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Payment Information
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">
                      CHF {booking.finalAmount}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Payment Method: {booking.paymentMethod.type}
                  </p>
                  {booking.paymentMethod.cardNumber && (
                    <p className="text-sm text-gray-600">
                      Card: ****{booking.paymentMethod.cardNumber.slice(-4)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
type SpinnerSize = "sm" | "md" | "lg";

const LoadingSpinner = ({ size = "lg" }: { size?: SpinnerSize }) => {
  const sizeClasses: Record<SpinnerSize, string> = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return <Loader2 className={`animate-spin ${sizeClasses[size]}`} />;
};

// Loading Overlay Component
const LoadingOverlay = ({ message = "Processing..." }) => (
  <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 rounded-xl">
    <div className="flex flex-col items-center space-y-3">
      <LoadingSpinner size="lg" />
      <p className="text-sm font-medium text-gray-600">{message}</p>
    </div>
  </div>
);
// Cancel Booking Modal Component
interface CancelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  booking: StudentBooking | null;
  slotId: string | null;
  isLoading?: boolean; // Add this prop
}

const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  booking,
  slotId,
  isLoading = false, // Add this prop with default value
}) => {
  if (!isOpen || !booking || !slotId) return null;

  const selectedSlot = booking.slots.find((slot) => slot._id === slotId);
  if (!selectedSlot) return null;
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-50 backdrop-blur-sm"
          onClick={!isLoading ? onClose : undefined} // Prevent closing when loading
        />

        <div className="inline-block transform overflow-hidden rounded-xl bg-white text-left align-bottom shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:align-middle relative">
          {/* Loading Overlay - use isLoading prop */}
          {isLoading && <LoadingOverlay message="Cancelling booking..." />}

          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 text-center w-full">
                Are You Sure You Want to Cancel This Booking?
              </h3>
              <button
                onClick={onClose}
                disabled={isLoading} // Disable when loading
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-[#5EC2D226] rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-3">Details</h4>

              {/* Payment Method */}
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-5 bg-purple-500 text-white text-xs rounded flex items-center justify-center font-bold">
                  S
                </div>
                <div>
                  <p className="text-sm text-gray-600">Credit card</p>
                  <p className="text-xs text-gray-500">
                    {booking.paymentMethod?.cardNumber
                      ? `**** **** **** ${booking.paymentMethod.cardNumber.slice(
                          -4,
                        )}`
                      : "**** **** **** 0505"}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="text-gray-900">
                    {booking.studentId.firstName} {booking.studentId.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lesson Title:</span>
                  <span className="text-gray-900">
                    Beginner's Driving Course
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">lesson time:</span>
                  <span className="text-gray-900">1 hour</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="text-gray-900">
                    CHF {booking.finalAmount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Start Date:</span>
                  <span className="text-gray-900">
                    {formatDate(selectedSlot.date)}, {selectedSlot.startTime}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">End Date:</span>
                  <span className="text-gray-900">
                    {formatDate(
                      booking.slots[booking.slots.length - 1]?.date ||
                        selectedSlot.date,
                    )}
                    , {selectedSlot.endTime}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  <span className="font-medium">Description:</span> This course
                  covers fundamental driving skills, including both theoretical
                  lessons and practical on-road training.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 flex justify-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading} // Disable when loading
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              No
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading} // Disable when loading
              className="px-6 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading && <LoadingSpinner size="sm" />}
              <span>{isLoading ? "Cancelling..." : "Yes"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Update the RefundConfirmationModal interface and component
interface RefundConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  booking: StudentBooking | null;
  slotId: string | null;
  isLoading?: boolean; // Add this prop
}

const RefundConfirmationModal: React.FC<RefundConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  booking,
  slotId,
  isLoading = false, // Add this prop with default value
}) => {
  if (!isOpen || !booking || !slotId) return null;

  const selectedSlot = booking.slots.find((slot) => slot._id === slotId);
  if (!selectedSlot) return null;
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-50 backdrop-blur-sm"
          onClick={!isLoading ? onClose : undefined} // Prevent closing when loading
        />

        <div className="inline-block transform overflow-hidden rounded-xl bg-white text-left align-bottom shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:align-middle relative">
          {/* Loading Overlay - use isLoading prop */}
          {isLoading && <LoadingOverlay message="Processing refund..." />}

          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 text-center w-full">
                Confirm Refund Processing
              </h3>
              <button
                onClick={onClose}
                disabled={isLoading} // Disable when loading
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    Refund Details
                  </span>
                </div>
                <p className="text-sm text-blue-800">
                  Are you sure you want to process a refund for this booking?
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Student:</span>
                  <span className="text-gray-900">
                    {booking.studentId.firstName} {booking.studentId.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="text-gray-900 font-medium">
                    CHF {booking.finalAmount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lesson Date:</span>
                  <span className="text-gray-900">
                    {formatDate(selectedSlot.date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Instructor:</span>
                  <span className="text-gray-900">
                    {booking.instructorId.firstName}{" "}
                    {booking.instructorId.lastName}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                <span className="font-medium">Note:</span> This action will
                process a refund to the student's original payment method and
                update the booking status.
              </p>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-4 flex justify-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading} // Disable when loading
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading} // Disable when loading
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading && <LoadingSpinner size="sm" />}
              <span>{isLoading ? "Processing..." : "Confirm Refund"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Generic confirm status change modal (for any slot status: completed, missed, cancelled, etc.)
interface StatusChangeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  statusLabel: string;
  isLoading?: boolean;
}

const StatusChangeConfirmModal: React.FC<StatusChangeConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  statusLabel,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-50 backdrop-blur-sm"
          onClick={!isLoading ? onClose : undefined}
        />
        <div className="inline-block transform overflow-hidden rounded-xl bg-white text-left align-bottom shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:align-middle relative">
          {isLoading && <LoadingOverlay message="Updating status..." />}
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Confirm status change
              </h3>
              <button
                onClick={onClose}
                disabled={isLoading}
                className="text-gray-400 hover:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Are you sure you want to change the slot status to{" "}
              <span className="font-semibold text-gray-900">{statusLabel}</span>
              ? This will update the booking and notify relevant parties.
            </p>
          </div>
          <div className="bg-gray-50 px-6 py-4 flex justify-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="px-6 py-2 text-sm font-medium text-white bg-[#5FC2D3] border border-transparent rounded-md hover:bg-[#3c8e9c] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading && <LoadingSpinner size="sm" />}
              <span>{isLoading ? "Updating..." : "Confirm"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component
const StudentBookingTable: React.FC<BookingsTableProps> = ({
  className = "",
}) => {
  const [selectedBooking, setSelectedBooking] = useState<StudentBooking | null>(
    null,
  );
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<string | null>(
    null,
  );
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  // Add these loading states
  const [isCancelling, setIsCancelling] = useState(false);
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const { data, loading, error, refetch } = useQuery(GET_ALL_STUDENT_BOOKINGS, {
    fetchPolicy: "cache-and-network",
  });

  const [updateBookingStatus] = useMutation(UPDATE_BOOKING_STATUS, {
    onCompleted: () => {
      refetch();
      setShowConfirmModal(false);
      setShowRefundModal(false);
      setSelectedBooking(null);
      setSelectedSlotId(null);
      setPendingStatusChange(null);
      setIsProcessingRefund(false); // Reset loading state
      toast.success("Booking status changed successfully");
      setActiveDropdown(null);
    },
    onError: (error) => {
      const message =
        error.graphQLErrors?.[0]?.message ||
        error.message ||
        "Error updating booking status";
      toast.error(message);
      setShowRefundModal(false);
      setShowConfirmModal(false);
      setIsProcessingRefund(false); // Reset loading state
    },
  });

  const [cancelBookingAdmin] = useMutation(CANCEL_BOOKING_ADMIN, {
    onCompleted: () => {
      refetch();
      setShowCancelModal(false);
      setSelectedBooking(null);
      setSelectedSlotId(null);
      setActiveDropdown(null);
      setIsCancelling(false); // Reset loading state
      toast.success("Booking cancelled successfully");
    },
    onError: (error) => {
      toast.error(error.message);
      console.error("Error cancelling booking:", error);
      setShowCancelModal(false);
      setIsCancelling(false); // Reset loading state
    },
  });

  const handleStatusChange = (
    booking: StudentBooking,
    slotId: string,
    newStatus: string,
  ) => {
    setSelectedBooking(booking);
    setSelectedSlotId(slotId);
    setPendingStatusChange(newStatus);
    setShowConfirmModal(true);
    setActiveDropdown(null);
  };

  const confirmStatusChange = () => {
    if (!selectedBooking || !selectedSlotId || !pendingStatusChange) return;

    setIsProcessingRefund(true);

    const input: UpdateBookingStatusInput = {
      bookingId: selectedBooking._id,
      slotId: selectedSlotId,
      status: pendingStatusChange as UpdateBookingStatusInput["status"],
    };

    updateBookingStatus({ variables: { input } });
  };

  const getStatusChangeLabel = () => {
    if (!pendingStatusChange) return "";
    const option = SLOT_STATUS_OPTIONS.find(
      (o) => o.value === pendingStatusChange,
    );
    return option?.label ?? pendingStatusChange;
  };

  const handleCancelBooking = () => {
    if (!selectedBooking || !selectedSlotId) return;

    setIsCancelling(true); // Set loading state

    const input: CancelBookingInput = {
      bookingId: selectedBooking._id,
      slotId: selectedSlotId,
      studentId: selectedBooking.studentId._id,
    };

    cancelBookingAdmin({ variables: { input } });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading bookings: {error.message}</p>
      </div>
    );
  }

  const bookings: StudentBooking[] = data?.getAllStudentBookings || [];
  const formatCancellationDateTime = (
    timestamp: string | number | undefined,
  ) => {
    if (timestamp === undefined || timestamp === null || timestamp === "")
      return "-";

    const date = new Date(Number(timestamp));

    // Check if date is valid
    if (isNaN(date.getTime())) return "-";

    const dateStr = date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return `${dateStr} ${timeStr}`;
  };
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}
    >
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">All Student</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Student
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Lesson Date
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Cancellation Date
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Instructor
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                History
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {bookings.map((booking) =>
              booking.slots.map((slot) => (
                <tr
                  key={`${booking._id}-${slot._id}`}
                  className="hover:bg-gray-50 transition-colors duration-150"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {booking.studentId.profileImage ? (
                          <img
                            className="h-8 w-8 rounded-full object-cover"
                            src={booking.studentId.profileImage}
                            alt=""
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                            {booking.studentId.firstName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {booking.studentId.firstName}{" "}
                          {booking.studentId.lastName}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {formatDate(slot.date)} {formatTime(slot.startTime)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {formatCancellationDateTime(slot.cancellationDate)}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {booking.instructorId.firstName}{" "}
                      {booking.instructorId.lastName}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex px-3 py-2 text-xs font-medium rounded-full ${
                          slot.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : slot.status === "refund"
                              ? "bg-yellow-100 text-yellow-800"
                              : slot.status === "completed"
                                ? "bg-blue-100 text-blue-800"
                                : slot.status === "booked"
                                  ? "bg-green-100 text-green-800"
                                  : slot.status === "missed"
                                    ? "bg-orange-100 text-orange-800"
                                    : slot.status === "available"
                                      ? "bg-gray-100 text-gray-800"
                                      : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {slot.status}
                      </span>

                      <StatusDropdown
                        currentStatus={slot.status}
                        onStatusChange={(newStatus) =>
                          handleStatusChange(booking, slot._id, newStatus)
                        }
                        isOpen={activeDropdown === `${booking._id}-${slot._id}`}
                        onToggle={() => {
                          const dropdownId = `${booking._id}-${slot._id}`;
                          setActiveDropdown(
                            activeDropdown === dropdownId ? null : dropdownId,
                          );
                        }}
                      />
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <button
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowDetailsModal(true);
                      }}
                      className="bg-[#5FC2D3] hover:bg-[#3c8e9c] text-white px-3 py-2.5 text-xs rounded-full transition-colors duration-150"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>

      {bookings.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Calendar className="h-12 w-12 text-gray-300" />
            <p className="text-gray-500 text-lg">No bookings found</p>
            <p className="text-gray-400 text-sm">
              Student bookings will appear here when they are created.
            </p>
          </div>
        </div>
      )}

      {/* Modals */}
      <ViewDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking}
      />

      <CancelBookingModal
        isOpen={showCancelModal}
        onClose={() => {
          if (!isCancelling) {
            // Prevent closing while loading
            setShowCancelModal(false);
            setSelectedBooking(null);
            setSelectedSlotId(null);
          }
        }}
        onConfirm={handleCancelBooking}
        booking={selectedBooking}
        slotId={selectedSlotId}
        isLoading={isCancelling} // Pass loading state
      />

      <RefundConfirmationModal
        isOpen={showRefundModal}
        onClose={() => {
          if (!isProcessingRefund) {
            setShowRefundModal(false);
            setSelectedBooking(null);
            setSelectedSlotId(null);
            setPendingStatusChange(null);
          }
        }}
        onConfirm={confirmStatusChange}
        booking={selectedBooking}
        slotId={selectedSlotId}
        isLoading={isProcessingRefund}
      />

      <StatusChangeConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          if (!isProcessingRefund) {
            setShowConfirmModal(false);
            setSelectedBooking(null);
            setSelectedSlotId(null);
            setPendingStatusChange(null);
          }
        }}
        onConfirm={confirmStatusChange}
        statusLabel={getStatusChangeLabel()}
        isLoading={isProcessingRefund}
      />
    </div>
  );
};

export default StudentBookingTable;
