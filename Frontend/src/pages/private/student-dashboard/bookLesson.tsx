import {
  Box,
  Typography,
  Avatar,
  Card,
  CardContent,
  Grid,
  Button,
  Divider,
  Skeleton,
  Pagination,
  Stack,
  Tabs,
  Tab,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChatIcon from "@mui/icons-material/Chat";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import { GET_STUDENT_BOOKINGS } from "../../../graphql/mutations/studentBooking";
import { BookingList } from "../../../components/BookingList";
import { getSlotDurationInHours } from "../../../components/StudentComponents/GetSlotDurationInHours";
import { BackButton } from "../../../components/InstructorComponent/common/BackButton";
import { Slot } from "../../../types/Bookings";

interface AvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
  booked: boolean;
  status: string; // Assuming status is a string like "available", "booked",
}

// interface InstructorData {
//   id: string;
//   name: string;
//   email: string;
//   description: string;
//   lessonFee: number;
// }

interface Booking {
  _id: string;
  instructorId: {
    firstName: string;
    lastName: string;
    email: string;
    description: string;
  };
  slots: AvailabilitySlot[];
  status: string;
  createdAt: string;
  initialAmount: number;
  finalAmount: number;
  teacherTariff: {
    lessonFee: number;
    finalPricePerLesson: number;
    lessonDiscount: number;
  };
}

