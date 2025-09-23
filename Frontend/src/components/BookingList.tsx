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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
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
    value: number
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

  const getSlotCounts = (bookings: Booking[]) => {
    const pastBookings = bookings
      .map((b) => ({
        ...b,
        slots: b.slots.filter(
          (s) => getSlotStartDateTime(s).getTime() < Date.now()
        ),
      }))
      .filter((b) => b.slots.length > 0);

    const allSlots = bookings.flatMap((b) => b.slots);
    const otherSlots = pastBookings.flatMap((b) => b.slots);
    const confirmedSlots = otherSlots.filter((s) => s.status === "booked");
    const cancelledSlots = otherSlots.filter((s) => s.status === "cancelled");
    const historySlots = allSlots.filter(
      (s) => getSlotStartDateTime(s).getTime() > Date.now()
    );

    return {
      all: allSlots.length,
      confirmed: confirmedSlots.length,
      cancelled: cancelledSlots.length,
      refund: otherSlots.filter((s) => s.status === "refund").length,
      history: historySlots.length,
    };
  };
  const pastBookings = bookings
    .map((b) => ({
      ...b,
      slots: b.slots.filter(
        (s) => getSlotStartDateTime(s).getTime() < Date.now()
      ),
    }))
    .filter((b) => b.slots.length > 0);

  // Future bookings: slots whose date+time is still ahead
  const futureBookings = bookings
    .map((b) => ({
      ...b,
      slots: b.slots.filter(
        (s) => getSlotStartDateTime(s).getTime() > Date.now()
      ),
    }))
    .filter((b) => b.slots.length > 0);
  const slotCounts = getSlotCounts(bookings);

  const filteredBookings =
    tabValue === 0 // ✅ Upcoming tab
      ? futureBookings
      : tabValue === 3 // ✅ History tab
        ? pastBookings
        : filterBookingsBySlotStatus(
            pastBookings,
            tabValue === 1 ? "cancelled" : tabValue === 2 ? "refund" : "all"
          );

  const sortedBookings = filteredBookings.sort((a, b) => {
    const aLatest = Math.max(
      ...a.slots.map((s) => getSlotStartDateTime(s).getTime())
    );
    const bLatest = Math.max(
      ...b.slots.map((s) => getSlotStartDateTime(s).getTime())
    );
    return bLatest - aLatest; // newest first
  });

  const currentBookings = sortedBookings.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
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
          <Tab label={`Upcoming (${slotCounts.confirmed})`} />
          <Tab label={`Cancelled (${slotCounts.cancelled})`} />
          <Tab label={`refund (${slotCounts.refund})`} />
          <Tab label={`History (${slotCounts.history})`} />
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
                          `/student-dashboard/search/instructors/${booking.instructorId._id}`
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
                          onClick={() => onBookingClick(booking, slot.id, slot)}
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
                            </Box>
                            <Typography
                              className="status-badge"
                              sx={{
                                px: 2,
                                py: 0.8,
                                mt: -3,
                                borderRadius: 2,
                                bgcolor:
                                  slot.status === "booked"
                                    ? "rgba(0, 200, 83, 0.15)"
                                    : slot.status === "cancelled"
                                      ? "rgba(211, 47, 47, 0.15)"
                                      : "rgba(255, 152, 0, 0.15)",
                                color:
                                  slot.status === "booked"
                                    ? "rgb(0, 170, 70)"
                                    : slot.status === "cancelled"
                                      ? "rgb(211, 47, 47)"
                                      : "rgb(255, 152, 0)",
                                fontWeight: 600,
                                fontSize: "0.75rem",
                                letterSpacing: "0.5px",
                                border: `1px solid ${
                                  slot.status === "booked"
                                    ? "rgba(0, 200, 83, 0.25)"
                                    : slot.status === "cancelled"
                                      ? "rgba(211, 47, 47, 0.25)"
                                      : "rgba(255, 152, 0, 0.25)"
                                }`,
                                transition:
                                  "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                              }}
                            >
                              {slot.status === "booked"
                                ? "CONFIRMED"
                                : slot.status.toUpperCase()}
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
                                onBookingClick(booking, slot.id, slot)
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
                ? ""
                : tabValue === 1
                  ? "Confirmed "
                  : "Cancelled "}
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
