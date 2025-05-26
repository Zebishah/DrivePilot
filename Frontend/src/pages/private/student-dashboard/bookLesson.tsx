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
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChatIcon from "@mui/icons-material/Chat";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useQuery } from "@apollo/client";
import { GET_STUDENT_BOOKINGS } from "../../../graphql/mutations/studentBooking";

interface AvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
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
}

const BookLesson: React.FC = () => {
  const location = useLocation();
  const { selectedAvailability, instructorData, fromSearch } = location.state || {};
  const navigate = useNavigate();

  const { loading, error, data, refetch } = useQuery(GET_STUDENT_BOOKINGS, {
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  });

  useEffect(() => {
    // Fetch data when component mounts
    refetch();
  }, [refetch]);


  useEffect(() => {
    // Only redirect if we're coming from search page and no availability is selected
    if (fromSearch && (!selectedAvailability || selectedAvailability.length === 0)) {
      navigate('/student-dashboard/search');
    }
  }, [selectedAvailability, fromSearch, navigate]);

  const handleConfirmPay = () => {
    const paymentData = {
      type: 'card',
      cardNumber: '5105 **** **** 0505'
    };

    navigate('/student-dashboard/booking-details', {
      state: {
        selectedAvailability,
        instructorData,
        paymentMethod: paymentData,
        isCurrentBooking: true
      }
    });
  };

  const handleBookingClick = (booking: Booking) => {
    navigate('/student-dashboard/booking-details', {
      state: {
        selectedAvailability: booking.slots,
        instructorData: {
          id: booking.instructorId,
          name: `${booking.instructorId.firstName} ${booking.instructorId.lastName}`,
          email: booking.instructorId.email,
          description: booking.instructorId.description
        },
        paymentMethod: {
          type: 'card',
          cardNumber: '**** **** **** ****'
        },
        isCurrentBooking: false,
        bookingId: booking._id,
        status: booking.status
      }
    });
  };

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
                        bgcolor: 'rgba(0, 0, 0, 0.06)'
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
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
                          bgcolor: 'rgba(0, 0, 0, 0.06)'
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
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
        }}
      >
        <Typography
          variant="h6"
          color="error"
          sx={{ mb: 2 }}
        >
          Error loading bookings
        </Typography>

        <Button
          variant="contained"
          onClick={() => refetch()}
          sx={{
            bgcolor: '#5fc2d3',
            '&:hover': {
              bgcolor: '#4bb1c2',
            },
          }}
        >
          Try Again
        </Button>
      </Box>
    );
  }

  const bookings = data?.getStudentBookings || [];

  return (
    <Box sx={{ p: 3, bgcolor: "#f5f5f5", minHeight: "100vh" }}>
      {/* Current Booking Details Card - Only show if we have selectedAvailability */}
      {selectedAvailability && selectedAvailability.length > 0 && (
        <Card sx={{ mb: 3 }}>
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
                <strong>Total Duration:</strong> {selectedAvailability.length} Hours
              </Typography>
              <Typography variant="body1">
                <strong>Start Date:</strong> {new Date(selectedAvailability[0].date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Typography>
              <Typography variant="body1">
                <strong>End Date:</strong> {new Date(selectedAvailability[selectedAvailability.length - 1].date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Typography>
            </Box>

            {/* Scheduled Lessons Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
                Scheduled Lessons
              </Typography>
              <Grid container spacing={2}>
                {selectedAvailability.map((slot: AvailabilitySlot, index: number) => (
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
                          1 hr lesson
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {new Date(slot.date).toLocaleDateString([], {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Instructor Information Section */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                Instructor Information
              </Typography>
              <Typography variant="body1">
                <strong>Name:</strong> {instructorData?.name || 'Not available'}
              </Typography>
              <Typography variant="body1">
                <strong>Contact:</strong>{" "}
                <a href={`mailto:${instructorData?.email}`}>
                  {instructorData?.email || 'Not available'}
                </a>
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                <strong>Description:</strong> {instructorData?.description || 'No description available'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Previous Bookings Card */}
      <Card sx={{ mb: 3 }}>
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
            {selectedAvailability ? "PREVIOUS BOOKINGS" : "YOUR BOOKINGS"}
          </Typography>
        </Box>
        <CardContent>
          {bookings.length > 0 ? (
            bookings.map((booking: Booking) => (
              <Box
                key={booking._id}
                sx={{
                  mb: 3,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    borderRadius: 1,
                    transition: 'background-color 0.2s'
                  }
                }}
                onClick={() => handleBookingClick(booking)}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {booking.instructorId.firstName} {booking.instructorId.lastName}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: booking.status === 'confirmed' ? 'green' :
                        booking.status === 'cancelled' ? 'red' : 'orange'
                    }}
                  >
                    {booking.status.toUpperCase()}
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {booking.instructorId.email}
                </Typography>
                <Grid container spacing={2}>
                  {booking.slots.map((slot: AvailabilitySlot, index: number) => (
                    <Grid item xs={12} sm={4} key={index}>
                      <Card
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          p: 1,
                          bgcolor: "#f5f5f5",
                          borderRadius: 2,
                        }}
                      >
                        <CheckCircleIcon sx={{ color: "green", mr: 1 }} />
                        <CardContent sx={{ p: 1 }}>
                          <Typography variant="body1">
                            {slot.startTime} - {slot.endTime}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            1 hr lesson
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {new Date(slot.date).toLocaleDateString([], {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                  Booked on: {new Date(Number(booking.createdAt)).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    // hour: '2-digit',
                    // minute: '2-digit'
                  })}
                </Typography>
                <Divider sx={{ my: 2 }} />
              </Box>
            ))
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="textSecondary">
                No Bookings Available
              </Typography>
              <Button
                variant="contained"
                color="primary"
                sx={{ mt: 2 }}
                onClick={() => navigate('/student-dashboard/search')}
              >
                Book a Lesson
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

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
    </Box>
  );
};

export default BookLesson;