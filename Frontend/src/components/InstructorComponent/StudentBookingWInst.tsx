import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  Calendar,
  Clock,
  DollarSign,
  User,
  X,
  Loader2,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { StudentBooking } from "../../types/Bookings";
import { useAuth } from "../../context/AuthContext";
import { GET_INSTRUCTOR_BOOKINGS_BY_ID } from "../../graphql/Queries/AdminBookingShowcase";
import { UPDATE_SLOT_STATUS } from "../../graphql/mutations/studentBooking";
import { createPortal } from "react-dom";
interface BookingsTableProps {
  className?: string;
}

interface ViewDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: StudentBooking | null;
}

interface StatusDropdownProps {
  currentStatus: string;
  slotId: string;
  bookingId: string;
  onStatusChange: (
    bookingId: string,
    slotId: string,
    newStatus: string
  ) => void;
  disabled?: boolean;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isLoading?: boolean;
}

const SLOT_STATUSES = [
  // {
  //   value: "available",
  //   label: "Available",
  //   color: "bg-gray-100 text-gray-800",
  // },
  { value: "booked", label: "Booked", color: "bg-green-100 text-green-800" },
  {
    value: "completed",
    label: "Completed",
    color: "bg-blue-100 text-blue-800",
  },
  { value: "refund", label: "Refund", color: "bg-yellow-100 text-yellow-800" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
  { value: "missed", label: "Missed", color: "bg-orange-100 text-orange-800" },
  { value: "yet", label: "Yet", color: "bg-purple-100 text-purple-800" },
];

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
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

        <div className="inline-block transform overflow-hidden rounded-xl bg-white text-left align-bottom shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:align-middle">
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex items-start">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                <h3 className="text-lg font-semibold leading-6 text-gray-900">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">{message}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className="inline-flex w-full justify-center rounded-lg bg-[#5FC2D3] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#3c8e9c] disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto transition-colors duration-150"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Updating...
                </>
              ) : (
                "Confirm"
              )}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto transition-colors duration-150"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusDropdown: React.FC<StatusDropdownProps> = ({
  currentStatus,
  slotId,
  bookingId,
  onStatusChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  const currentStatusObj =
    SLOT_STATUSES.find((s) => s.value === currentStatus) || SLOT_STATUSES[0];

  const handleStatusSelect = (newStatus: string) => {
    if (newStatus !== currentStatus) {
      onStatusChange(bookingId, slotId, newStatus);
    }
    setIsOpen(false);
  };

  // Calculate dropdown position
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <>
      {/* Button stays inside table */}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center justify-between px-3 py-2 text-xs font-medium rounded-full ${currentStatusObj.color} hover:opacity-80 transition-opacity duration-150 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]`}
      >
        <span>{currentStatusObj.label}</span>
        <ChevronDown
          className={`ml-2 h-3.5 w-3.5 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown via Portal */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "absolute",
              top: position.top,
              left: position.left,
              width: position.width,
              zIndex: 9999,
            }}
            className="rounded-xl bg-white  shadow-xl ring-1 ring-black ring-opacity-5"
          >
            <div className="py-1 ">
              {SLOT_STATUSES.map((status) => (
                <button
                  key={status.value}
                  onClick={() => handleStatusSelect(status.value)}
                  className={`group block w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 ${
                    status.value === currentStatus
                      ? "bg-gray-100 font-medium text-gray-900"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-opacity duration-150 ${status.color} group-hover:opacity-90`}
                  >
                    {status.label}
                  </span>
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

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

const StudentBookingWInst: React.FC<BookingsTableProps> = ({
  className = "",
}) => {
  const [selectedBooking, setSelectedBooking] = useState<StudentBooking | null>(
    null
  );
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    bookingId: string;
    slotId: string;
    newStatus: string;
  } | null>(null);

  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery(
    GET_INSTRUCTOR_BOOKINGS_BY_ID,
    {
      variables: { instructorId: user?.id },
      fetchPolicy: "cache-and-network",
    }
  );

  const [updateSlotStatus, { loading: updateLoading }] = useMutation(
    UPDATE_SLOT_STATUS,
    {
      onCompleted: () => {
        setShowConfirmationModal(false);
        setPendingStatusChange(null);
        refetch();
      },
      onError: (err) => {
        console.error("Error updating slot status:", err);
        alert(`Failed to update status: ${err.message}`);
        setShowConfirmationModal(false);
        setPendingStatusChange(null);
      },
    }
  );

  const handleStatusChange = (
    bookingId: string,
    slotId: string,
    newStatus: string
  ) => {
    setPendingStatusChange({ bookingId, slotId, newStatus });
    setShowConfirmationModal(true);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatusChange) return;

    try {
      await updateSlotStatus({
        variables: {
          input: {
            bookingId: pendingStatusChange.bookingId,
            slotId: pendingStatusChange.slotId,
            status: pendingStatusChange.newStatus,
          },
        },
      });
    } catch (err) {
      console.error("Mutation error:", err);
    }
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

  const formatCancellationDateTime = (timestamp: string | number) => {
    if (!timestamp) return "-";

    const date = new Date(Number(timestamp));

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

  const bookings: StudentBooking[] = data?.getInstructorBookingsById || [];

  const getStatusLabel = () => {
    if (!pendingStatusChange) return "";
    const statusObj = SLOT_STATUSES.find(
      (s) => s.value === pendingStatusChange.newStatus
    );
    return statusObj?.label || pendingStatusChange.newStatus;
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}
    >
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">
          All Student Bookings
        </h2>
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
                    <StatusDropdown
                      currentStatus={slot.status}
                      slotId={slot._id}
                      bookingId={booking._id}
                      onStatusChange={handleStatusChange}
                      disabled={updateLoading}
                    />
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

      <ViewDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking}
      />

      <ConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => {
          if (!updateLoading) {
            setShowConfirmationModal(false);
            setPendingStatusChange(null);
          }
        }}
        onConfirm={confirmStatusChange}
        title="Confirm Status Change"
        message={`Are you sure you want to change the status to "${getStatusLabel()}"? This action will update the booking and notify relevant parties.`}
        isLoading={updateLoading}
      />
    </div>
  );
};

export default StudentBookingWInst;
