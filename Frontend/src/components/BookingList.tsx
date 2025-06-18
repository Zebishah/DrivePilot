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
import { useState } from "react";
import { Booking } from "../types/Student";

interface BookingListProps {
  bookings: Booking[];
  onBookingClick: (booking: Booking) => void;
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

  const filterBookingsByStatus = (bookings: Booking[], status: string) => {
    if (status === "all") return bookings;
    return bookings.filter(
      (booking) => booking.status.toLowerCase() === status
    );
  };

  const currentBookings = filterBookingsByStatus(
    bookings,
    tabValue === 0 ? "all" : tabValue === 1 ? "confirmed" : "cancelled"
  ).slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const filteredBookings = filterBookingsByStatus(
    bookings,
    tabValue === 0 ? "all" : tabValue === 1 ? "confirmed" : "cancelled"
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
          <Tab label={`All (${bookings.length})`} />
          <Tab
            label={`Confirmed (${filterBookingsByStatus(bookings, "confirmed").length})`}
          />
          <Tab
            label={`Cancelled (${filterBookingsByStatus(bookings, "cancelled").length})`}
          />
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
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: 3,
                    },
                  }}
                  onClick={() => onBookingClick(booking)}
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
                    <Typography
                      sx={{
                        px: 2,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor:
                          booking.status === "confirmed"
                            ? "rgba(0, 200, 83, 0.1)"
                            : booking.status === "cancelled"
                              ? "rgba(211, 47, 47, 0.1)"
                              : "rgba(255, 152, 0, 0.1)",
                        color:
                          booking.status === "confirmed"
                            ? "rgb(0, 200, 83)"
                            : booking.status === "cancelled"
                              ? "rgb(211, 47, 47)"
                              : "rgb(255, 152, 0)",
                        fontWeight: 600,
                      }}
                    >
                      {booking.status.toUpperCase()}
                    </Typography>
                  </Box>

                  <Grid container spacing={2}>
                    {booking.slots.map((slot, index) => (
                      <Grid item xs={12} sm={4} key={index}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: "rgba(95, 194, 211, 0.1)",
                          }}
                        >
                          <Typography variant="body2" fontWeight={600}>
                            {slot.startTime} - {slot.endTime}
                          </Typography>
                          <Typography
                            variant="caption"
                            display="block"
                            color="textSecondary"
                          >
                            {new Date(slot.date).toLocaleDateString([], {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </Typography>
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
              Bookings Available
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
