import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Tabs,
  Tab,
  Stack,
  Pagination,
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
  const ITEMS_PER_PAGE = 5;
  const navigate = useNavigate();
  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number,
  ) => {
    setPage(value);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(1);
  };

  const filterBookingsBySlotStatus = (bookings: Booking[], status: string) => {
    if (status === "all") return bookings;

    return bookings
      .map((booking) => ({
        ...booking,
        slots: booking.slots.filter((slot) => {
          if (status === "confirmed") {
            return slot.status === "booked";
          } else if (status === "cancelled") {
            return slot.status === "cancelled";
          } else if (status === "refund") {
            return slot.status === "refund";
          }
          return true;
        }),
      }))
      .filter((booking) => booking.slots.length > 0); // Only return bookings that have slots matching the filter
  };

  const getSlotStartDateTime = (slot: Slot) =>
    new Date(`${slot.date}T${slot.startTime}`); // assumes date = "YYYY-MM-DD" and startTime = "HH:mm"
  const getSlotEndDateTime = (slot: Slot) =>
    new Date(`${slot.date}T${slot.endTime}`);

  /** Stripe checkout started but never completed (no payment, no card saved) — do not show as upcoming */
  const isAbandonedPending = (booking: Booking) =>
    booking.status === "pending" &&
    !booking.stripeCustomerId &&
    !(booking.slots ?? []).some((s) => s.paymentStatus === "paid");

  const categorizeBookings = (bookings: Booking[]) => {
    const now = new Date();
    const upcoming: Booking[] = [];
    const cancelled: Booking[] = [];
    const refund: Booking[] = [];
    const completed: Booking[] = [];
    const abandoned: Booking[] = [];

    bookings.forEach((booking) => {
      const upcomingSlots: Slot[] = [];
      const cancelledSlots: Slot[] = [];
      const refundSlots: Slot[] = [];
      const completedSlots: Slot[] = [];
      const abandonedSlots: Slot[] = [];

      booking.slots.forEach((slot) => {
        if (slot.status === "cancelled") {
          cancelledSlots.push(slot);
        } else if (slot.status === "refund") {
          refundSlots.push(slot);
        } else if (
          slot.status === "completed" ||
          getSlotEndDateTime(slot) <= now
        ) {
          completedSlots.push(slot);
        } else if (
          (slot.status === "booked" || slot.status === "confirmed") &&
          getSlotEndDateTime(slot) > now &&
          isAbandonedPending(booking)
        ) {
          abandonedSlots.push(slot);
        } else if (
          (slot.status === "booked" || slot.status === "confirmed") &&
          getSlotEndDateTime(slot) > now &&
          !isAbandonedPending(booking)
        ) {
          upcomingSlots.push(slot);
        } else {
          completedSlots.push(slot);
        }
      });

      if (upcomingSlots.length > 0)
        upcoming.push({ ...booking, slots: upcomingSlots });
      if (cancelledSlots.length > 0)
        cancelled.push({ ...booking, slots: cancelledSlots });
      if (refundSlots.length > 0)
        refund.push({ ...booking, slots: refundSlots });
      if (completedSlots.length > 0)
        completed.push({ ...booking, slots: completedSlots });
      if (abandonedSlots.length > 0)
        abandoned.push({ ...booking, slots: abandonedSlots });
    });

    return { upcoming, cancelled, refund, completed, abandoned };
  };

  const { upcoming, cancelled, refund, completed, abandoned } =
    categorizeBookings(bookings);

  const slotCounts = {
    upcoming: upcoming.reduce((acc, b) => acc + b.slots.length, 0),
    cancelled: cancelled.reduce((acc, b) => acc + b.slots.length, 0),
    refund: refund.reduce((acc, b) => acc + b.slots.length, 0),
    completed: completed.reduce((acc, b) => acc + b.slots.length, 0),
    abandoned: abandoned.reduce((acc, b) => acc + b.slots.length, 0),
  };

  let filteredBookings: Booking[] = [];
  switch (tabValue) {
    case 0:
      filteredBookings = upcoming;
      break;
    case 1:
      filteredBookings = abandoned;
      break;
    case 2:
      filteredBookings = cancelled;
      break;
    case 3:
      filteredBookings = refund;
      break;
    case 4:
      filteredBookings = completed;
      break;
    default:
      filteredBookings = upcoming;
  }

  // Sort newest first
  const sortedBookings = filteredBookings.sort((a, b) => {
    const aLatest = Math.max(
      ...a.slots.map((s) => getSlotEndDateTime(s).getTime()),
    );
    const bLatest = Math.max(
      ...b.slots.map((s) => getSlotEndDateTime(s).getTime()),
    );
    return bLatest - aLatest;
  });

  const currentBookings = sortedBookings.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );
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
          <Tab label={`Refund (${slotCounts.refund})`} />
          <Tab label={`Completed (${slotCounts.completed})`} />
        </Tabs>
      </Box>

      <CardContent>
        {filteredBookings.length > 0 ? (
          <>
            <Stack spacing={2}>
              {currentBookings.map((booking) => (
                <Card
                  key={booking._id}
                  sx={{
                    p: 2,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: 3,
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="h6">
                        {booking.instructorId.firstName}{" "}
                        {booking.instructorId.lastName}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {booking.instructorId.email}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => {
                        navigate(
                          `/student-dashboard/search/instructors/${booking.instructorId._id}`,
                        );
                      }}
                      sx={{
                        bgcolor: "#5fc2d3",
                        color: "white",
                        fontWeight: 600,
                        borderRadius: 2,
                        py: 1,
                        fontSize: "0.8rem",
                        textTransform: "none",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          bgcolor: "#4bb1c2",
                          transform: "translateY(-1px)",
                          boxShadow: "0 4px 12px rgba(95, 194, 211, 0.3)",
                        },
                        "&:active": {
                          transform: "translateY(0)",
                        },
                      }}
                    >
                      View Instructor
                    </Button>
                  </Box>

                  <Grid container spacing={2}>
                    {booking.slots.map((slot, index) => (
                      <Grid item xs={12} sm={4} key={index}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 3,
                            background:
                              "linear-gradient(135deg, rgba(95, 194, 211, 0.08) 0%, rgba(95, 194, 211, 0.15) 100%)",
                            border: "1px solid rgba(95, 194, 211, 0.2)",
                            position: "relative",
                            overflow: "hidden",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            "&:hover": {
                              transform: "translateY(-3px) scale(1.02)",
                              boxShadow: "0 8px 20px rgba(95, 194, 211, 0.25)",
                              background:
                                "linear-gradient(135deg, rgba(95, 194, 211, 0.12) 0%, rgba(95, 194, 211, 0.22) 100%)",
                              border: "1px solid rgba(95, 194, 211, 0.35)",
                              "&::before": {
                                opacity: 1,
                              },
                              "& .slot-time": {
                                color: "#4bb1c2",
                              },
                              "& .slot-date": {
                                color: "#5fc2d3",
                              },
                              "& .status-badge": {
                                transform: "scale(1.05)",
                                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                              },
                            },
                            "&::before": {
                              content: '""',
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background:
                                "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
                              opacity: 0,
                              transition: "opacity 0.3s ease",
                              cursor: "pointer",
                            },
                            "&:active": {
                              transform: "translateY(-1px) scale(1.01)",
                            },
                          }}
                          onClick={() =>
                            onBookingClick(booking, slot._id, slot)
                          }
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              width: "100%",
                              position: "relative",
                              zIndex: 1,
                              mb: 2,
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 0.5,
                              }}
                            >
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                className="slot-time"
                                sx={{
                                  color: "#2c5282",
                                  transition: "color 0.3s ease",
                                  mb: 0.5,
                                }}
                              >
                                {slot.startTime} - {slot.endTime}
                              </Typography>
                              <Typography
                                variant="caption"
                                display="block"
                                className="slot-date"
                                sx={{
                                  color: "rgba(44, 82, 130, 0.7)",
                                  transition: "color 0.3s ease",
                                  fontWeight: 500,
                                }}
                              >
                                {new Date(slot.date).toLocaleDateString([], {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </Typography>
                              {tabValue === 0 && (
                                <Typography
                                  component="span"
                                  variant="caption"
                                  sx={{
                                    display: "inline-block",
                                    mt: 0.5,
                                    px: 1,
                                    py: 0.25,
                                    borderRadius: 1,
                                    fontWeight: 600,
                                    fontSize: "0.65rem",
                                    letterSpacing: "0.3px",
                                    alignSelf: "flex-start",
                                    ...(String((slot as { paymentStatus?: string }).paymentStatus) === "paid"
                                      ? {
                                          bgcolor: "rgba(0, 200, 83, 0.15)",
                                          color: "rgb(0, 150, 60)",
                                          border: "1px solid rgba(0, 200, 83, 0.35)",
                                        }
                                      : {
                                          bgcolor: "rgba(255, 152, 0, 0.15)",
                                          color: "rgb(200, 120, 0)",
                                          border: "1px solid rgba(255, 152, 0, 0.35)",
                                        }),
                                  }}
                                >
                                  {String((slot as { paymentStatus?: string }).paymentStatus) === "paid"
                                    ? "Paid"
                                    : "Unpaid (T-48)"}
                                </Typography>
                              )}
                            </Box>
                            <Typography
                              className="status-badge"
                              sx={{
                                px: 2,
                                py: 0.8,
                                mt: -3,
                                borderRadius: 2,
                                bgcolor:
                                  tabValue === 1
                                    ? "rgba(158, 158, 158, 0.2)"
                                    : tabValue === 2
                                      ? "rgba(211, 47, 47, 0.15)"
                                      : tabValue === 3
                                        ? "rgba(255, 152, 0, 0.15)"
                                        : tabValue === 4
                                          ? "rgba(0, 200, 83, 0.15)"
                                          : "rgba(0, 200, 83, 0.15)",
                                color:
                                  tabValue === 1
                                    ? "rgb(97, 97, 97)"
                                    : tabValue === 2
                                      ? "rgb(211, 47, 47)"
                                      : tabValue === 3
                                        ? "rgb(255, 152, 0)"
                                        : tabValue === 4
                                          ? "rgb(0, 170, 70)"
                                          : "rgb(0, 170, 70)",
                                fontWeight: 600,
                                fontSize: "0.75rem",
                                letterSpacing: "0.5px",
                                border: `1px solid ${
                                  tabValue === 1
                                    ? "rgba(158, 158, 158, 0.4)"
                                    : tabValue === 2
                                      ? "rgba(211, 47, 47, 0.25)"
                                      : tabValue === 3
                                        ? "rgba(255, 152, 0, 0.25)"
                                        : "rgba(0, 200, 83, 0.25)"
                                }`,
                                transition:
                                  "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                              }}
                            >
                              {tabValue === 0
                                ? "UPCOMING"
                                : tabValue === 1
                                  ? "ABANDONED"
                                  : tabValue === 2
                                    ? "CANCELLED"
                                    : tabValue === 3
                                      ? "REFUND"
                                      : "COMPLETED"}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "row",
                              gap: 1,
                              mt: -3,
                            }}
                          >
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<VisibilityIcon />}
                              onClick={() =>
                                onBookingClick(booking, slot._id, slot)
                              }
                              sx={{
                                bgcolor: "rgba(95, 194, 211, 0.08)",
                                color: "#5fc2d3",
                                border: "1px solid #5fc2d3",
                                fontWeight: 550,
                                borderRadius: 2,
                                py: 0.5,
                                fontSize: "0.7rem",
                                marginLeft: "auto",
                                textTransform: "none",
                                transition: "all 0.3s ease",
                                "&:hover": {
                                  bgcolor: "rgba(95, 194, 211, 0.15)",
                                  borderColor: "#4bb1c2",
                                  color: "#4bb1c2",
                                  transform: "translateY(-1px)",
                                  boxShadow:
                                    "0 4px 12px rgba(95, 194, 211, 0.3)",
                                },
                                "&:active": {
                                  transform: "translateY(0)",
                                },
                              }}
                            >
                              View Details
                            </Button>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Card>
              ))}
            </Stack>

            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination
                count={Math.ceil(filteredBookings.length / ITEMS_PER_PAGE)}
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
                      ? "Refund"
                      : "Completed"}{" "}
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
