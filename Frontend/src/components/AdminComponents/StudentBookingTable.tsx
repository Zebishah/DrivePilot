import React, { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import {
  Calendar,
  Clock,
  DollarSign,
  User,
  X,
  Loader2,
} from "lucide-react";
import {
  StudentBooking,
  UpdateBookingStatusInput,
} from "../../types/AdminBookingShowcase";
import { GET_ALL_STUDENT_BOOKINGS } from "../../graphql/Queries/AdminBookingShowcase";
import {
  UPDATE_BOOKING_STATUS,
} from "../../graphql/mutations/AdminBookingsShowcase";
import toast from "react-hot-toast";

interface BookingsTableProps {
  className?: string;
}

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

  const getAdminDisplayStatus = (slot: StudentBooking["slots"][number]) => {
    const raw = (slot.status ?? "").toLowerCase();
    if (raw === "missed") return "Missed";
    if (raw === "cancelled" || raw === "canceled" || raw === "refund")
      return "Cancelled";
    if (raw === "completed") return "Completed";
    const slotEnd = new Date(`${slot.date}T${slot.endTime}:00`);
    return slotEnd <= new Date() ? "Completed" : "Upcoming";
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
                  {booking.slots.map((slot) => {
                    const displayStatus = getAdminDisplayStatus(slot);
                    return (
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
                            displayStatus === "Cancelled"
                                ? "bg-yellow-100 text-yellow-800"
                              : displayStatus === "Completed"
                                ? "bg-blue-100 text-blue-800"
                                : displayStatus === "Missed"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-green-100 text-green-800"
                          }`}
                        >
                          {displayStatus}
                        </span>
                      </div>
                    </div>
                  )})}
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
// Refund UI intentionally omitted from this page (admin is view-only here)

// Main Component
const StudentBookingTable: React.FC<BookingsTableProps> = ({
  className = "",
}) => {
  const [selectedBooking, setSelectedBooking] = useState<StudentBooking | null>(
    null,
  );
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "upcoming" | "completed" | "cancelled" | "missed"
  >("all");
  const [sortBy, setSortBy] = useState<
    | "date_desc"
    | "date_asc"
    | "status_upcoming"
    | "status_completed"
    | "status_cancelled"
    | "status_missed"
  >("date_desc");
  const { data, loading, error, refetch } = useQuery(GET_ALL_STUDENT_BOOKINGS, {
    fetchPolicy: "cache-and-network",
  });

  // Refund mutation intentionally not exposed from this page.

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
  type DerivedStatus = "Upcoming" | "Completed" | "Cancelled" | "Missed";
  type Row = { booking: StudentBooking; slot: StudentBooking["slots"][number]; derivedStatus: DerivedStatus };

  const getDerivedStatus = (
    slot: StudentBooking["slots"][number],
  ): DerivedStatus => {
    const raw = (slot.status ?? "").toLowerCase();
    if (raw === "missed") return "Missed";
    if (raw === "cancelled" || raw === "canceled" || raw === "refund")
      return "Cancelled";
    if (raw === "completed") return "Completed";
    const slotEnd = new Date(`${slot.date}T${slot.endTime}:00`);
    if (slotEnd <= new Date()) return "Completed";
    return "Upcoming";
  };

  const getSlotTime = (slot: { date: string; startTime: string }) =>
    new Date(`${slot.date}T${slot.startTime}`).getTime();

  const statusOrder = (s: DerivedStatus) => {
    if (s === "Upcoming") return 0;
    if (s === "Completed") return 1;
    if (s === "Cancelled") return 2;
    return 3; // Missed
  };

  const rows: Row[] = bookings
    .flatMap((b) =>
      b.slots.map((s) => ({ booking: b, slot: s, derivedStatus: getDerivedStatus(s) })),
    )
    .filter((r) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "upcoming") return r.derivedStatus === "Upcoming";
      if (statusFilter === "completed") return r.derivedStatus === "Completed";
      if (statusFilter === "cancelled") return r.derivedStatus === "Cancelled";
      return r.derivedStatus === "Missed";
    })
    .sort((a, b) => {
      const aTime = getSlotTime(a.slot);
      const bTime = getSlotTime(b.slot);

      if (sortBy === "date_asc") return aTime - bTime;
      if (sortBy === "date_desc") return bTime - aTime;

      const desired: DerivedStatus =
        sortBy === "status_upcoming"
          ? "Upcoming"
          : sortBy === "status_completed"
            ? "Completed"
            : sortBy === "status_cancelled"
              ? "Cancelled"
              : "Missed";
      const aRank = a.derivedStatus === desired ? 0 : 1;
      const bRank = b.derivedStatus === desired ? 0 : 1;
      if (aRank !== bRank) return aRank - bRank;

      const aGroup = statusOrder(a.derivedStatus);
      const bGroup = statusOrder(b.derivedStatus);
      if (aGroup !== bGroup) return aGroup - bGroup;
      return bTime - aTime;
    });
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

  const hasLessonPassed = (slot: { date: string; endTime: string }) => {
    const slotEnd = new Date(`${slot.date}T${slot.endTime}:00`);
    return slotEnd.getTime() <= Date.now();
  };
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}
    >
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
        <h2 className="text-lg font-medium text-gray-900">All Student</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as typeof statusFilter)
            }
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5FC2D3]/60 focus:border-[#5FC2D3] transition-colors"
          >
            <option value="all">All</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="missed">Missed</option>
          </select>

          <span className="text-sm text-gray-600">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5FC2D3]/60 focus:border-[#5FC2D3] transition-colors"
          >
            <option value="date_desc">Date: Newest → Oldest</option>
            <option value="date_asc">Date: Oldest → Newest</option>
            <option value="status_upcoming">Status: Upcoming</option>
            <option value="status_completed">Status: Completed</option>
            <option value="status_cancelled">Status: Cancelled</option>
            <option value="status_missed">Status: Missed</option>
          </select>
        </div>
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
            {rows.map(({ booking, slot, derivedStatus }) => {
              const lessonPassed = hasLessonPassed(slot);
              const rawStatus = (slot.status ?? "").toLowerCase();
              const isStatusNotSetYet =
                lessonPassed &&
                derivedStatus === "Completed" &&
                rawStatus !== "completed" &&
                rawStatus !== "missed" &&
                rawStatus !== "cancelled" &&
                rawStatus !== "refund";

              return (
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
                          derivedStatus === "Cancelled"
                            ? "bg-red-100 text-red-800"
                            : derivedStatus === "Missed"
                              ? "bg-orange-100 text-orange-800"
                            : derivedStatus === "Completed"
                              ? isStatusNotSetYet
                                ? "bg-amber-100 text-amber-800"
                                : "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {isStatusNotSetYet ? "No Status Set Yet" : derivedStatus}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowDetailsModal(true);
                        }}
                        className="bg-[#5FC2D3] hover:bg-[#3c8e9c] text-white px-3 py-2.5 text-xs rounded-full transition-colors duration-150"
                      >
                        View Details
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && !loading && (
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

      {/* Refund action removed from this page */}
    </div>
  );
};

export default StudentBookingTable;