const BookLesson: React.FC = () => {
  const location = useLocation();
  const { selectedAvailability, instructorData, fromSearch } =
    location.state || {};
  const navigate = useNavigate();

  const { loading, error, data, refetch } = useQuery(GET_STUDENT_BOOKINGS, {
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
  });

  const [page, setPage] = useState(1);
  const [tabValue, setTabValue] = useState(0);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    // Fetch data when component mounts
    refetch();
  }, [refetch]);

  useEffect(() => {
    // Only redirect if we're coming from search page and no availability is selected
    if (
      fromSearch &&
      (!selectedAvailability || selectedAvailability.length === 0)
    ) {
      navigate("/student-dashboard/search");
    }
  }, [selectedAvailability, fromSearch, navigate]);

  const handleConfirmPay = () => {
    const paymentData = {
      type: "card",
      cardNumber: "5105 **** **** 0505",
    };

    navigate("/student-dashboard/booking-details", {
      state: {
        selectedAvailability,
        instructorData,
        paymentMethod: paymentData,
        isCurrentBooking: true,
        bookedLessonFee: instructorData.lessonFee,
        bookedLessonDiscount: instructorData.lessonDiscount,
        FinalPricePerLesson: instructorData.FinalPricePerLesson,
        instructorId: instructorData?.id,
      },
    });
  };

  const handleBookingClick = (booking: Booking, id: string, slot: Slot) => {
    console.log("Clicked booking:", booking);
    navigate("/student-dashboard/booking-details", {
      state: {
        selectedAvailability: slot ? [slot] : booking.slots,
        instructorData: {
          id: booking.instructorId,
          name: `${booking.instructorId.firstName} ${booking.instructorId.lastName}`,
          email: booking.instructorId.email,
          description: booking.instructorId.description,
        },
        name: `${booking.instructorId.firstName} ${booking.instructorId.lastName}`,
        email: booking.instructorId.email,
        description: booking.instructorId.description,
        instructorId: booking?.instructorId?._id,
        paymentMethod: {
          type: "card",
          cardNumber: "**** **** **** ****",
        },
        isCurrentBooking: false,
        bookingId: booking._id,
        slotId: id,
        finalAmountPrice: booking.teacherTariff.finalPricePerLesson,
        initialAmount: booking.teacherTariff.lessonFee,
        status: booking.status,
        slot: slot,
      },
    });
  };

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(1); // Reset to first page when changing tabs
  };
  const bookings = data?.getStudentBookings || [];
  const filterBookingsByStatus = (bookings: Booking[], status: string) => {
    if (status === "all") return bookings;
    return bookings.filter(
      (booking) => booking.status.toLowerCase() === status
    );
  };

  // Calculate pagination
  const currentBookings = filterBookingsByStatus(
    bookings,
    tabValue === 0 ? "all" : tabValue === 1 ? "confirmed" : "cancelled"
  ).slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  if (loading) {
    return (
      <Box sx={{ p: 3, bgcolor: "#f5f5f5", minHeight: "100vh" }}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            {/* Header Skeleton */}
            <Skeleton variant="text" width="40%" height={40} sx={{ mb: 2 }} />

            {/* Overview Section Skeletons */}
            <Box sx={{ mb: 4 }}>
              <Skeleton variant="text" width="30%" height={32} sx={{ mb: 2 }} />
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="40%" height={24} />
              <Skeleton variant="text" width="50%" height={24} />
            </Box>

            {/* Scheduled Lessons Skeletons */}
            <Box sx={{ mb: 4 }}>
              <Skeleton variant="text" width="35%" height={32} sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {[1, 2, 3].map((item) => (
                  <Grid item xs={12} sm={4} key={item}>
                    <Skeleton
                      variant="rectangular"
                      height={120}
                      sx={{
                        borderRadius: 2,
                        bgcolor: "rgba(0, 0, 0, 0.06)",
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Instructor Information Skeletons */}
            <Box>
              <Skeleton variant="text" width="35%" height={32} sx={{ mb: 2 }} />
              <Skeleton variant="text" width="45%" height={24} />
              <Skeleton variant="text" width="35%" height={24} />
              <Skeleton variant="text" width="70%" height={24} sx={{ mt: 1 }} />
            </Box>
          </CardContent>
        </Card>

        {/* Previous Bookings Card Skeleton */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Skeleton variant="text" width="30%" height={40} sx={{ mb: 3 }} />
            {[1, 2].map((booking) => (
              <Box key={booking} sx={{ mb: 4 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Skeleton variant="text" width="30%" />
                  <Skeleton variant="text" width="15%" />
                </Box>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {[1, 2, 3].map((slot) => (
                    <Grid item xs={12} sm={4} key={slot}>
                      <Skeleton
                        variant="rectangular"
                        height={100}
                        sx={{
                          borderRadius: 2,
                          bgcolor: "rgba(0, 0, 0, 0.06)",
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
                <Skeleton variant="text" width="25%" />
              </Box>
            ))}
          </CardContent>
        </Card>
      </Box>
    );
  } // Keep the error state but enhance it
  if (error) {
    return (
      <Box
        sx={{
          p: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "50vh",
        }}
      >
        <Typography variant="h6" color="error" sx={{ mb: 2 }}>
          Error loading bookings
        </Typography>

        <Button
          variant="contained"
          onClick={() => refetch()}
          sx={{
            bgcolor: "#5fc2d3",
            "&:hover": {
              bgcolor: "#4bb1c2",
            },
          }}
        >
          Try Again
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 3, py: 1, bgcolor: "#f5f5f5", minHeight: "100vh" }}>
      <BackButton variant="outline" label="Back" />
      {/* Payment Methods Card - Only show if we have selectedAvailability */}
      {selectedAvailability && selectedAvailability.length > 0 && (
        <Card>
          <Box
            sx={{
              mb: 2,
              pb: 1.6,
              px: 2,
              pt: 1.3,
              width: "100%",
              borderBottom: 1,
              borderBottomColor: "gray",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Payment Methods
            </Typography>
          </Box>
          <CardContent>
            <Card sx={{ display: "flex", alignItems: "center", p: 2, mb: 2 }}>
              <Avatar sx={{ bgcolor: "#6a1b9a", mr: 2 }}>S</Avatar>
              <CardContent sx={{ flex: 1 }}>
                <Typography variant="body1">Debit Card</Typography>
                <Typography variant="body2" color="textSecondary">
                  3566 **** **** 0505
                </Typography>
              </CardContent>
            </Card>
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                sx={{
                  borderRadius: 20,
                  textTransform: "none",
                  borderColor: "#1976d2",
                  color: "#1976d2",
                }}
                endIcon={<ChatIcon />}
                onClick={handleConfirmPay}
              >
                Confirm Pay
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
      {/* Current Booking Details Card - Only show if we have selectedAvailability */}
      {selectedAvailability && selectedAvailability.length > 0 && (
        <Card sx={{ mb: 3, mt: 2 }}>
          <Box
            sx={{
              mb: 2,
              pb: 1.6,
              px: 2,
              pt: 1.3,
              width: "100%",
              borderBottom: 1,
              borderBottomColor: "gray",
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: "bold" }}>
              CURRENT BOOKING
            </Typography>
          </Box>
          <CardContent>
            {/* Overview Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                Overview
              </Typography>
              <Typography variant="body1">
                <strong>Lesson Number:</strong> {selectedAvailability.length}
              </Typography>
              <Typography variant="body1">
                <strong>Total Duration:</strong> {selectedAvailability.length}{" "}
                Hours
              </Typography>
              <Typography variant="body1">
                <strong>Start Date:</strong>{" "}
                {new Date(selectedAvailability[0].date).toLocaleDateString(
                  "en-US",
                  {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  }
                )}
              </Typography>
              <Typography variant="body1">
                <strong>End Date:</strong>{" "}
                {new Date(
                  selectedAvailability[selectedAvailability.length - 1].date
                ).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </Typography>
            </Box>

            {/* Scheduled Lessons Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
                Scheduled Lessons
              </Typography>
              <Grid container spacing={2}>
                {selectedAvailability.map(
                  (slot: AvailabilitySlot, index: number) => (
                    <Grid item xs={12} sm={4} key={index}>
                      <Card
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          p: 1,
                          bgcolor: "#e6f0fa",
                          borderRadius: 2,
                        }}
                      >
                        <CheckCircleIcon sx={{ color: "green", mr: 1 }} />
                        <CardContent sx={{ p: 1 }}>
                          <Typography variant="body1">
                            {slot.startTime} - {slot.endTime}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {getSlotDurationInHours(slot)} hours lesson
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {new Date(slot.date).toLocaleDateString([], {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )
                )}
              </Grid>
            </Box>

            {/* Instructor Information Section */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                Instructor Information
              </Typography>
              <Typography variant="body1">
                <strong>Name:</strong> {instructorData?.name || "Not available"}
              </Typography>
              <Typography variant="body1">
                <strong>Contact:</strong>{" "}
                <a href={`mailto:${instructorData?.email}`}>
                  {instructorData?.email || "Not available"}
                </a>
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                <strong>Description:</strong>{" "}
                {instructorData?.description || "No description available"}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Bookings List */}
      <BookingList
        bookings={bookings}
        onBookingClick={handleBookingClick}
        showNewBookingButton={!selectedAvailability}
        onNewBooking={() => navigate("/student-dashboard/search")}
      />
    </Box>
  );
};

export default BookLesson;
