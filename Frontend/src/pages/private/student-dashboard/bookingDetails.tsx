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
  CircularProgress,
  DialogTitle,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import { useMutation } from "@apollo/client";
import {
  CANCEL_BOOKING,
  CREATE_BOOKING,
} from "../../../graphql/mutations/studentBooking";
import toast from "react-hot-toast";
import advancedFormat from "dayjs/plugin/advancedFormat";
import dayjs from "dayjs";
dayjs.extend(advancedFormat);
import { BackButton } from "../../../components/InstructorComponent/common/BackButton";
import {
  getSlotDurationInHours,
  getSlotDurations,
} from "../../../components/StudentComponents/GetSlotDurationInHours";
function formatLessonDateTime(dateStr: string, timeStr: string) {
  // parse the combined ISO, then format:
  return dayjs(`${dateStr}T${timeStr}`).format("dddd, MMMM Do [at] h:mm A");
}
const BookingDetails: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    selectedAvailability,
    instructorData,
    paymentMethod,
    isCurrentBooking = true,
    status,
    bookingId,
    booking,
    initialAmount,
    finalAmountPrice,
    slotId,
    instructorId,
    bookedLessonFee,
    bookedLessonDiscount,
    FinalPricePerLesson,
    slot,
    name = "",
    email = "",
    description = "",
  } = location.state || {};
  console.log("location.state", location.state);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCancelled = status === "cancelled";

  const [createBooking] = useMutation(CREATE_BOOKING, {
    onCompleted: () => {
      handleCloseDialog();
      navigate("/student-dashboard/book");
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
  const lessonFee = bookedLessonFee;
  const lessonDiscount = bookedLessonDiscount;
  const discount = initialAmount - finalAmountPrice; // 200
  const discountPercentage = ((discount / initialAmount) * 100).toFixed(2); // "20.00"
  console.log("lessonFee", lessonDiscount);

  const totalAmount = Number(selectedAvailability?.length * lessonFee) || 10;
  const finalAmount = Number(
    (totalAmount * (1 - lessonDiscount / 100)).toFixed(2)
  );
  console.log("");
  const initialPriceShown = bookedLessonFee
    ? bookedLessonFee * selectedAvailability?.length
    : initialAmount * selectedAvailability?.length;
  const finalPriceShown = finalAmountPrice
    ? finalAmountPrice * selectedAvailability?.length
    : FinalPricePerLesson * selectedAvailability?.length;
  const finalDiscountShown = lessonDiscount
    ? lessonDiscount
    : discountPercentage;
  const handleConfirm = () => {
    setError(null);
    setIsConfirmDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsConfirmDialogOpen(false);
    setError(null);
  };
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleConfirmBooking = async () => {
    try {
      setConfirmLoading(true);
      if (!selectedAvailability || selectedAvailability.length === 0) {
        throw new Error("No availability slots selected");
      }

      if (!instructorData) {
        throw new Error("Invalid instructor information");
      }

      if (!paymentMethod?.type) {
        throw new Error("Payment method is required");
      }

      const mutationInput = {
        instructorId: instructorData,
        slots: selectedAvailability.map((slot: any) => ({
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: "booked", // Assuming booked status for all selected slots
        })),

        totalAmount: parseFloat(totalAmount.toFixed(2)),
        finalAmount: parseFloat(finalAmount),
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
      navigate("/student-dashboard/search");
    } catch (error: any) {
      console.error("Error creating booking:", error);
      setError(error.message || "Failed to create booking. Please try again.");
      toast.error("Failed to create booking. Please try again.");
    } finally {
      setConfirmLoading(false);
    }
  };
  // Add new state for reschedule dialog
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const handleReschedule = () => {
    if (isCurrentBooking || isCancelled) {
      navigate(`/student-dashboard/search/instructors/${instructorId}`);
    }
    const firstSlot = selectedAvailability[0];
    const lessonStart = new Date(`${firstSlot.date}T${firstSlot.startTime}`);
    const now = new Date();
    const msUntil = lessonStart - now;

    if (msUntil < 48 * 60 * 60 * 1000) {
      setIsTooLate(true);
    } else {
      setIsTooLate(false);
    }
    setIsRescheduleDialogOpen(true);
  };

  const handleConfirmReschedule = async () => {
    try {
      setRescheduleLoading(true);
      // First cancel the current booking
      await cancelBooking({ variables: { bookingId: bookingId } });
      toast.success("Booking cancelled for rescheduling");
      // Navigate to instructor page for rebooking
      navigate(`/student-dashboard/search/instructors/${instructorId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to reschedule booking");
    } finally {
      setRescheduleLoading(false);
      setIsRescheduleDialogOpen(false);
    }
  };
  const [isCancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [isTooLate, setIsTooLate] = useState(false);
  const [cancelBooking] = useMutation(CANCEL_BOOKING);
  const handleOpenCancel = () => {
    if (isCurrentBooking) {
      navigate(`/student-dashboard/search/instructors/${instructorId}`);
    }
    const firstSlot = selectedAvailability[0];
    const lessonStart = new Date(`${firstSlot.date}T${firstSlot.startTime}`);
    const now = new Date();
    const msUntil = lessonStart - now;

    // < 48h?
    if (msUntil < 48 * 60 * 60 * 1000) {
      setIsTooLate(true);
    } else {
      setIsTooLate(false);
    }
    setCancelError("");
    setCancelDialogOpen(true);
  };
  const handleCloseCancel = () => {
    setCancelDialogOpen(false);
  };

  const handleCancelBooking = async () => {
    try {
      setCancelLoading(true);
      await cancelBooking({
        variables: { bookingId: bookingId, slotId: slotId },
      });
      toast.success("Booking cancelled successfully");
      navigate(`/student-dashboard/book`);

      handleCloseCancel();
      // optionally refetch queries or update cache here
    } catch (err) {
      toast.error(err.message || "Failed to cancel booking");
    } finally {
      setCancelLoading(false);
    }
  };

  // New handler for when user confirms cancellation despite no refund
  const handleConfirmCancellationNoRefund = async () => {
    try {
      setCancelLoading(true);
      await cancelBooking({
        variables: { bookingId: bookingId, slotId: slotId },
      });
      toast.success("Booking cancelled successfully (no refund issued)");
      navigate(`/student-dashboard/book`);
      handleCloseCancel();
    } catch (err) {
      toast.error(err.message || "Failed to cancel booking");
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <Box sx={{ py: 1, px: 3, bgcolor: "#f5f5f5", minHeight: "100vh" }}>
      <BackButton variant="outline" showIcon={true} />
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            Booking Details
          </Typography>
          {/* {!isCurrentBooking && (
            <Typography
              sx={{
                px: 2,
                py: 0.5,
                borderRadius: 1,
                bgcolor:
                  status === "confirmed"
                    ? "rgba(0, 200, 83, 0.1)"
                    : status === "cancelled"
                      ? "rgba(211, 47, 47, 0.1)"
                      : "rgba(255, 152, 0, 0.1)",
                color:
                  status === "confirmed"
                    ? "rgb(0, 200, 83)"
                    : status === "cancelled"
                      ? "rgb(211, 47, 47)"
                      : "rgb(255, 152, 0)",
                fontWeight: 600,
              }}
            >
              {status.toUpperCase()}
            </Typography>
          )} */}
          <Box>
            <Button
              variant="contained"
              sx={{ mr: 1 }}
              onClick={handleReschedule}
            >
              Rescheduling
            </Button>
            {!isCancelled && (
              <Button
                variant="contained"
                color="error"
                onClick={handleOpenCancel}
              >
                Cancel Booking
              </Button>
            )}
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
          {/* <Typography variant="body1">
            <strong>Base Price:</strong>{" "}
            {initialAmount
              ? (() => {
                  return (
                    <>
                      <span
                        className={`${initialAmount !== finalAmountPrice ? "line-through" : ""} text-gray-800`}
                      >
                        CHF {initialAmount}/hr
                      </span>
                      {initialAmount !== finalAmountPrice ? (
                        <span className="ml-2 text-green-600 font-semibold">
                          CHF {finalAmountPrice.toFixed(2)}
                        </span>
                      ) : null}
                    </>
                  );
                })()
              : "0"}
          </Typography>
          <Typography variant="body1">
            <strong>Discount:</strong>
            {
              <span className="ml-2 text-red-500 font-semibold text-sm">
                ({discountPercentage}% OFF)
              </span>
            }
          </Typography> */}
          <Typography variant="body1">
            <strong>Base Price:</strong>{" "}
            {initialPriceShown
              ? (() => {
                  return (
                    <>
                      <span
                        className={`${initialPriceShown !== finalPriceShown ? "line-through" : ""} text-gray-800`}
                      >
                        CHF {initialPriceShown}/hr
                      </span>
                      {initialPriceShown !== finalPriceShown ? (
                        <span className="ml-2 text-green-600 font-semibold">
                          CHF {finalPriceShown.toFixed(2)}
                        </span>
                      ) : null}
                    </>
                  );
                })()
              : "0"}
          </Typography>
          <Typography variant="body1">
            <strong>Discount:</strong>
            {
              <span className="ml-2 text-red-500 font-semibold text-sm">
                ({finalDiscountShown}% OFF)
              </span>
            }
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
            {slot
              ? selectedAvailability[0]?.date
                ? new Date(selectedAvailability[0].date).toLocaleDateString(
                    "en-US",
                    {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }
                  )
                : "Not selected"
              : selectedAvailability?.[selectedAvailability.length - 1]?.date
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
            <strong>Name:</strong> {name || "Not available"}
          </Typography>
          <Typography variant="body1">
            <strong>Contact:</strong>{" "}
            <a href={`mailto:${email}`}>{email || "Not available"}</a>
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            <strong>Description:</strong>{" "}
            {description || "No description available"}
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            <strong>Attention:</strong>
            {""} This doesn’t apply to your current case, but just so you know —
            cancellations made less than 48 hours before a lesson are
            non-refundable, except in exceptional circumstances (e.g. medical
            emergencies).
          </Typography>
        </CardContent>
      </Card>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
        {isCurrentBooking ? (
          <Button
            variant="contained"
            onClick={handleConfirmBooking}
            disabled={confirmLoading}
            sx={{
              width: "200px",
              bgcolor: "#5ec2d2",
              "&:hover": {
                bgcolor: "rgba(65, 135, 147);",
              },
            }}
          >
            {confirmLoading ? (
              <CircularProgress size={20} />
            ) : (
              "Confirm Booking"
            )}
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
              {/* <Typography variant="body1" gutterBottom>
                <strong>Duration:</strong>{" "}
                {getSlotDurations(selectedAvailability)?.totalDuration} Hours
              </Typography> */}
              <Typography variant="body1" gutterBottom>
                <strong>Total Amount:</strong> CHF {totalAmount}
              </Typography>
              <p className="flex items-center gap-2">
                <Typography variant="body1" gutterBottom>
                  <strong>After Discount:</strong>
                </Typography>
                {totalAmount
                  ? (() => {
                      return (
                        <>
                          <span
                            className={`${lessonDiscount > 0 ? "line-through" : ""} -mt-1.5 text-gray-800`}
                          >
                            CHF {totalAmount}
                          </span>

                          <span className=" -mt-1.5 text-green-600 font-semibold">
                            CHF {finalAmount}
                          </span>
                        </>
                      );
                    })()
                  : "N/A"}
              </p>

              <Typography variant="body1" gutterBottom>
                {lessonDiscount > 0 && (
                  <>
                    <strong>Discount:</strong> {lessonDiscount}%
                  </>
                )}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Start:</strong>{" "}
                {selectedAvailability?.[0]
                  ? formatLessonDateTime(
                      selectedAvailability[0].date,
                      selectedAvailability[0].startTime
                    )
                  : "Not selected"}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>End:</strong>{" "}
                {selectedAvailability?.length
                  ? formatLessonDateTime(
                      selectedAvailability[selectedAvailability.length - 1]
                        .date,
                      selectedAvailability[selectedAvailability.length - 1]
                        .endTime
                    )
                  : "Not selected"}
              </Typography>

              <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                <strong>Attention:</strong>
                {""}This doesn’t apply to your current case, but just so you
                know — cancellations made less than 48 hours before a lesson are
                non-refundable, except in exceptional circumstances (e.g.
                medical emergencies).
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
            <Button
              variant="contained"
              onClick={handleConfirmBooking}
              disabled={!!error || confirmLoading}
              sx={{
                width: "200px",
                bgcolor: "#5ec2d2",
                "&:hover": {
                  bgcolor: "rgba(65, 135, 147);",
                },
              }}
            >
              {confirmLoading ? <CircularProgress size={20} /> : "Confirm"}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <Dialog
        open={isCancelDialogOpen}
        onClose={handleCloseCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {isTooLate ? "Cannot Cancel Lesson" : "Cancel Lesson"}
          <IconButton
            onClick={handleCloseCancel}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {cancelError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {cancelError}
            </Alert>
          )}
          {isTooLate ? (
            <>
              <Alert severity="error">
                Cancellations made within 48 hours of a lesson are
                non-refundable. However, we may consider a full or partial
                refund for documented, exceptional circumstances (like a medical
                emergency). If this is your situation, please contact us with
                the details and any supporting documents for review. If you're
                unable to attend, we strongly recommend cancelling anyway so
                that the instructor does not travel unnecessarily.
              </Alert>

              {/* Two Clear Action Buttons */}
              <Box sx={{ display: "flex", gap: 2, mt: 4 }}>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleConfirmCancellationNoRefund}
                  disabled={cancelLoading}
                  sx={{
                    flex: 1,
                    py: 1.5,
                    fontSize: "0.95rem",
                    fontWeight: 600,
                  }}
                >
                  {cancelLoading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    "Confirm Cancellation"
                  )}
                </Button>

                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleCloseCancel}
                  sx={{
                    flex: 1,
                    py: 1.5,
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    bgcolor: "#5ec2d2",
                    "&:hover": {
                      bgcolor: "rgba(65, 135, 147)",
                    },
                  }}
                >
                  Keep My Booking
                </Button>
              </Box>
            </>
          ) : (
            <>
              <Typography align="center" gutterBottom>
                Are you sure you want to cancel your lesson scheduled on{" "}
                {selectedAvailability?.[0]
                  ? formatLessonDateTime(
                      selectedAvailability[0].date,
                      selectedAvailability[0].startTime
                    )
                  : "Not selected"}
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
                  <strong>Start:</strong>{" "}
                  {selectedAvailability?.[0]
                    ? formatLessonDateTime(
                        selectedAvailability[0].date,
                        selectedAvailability[0].startTime
                      )
                    : "Not selected"}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>End:</strong>{" "}
                  {selectedAvailability?.length
                    ? formatLessonDateTime(
                        selectedAvailability[selectedAvailability.length - 1]
                          .date,
                        selectedAvailability[selectedAvailability.length - 1]
                          .endTime
                      )
                    : "Not selected"}
                </Typography>

                <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                  <strong>Attention:</strong>
                  {""} If you cancel a lesson less than 48 hours before its
                  start time, no refund will be issued.
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: "center", pb: 3, gap: 5 }}>
          {!isTooLate && (
            <>
              <Button
                variant="contained"
                onClick={handleCancelBooking}
                disabled={cancelLoading}
                sx={{ width: "200px" }}
              >
                {cancelLoading ? (
                  <CircularProgress size={20} />
                ) : (
                  "Confirm Cancel"
                )}
              </Button>
              <Button onClick={handleCloseCancel}>Close</Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog
        open={isRescheduleDialogOpen}
        onClose={() => setIsRescheduleDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {isTooLate ? "Cannot Reschedule Lesson" : "Reschedule Lesson"}
          <IconButton
            onClick={() => setIsRescheduleDialogOpen(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {isTooLate ? (
            <Alert severity="error">
              You can't reschedule your lesson now because it's less than 48
              hours before start.
            </Alert>
          ) : (
            <>
              <Typography align="center" gutterBottom>
                Are you sure you want to reschedule your lesson scheduled for{" "}
                {selectedAvailability?.[0]
                  ? formatLessonDateTime(
                      selectedAvailability[0].date,
                      selectedAvailability[0].startTime
                    )
                  : "Not selected"}
                ?
              </Typography>
              <Alert severity="info" sx={{ mt: 2 }}>
                By confirming, your current booking will be cancelled and you'll
                be redirected to select new time slots.
              </Alert>
              <Box sx={{ bgcolor: "#f5f5f5", p: 3, borderRadius: 1, mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Current Booking Details
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Lesson Number:</strong>{" "}
                  {selectedAvailability?.length || 0}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Duration:</strong> {selectedAvailability?.length || 0}{" "}
                  Hours
                </Typography>
                <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                  <strong>Note:</strong> After confirming, you'll need to select
                  new available time slots.
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: "center", pb: 3, gap: 2 }}>
          {!isTooLate && (
            <Button
              variant="contained"
              onClick={handleConfirmReschedule}
              disabled={rescheduleLoading}
              sx={{
                width: "200px",
                bgcolor: "#5ec2d2",
                "&:hover": {
                  bgcolor: "rgba(65, 135, 147)",
                },
              }}
            >
              {rescheduleLoading ? (
                <CircularProgress size={20} />
              ) : (
                "Confirm Reschedule"
              )}
            </Button>
          )}
          <Button
            onClick={() => setIsRescheduleDialogOpen(false)}
            variant="outlined"
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BookingDetails;
