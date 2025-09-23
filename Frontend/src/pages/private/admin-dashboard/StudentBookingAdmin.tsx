import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client";
import {
  ChevronDown,
  Calendar,
  Clock,
  DollarSign,
  User,
  Car,
  MapPin,
  X,
  AlertTriangle,
  Edit2,
  Eye,
} from "lucide-react";
import {
  CancelBookingInput,
  StudentBooking,
  UpdateBookingStatusInput,
} from "../../../types/AdminBookingShowcase";
import { GET_ALL_STUDENT_BOOKINGS } from "../../../graphql/Queries/AdminBookingShowcase";
import {
  CANCEL_BOOKING_ADMIN,
  UPDATE_BOOKING_STATUS,
} from "../../../graphql/mutations/AdminBookingsShowcase";

interface BookingsTableProps {
  className?: string;
}

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

  const statusOptions = [
    { value: "Refund", label: "Refund" },
    { value: "Cancel", label: "Cancel" },
  ];

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
        className="inline-flex items-center px-2 py-1 text-xs rounded border border-gray-200 bg-white hover:bg-gray-50"
      >
        Choose one
        <ChevronDown
          className={`ml-1 h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded shadow-lg z-50">
          <div className="py-1">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onStatusChange(option.value)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
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
                            slot.status === "confirmed"
                              ? "bg-green-100 text-green-800"
                              : slot.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : slot.status === "cancelled"
                                  ? "bg-red-100 text-red-800"
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

// Cancel Booking Modal Component
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
          onClick={onClose}
        />

        <div className="inline-block transform overflow-hidden rounded-xl bg-white text-left align-bottom shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:align-middle">
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 text-center w-full">
                Are You Sure You Want to Cancel This Booking?
              </h3>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-3">Details</h4>

              {/* Payment Method */}
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-5 bg-purple-500 text-white text-xs rounded flex items-center justify-center font-bold">
                  S
                </div>
                <div>
                  <p className="text-sm text-gray-600">Credit card</p>
                  <p className="text-xs text-gray-500">
                    {booking.paymentMethod.cardNumber
                      ? `**** **** **** ${booking.paymentMethod.cardNumber.slice(-4)}`
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
                  <span className="text-gray-600">Duration:</span>
                  <span className="text-gray-900">15 days</span>
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
                    {formatDate(selectedSlot.date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">End Date:</span>
                  <span className="text-gray-900">
                    {formatDate(
                      booking.slots[booking.slots.length - 1]?.date ||
                        selectedSlot.date
                    )}
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
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-150 disabled:opacity-50"
            >
              No
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-150 disabled:opacity-50"
            >
              {isSubmitting ? "Cancelling..." : "Yes"}
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
    null
  );
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<string | null>(
    null
  );
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery(GET_ALL_STUDENT_BOOKINGS, {
    fetchPolicy: "cache-and-network",
  });

  const [updateBookingStatus] = useMutation(UPDATE_BOOKING_STATUS, {
    onCompleted: () => {
      refetch();
      setShowConfirmModal(false);
      setSelectedBooking(null);
      setSelectedSlotId(null);
      setPendingStatusChange(null);
      setActiveDropdown(null);
    },
    onError: (error) => {
      console.error("Error updating booking status:", error);
    },
  });

  const [cancelBookingAdmin] = useMutation(CANCEL_BOOKING_ADMIN, {
    onCompleted: () => {
      refetch();
      setShowCancelModal(false);
      setSelectedBooking(null);
      setSelectedSlotId(null);
      setActiveDropdown(null);
    },
    onError: (error) => {
      console.error("Error cancelling booking:", error);
    },
  });

  const handleStatusChange = (
    booking: StudentBooking,
    slotId: string,
    newStatus: string
  ) => {
    setSelectedBooking(booking);
    setSelectedSlotId(slotId);

    if (newStatus === "Cancel") {
      setShowCancelModal(true);
    } else {
      setPendingStatusChange(newStatus.toLowerCase());
      setShowConfirmModal(true);
    }
    setActiveDropdown(null);
  };

  const confirmStatusChange = () => {
    if (!selectedBooking || !selectedSlotId || !pendingStatusChange) return;

    const input: UpdateBookingStatusInput = {
      bookingId: selectedBooking._id,
      slotId: selectedSlotId,
      status: pendingStatusChange as any,
    };

    updateBookingStatus({ variables: { input } });
  };

  const handleCancelBooking = (reason: string) => {
    if (!selectedBooking || !selectedSlotId) return;

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

  const bookings = (data?.getAllStudentBookings || [])
    .flatMap((b: StudentBooking) =>
      b.slots.map((s) => ({ booking: b, slot: s }))
    )
    .sort((a, b) => {
      const aTime = new Date(`${a.slot.date}T${a.slot.startTime}`).getTime();
      const bTime = new Date(`${b.slot.date}T${b.slot.startTime}`).getTime();
      return bTime - aTime; // 🔑 newest first
    });

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}
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
              booking.slots.map((slot, index) => (
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
                      {booking.instructorId.firstName}{" "}
                      {booking.instructorId.lastName}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                          slot.status === "Cancelled" ||
                          slot.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : slot.status === "Refund"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {slot.status === "cancelled" ? "Cancel" : slot.status}
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
                            activeDropdown === dropdownId ? null : dropdownId
                          );
                        }}
                      />

                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <button
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowDetailsModal(true);
                      }}
                      className="bg-teal-500 hover:bg-teal-600 text-white px-3 py-1 text-xs rounded transition-colors duration-150"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
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
          setShowCancelModal(false);
          setSelectedBooking(null);
          setSelectedSlotId(null);
        }}
        onConfirm={handleCancelBooking}
        booking={selectedBooking}
        slotId={selectedSlotId}
      />
    </div>
  );
};

export default StudentBookingTable;
