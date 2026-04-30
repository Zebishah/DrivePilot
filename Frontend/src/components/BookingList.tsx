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
import { Booking } from "../types/Student";
import { Slot } from "../types/Bookings";
import { useNavigate } from "react-router-dom";

interface BookingListProps {
  bookings: Booking[];
  onBookingClick: (booking: Booking, id: string, slot: Slot) => void;
  showNewBookingButton?: boolean;
  onNewBooking?: () => void;
}

export const BookingList: React.FC<BookingListProps> = ({
  bookings,
  onBookingClick,
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

  const getSlotEndDateTime = (slot: Slot) =>
    new Date(`${slot.date}T${slot.endTime}`);

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
    effectiveStatus: "upcoming" | "cancelled" | "missed" | "completed" | "no_status" | "abandoned";
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
            effectiveStatus: "cancelled",
          });
        } else if (slot.status === "missed") {
          rows.push({
            booking,
            slot,
            tab: "history",
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
    if (row.tab === "upcoming") return "Upcoming";
    if (row.tab === "abandoned") return "Abandoned";
    if (row.tab === "cancelled") return "Cancelled";
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
    if (status === "Upcoming") return "info";
    if (status === "Cancelled") return "error";
    if (status === "Missed") return "warning";
    if (status === "Completed") return "success";
    if (status === "No Status Set Yet") return "warning";
    return "default";
  };
  const formatCompletionDate = (slot: Slot) => {
    if (String(slot.status || "").toLowerCase() !== "completed") return "—";
    if (!slot.completionMarkedAt) return "—";
    const numericTs = Number(slot.completionMarkedAt);
    const d = Number.isFinite(numericTs)
      ? new Date(numericTs)
      : new Date(slot.completionMarkedAt);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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
            <TableContainer component={Paper} variant="outlined">
              <Table
                size="small"
                sx={{
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
                    <TableCell>Time Slot</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Completion Date</TableCell>
                    <TableCell>Lesson price (CHF)</TableCell>
                    <TableCell>Final Price (CHF)</TableCell>
                    {tabValue === 2 && <TableCell>Cancelled By</TableCell>}
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentRows.map((row) => {
                    const statusLabel = getDisplayStatus(row);
                    return (
                      <TableRow key={`${row.booking._id}-${row.slot._id}`}>
                        <TableCell>
                          {row.booking.instructorId.firstName} {row.booking.instructorId.lastName}
                        </TableCell>
                        <TableCell>{row.booking.instructorId.email}</TableCell>
                        <TableCell>
                          {new Date(row.slot.date).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          {row.slot.startTime} - {row.slot.endTime}
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
                        <TableCell>{formatCompletionDate(row.slot)}</TableCell>
                        <TableCell>{formatLessonPrice(row.booking)}</TableCell>
                        <TableCell>{formatFinalPrice(row.booking)}</TableCell>
                        {tabValue === 2 && (
                          <TableCell>{getCancelledByLabel(
                            (row.slot as { cancelledBy?: string }).cancelledBy,
                          )}</TableCell>
                        )}
                        <TableCell align="right">
                          <Box sx={{ display: "inline-flex", gap: 1 }}>
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
