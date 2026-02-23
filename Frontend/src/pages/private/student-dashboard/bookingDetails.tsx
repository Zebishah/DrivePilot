import React, { useState, useEffect } from "react";
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
  Tooltip,
} from "@mui/material";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import { useMutation, useQuery } from "@apollo/client";
import {
  CANCEL_BOOKING,
  CREATE_BOOKING_CHECKOUT_SESSION,
  COMPLETE_BOOKING_FROM_CHECKOUT,
  COMPLETE_DEFERRED_BOOKING_FROM_CHECKOUT,
} from "../../../graphql/mutations/studentBooking";
import { REQUEST_REFUND, GET_MY_REFUND_REQUESTS } from "../../../graphql/mutations/refundRequest";
import toast from "react-hot-toast";
import advancedFormat from "dayjs/plugin/advancedFormat";
import dayjs from "dayjs";
dayjs.extend(advancedFormat);
import { BackButton } from "../../../components/InstructorComponent/common/BackButton";
import { getSlotDurationInHours } from "../../../components/StudentComponents/GetSlotDurationInHours";
import { Slot } from "../../../types/Bookings";
function formatLessonDateTime(dateStr: string, timeStr: string) {
  // parse the combined ISO, then format:
  return dayjs(`${dateStr}T${timeStr}`).format("dddd, MMMM Do [at] h:mm A");
}
const BookingDetails: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    selectedAvailability,
    instructorData,
    paymentMethod,
    isCurrentBooking = true,
    status,
    bookingId,
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
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayCancelled, setDisplayCancelled] = useState(false);
  const isCancelled = status === "cancelled" || displayCancelled;

  const [createBookingCheckoutSession, { loading: checkoutLoading }] =
    useMutation(CREATE_BOOKING_CHECKOUT_SESSION, {
      onError: (err) => {
        toast.error(err.message || "Failed to start checkout. Please try again.");
        setError(err.message || "Failed to start checkout.");
      },
    });
  const [completeBookingFromCheckout] = useMutation(
    COMPLETE_BOOKING_FROM_CHECKOUT,
    {
      onError: (err) => {
        toast.error(err.message || "Failed to complete booking.");
      },
    },
  );

  const [completeDeferredBookingFromCheckout] = useMutation(
    COMPLETE_DEFERRED_BOOKING_FROM_CHECKOUT,
    {
      // Error shown in useEffect .catch() to avoid double toast with success path fallback
      onError: () => {},
    },
  );

  const [checkoutHandled, setCheckoutHandled] = useState(false);
  const checkout = searchParams.get("checkout");
  const sessionId = searchParams.get("session_id");

  const runDeferredCompletion = () =>
    completeDeferredBookingFromCheckout({ variables: { sessionId } })
      .then(() => {
        setSearchParams({});
        toast.success(
          "Card saved successfully. We will charge you 48 hours before each lesson.",
        );
        navigate("/student-dashboard/book", { replace: true });
      })
      .catch((err) => {
        setSearchParams({});
        toast.error(
          err?.message ||
            "We could not link your card to your account. Please try again or contact support.",
        );
      });

  useEffect(() => {
    if (!sessionId || checkoutHandled) return;

    if (checkout === "cancelled") {
      toast("Payment was cancelled. You can try again when ready.");
      setSearchParams({});
      setCheckoutHandled(true);
      return;
    }

    // We have session_id: complete the booking (deferred or instant).
    setCheckoutHandled(true);

    if (checkout === "setup_success") {
      runDeferredCompletion();
      return;
    }

    if (checkout === "success") {
      completeBookingFromCheckout({ variables: { sessionId } })
        .then(() => {
          setSearchParams({});
          toast.success("Booking confirmed! Payment successful.");
          navigate("/student-dashboard/book", { replace: true });
        })
        .catch(() => {
          runDeferredCompletion();
        });
      return;
    }

    // session_id present but checkout param missing or unexpected: try deferred first (most common after "book lesson")
    runDeferredCompletion();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when URL params change
  }, [checkout, sessionId, checkoutHandled]);
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

  const resolveInstructorId = (): string => {
    if (typeof instructorId === "string" && instructorId) return instructorId;
    if (instructorData && typeof instructorData === "object") {
      const id = (instructorData as { id?: string; _id?: string }).id ?? (instructorData as { _id?: string })._id;
      if (id) return String(id);
    }
    if (typeof instructorData === "string") return instructorData;
    return "";
  };

  const handleRedirectToStripeCheckout = async () => {
    try {
      setError(null);
      if (!selectedAvailability || selectedAvailability.length === 0) {
        throw new Error("No availability slots selected");
      }
      const resolvedInstructorId = resolveInstructorId();
      if (!resolvedInstructorId) {
        throw new Error("Invalid instructor information");
      }
      const mutationInput = {
        instructorId: resolvedInstructorId,
        slots: selectedAvailability.map((slot: { date: string; startTime: string; endTime: string }) => ({
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: "booked",
        })),
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        finalAmount: Number(finalAmount),
        paymentMethod: {
          type: "card",
          cardNumber: "",
          paymentMethodId: "checkout",
        },
      };
      const result = await createBookingCheckoutSession({
        variables: { input: mutationInput },
      });
      const url = result.data?.createBookingCheckoutSession?.url;
      if (url) {
        handleCloseDialog();
        window.location.href = url;
      } else {
        setError("Could not open payment page. Please try again.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start checkout. Please try again.";
      setError(msg);
      toast.error(msg);
    }
  };
  // Add new state for reschedule dialog
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const handleReschedule = () => {
    if (isCurrentBooking || isCancelled) {
      navigate(`/student-dashboard/search/instructors/${instructorId}`);
    }
    const firstSlot = selectedAvailability?.[0];
    const lessonStart = firstSlot ? new Date(`${firstSlot.date}T${firstSlot.startTime}`).getTime() : 0;
    const now = Date.now();
    const msUntil = lessonStart ? lessonStart - now : 0;

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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reschedule booking");
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
  const { data: myRefundData, refetch: refetchMyRefundRequests } = useQuery(GET_MY_REFUND_REQUESTS, {
    fetchPolicy: "network-only",
  });
  const myRefundRequests = myRefundData?.getMyRefundRequests ?? [];
  const pendingRefundForThisSlot = Boolean(
    bookingId &&
      slotId &&
      myRefundRequests.some(
        (r: { bookingId: string; slotId: string; status: string }) =>
          r.bookingId === bookingId && r.slotId === slotId && r.status === "pending"
      )
  );

  const [requestRefund, { loading: refundLoading }] = useMutation(REQUEST_REFUND, {
    onCompleted: () => {
      setRefundRequestedForSlot(true);
      setRefundDialogOpen(false);
      refetchMyRefundRequests();
      toast.success("Refund requested. It will be processed after admin approval.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to request refund");
    },
  });
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundRequestedForSlot, setRefundRequestedForSlot] = useState(false);
  const currentSlot =
    slot ||
    selectedAvailability?.find((s: { _id?: string }) => s._id === slotId);
  const isSlotRefunded = Boolean(
    currentSlot?.status === "refund" ||
      (currentSlot as { refundedAt?: string } | undefined)?.refundedAt ||
      (currentSlot as { paymentStatus?: string } | undefined)?.paymentStatus === "refunded"
  );
  const isPendingOrRefunded = pendingRefundForThisSlot || refundRequestedForSlot || isSlotRefunded;
  const handleOpenRefund = () => setRefundDialogOpen(true);
  const handleCloseRefund = () => setRefundDialogOpen(false);
  const handleConfirmRefund = () => {
    if (isPendingOrRefunded) return;
    if (bookingId && slotId) {
      requestRefund({ variables: { bookingId, slotId } });
    }
  };
  const handleOpenCancel = () => {
    if (isCurrentBooking) {
      navigate(`/student-dashboard/search/instructors/${instructorId}`);
    }
    const firstSlot = selectedAvailability?.[0];
    const lessonStart = firstSlot ? new Date(`${firstSlot.date}T${firstSlot.startTime}`).getTime() : 0;
    const now = Date.now();
    const msUntil = lessonStart ? lessonStart - now : 0;

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
      setCancelError("");
      await cancelBooking({
        variables: { bookingId: bookingId, slotId: slotId },
      });
      toast.success("Booking cancelled successfully. You can request a refund for this lesson if you had paid.");
      setDisplayCancelled(true);
      handleCloseCancel();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { graphQLErrors?: Array<{ message?: string }> })?.graphQLErrors?.[0]?.message ||
            "Failed to cancel booking";
      setCancelError(msg);
      toast.error(msg);
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
      setDisplayCancelled(true);
      handleCloseCancel();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel booking");
    } finally {
      setCancelLoading(false);
    }
  };
  const isLessonPast = selectedAvailability?.length
    ? new Date(
        `${selectedAvailability[selectedAvailability.length - 1].date}T${
          selectedAvailability[selectedAvailability.length - 1].endTime
        }`
      ).getTime() < Date.now()
    : false;
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
            <Tooltip
              title={isLessonPast ? "You can't reschedule past bookings." : ""}
              arrow
            >
              <span>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleReschedule}
                  disabled={isLessonPast}
                  sx={{
                    width: "200px",
                    opacity: isLessonPast ? 0.6 : 1,
                    pointerEvents: isLessonPast ? "none" : "auto",
                    bgcolor: isLessonPast ? "#d3d3d3" : "#5ec2d2",
                    mr: 2,
                    "&:hover": {
                      bgcolor: isLessonPast ? "#d3d3d3" : "rgba(65, 135, 147)",
                    },
                  }}
                >
                  Reschedule
                </Button>
              </span>
            </Tooltip>

            {!isCancelled && (
              <Tooltip
                title={isLessonPast ? "You can't cancel past bookings." : ""}
                arrow
              >
                <span>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={handleOpenCancel}
                    disabled={isLessonPast || cancelLoading}
                    sx={{
                      width: "200px",
                      opacity: isLessonPast ? 0.6 : 1,
                      pointerEvents: isLessonPast ? "none" : "auto",
                      bgcolor: isLessonPast ? "#d3d3d3" : "#f44336",
                      "&:hover": {
                        bgcolor: isLessonPast ? "#d3d3d3" : "#d32f2f",
                      },
                    }}
                  >
                    {cancelLoading ? (
                      <CircularProgress size={20} />
                    ) : (
                      "Cancel Lesson"
                    )}
                  </Button>
                </span>
              </Tooltip>
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
              selectedAvailability.map((slot: { date: string; startTime: string; endTime: string }, index: number) => (
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
                        {getSlotDurationInHours(slot as Slot)} hours lesson
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
            {""} This doesn't apply to your current case, but just so you know —
            cancellations made less than 48 hours before a lesson are
            non-refundable, except in exceptional circumstances (e.g. medical
            emergencies).
          </Typography>
        </CardContent>
      </Card>

      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", mt: 3, gap: 1 }}>
        {isCurrentBooking ? (
          <>
            <Typography variant="body2" color="text.secondary">
              Next: pay CHF {finalAmount.toFixed(2)} securely on Stripe.
            </Typography>
            <Button
              variant="contained"
              onClick={handleConfirm}
              disabled={!initialPriceShown}
              sx={{
                width: "200px",
                bgcolor: "#5ec2d2",
                "&:hover": {
                  bgcolor: "rgba(65, 135, 147);",
                },
              }}
            >
              Confirm Booking
            </Button>
          </>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "flex-end" }}>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              {isCancelled && bookingId && slotId && pendingRefundForThisSlot && (
                <Typography variant="body2" color="info.main" fontWeight={500}>
                  Refund pending admin approval
                </Typography>
              )}
              {isCancelled && bookingId && slotId && !isPendingOrRefunded && (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleOpenRefund}
                  disabled={refundLoading}
                >
                  {refundLoading ? (
                    <CircularProgress size={20} />
                  ) : (
                    "Request refund"
                  )}
                </Button>
              )}
              {isCancelled && bookingId && slotId && isSlotRefunded && (
                <Typography variant="body2" color="text.secondary">
                  This lesson has been refunded.
                </Typography>
              )}
              <Button
                variant="outlined"
                color="primary"
                onClick={() => navigate("/student-dashboard/book")}
              >
                Back to Bookings
              </Button>
            </Box>
            {isCancelled && bookingId && slotId && !isSlotRefunded && (
              <Typography variant="caption" color="text.secondary">
                {pendingRefundForThisSlot
                  ? "Admin will review your refund request. You will be notified once processed."
                  : "Refund will be sent to the card you used to pay after admin approval."}
              </Typography>
            )}
          </Box>
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

            <Typography align="center" gutterBottom>
              {selectedAvailability?.length || 0} lesson
              {selectedAvailability?.length > 1 ? "s" : ""} — CHF{" "}
              {finalAmount.toFixed(2)} (after discount)
            </Typography>

            <Box sx={{ bgcolor: "#f5f5f5", p: 2, borderRadius: 1, mt: 2, mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Start:</strong>{" "}
                {selectedAvailability?.[0]
                  ? formatLessonDateTime(
                      selectedAvailability[0].date,
                      selectedAvailability[0].startTime
                    )
                  : "—"}
              </Typography>
              <Typography variant="body2">
                <strong>End:</strong>{" "}
                {selectedAvailability?.length
                  ? formatLessonDateTime(
                      selectedAvailability[selectedAvailability.length - 1]
                        .date,
                      selectedAvailability[selectedAvailability.length - 1]
                        .endTime
                    )
                  : "—"}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You will be redirected to Stripe&apos;s secure payment page to complete your booking. No card details are entered on this site.
            </Typography>
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleRedirectToStripeCheckout}
              disabled={checkoutLoading}
              sx={{
                py: 1.5,
                mt: 1,
                bgcolor: "#5fc2d3",
                "&:hover": { bgcolor: "#4bb1c2" },
              }}
            >
              {checkoutLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                `Pay CHF ${finalAmount.toFixed(2)} on Stripe`
              )}
            </Button>
          </DialogContent>
          <DialogActions sx={{ justifyContent: "center", pb: 3 }} />
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

      {/* Refund request dialog */}
      <Dialog
        open={refundDialogOpen}
        onClose={handleCloseRefund}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Request refund
          <IconButton
            onClick={handleCloseRefund}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            You are requesting a full refund for this cancelled lesson.
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Your request will be sent to admin for approval. Once approved, the
            refund will be credited to your original payment method
            {paymentMethod?.cardLast4
              ? ` (card ending ****${paymentMethod.cardLast4})`
              : ""}
            . It may take a few business days to appear.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
          <Button onClick={handleCloseRefund}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConfirmRefund}
            disabled={refundLoading || isPendingOrRefunded}
          >
            {refundLoading ? (
              <CircularProgress size={20} />
            ) : (
              "Confirm refund"
            )}
          </Button>
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
