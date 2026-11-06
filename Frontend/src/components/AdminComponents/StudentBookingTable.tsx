/* eslint-disable react-refresh/only-export-components */
import React, { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  Calendar,
  Clock,
  DollarSign,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  StudentBooking,
} from "../../types/AdminBookingShowcase";
import { GET_ALL_STUDENT_BOOKINGS } from "../../graphql/Queries/AdminBookingShowcase";
import { UPDATE_BOOKING_STATUS } from "../../graphql/mutations/AdminBookingsShowcase";
import ConfirmationModal from "./ConfirmationModal";
import { AdminModal } from "../admin/AdminModal";
import { AdminButton } from "../admin/AdminPrimitives";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const SLOT_BUSINESS_TIMEZONE =
  import.meta.env.VITE_SLOT_TIMEZONE || "Europe/Zurich";

function normalizeSlotTime(timeStr?: string) {
  if (!timeStr) return "00:00:00";
  return timeStr.includes(":") && timeStr.split(":").length === 2
    ? `${timeStr}:00`
    : timeStr;
}

function parseSlotStartMs(slot: { date: string; startTime: string }) {
  const parsed = dayjs.tz(
    `${slot.date} ${normalizeSlotTime(slot.startTime)}`,
    "YYYY-MM-DD HH:mm:ss",
    SLOT_BUSINESS_TIMEZONE,
  );
  const ms = parsed.valueOf();
  return Number.isFinite(ms) ? ms : NaN;
}

/** Parse slot end for comparison (HH:mm → HH:mm:00). */
function getSlotEndDateForAdmin(slot: { date: string; endTime: string }) {
  const parsed = dayjs.tz(
    `${slot.date} ${normalizeSlotTime(slot.endTime || "23:59:59")}`,
    "YYYY-MM-DD HH:mm:ss",
    SLOT_BUSINESS_TIMEZONE,
  );
  return parsed.isValid() ? parsed.toDate() : new Date(NaN);
}

