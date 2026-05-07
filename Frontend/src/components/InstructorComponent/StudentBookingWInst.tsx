import React, { useState, useEffect, useRef, useMemo } from "react";
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
import {
  Pagination,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const SLOT_BUSINESS_TIMEZONE =
  import.meta.env.VITE_SLOT_TIMEZONE || "Europe/Zurich";
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function normalizeSlotTime(timeStr?: string) {
  if (!timeStr) return "00:00:00";
  return timeStr.split(":").length === 2 ? `${timeStr}:00` : timeStr;
}
interface BookingsTableProps {
  className?: string;
  /** When set, only bookings for this student are listed (same UI as main Booking Management). */
  filterStudentId?: string;
}

type BookingTabKey =
  | "upcoming"
  | "abandoned"
  | "cancelled"
  | "missed"
  | "history";

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
  lessonPassed: boolean;
  /** Active list tab — used so "Abandoned" rows do not show as "Upcoming". */
  listTab?: BookingTabKey;
  paymentStatus?: string;
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
  { value: "booked", label: "Booked", color: "bg-green-100 text-green-800" },
  { value: "completed", label: "Completed", color: "bg-blue-100 text-blue-800" },
  { value: "refund", label: "Refunded", color: "bg-yellow-100 text-yellow-800" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
  { value: "missed", label: "Missed", color: "bg-orange-100 text-orange-800" },
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
  lessonPassed,
  listTab,
  paymentStatus,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  const normalizedStatus = (currentStatus ?? "").toLowerCase();
  const normalizedPaymentStatus = (paymentStatus ?? "").toLowerCase();
  const isAwaitingPayment =
    normalizedPaymentStatus === "requires_action" ||
    normalizedPaymentStatus === "payment_failed";

  const isFinalDisabled =
    normalizedStatus === "completed" ||
    normalizedStatus === "missed" ||
    normalizedStatus === "refund";

  // UI label rules (match admin logic)
  const isStatusNotSetYet =
    lessonPassed &&
    normalizedStatus !== "completed" &&
    normalizedStatus !== "missed" &&
    normalizedStatus !== "cancelled" &&
    normalizedStatus !== "refund";

  const displayLabel =
    listTab === "abandoned"
      ? "Abandoned"
      : isAwaitingPayment
        ? "Awaiting Payment"
      : normalizedStatus === "booked" && !lessonPassed
        ? "Upcoming"
        : isStatusNotSetYet
          ? "No Status Set Yet"
          : SLOT_STATUSES.find((s) => s.value === normalizedStatus)?.label ||
            currentStatus;

  const displayColor =
    listTab === "abandoned"
      ? "bg-slate-200 text-slate-800"
      : isAwaitingPayment
        ? "bg-amber-100 text-amber-800"
      : normalizedStatus === "booked" && !lessonPassed
        ? "bg-yellow-100 text-yellow-800"
        : isStatusNotSetYet
          ? "bg-amber-100 text-amber-800"
          : SLOT_STATUSES.find((s) => s.value === normalizedStatus)?.color ||
            "bg-gray-100 text-gray-800";

  const isActuallyDisabled = disabled || isFinalDisabled || isAwaitingPayment;

  const allowedStatuses = (() => {
    // Final statuses are non-editable from this table.
    if (isFinalDisabled) return [];

    // Refund is not an instructor action.
    if (isAwaitingPayment) {
      return [];
    }

    if (listTab === "upcoming" || listTab === "abandoned") {
      // Future lessons: only cancel is allowed.
      return ["cancelled"];
    }

    if (listTab === "history") {
      // Past lessons: instructor can only validate attendance outcome.
      // No cancel/refund from History.
      return ["completed", "missed"];
    }

    if (listTab === "cancelled") {
      // Keep cancelled rows non-editable here.
      return [];
    }

    // Fallback: match history behavior.
    return lessonPassed ? ["completed", "missed"] : ["cancelled"];
  })();

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
        disabled={isActuallyDisabled}
        onClick={() => {
          if (isActuallyDisabled) return;
          setIsOpen((prev) => !prev);
        }}
        className={`inline-flex items-center justify-between px-3 py-2 text-xs font-medium rounded-full ${displayColor} hover:opacity-80 transition-opacity duration-150 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]`}
      >
        <span>{displayLabel}</span>
        <ChevronDown
          className={`ml-2 h-3.5 w-3.5 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown via Portal */}
      {isOpen && allowedStatuses.length > 0 &&
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
              {SLOT_STATUSES.filter((s) => allowedStatuses.includes(s.value)).map(
                (status) => (
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
              ),
              )}
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
                      {(() => {
                        const normalized = String(slot.status || "").toLowerCase();
                        const displayStatus =
                          normalized === "refund"
                            ? "Refunded"
                            : normalized.charAt(0).toUpperCase() + normalized.slice(1);
                        return (
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
                          {displayStatus}
                        </span>
                      </div>
                        );
                      })()}
                      <div className="mt-2 text-xs text-gray-600">
                        {(slot.paymentStatus === "requires_action" ||
                          slot.paymentStatus === "payment_failed") && (
                          <div className="mb-1 rounded-md bg-amber-50 px-2 py-1 text-amber-800">
                            The student's payment has not been completed. The student must complete the payment before{" "}
                            {getPaymentDeadlineLabelByTimezone(slot)} (local time) /{" "}
                            {getPaymentDeadlineLabelByTimezone(slot, SLOT_BUSINESS_TIMEZONE)} (Switzerland time). Otherwise, the lesson will be automatically cancelled.
                          </div>
                        )}
                        Cancelled by:{" "}
                        {getCancelledByLabel(
                          (slot as { cancelledBy?: string }).cancelledBy,
                        )}{" "}
                        • Cancelled at:{" "}
                        {formatCancellationDateTime(
                          (
                            slot as { cancellationDate?: string; refundedAt?: string }
                          ).cancellationDate ||
                            (
                              slot as { cancellationDate?: string; refundedAt?: string }
                            ).refundedAt,
                        )}
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

// (Spinner helper removed — unused)

type SortOrder = "newest" | "oldest";
type HistoryStatusFilter = "all" | "no_status" | "completed" | "missed";

function getSlotEndDateTime(slot: { date: string; endTime: string }) {
  return new Date(`${slot.date}T${slot.endTime || "23:59"}:00`);
}

function getCancelledByLabel(cancelledBy?: string) {
  if (cancelledBy === "student") return "Student";
  if (cancelledBy === "instructor") return "Instructor";
  if (cancelledBy === "admin") return "Admin";
  return "Unknown";
}
function formatCancellationDateTime(value?: string) {
  if (!value) return "-";
  const numeric = Number(value);
  const date = Number.isFinite(numeric)
    ? new Date(numeric < 1_000_000_000_000 ? numeric * 1000 : numeric)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPaymentDeadlineLabelByTimezone(
  slot: StudentBooking["slots"][number],
  timeZone?: string,
) {
  const reminderBase =
    slot.paymentReminderStartedAt ||
    (slot as { paymentReminder1SentAt?: string }).paymentReminder1SentAt ||
    (slot as { chargedAt?: string }).chargedAt;
  const deadline = slot.paymentReminderDeadlineAt
    ? new Date(slot.paymentReminderDeadlineAt)
    : reminderBase
      ? new Date(new Date(reminderBase).getTime() + TWENTY_FOUR_HOURS_MS)
      : null;
  const slotStartTz = dayjs.tz(
    `${slot.date} ${normalizeSlotTime(slot.startTime)}`,
    "YYYY-MM-DD HH:mm:ss",
    SLOT_BUSINESS_TIMEZONE,
  );
  const derivedDeadline =
    slotStartTz.isValid()
      ? new Date(slotStartTz.valueOf() - FORTY_EIGHT_HOURS_MS + TWENTY_FOUR_HOURS_MS)
      : null;
  const effectiveDeadline =
    deadline && !Number.isNaN(deadline.getTime())
      ? deadline
      : derivedDeadline && !Number.isNaN(derivedDeadline.getTime())
        ? derivedDeadline
        : null;
  if (!effectiveDeadline) return "-";
  return effectiveDeadline.toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(timeZone ? { timeZone } : {}),
  });
}

const StudentBookingWInst: React.FC<BookingsTableProps> = ({
  className = "",
  filterStudentId,
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
  const formatCompletionDate = (completionMarkedAt?: string, status?: string) => {
    if (String(status || "").toLowerCase() !== "completed") return "-";
    if (!completionMarkedAt) return "-";
    const numericTs = Number(completionMarkedAt);
    const d = Number.isFinite(numericTs)
      ? new Date(numericTs)
      : new Date(completionMarkedAt);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  /** Base lesson price per slot (uses totalAmount), in CHF */
  const formatLessonPriceChf = (booking: StudentBooking) => {
    const slotCount = booking.slots?.length || 1;
    const total = Number(booking.totalAmount ?? 0);
    if (!Number.isFinite(total) || total <= 0) return "—";
    const perLesson = total / slotCount;
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: "CHF",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(perLesson);
  };

  /** Final lesson price per slot after discount (uses finalAmount), in CHF */
  const formatFinalPriceChf = (booking: StudentBooking) => {
    const slotCount = booking.slots?.length || 1;
    const total = Number(booking.finalAmount ?? booking.totalAmount ?? 0);
    if (!Number.isFinite(total) || total <= 0) return "—";
    const perLesson = total / slotCount;
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: "CHF",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(perLesson);
  };

  // (cancellation date formatter removed — unused in new table)

  const hasLessonPassed = (slot: { date: string; endTime: string }) => {
    const slotEnd = new Date(`${slot.date}T${slot.endTime}:00`);
    return slotEnd.getTime() <= Date.now();
  };

  const [tab, setTab] = useState<BookingTabKey>("upcoming");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [historyStatusFilter, setHistoryStatusFilter] =
    useState<HistoryStatusFilter>("all");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const bookings: StudentBooking[] = useMemo(
    () => data?.getInstructorBookingsById || [],
    [data?.getInstructorBookingsById],
  );

  const filteredBookings = useMemo(() => {
    const id = filterStudentId?.trim();
    if (!id) return bookings;
    return bookings.filter((b) => String(b.studentId?._id) === id);
  }, [bookings, filterStudentId]);

  const getStatusLabel = () => {
    if (!pendingStatusChange) return "";
    const statusObj = SLOT_STATUSES.find(
      (s) => s.value === pendingStatusChange.newStatus
    );
    return statusObj?.label || pendingStatusChange.newStatus;
  };

  type Row = { booking: StudentBooking; slot: StudentBooking["slots"][number] };

  const allRows = useMemo(() => {
    const now = new Date();
    const rows: Array<
      Row & {
        tab: BookingTabKey;
        effectiveStatus:
          | "upcoming"
          | "cancelled"
          | "refunded"
          | "missed"
          | "completed"
          | "abandoned"
          | "no_status"
          | "awaiting_payment";
      }
    > = [];

    const isAbandonedPending = (booking: StudentBooking) =>
      String(booking.status || "").toLowerCase() === "pending" &&
      !booking.stripeCustomerId &&
      !(booking.slots ?? []).some(
        (s) => String(s.paymentStatus || "").toLowerCase() === "paid",
      );

    for (const booking of filteredBookings) {
      for (const slot of booking.slots || []) {
        const st = String(slot.status || "").toLowerCase();
        const paySt = String(slot.paymentStatus || "").toLowerCase();
        const isAwaitingPayment =
          paySt === "requires_action" || paySt === "payment_failed";
        const slotEnd = getSlotEndDateTime(slot);

        if (st === "cancelled") {
          rows.push({
            booking,
            slot,
            tab: "cancelled",
            effectiveStatus: "cancelled",
          });
          continue;
        }
        if (st === "refund") {
          rows.push({
            booking,
            slot,
            tab: "cancelled",
            effectiveStatus: "refunded",
          });
          continue;
        }
        if (st === "missed") {
          rows.push({
            booking,
            slot,
            tab: "missed",
            effectiveStatus: "missed",
          });
          continue;
        }
        if (st === "completed") {
          rows.push({
            booking,
            slot,
            tab: "history",
            effectiveStatus: "completed",
          });
          continue;
        }
        if (
          (st === "booked" || st === "confirmed") &&
          slotEnd.getTime() <= now.getTime()
        ) {
          rows.push({
            booking,
            slot,
            tab: "history",
            effectiveStatus: "no_status",
          });
          continue;
        }
        if (
          (st === "booked" || st === "confirmed") &&
          slotEnd.getTime() > now.getTime() &&
          isAbandonedPending(booking)
        ) {
          rows.push({
            booking,
            slot,
            tab: "abandoned",
            effectiveStatus: "abandoned",
          });
          continue;
        }
        if (
          (st === "booked" || st === "confirmed") &&
          slotEnd.getTime() > now.getTime() &&
          !isAbandonedPending(booking) &&
          isAwaitingPayment
        ) {
          rows.push({
            booking,
            slot,
            tab: "upcoming",
            effectiveStatus: "awaiting_payment",
          });
          continue;
        }
        if (
          (st === "booked" || st === "confirmed") &&
          slotEnd.getTime() > now.getTime() &&
          !isAbandonedPending(booking) &&
          !isAwaitingPayment
        ) {
          rows.push({
            booking,
            slot,
            tab: "upcoming",
            effectiveStatus: "upcoming",
          });
        }
      }
    }

    return rows;
  }, [filteredBookings]);

  const counts = useMemo(() => {
    return {
      upcoming: allRows.filter((r) => r.tab === "upcoming").length,
      abandoned: allRows.filter((r) => r.tab === "abandoned").length,
      cancelled: allRows.filter((r) => r.tab === "cancelled").length,
      missed: allRows.filter((r) => r.effectiveStatus === "missed")
        .length,
      history: allRows.filter((r) => r.tab === "history").length,
    };
  }, [allRows]);

  const filteredSortedRows = useMemo(() => {
    let rows =
      tab === "missed"
        ? allRows.filter((r) => r.effectiveStatus === "missed")
        : allRows.filter((r) => r.tab === tab);

    if (tab === "history" && historyStatusFilter !== "all") {
      rows = rows.filter((r) => {
        if (historyStatusFilter === "no_status")
          return r.effectiveStatus === "no_status";
        if (historyStatusFilter === "completed")
          return r.effectiveStatus === "completed";
        if (historyStatusFilter === "missed")
          return r.effectiveStatus === "missed";
        return true;
      });
    }

    const sorted = [...rows].sort((a, b) => {
      const diff =
        getSlotEndDateTime(a.slot).getTime() - getSlotEndDateTime(b.slot).getTime();
      return sortOrder === "newest" ? -diff : diff;
    });
    return sorted;
  }, [allRows, tab, historyStatusFilter, sortOrder]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSortedRows.length / ITEMS_PER_PAGE),
  );
  const pagedRows = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredSortedRows.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSortedRows, page]);

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

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}
    >
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Booking Management</h2>
      </div>

      <div className=" pt-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <Tabs
            value={
              tab === "upcoming"
                ? 0
                : tab === "abandoned"
                  ? 1
                  : tab === "cancelled"
                    ? 2
                    : tab === "missed"
                      ? 3
                      : 4
            }
            onChange={(_, newValue) => {
              const nextTab: BookingTabKey =
                newValue === 0
                  ? "upcoming"
                  : newValue === 1
                    ? "abandoned"
                    : newValue === 2
                      ? "cancelled"
                      : newValue === 3
                        ? "missed"
                        : "history";

              setTab(nextTab);
              setPage(1);
              setHistoryStatusFilter("all");
            }}
            sx={{
              px: 2,
              pt: 2,
              "& .MuiTab-root": {
                minWidth: 120,
                fontWeight: 600,
              },
              "& .Mui-selected": {
                color: "#5fc2d3 !important",
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "#5fc2d3",
              },
            }}
          >
            <Tab label={`Upcoming (${counts.upcoming})`} />
            <Tab label={`Abandoned (${counts.abandoned})`} />
            <Tab label={`Cancelled (${counts.cancelled})`} />
            <Tab label={`Missed (${counts.missed})`} />
            <Tab label={`History (${counts.history})`} />
          </Tabs>

          <div className="flex flex-wrap gap-3 items-center">
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="booking-sort-label">Sort</InputLabel>
              <Select
                labelId="booking-sort-label"
                value={sortOrder}
                label="Sort"
                onChange={(e) => {
                  setSortOrder(e.target.value as SortOrder);
                  setPage(1);
                }}
              >
                <MenuItem value="newest">Newest to oldest</MenuItem>
                <MenuItem value="oldest">Oldest to newest</MenuItem>
              </Select>
            </FormControl>

            {tab === "history" && (
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="booking-history-status-label">
                  History Status
                </InputLabel>
                <Select
                  labelId="booking-history-status-label"
                  value={historyStatusFilter}
                  label="History Status"
                  onChange={(e) => {
                    setHistoryStatusFilter(
                      e.target.value as HistoryStatusFilter,
                    );
                    setPage(1);
                  }}
                >
                  <MenuItem value="all">All statuses</MenuItem>
                  <MenuItem value="no_status">No Status Set Yet</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="missed">Missed</MenuItem>
                </Select>
              </FormControl>
            )}
          </div>
        </div>
      </div>

      {filteredSortedRows.length > 0 && (
      <div className="overflow-x-auto mt-4">
        <table className="w-full min-w-[1024px] border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Student
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Email
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Date
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap">
                Time slot
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap">
                Lesson price (CHF)
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap">
                Final Price (CHF)
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                {tab === "cancelled" ? "Cancellation Time" : "Completion Date"}
              </th>
              {tab === "cancelled" && (
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                  Cancelled By
                </th>
              )}
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {pagedRows.map(({ booking, slot }) => {
              const isAwaitingPayment =
                String(slot.paymentStatus || "").toLowerCase() === "requires_action" ||
                String(slot.paymentStatus || "").toLowerCase() === "payment_failed";
              return (
              <React.Fragment key={`${booking._id}-${slot._id}`}>
              <tr className="hover:bg-gray-50 transition-colors duration-150">
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
                        {booking.studentId.firstName} {booking.studentId.lastName}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-700">
                    {booking.studentId.email}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{formatDate(slot.date)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 tabular-nums">
                    {formatLessonPriceChf(booking)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 tabular-nums">
                    {formatFinalPriceChf(booking)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusDropdown
                    currentStatus={slot.status}
                    paymentStatus={slot.paymentStatus}
                    slotId={slot._id}
                    bookingId={booking._id}
                    onStatusChange={handleStatusChange}
                    disabled={updateLoading}
                    lessonPassed={hasLessonPassed(slot)}
                    listTab={tab}
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {tab === "cancelled"
                      ? formatCancellationDateTime(
                          (
                            slot as { cancellationDate?: string; refundedAt?: string }
                          ).cancellationDate ||
                            (
                              slot as { cancellationDate?: string; refundedAt?: string }
                            ).refundedAt,
                        )
                      : formatCompletionDate(
                          (slot as { completionMarkedAt?: string }).completionMarkedAt,
                          slot.status,
                        )}
                  </div>
                </td>
                {tab === "cancelled" && (
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {getCancelledByLabel(
                        (slot as { cancelledBy?: string }).cancelledBy,
                      )}
                    </div>
                  </td>
                )}
                <td className="px-6 py-4">
                  <button
                    onClick={() => {
                      setSelectedBooking(booking);
                      setShowDetailsModal(true);
                    }}
                    className="bg-[#5FC2D3] hover:bg-[#3c8e9c] text-white px-4 py-2.5 text-xs font-semibold rounded-full transition-colors duration-150"
                  >
                    View Details
                  </button>
                </td>
              </tr>
              {isAwaitingPayment && (
                <tr>
                  <td
                    colSpan={tab === "cancelled" ? 10 : 9}
                    className="px-6 py-3 text-xs font-medium text-amber-800 bg-amber-50"
                  >
                    The student&apos;s payment has not been completed. The student must complete the payment before{" "}
                    {getPaymentDeadlineLabelByTimezone(slot)} (local time) /{" "}
                    {getPaymentDeadlineLabelByTimezone(slot, SLOT_BUSINESS_TIMEZONE)} (Switzerland time). Otherwise, the lesson will be automatically cancelled.
                  </td>
                </tr>
              )}
              </React.Fragment>
            )})}
          </tbody>
        </table>
      </div>
      )}

      {filteredSortedRows.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Calendar className="h-12 w-12 text-gray-300" />
            <p className="text-gray-500 text-lg">
              No{" "}
              {tab === "upcoming"
                ? "Upcoming"
                : tab === "abandoned"
                  ? "Abandoned"
                  : tab === "cancelled"
                    ? "Cancelled"
                    : tab === "missed"
                      ? "Missed"
                      : "History"}{" "}
              slots available
            </p>
            <p className="text-gray-400 text-sm">
              There are no lessons in this section.
            </p>
          </div>
        </div>
      )}

      {filteredSortedRows.length > 0 && (
        <div className="flex justify-center py-4">
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, v) => setPage(v)}
            color="primary"
            sx={{
              "& .MuiPaginationItem-root": {
                "&.Mui-selected": {
                  bgcolor: "#5fc2d3",
                  color: "white",
                  "&:hover": {
                    bgcolor: "#4bb1c2",
                  },
                },
              },
            }}
          />
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
