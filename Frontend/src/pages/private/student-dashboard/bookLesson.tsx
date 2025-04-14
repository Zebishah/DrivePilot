import {
  Box,
  Typography,
  Avatar,
  Card,
  CardContent,
  Grid,
  Button,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChatIcon from "@mui/icons-material/Chat";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

interface AvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
}

interface InstructorData {
  id: string;
  name: string;
  email: string;
  description: string;
  lessonFee: number;
}

const BookLesson: React.FC = () => {
  const location = useLocation();
  const { selectedAvailability, instructorData } = location.state || {};

  const navigate = useNavigate();

  useEffect(() => {
    if (!selectedAvailability || selectedAvailability.length === 0) {
      navigate('/student-dashboard/search');
    }
  }, [selectedAvailability]);

  const handleConfirmPay = () => {
    // Add debug logging
    const paymentData = {
      type: 'card',
      cardNumber: '5105 **** **** 0505'
    };
    
    navigate('/student-dashboard/booking-details', {
      state: {
        selectedAvailability,
        instructorData,
        paymentMethod: paymentData
      }
    });
  };

  return (
    <Box sx={{ p: 3, bgcolor: "#f5f5f5", minHeight: "100vh" }}>
      {/* Booking Details Card */}
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
            BOOKING DETAILS
          </Typography>
        </Box>
        <CardContent>
          {/* Overview Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
              Overview
            </Typography>
            <Typography variant="body1">
              <strong>Lesson Number:</strong> {selectedAvailability?.length || 0}
            </Typography>
            <Typography variant="body1">
              <strong>Total Duration:</strong> {selectedAvailability?.length || 0} Hours
            </Typography>
            <Typography variant="body1">
              <strong>Start Date:</strong> {selectedAvailability?.[0]?.date ? new Date(selectedAvailability[0].date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              }) : 'Not selected'}
            </Typography>
            <Typography variant="body1">
              <strong>End Date:</strong> {selectedAvailability?.[selectedAvailability.length - 1]?.date ? new Date(selectedAvailability[selectedAvailability.length - 1].date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              }) : 'Not selected'}
            </Typography>
          </Box>

          {/* Scheduled Lessons Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
              Scheduled Lessons
            </Typography>
            <Grid container spacing={2}>
              {selectedAvailability && selectedAvailability.length > 0 ? (
                selectedAvailability.map((slot: AvailabilitySlot, index: number) => (
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
                ))
              ) : (
                <Grid item xs={12}>
                  <Typography variant="body1" color="textSecondary">
                    No lessons selected
                  </Typography>
                </Grid>
              )}
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

      {/* Payment Methods Card */}
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
    </Box>
  );
};

export default BookLesson;