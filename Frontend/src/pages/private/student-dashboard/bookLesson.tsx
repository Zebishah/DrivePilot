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

export default function StudentBookings() {
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
                <strong>Lesson Number:</strong> 1
              </Typography>
              <Typography variant="body1">
                <strong>Total Duration:</strong> 20 Hours
              </Typography>
              <Typography variant="body1">
                <strong>Start Date:</strong> January 20, 2025
              </Typography>
              <Typography variant="body1">
                <strong>End Date:</strong> January 24, 2025
              </Typography>
            </Box>
  
            {/* Scheduled Lessons Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
                Scheduled Lessons
              </Typography>
              <Grid container spacing={2}>
                {[
                  { time: "12:00 PM - 01:00 PM", duration: "1 hr lesson", location: "Bern, SWI" },
                  { time: "12:00 PM - 01:00 PM", duration: "1 hr lesson", location: "Bern, SWI" },
                  { time: "12:00 PM - 01:00 PM", duration: "1 hr lesson", location: "Bern, SWI" },
                ].map((lesson, index) => (
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
                        <Typography variant="body1">{lesson.time}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {lesson.duration}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {lesson.location}
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
                <strong>Name:</strong> Mr. Ahmed Khan
              </Typography>
              <Typography variant="body1">
                <strong>Contact:</strong>{" "}
                <a href="mailto:ahmed.khan@drivingschool.com">
                  ahmed.khan@drivingschool.com
                </a>
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                <strong>Description:</strong> With over 10 years of experience, Mr. Khan
                specializes in beginner driver education and emphasizes safety and
                confidence-building.
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
              >
                Confirm Pay
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  };