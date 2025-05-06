import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Avatar,
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import { useMutation } from "@apollo/client";
import { CREATE_BOOKING } from "../../../graphql/mutations/studentBooking";
import toast from "react-hot-toast";

const BookingDetails: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    selectedAvailability,
    instructorData,
    paymentMethod,
    isCurrentBooking = true,
    status,
  } = location.state || {};
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createBooking] = useMutation(CREATE_BOOKING, {
    onCompleted: () => {
      handleCloseDialog();
      navigate("/student-dashboard/overview");
      toast.success("Booking created successfully!");
    },
    onError: (error) => {
      console.error("Booking creation failed:", error);
      toast.error(
        error.message || "Failed to create booking. Please try again."
      );
      setError(error.message || "Failed to create booking. Please try again.");
    },
  });

  // Calculate total amount based on number of lessons and lesson fee
  const lessonFee = instructorData?.lessonFee;
  const totalAmount = Number(selectedAvailability?.length * lessonFee) || 0;

  const handleConfirm = () => {
    setError(null);
    setIsConfirmDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsConfirmDialogOpen(false);
    setError(null);
  };

  const handleConfirmBooking = async () => {
    try {
      if (!selectedAvailability || selectedAvailability.length === 0) {
        throw new Error("No availability slots selected");
      }

      if (!instructorData?.id) {
        throw new Error("Invalid instructor information");
      }

      if (!paymentMethod?.type) {
        throw new Error("Payment method is required");
      }

      const mutationInput = {
        instructorId: instructorData.id,
        slots: selectedAvailability.map((slot: any) => ({
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        paymentMethod: {
          type: paymentMethod.type.toLowerCase(),
          cardNumber: paymentMethod.cardNumber || "",
        },
      };

      await createBooking({
        variables: {
          input: mutationInput,
        },
      });
    } catch (error: any) {
      console.error("Error creating booking:", error);
      setError(error.message || "Failed to create booking. Please try again.");
      toast.error("Failed to create booking. Please try again.");
    }
  };

  const handleReschedule = () => {
    // Handle rescheduling logic
  };

  const handleCancel = () => {
    // Handle cancellation logic
  };

  return (
    <Box sx={{ p: 3, bgcolor: "#f5f5f5", minHeight: "100vh" }}>
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            Booking Details
          </Typography>
          {!isCurrentBooking && (
            <Typography
              variant="body1"
              sx={{
                color:
                  status === "confirmed"
                    ? "green"
                    : status === "cancelled"
                    ? "red"
                    : "orange",
                fontWeight: "bold",
              }}
            >
              {status.toUpperCase()}
            </Typography>
          )}
          <Box>
            <Button
              variant="contained"
              sx={{ mr: 1 }}
              onClick={handleReschedule}
            >
              Rescheduling
            </Button>
            <Button variant="contained" color="error" onClick={handleCancel}>
              Cancel Booking
            </Button>
          </Box>
        </Box>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
            Payment Method
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Avatar sx={{ bgcolor: "#6a1b9a", mr: 2 }}>S</Avatar>
            <Box>
              <Typography variant="body1">
                {paymentMethod?.type || "N/A"}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {paymentMethod?.cardNumber || "N/A"}
              </Typography>
            </Box>
          </Box>

          <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
            Overview
          </Typography>
          <Typography variant="body1">
            <strong>Lesson Number:</strong> {selectedAvailability?.length || 0}
          </Typography>
          <Typography variant="body1">
            <strong>Total Duration:</strong> {selectedAvailability?.length || 0}{" "}
            Hours
          </Typography>
          <Typography variant="body1">
            <strong>Start Date:</strong>{" "}
            {selectedAvailability?.[0]?.date
              ? new Date(selectedAvailability[0].date).toLocaleDateString(
                  "en-US",
                  {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  }
                )
              : "Not selected"}
          </Typography>
          <Typography variant="body1">
            <strong>End Date:</strong>{" "}
            {selectedAvailability?.[selectedAvailability.length - 1]?.date
              ? new Date(
                  selectedAvailability[selectedAvailability.length - 1].date
                ).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              : "Not selected"}
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2, mt: 3 }}>
            Scheduled Lessons
          </Typography>
          <Grid container spacing={2}>
            {selectedAvailability && selectedAvailability.length > 0 ? (
              selectedAvailability.map((slot: any, index: number) => (
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
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
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

          <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1, mt: 3 }}>
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
        </CardContent>
      </Card>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
        {isCurrentBooking ? (
          <Button variant="contained" color="primary" onClick={handleConfirm}>
            Confirm Booking
          </Button>
        ) : (
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate("/student-dashboard/book")}
          >
            Back to Bookings
          </Button>
        )}
      </Box>

      {/* Confirmation Dialog - Only show for current bookings */}
      {isCurrentBooking && (
        <Dialog
          open={isConfirmDialogOpen}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogContent sx={{ position: "relative", pt: 2 }}>
            <IconButton
              onClick={handleCloseDialog}
              sx={{
                position: "absolute",
                right: 8,
                top: 8,
              }}
            >
              <CloseIcon />
            </IconButton>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Typography variant="h6" align="center" gutterBottom>
              Confirm Lesson Booking
            </Typography>

            <Typography variant="h5" align="center" gutterBottom>
              Congratulations!
            </Typography>

            <Typography align="center" gutterBottom>
              You have Booked {selectedAvailability?.length || 0} lesson
              {selectedAvailability?.length > 1 ? "s" : ""}
            </Typography>

            <Box sx={{ bgcolor: "#f5f5f5", p: 3, borderRadius: 1, mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Details
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Avatar sx={{ bgcolor: "#6a1b9a", mr: 2 }}>S</Avatar>
                <Box>
                  <Typography variant="body1">
                    {paymentMethod?.type || "Credit card"}
                    <Typography variant="caption" color="textSecondary">
                      (Debug - type: {JSON.stringify(paymentMethod?.type)})
                    </Typography>
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {paymentMethod?.cardNumber || "5105 **** **** 0505"}
                  </Typography>
                </Box>
              </Box>

              <Typography variant="body1" gutterBottom>
                <strong>Lesson Number:</strong>{" "}
                {selectedAvailability?.length || 0}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Duration:</strong> {selectedAvailability?.length || 0}{" "}
                Hours
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Amount:</strong> ${totalAmount}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Start Date:</strong>{" "}
                {selectedAvailability?.[0]?.date
                  ? new Date(selectedAvailability[0].date).toLocaleDateString(
                      "en-US",
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      }
                    )
                  : "Not selected"}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>End Date:</strong>{" "}
                {selectedAvailability?.[selectedAvailability.length - 1]?.date
                  ? new Date(
                      selectedAvailability[selectedAvailability.length - 1].date
                    ).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Not selected"}
              </Typography>

              <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                <strong>Attention:</strong> If you cancel a lesson less than 48
                hours in advance, the teacher will be informed, but no refund
                will be issued for the missed session.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
            <Button
              variant="contained"
              onClick={handleConfirmBooking}
              disabled={!!error}
              sx={{
                width: "200px",
                bgcolor: "#5ec2d2",
                "&:hover": {
                  bgcolor: "rgba(65, 135, 147);",
                },
              }}
            >
              Yes
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default BookingDetails;
