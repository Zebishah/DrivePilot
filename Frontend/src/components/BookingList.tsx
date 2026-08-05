import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Tabs,
  Tab,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Booking } from "../types/Student";
import { Slot } from "../types/Bookings";
import { useNavigate } from "react-router-dom";

dayjs.extend(utc);
dayjs.extend(timezone);

/** Must match server `SLOT_TIMEZONE` / `slotTimezone.js` default (lesson wall-clock is business TZ). */
const SLOT_BUSINESS_TIMEZONE =
  import.meta.env.VITE_SLOT_TIMEZONE || "Europe/Zurich";

function parseSlotStartUtcMs(slot: Slot): number {
  const raw = typeof slot.startTime === "string" ? slot.startTime : "";
  const normalized = raw.length === 5 ? `${raw}:00` : raw;
  const parsed = dayjs.tz(
    `${slot.date} ${normalized}`,
    "YYYY-MM-DD HH:mm:ss",
    SLOT_BUSINESS_TIMEZONE,
  );
  const ms = parsed.valueOf();
  return Number.isFinite(ms) ? ms : NaN;
}

function parseSlotEndUtcMs(slot: Slot): number {
  const raw = typeof slot.endTime === "string" ? slot.endTime : "";
  const normalized = raw.length === 5 ? `${raw}:00` : raw || "23:59:59";
  const parsed = dayjs.tz(
    `${slot.date} ${normalized}`,
    "YYYY-MM-DD HH:mm:ss",
    SLOT_BUSINESS_TIMEZONE,
  );
  const ms = parsed.valueOf();
  return Number.isFinite(ms) ? ms : NaN;
}

interface BookingListProps {
  bookings: Booking[];
  onBookingClick: (booking: Booking, id: string, slot: Slot) => void;
  onRequestRefund?: (booking: Booking, slot: Slot) => void;
  refundRequestStateMap?: Record<string, "pending" | "approved" | "rejected">;
  showNewBookingButton?: boolean;
  onNewBooking?: () => void;
}