function formatSlotDateForViewer(slot: { date: string; startTime: string }) {
  const startMs = parseSlotStartMs(slot);
  if (!Number.isFinite(startMs)) return slot.date;
  return new Date(startMs).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatWallClock12h(timeStr?: string) {
  const [hStr, mStr] = String(timeStr || "").split(":");
  const hour = Number(hStr);
  const minute = Number(mStr);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return timeStr || "—";
  return new Date(2000, 0, 1, hour, minute, 0).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatSlotTimeForViewer(slot: {
  date: string;
  startTime: string;
  endTime: string;
}) {
  const startMs = parseSlotStartMs(slot);
  const endMs = getSlotEndDateForAdmin(slot).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return `${slot.startTime} - ${slot.endTime}`;
  }
  const startLabel = new Date(startMs).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const endLabel = new Date(endMs).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${startLabel} - ${endLabel}`;
}

function formatSlotSwissTime(slot: { startTime: string; endTime: string }) {
  return `${formatWallClock12h(slot.startTime)} - ${formatWallClock12h(slot.endTime)}`;
}

export type AdminLessonDisplayStatus =
  | "Upcoming"
  | "Completed"
  | "Cancelled"
  | "Refunded"
  | "Missed"
  | "Booked"
  | "Pending";

/** Derived only from slot data + time (matches instructor-side truth; never shows raw "booked"). */
export function getAdminLessonDisplayStatus(
  slot: StudentBooking["slots"][number],
): AdminLessonDisplayStatus {
  const raw = (slot.status ?? "").toLowerCase();
  if (raw === "missed") return "Missed";
  if (raw === "cancelled" || raw === "canceled") return "Cancelled";
  if (raw === "refund") return "Refunded";
  if (raw === "completed") return "Completed";
  const slotEnd = getSlotEndDateForAdmin(slot);
  if (slotEnd.getTime() > Date.now()) return "Upcoming";
  return slot.booked ? "Booked" : "Pending";
}

export function adminSlotEligibleForRefund(
  slot: StudentBooking["slots"][number],
): boolean {
  return (slot.status ?? "").toLowerCase() === "cancelled";
}
function getCancelledByLabel(cancelledBy?: string) {
  if (cancelledBy === "student") return "Student";
  if (cancelledBy === "instructor") return "Instructor";
  if (cancelledBy === "admin") return "Admin";
  return "Not provided";
}

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

  const formatCancellationDateTime = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AdminModal open={isOpen} onClose={onClose} title="Booking details" subtitle="Booking lifecycle and payment summary" size="lg" footer={<AdminButton variant="secondary" onClick={onClose}>Close</AdminButton>}>
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
                    const displayStatus = getAdminLessonDisplayStatus(slot);
                    const cancellationRelevant = displayStatus === "Cancelled" || displayStatus === "Refunded";
                    return (
                    <div key={slot._id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {formatSlotDateForViewer({
                                date: slot.date,
                                startTime: slot.startTime,
                              })}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {`Switzerland: ${formatSlotSwissTime({
                                startTime: slot.startTime,
                                endTime: slot.endTime,
                              })}`}
                              <span className="block text-xs text-gray-500">
                                ({`Your time: ${formatSlotTimeForViewer({
                                  date: slot.date,
                                  startTime: slot.startTime,
                                  endTime: slot.endTime,
                                })}`})
                              </span>
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            displayStatus === "Cancelled"
                              ? "bg-red-100 text-red-800"
                              : displayStatus === "Refunded"
                                ? "bg-violet-100 text-violet-800"
                              : displayStatus === "Missed"
                                ? "bg-orange-100 text-orange-800"
                                : displayStatus === "Pending"
                                  ? "bg-amber-100 text-amber-800"
                                : displayStatus === "Completed"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {displayStatus}
                        </span>
                      </div>
                      {cancellationRelevant && <div className="mt-2 text-xs text-gray-600">
                        {displayStatus === "Refunded" ? "Refunded" : "Cancelled"} by: {getCancelledByLabel(slot.cancelledBy)}
                        {" • "}
                        {displayStatus === "Refunded" ? "Refunded at" : "Cancelled at"}:{" "}
                        {formatCancellationDateTime(slot.cancellationDate || slot.refundedAt)}
                      </div>}
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
    </AdminModal>
  );
};

// Main Component
const StudentBookingTable: React.FC<BookingsTableProps> = ({
  className = "",
}) => {
  const [selectedBooking, setSelectedBooking] = useState<StudentBooking | null>(
    null,
  );
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [refundTarget, setRefundTarget] = useState<{
    bookingId: string;
    slotId: string;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    | "all"
    | "upcoming"
    | "completed"
    | "cancelled"
    | "refunded"
    | "missed"
    | "no_status_set_yet"
  >("all");
  const [sortBy, setSortBy] = useState<
    | "date_desc"
    | "date_asc"
    | "status_upcoming"
    | "status_completed"
    | "status_cancelled"
    | "status_missed"
  >("date_desc");
  const { data, loading, error } = useQuery(GET_ALL_STUDENT_BOOKINGS, {
    fetchPolicy: "cache-and-network",
  });

  const [updateBookingStatus, { loading: refundLoading }] = useMutation(
    UPDATE_BOOKING_STATUS,
    {
      refetchQueries: ["GetAllStudentBookings"],
      awaitRefetchQueries: true,
      onCompleted: () => {
        toast.success("Refund processed for this slot.");
        setRefundTarget(null);
      },
      onError: (err) => {
        toast.error(err.message || "Failed to process refund.");
      },
    },
  );

  const formatCompletionDate = (
    completionMarkedAt: string | undefined,
    status: string | undefined,
  ) => {
    if (String(status || "").toLowerCase() !== "completed") return "-";
    if (!completionMarkedAt) return "-";
    const numericTs = Number(completionMarkedAt);
    const date = Number.isFinite(numericTs)
      ? new Date(numericTs)
      : new Date(completionMarkedAt);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
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
  type DerivedStatus = AdminLessonDisplayStatus;
  type Row = {
    booking: StudentBooking;
    slot: StudentBooking["slots"][number];
    derivedStatus: DerivedStatus;
  };

  const getSlotTime = (slot: { date: string; startTime: string }) =>
    parseSlotStartMs(slot);

  const statusOrder = (s: DerivedStatus) => {
    if (s === "Upcoming") return 0;
    if (s === "Completed") return 1;
    if (s === "Cancelled") return 2;
    if (s === "Refunded") return 3;
    if (s === "Missed") return 4;
    return 5; // No Status Set Yet
  };

  const rows: Row[] = bookings
    .flatMap((b) =>
      b.slots.map((s) => ({
        booking: b,
        slot: s,
        derivedStatus: getAdminLessonDisplayStatus(s),
      })),
    )
    .filter((r) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "upcoming") return r.derivedStatus === "Upcoming";
      if (statusFilter === "completed") return r.derivedStatus === "Completed";
      if (statusFilter === "cancelled") return r.derivedStatus === "Cancelled";
      if (statusFilter === "refunded") return r.derivedStatus === "Refunded";
      if (statusFilter === "missed") return r.derivedStatus === "Missed";
      return r.derivedStatus === "No Status Set Yet";
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
      const isCancelledGroup = (v: DerivedStatus) =>
        v === "Cancelled" || v === "Refunded";
      const aRank =
        desired === "Cancelled"
          ? isCancelledGroup(a.derivedStatus)
            ? 0
            : 1
          : a.derivedStatus === desired
            ? 0
            : 1;
      const bRank =
        desired === "Cancelled"
          ? isCancelledGroup(b.derivedStatus)
            ? 0
            : 1
          : b.derivedStatus === desired
            ? 0
            : 1;
      if (aRank !== bRank) return aRank - bRank;

      const aGroup = statusOrder(a.derivedStatus);
      const bGroup = statusOrder(b.derivedStatus);
      if (aGroup !== bGroup) return aGroup - bGroup;
      return bTime - aTime;
    });
  const hasCancellation = rows.some(({ derivedStatus }) => derivedStatus === "Cancelled" || derivedStatus === "Refunded");
  const formatCancellationDateTime = (value: string | number | undefined) => {
    if (value === undefined || value === null || value === "")
      return "-";
    const date = new Date(value);

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
      className={`dsp-admin-bookings bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}
    >
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-lg font-medium text-gray-900">All bookings</h2>
        <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto">
          <label className="grid gap-1">
            <span className="text-sm text-gray-600">Filter:</span>
          <select aria-label="Filter bookings by status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as typeof statusFilter)
            }
            className="w-full min-w-0 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5FC2D3]/60 focus:border-[#5FC2D3] transition-colors"
          >
            <option value="all">All</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
            <option value="missed">Missed</option>
          </select>

          </label>
          <label className="grid gap-1">
            <span className="text-sm text-gray-600">Sort:</span>
          <select aria-label="Sort bookings"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="w-full min-w-0 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5FC2D3]/60 focus:border-[#5FC2D3] transition-colors"
          >
            <option value="date_desc">Date: Newest → Oldest</option>
            <option value="date_asc">Date: Oldest → Newest</option>
            <option value="status_upcoming">Status: Upcoming</option>
            <option value="status_completed">Status: Completed</option>
            <option value="status_cancelled">Status: Cancelled</option>
            <option value="status_missed">Status: Missed</option>
          </select>
          </label>
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
              {hasCancellation && <>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Cancellation date/time</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Cancelled by</th>
              </>}
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Instructor
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Completion Date
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                History
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {rows.map(({ booking, slot, derivedStatus }) => {
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
                      {formatSlotDateForViewer({
                        date: slot.date,
                        startTime: slot.startTime,
                      })}
                      <div className="text-xs text-gray-500">
                        {`Switzerland: ${formatSlotSwissTime({
                          startTime: slot.startTime,
                          endTime: slot.endTime,
                        })}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        ({`Your time: ${formatSlotTimeForViewer({
                          date: slot.date,
                          startTime: slot.startTime,
                          endTime: slot.endTime,
                        })}`})
                      </div>
                    </div>
                  </td>
                  {hasCancellation && <>
                    <td className="px-6 py-4"><div className="text-sm text-gray-900">{derivedStatus === "Cancelled" || derivedStatus === "Refunded" ? formatCancellationDateTime(slot.cancellationDate || slot.refundedAt) : "—"}</div></td>
                    <td className="px-6 py-4"><div className="text-sm text-gray-900">{derivedStatus === "Cancelled" || derivedStatus === "Refunded" ? getCancelledByLabel(slot.cancelledBy) : "—"}</div></td>
                  </>}

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
                            : derivedStatus === "Refunded"
                              ? "bg-violet-100 text-violet-800"
                            : derivedStatus === "Missed"
                              ? "bg-orange-100 text-orange-800"
                            : derivedStatus === "Pending"
                              ? "bg-amber-100 text-amber-800"
                            : derivedStatus === "Completed"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {derivedStatus}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {formatCompletionDate(slot.completionMarkedAt, slot.status)}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowDetailsModal(true);
                        }}
                        className="bg-[#5FC2D3] hover:bg-[#3c8e9c] text-white px-3 py-2.5 text-xs rounded-full transition-colors duration-150"
                      >
                        View Details
                      </button>
                      {/* {adminSlotEligibleForRefund(slot) && (
                        <button
                          type="button"
                          onClick={() =>
                            setRefundTarget({
                              bookingId: booking._id,
                              slotId: slot._id,
                            })
                          }
                          className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2.5 text-xs rounded-full transition-colors duration-150"
                        >
                          Refund
                        </button>
                      )} */}
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

      <ConfirmationModal
        isOpen={Boolean(refundTarget)}
        onClose={() => !refundLoading && setRefundTarget(null)}
        onConfirm={() => {
          if (!refundTarget) return;
          void updateBookingStatus({
            variables: {
              input: {
                bookingId: refundTarget.bookingId,
                slotId: refundTarget.slotId,
                status: "refund",
              },
            },
          });
        }}
        title="Process refund"
        message="This marks the cancelled lesson as refunded in the system. Slot statuses are otherwise set from the instructor panel."
        confirmText={refundLoading ? "Processing…" : "Confirm refund"}
        variant="danger"
      />
    </div>
  );
};

export default StudentBookingTable;