export const BookingList: React.FC<BookingListProps> = ({
  bookings,
  onBookingClick,
  onRequestRefund,
  refundRequestStateMap = {},
  showNewBookingButton = true,
  onNewBooking,
}) => {
  const [page, setPage] = useState(1);
  const [tabValue, setTabValue] = useState(0);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<
    "all" | "no_status" | "completed" | "missed"
  >("all");
  const ITEMS_PER_PAGE = 10;
  const navigate = useNavigate();
  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(1);
    setHistoryStatusFilter("all");
  };

  const getSlotEndDateTime = (slot: Slot) => {
    const ms = parseSlotEndUtcMs(slot);
    return Number.isFinite(ms) ? new Date(ms) : new Date(NaN);
  };

  const formatSlotDateForViewer = (slot: Slot) => {
    const ms = parseSlotStartUtcMs(slot);
    if (!Number.isFinite(ms)) {
      return new Date(slot.date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    return new Date(ms).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatSlotTimeForViewer = (slot: Slot) => {
    const startMs = parseSlotStartUtcMs(slot);
    const endMs = parseSlotEndUtcMs(slot);
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
  };

  const formatSlotTimeForSwiss = (slot: Slot) => {
    const startMs = parseSlotStartUtcMs(slot);
    const endMs = parseSlotEndUtcMs(slot);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      return `${slot.startTime} - ${slot.endTime}`;
    }
    const startLabel = new Date(startMs).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: SLOT_BUSINESS_TIMEZONE,
    });
    const endLabel = new Date(endMs).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: SLOT_BUSINESS_TIMEZONE,
    });
    return `${startLabel} - ${endLabel}`;
  };

  /** Base lesson price per slot (uses totalAmount), in CHF */
  const formatLessonPrice = (booking: Booking) => {
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
  const formatFinalPrice = (booking: Booking) => {
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

  /** Stripe checkout started but never completed (no payment, no card saved) — do not show as upcoming */
  const isAbandonedPending = (booking: Booking) =>
    booking.status === "pending" &&
    !booking.stripeCustomerId &&
    !(booking.slots ?? []).some((s) => s.paymentStatus === "paid");

  type BookingTab = "upcoming" | "abandoned" | "cancelled" | "history";
  type BookingRow = {
    booking: Booking;
    slot: Slot;
    tab: BookingTab;
    effectiveStatus:
      | "upcoming"
      | "cancelled"
      | "refunded"
      | "missed"
      | "completed"
      | "no_status"
      | "abandoned"
      | "awaiting_payment";
  };

  const slotNeedsPayment = (slot: Slot) =>
    slot.paymentStatus === "requires_action" ||
    slot.paymentStatus === "payment_failed";

  const getPaymentDeadlineDate = (slot: Slot) => {
    if (slot.paymentReminderDeadlineAt) return new Date(slot.paymentReminderDeadlineAt);
    if (slot.paymentReminderStartedAt) {
      return new Date(new Date(slot.paymentReminderStartedAt).getTime() + 24 * 60 * 60 * 1000);
    }
    return null;
  };

  const formatPaymentDeadline = (slot: Slot) => {
    const d = getPaymentDeadlineDate(slot);
    if (!d || Number.isNaN(d.getTime())) return "the deadline";
    return d.toLocaleString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const categorizeRows = (bookings: Booking[]) => {
    const now = new Date();
    const rows: BookingRow[] = [];

    bookings.forEach((booking) => {
      booking.slots.forEach((slot) => {
        const slotEnd = getSlotEndDateTime(slot);

        if (slot.status === "cancelled") {
          rows.push({
            booking,
            slot,
            tab: "cancelled",
            effectiveStatus: "cancelled",
          });
        } else if (slot.status === "refund") {
          rows.push({
            booking,
            slot,
            tab: "cancelled",
            effectiveStatus: "refunded",
          });
        } else if (slot.status === "missed") {
          rows.push({
            booking,
            slot,
            tab: "missed",
            effectiveStatus: "missed",
          });
        } else if (slot.status === "completed") {
          rows.push({
            booking,
            slot,
            tab: "history",
            effectiveStatus: "completed",
          });
        } else if (
          (slot.status === "booked" || slot.status === "confirmed") &&
          slotEnd <= now
        ) {
          rows.push({
            booking,
            slot,
            tab: "history",
            effectiveStatus: "no_status",
          });
        } else if (
          (slot.status === "booked" || slot.status === "confirmed") &&
          slotEnd > now &&
          slotNeedsPayment(slot)
        ) {
          rows.push({
            booking,
            slot,
            tab: "upcoming",
            effectiveStatus: "awaiting_payment",
          });
        } else if (
          (slot.status === "booked" || slot.status === "confirmed") &&
          slotEnd > now &&
          isAbandonedPending(booking)
        ) {
          rows.push({
            booking,
            slot,
            tab: "abandoned",
            effectiveStatus: "abandoned",
          });
        } else if (
          (slot.status === "booked" || slot.status === "confirmed") &&
          slotEnd > now &&
          !isAbandonedPending(booking)
        ) {
          rows.push({
            booking,
            slot,
            tab: "upcoming",
            effectiveStatus: "upcoming",
          });
        }
      });
    });

    return rows;
  };

  const allRows = categorizeRows(bookings);

  const slotCounts = {
    upcoming: allRows.filter((r) => r.tab === "upcoming").length,
    abandoned: allRows.filter((r) => r.tab === "abandoned").length,
    cancelled: allRows.filter((r) => r.tab === "cancelled").length,
    missed: allRows.filter((r) => r.effectiveStatus === "missed").length,
    history: allRows.filter((r) => r.tab === "history").length,
  };

  let filteredRows: BookingRow[] = [];
  switch (tabValue) {
    case 0:
      filteredRows = allRows.filter((r) => r.tab === "upcoming");
      break;
    case 1:
      filteredRows = allRows.filter((r) => r.tab === "abandoned");
      break;
    case 2:
      filteredRows = allRows.filter((r) => r.tab === "cancelled");
      break;
    case 3:
      filteredRows = allRows.filter((r) => r.effectiveStatus === "missed");
      break;
    case 4:
      filteredRows = allRows.filter((r) => r.tab === "history");
      break;
    default:
      filteredRows = allRows.filter((r) => r.tab === "upcoming");
  }

  if (tabValue === 4 && historyStatusFilter !== "all") {
    filteredRows = filteredRows.filter((r) => {
      if (historyStatusFilter === "no_status") return r.effectiveStatus === "no_status";
      if (historyStatusFilter === "completed") return r.effectiveStatus === "completed";
      if (historyStatusFilter === "missed") return r.effectiveStatus === "missed";
      return true;
    });
  }

  const sortedRows = [...filteredRows].sort((a, b) => {
    const diff = getSlotEndDateTime(a.slot).getTime() - getSlotEndDateTime(b.slot).getTime();
    return sortOrder === "newest" ? -diff : diff;
  });

  const currentRows = sortedRows.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const getDisplayStatus = (row: BookingRow) => {
    if (row.effectiveStatus === "awaiting_payment") return "Awaiting Payment";
    if (row.tab === "upcoming") return "Upcoming";
    if (row.tab === "abandoned") return "Abandoned";
    if (row.tab === "cancelled") {
      if (row.effectiveStatus === "refunded") return "Refunded";
      return "Cancelled";
    }
    if (row.effectiveStatus === "no_status") return "No Status Set Yet";
    if (row.effectiveStatus === "completed") return "Completed";
    return "Missed";
  };

  function getCancelledByLabel(cancelledBy?: string) {
    if (cancelledBy === "student") return "Student";
    if (cancelledBy === "instructor") return "Instructor";
    if (cancelledBy === "admin") return "Admin";
    return "Unknown";
  }
  const getStatusChipColor = (status: string) => {
    if (status === "Refunded") return "warning";
    if (status === "Upcoming") return "info";
    if (status === "Awaiting Payment") return "warning";
    if (status === "Cancelled") return "error";
    if (status === "Missed") return "warning";
    if (status === "Completed") return "success";
    if (status === "No Status Set Yet") return "warning";
    return "default";
  };
  const parseFlexibleDate = (value?: string) => {
    if (!value) return null;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      const d = new Date(numeric < 1_000_000_000_000 ? numeric * 1000 : numeric);
      if (!Number.isNaN(d.getTime())) return d;
    }
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
    return null;
  };
  const formatCancellationDateTime = (value?: string) => {
    const d = parseFlexibleDate(value);
    if (!d) return "—";
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const formatCompletionDate = (slot: Slot) => {
    if (String(slot.status || "").toLowerCase() !== "completed") return "—";
    if (!slot.completionMarkedAt) return "—";
    const d = parseFlexibleDate(slot.completionMarkedAt);
    if (!d) return "—";
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getPaymentDisplay = (slot: Slot) => {
    const slotStatus = String(slot.status || "").toLowerCase();
    const paymentStatus = String(slot.paymentStatus || "").toLowerCase();
    const isCancelledLike = slotStatus === "cancelled" || slotStatus === "refund";
    if (
      isCancelledLike &&
      (paymentStatus === "requires_action" ||
        paymentStatus === "payment_failed" ||
        paymentStatus === "pending_payment")
    ) {
      return { label: "Not Paid In Time", color: "error" as const };
    }
    if (paymentStatus === "paid") {
      return { label: "Paid", color: "success" as const };
    }
    if (paymentStatus === "requires_action" || paymentStatus === "payment_failed") {
      return { label: "Action Required", color: "warning" as const };
    }
    if (paymentStatus === "refunded") {
      return { label: "Refunded", color: "default" as const };
    }
    if (paymentStatus === "pending_payment") {
      const startMs = parseSlotStartUtcMs(slot);
      const t48 = startMs - 48 * 60 * 60 * 1000;
      if (Number.isFinite(t48) && Date.now() >= t48) {
        return { label: "Due Now (T-48)", color: "warning" as const };
      }
      return { label: "Pending (T-48)", color: "info" as const };
    }
    return { label: "—", color: "default" as const };
  };

  const formatT48Instant = (t48Ms: number, timeZone?: string) =>
    new Date(t48Ms).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      ...(timeZone ? { timeZone } : {}),
    });

  const getT48Display = (slot: Slot) => {
    const startMs = parseSlotStartUtcMs(slot);
    if (!Number.isFinite(startMs)) return null;
    const t48Ms = startMs - 48 * 60 * 60 * 1000;
    if (Number.isNaN(new Date(t48Ms).getTime())) return null;
    return {
      yourTime: formatT48Instant(t48Ms),
      switzerlandTime: formatT48Instant(t48Ms, SLOT_BUSINESS_TIMEZONE),
    };
  };

  return (
    <Card sx={{ mb: 3, mt: 2 }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{
            px: 2,
            pt: 2,
            "& .MuiTab-root": {
              minWidth: 100,
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
          <Tab label={`Upcoming (${slotCounts.upcoming})`} />
          <Tab label={`Abandoned (${slotCounts.abandoned})`} />
          <Tab label={`Cancelled (${slotCounts.cancelled})`} />
          <Tab label={`Missed (${slotCounts.missed})`} />
          <Tab label={`History (${slotCounts.history})`} />
        </Tabs>
      </Box>

      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mb: 2, flexWrap: "wrap" }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Sort</InputLabel>
            <Select
              value={sortOrder}
              label="Sort"
              onChange={(e) => {
                setSortOrder(e.target.value as "newest" | "oldest");
                setPage(1);
              }}
            >
              <MenuItem value="newest">Newest to oldest</MenuItem>
              <MenuItem value="oldest">Oldest to newest</MenuItem>
            </Select>
          </FormControl>

          {tabValue === 4 && (
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>History Status</InputLabel>
              <Select
                value={historyStatusFilter}
                label="History Status"
                onChange={(e) => {
                  setHistoryStatusFilter(
                    e.target.value as "all" | "no_status" | "completed" | "missed",
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
        </Box>

        {filteredRows.length > 0 ? (
          <>
            <TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
              <Table
                size="small"
                sx={{
                  minWidth: 1024,
                  "& .MuiTableCell-root": {
                    py: 1.6,
                    px: 2,
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>Instructor</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>Time slot</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>Lesson price (CHF)</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>Final Price (CHF)</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Payment</TableCell>
                    <TableCell>
                      {tabValue === 2 ? "Cancellation Time" : "Info"}
                    </TableCell>
                    {tabValue === 2 && <TableCell>Cancelled By</TableCell>}
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentRows.map((row) => {
                    const statusLabel = getDisplayStatus(row);
                    const t48Lines = getT48Display(row.slot);
                    const rowStatus = String(row.slot.status || "").toLowerCase();
                    const rowPaymentStatus = String(
                      row.slot.paymentStatus || "",
                    ).toLowerCase();
                    const isPaymentRelatedCancelled =
                      row.tab === "cancelled" &&
                      (rowStatus === "cancelled" || rowStatus === "refund") &&
                      (rowPaymentStatus === "requires_action" ||
                        rowPaymentStatus === "payment_failed" ||
                        rowPaymentStatus === "pending_payment");
                    return (
                      <>
                        <TableRow key={`${row.booking._id}-${row.slot._id}`}>
                          <TableCell>
                            {row.booking.instructorId.firstName} {row.booking.instructorId.lastName}
                          </TableCell>
                          <TableCell>{row.booking.instructorId.email}</TableCell>
                          <TableCell>
                            {formatSlotDateForViewer(row.slot)}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                              <Typography variant="body2">
                                {formatSlotTimeForViewer(row.slot)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ({`Switzerland: ${formatSlotTimeForSwiss(row.slot)}`})
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                            {formatLessonPrice(row.booking)}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                            {formatFinalPrice(row.booking)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={statusLabel}
                              color={getStatusChipColor(statusLabel)}
                              size="small"
                              variant={statusLabel === "No Status Set Yet" ? "outlined" : "filled"}
                              sx={{
                                px: 1.3,
                                py: 0.7,
                                borderRadius: 2.5,
                                minHeight: 30,
                                fontWeight: 600,
                                "& .MuiChip-label": {
                                  px: 1.2,
                                  py: 0.25,
                                },
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                              <Chip
                                label={getPaymentDisplay(row.slot).label}
                                color={getPaymentDisplay(row.slot).color}
                                size="small"
                                variant="outlined"
                                sx={{
                                  px: 1.1,
                                  py: 0.6,
                                  borderRadius: 2.5,
                                  minHeight: 30,
                                  fontWeight: 600,
                                  width: "fit-content",
                                }}
                              />
                              {["pending_payment"].includes(
                                String(row.slot.paymentStatus || "").toLowerCase(),
                              ) &&
                                t48Lines && (
                                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ lineHeight: 1.2 }}
                                    >
                                      T-48 at (your local time): {t48Lines.yourTime}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ lineHeight: 1.2 }}
                                    >
                                      T-48 at (Switzerland / lesson time): {t48Lines.switzerlandTime}
                                    </Typography>
                                  </Box>
                                )}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ minWidth: 280 }}>
                            {tabValue === 2
                              ? formatCancellationDateTime(
                                  (row.slot as { cancellationDate?: string; refundedAt?: string })
                                    .cancellationDate ||
                                    (row.slot as { cancellationDate?: string; refundedAt?: string })
                                      .refundedAt,
                                )
                              : formatCompletionDate(row.slot)}
                          </TableCell>
                          {tabValue === 2 && (
                            <TableCell>{getCancelledByLabel(
                              (row.slot as { cancelledBy?: string }).cancelledBy,
                            )}</TableCell>
                          )}
                          <TableCell align="right">
                            <Box sx={{ display: "inline-flex", gap: 1 }}>
                              {row.effectiveStatus === "awaiting_payment" && (
                                <Button
                                  variant="contained"
                                  size="small"
                                  onClick={() =>
                                    navigate(
                                      `/student-dashboard/complete-payment?bookingId=${row.booking._id}&slotId=${row.slot._id}`,
                                    )
                                  }
                                  sx={{
                                    bgcolor: "#f59e0b",
                                    "&:hover": { bgcolor: "#d97706" },
                                    borderRadius: 2.5,
                                    px: 1.8,
                                    py: 0.8,
                                    fontWeight: 600,
                                  }}
                                >
                                  Complete Checkout
                                </Button>
                              )}
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<VisibilityIcon />}
                                onClick={() => onBookingClick(row.booking, row.slot._id, row.slot)}
                                sx={{
                                  borderRadius: 2.5,
                                  px: 1.8,
                                  py: 0.8,
                                  fontWeight: 600,
                                }}
                              >
                                View Details
                              </Button>
                              {tabValue === 2 && onRequestRefund && (
                                <Button
                                  variant="contained"
                                  size="small"
                                  disabled={(() => {
                                    const refundKey = `${row.booking._id}:${row.slot._id}`;
                                    const requestStatus = refundRequestStateMap[refundKey];
                                    const slotStatus = String(row.slot.status || "").toLowerCase();
                                    const slotIsPaid =
                                      String((row.slot as { paymentStatus?: string }).paymentStatus || "")
                                        .toLowerCase() === "paid" ||
                                      (row.slot as { chargeAmount?: number }).chargeAmount != null;
                                    const slotEnd = getSlotEndDateTime(row.slot);
                                    const lessonPassed = slotEnd.getTime() < Date.now();
                                    return (
                                      slotStatus !== "cancelled" ||
                                      !slotIsPaid ||
                                      lessonPassed ||
                                      Boolean(requestStatus)
                                    );
                                  })()}
                                  onClick={() => onRequestRefund(row.booking, row.slot)}
                                  sx={{
                                    bgcolor: "#8b5cf6",
                                    "&:hover": { bgcolor: "#7c3aed" },
                                    borderRadius: 2.5,
                                    px: 1.8,
                                    py: 0.8,
                                    fontWeight: 600,
                                  }}
                                >
                                  Request Refund
                                </Button>
                              )}
                              <Button
                                variant="contained"
                                size="small"
                                onClick={() =>
                                  navigate(
                                    `/student-dashboard/search/instructors/${row.booking.instructorId._id}`,
                                  )
                                }
                                sx={{
                                  bgcolor: "#5fc2d3",
                                  "&:hover": { bgcolor: "#4bb1c2" },
                                  borderRadius: 2.5,
                                  px: 1.8,
                                  py: 0.8,
                                  fontWeight: 600,
                                }}
                              >
                                View Instructor
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                        {row.effectiveStatus === "awaiting_payment" && (
                          <TableRow>
                            <TableCell colSpan={tabValue === 2 ? 11 : 10} sx={{ py: 1.2, bgcolor: "#fff7ed" }}>
                              <Typography variant="caption" color="warning.dark" sx={{ fontWeight: 600 }}>
                                Please complete your payment before {formatPaymentDeadline(row.slot)}. Otherwise, your lesson will be automatically cancelled.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                        {isPaymentRelatedCancelled && (
                          <TableRow>
                            <TableCell
                              colSpan={tabValue === 2 ? 11 : 10}
                              sx={{ py: 1.2, bgcolor: "#fef2f2" }}
                            >
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: 600, color: "#991b1b" }}
                              >
                                This slot is cancelled and not available because
                                payment was not completed before the deadline.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination
                count={Math.ceil(filteredRows.length / ITEMS_PER_PAGE)}
                page={page}
                onChange={handlePageChange}
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
            </Box>
          </>
        ) : (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No{" "}
              {tabValue === 0
                ? "Upcoming"
                : tabValue === 1
                  ? "Abandoned"
                  : tabValue === 2
                    ? "Cancelled"
                    : tabValue === 3
                      ? "Missed"
                      : "History"}{" "}
              Slots Available
            </Typography>
            {showNewBookingButton && (
              <Button
                variant="contained"
                onClick={onNewBooking}
                sx={{
                  mt: 2,
                  bgcolor: "#5fc2d3",
                  "&:hover": {
                    bgcolor: "#4bb1c2",
                  },
                }}
              >
                Book a Lesson
              </Button>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
