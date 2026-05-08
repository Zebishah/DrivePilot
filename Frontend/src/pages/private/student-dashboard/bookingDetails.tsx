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
  Divider,
  Chip,
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
  RESCHEDULE_BOOKING_SLOT,
} from "../../../graphql/mutations/studentBooking";
import { GET_MY_REFUND_REQUESTS } from "../../../graphql/mutations/refundRequest";
import { GET_INSTRUCTOR_PROFILE } from "../../../graphql/mutations/instructorPublic";
import toast from "react-hot-toast";
import advancedFormat from "dayjs/plugin/advancedFormat";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import dayjs from "dayjs";
dayjs.extend(advancedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
import { BackButton } from "../../../components/InstructorComponent/common/BackButton";
import { getSlotDurationInHours } from "../../../components/StudentComponents/GetSlotDurationInHours";
import { Slot } from "../../../types/Bookings";

const SLOT_BUSINESS_TIMEZONE =
  import.meta.env.VITE_SLOT_TIMEZONE || "Europe/Zurich";
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

function normalizeSlotTime(timeStr: string) {
  if (!timeStr) return "00:00:00";
  return timeStr.split(":").length === 2 ? `${timeStr}:00` : timeStr;
}

function getSlotStartUtcMs(dateStr: string, timeStr: string) {
  const parsed = dayjs.tz(
    `${dateStr} ${normalizeSlotTime(timeStr)}`,
    "YYYY-MM-DD HH:mm:ss",
    SLOT_BUSINESS_TIMEZONE,
  );
  return parsed.isValid() ? parsed.valueOf() : NaN;
}

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
  const [error, setError] = useState<string | null>(null);
  /** Slot needs 3DS or retry after T-48 charge (requires_action or payment_failed) */
  const slotNeedsPayment =
    (slot as { paymentStatus?: string } | undefined)?.paymentStatus === "requires_action" ||
    (slot as { paymentStatus?: string } | undefined)?.paymentStatus === "payment_failed";
  const paymentReminderDeadlineAt = (slot as { paymentReminderDeadlineAt?: string } | undefined)
    ?.paymentReminderDeadlineAt;
  const paymentReminderStartedAt = (slot as { paymentReminderStartedAt?: string } | undefined)
    ?.paymentReminderStartedAt;
  const computedDeadline = (() => {
    if (paymentReminderDeadlineAt) return new Date(paymentReminderDeadlineAt);
    if (paymentReminderStartedAt) {
      return new Date(new Date(paymentReminderStartedAt).getTime() + 24 * 60 * 60 * 1000);
    }
    return null;
  })();
  const paymentDeadlineLabel =
    computedDeadline && !Number.isNaN(computedDeadline.getTime())
      ? computedDeadline.toLocaleString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "the deadline";
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
  /** Set when user returns from Stripe with checkout=cancelled (so we can show retry message when state was lost) */
  const [paymentCancelledReturn, setPaymentCancelledReturn] = useState(false);
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
    // Handle cancel first: Stripe cancel_url has ?checkout=cancelled but usually no session_id
    if (checkout === "cancelled") {
      toast("Payment was cancelled. You can try again when ready.");
      setSearchParams((prev) => {
        prev.delete("checkout");
        prev.delete("session_id");
        return prev;
      });
      setCheckoutHandled(true);
      setPaymentCancelledReturn(true);
      return;
    }

    if (!sessionId || checkoutHandled) return;

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
  const [selectedRescheduleSlotId, setSelectedRescheduleSlotId] = useState<string>("");
  const [rescheduleError, setRescheduleError] = useState<string>("");
  const [rescheduleBookingSlot] = useMutation(RESCHEDULE_BOOKING_SLOT);
  const { data: instructorProfileData } = useQuery(GET_INSTRUCTOR_PROFILE, {
    variables: { id: instructorId },
    skip: !instructorId || isCurrentBooking || isCancelled,
    fetchPolicy: "network-only",
  });
  const handleReschedule = () => {
    if (isCurrentBooking || isCancelled) return;
    const firstSlot = selectedAvailability?.[0];
    const lessonDate = firstSlot?.date ? new Date(firstSlot.date) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (lessonDate) lessonDate.setHours(0, 0, 0, 0);

    if (!lessonDate || lessonDate < today) {
      setIsTooLate(true);
    } else {
      setIsTooLate(false);
    }
    setSelectedRescheduleSlotId("");
    setRescheduleError("");
    setIsRescheduleDialogOpen(true);
  };

  const currentSlot =
    slot ||
    selectedAvailability?.find((s: { _id?: string }) => s._id === slotId);

  const availableRescheduleSlots = (() => {
    const profile = instructorProfileData?.getInstructorPublicProfile;
    const allSlots =
      profile?.availability?.flatMap(
        (d: { availableSlots?: Array<{ id: string; date: string; startTime: string; endTime: string; booked?: boolean; status?: string }> }) =>
          d.availableSlots || [],
      ) || [];

    const now = Date.now();
    return allSlots.filter((s: { id: string; date: string; startTime: string; endTime: string; booked?: boolean; status?: string }) => {
      if (!s.id) return false;
      if (s.booked || s.status !== "available") return false;
      const startMs = new Date(`${s.date}T${s.startTime}`).getTime();
      if (!Number.isFinite(startMs)) return false;
      if (startMs <= now) return false;
      const sameAsCurrent =
        s.date === (currentSlot as { date?: string })?.date &&
        s.startTime === (currentSlot as { startTime?: string })?.startTime &&
        s.endTime === (currentSlot as { endTime?: string })?.endTime;
      return !sameAsCurrent;
    });
  })();
  const selectedRescheduleSlot = availableRescheduleSlots.find(
    (s: { id: string }) => s.id === selectedRescheduleSlotId,
  );
  const selectedRescheduleStartMs = selectedRescheduleSlot
    ? getSlotStartUtcMs(selectedRescheduleSlot.date, selectedRescheduleSlot.startTime)
    : NaN;
  const selectedRescheduleInT48Window =
    Number.isFinite(selectedRescheduleStartMs) &&
    selectedRescheduleStartMs - Date.now() <= FORTY_EIGHT_HOURS_MS;
  const selectedRescheduleChargeAtMs =
    Number.isFinite(selectedRescheduleStartMs)
      ? selectedRescheduleStartMs - FORTY_EIGHT_HOURS_MS
      : NaN;
  const currentSlotPaymentStatus = String(
    (currentSlot as { paymentStatus?: string } | undefined)?.paymentStatus || "",
  ).toLowerCase();
  const isCurrentSlotPendingPayment = currentSlotPaymentStatus === "pending_payment";

  const handleConfirmReschedule = async () => {
    try {
      if (!bookingId || !slotId) {
        setRescheduleError("Booking/slot info missing for reschedule.");
        return;
      }
      if (!selectedRescheduleSlotId) {
        setRescheduleError("Please select a new slot.");
        return;
      }
      const selectedSlot = availableRescheduleSlots.find((s: { id: string }) => s.id === selectedRescheduleSlotId);
      if (!selectedSlot) {
        setRescheduleError("Selected slot is no longer available. Please choose another.");
        return;
      }
      const selectedStartMs = getSlotStartUtcMs(
        selectedSlot.date,
        selectedSlot.startTime,
      );
      const dueNowAfterReschedule =
        currentSlotPaymentStatus === "pending_payment" &&
        Number.isFinite(selectedStartMs) &&
        selectedStartMs - Date.now() <= FORTY_EIGHT_HOURS_MS;

      setRescheduleLoading(true);
      setRescheduleError("");
      await rescheduleBookingSlot({
        variables: {
          input: {
            bookingId,
            slotId,
            newDate: selectedSlot.date,
            newStartTime: selectedSlot.startTime,
            newEndTime: selectedSlot.endTime,
          },
        },
      });
      if (dueNowAfterReschedule) {
        toast.success(
          "Lesson rescheduled. Payment is now due and will be attempted shortly.",
        );
      } else {
        toast.success("Lesson rescheduled successfully.");
      }
      setIsRescheduleDialogOpen(false);
      navigate("/student-dashboard/book", { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reschedule booking";
      setRescheduleError(message);
      toast.error(message);
    } finally {
      setRescheduleLoading(false);
    }
  };
  const [isCancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [isTooLate, setIsTooLate] = useState(false);
  const [cancelBooking] = useMutation(CANCEL_BOOKING);
  const { data: myRefundData } = useQuery(GET_MY_REFUND_REQUESTS, {
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
  const rejectedRefundForThisSlot = myRefundRequests.find(
    (r: { bookingId: string; slotId: string; status: string; rejectionReason?: string | null }) =>
      bookingId && slotId && r.bookingId === bookingId && r.slotId === slotId && r.status === "rejected"
  ) as { rejectionReason?: string | null } | undefined;

  const isLessonPast = selectedAvailability?.length
    ? new Date(
        `${selectedAvailability[selectedAvailability.length - 1].date}T${
          selectedAvailability[selectedAvailability.length - 1].endTime || "23:59"
        }`
      ).getTime() < Date.now()
    : false;
  /** Current slot's lesson date/time has passed (for single-slot view from booked lessons) */
  const slotDate = (currentSlot as { date?: string } | undefined)?.date;
  const slotEndTime =
    (currentSlot as { endTime?: string; startTime?: string } | undefined)?.endTime ||
    (currentSlot as { startTime?: string } | undefined)?.startTime ||
    "23:59";
  const isSlotLessonPast =
    !!currentSlot &&
    !!slotDate &&
    new Date(`${slotDate}T${slotEndTime}`).getTime() < Date.now();
  /** Cannot cancel if lesson past or slot already completed/missed/refunded */
  const cannotCancel =
    isLessonPast ||
    (currentSlot as { status?: string } | undefined)?.status === "completed" ||
    (currentSlot as { status?: string } | undefined)?.status === "missed" ||
    (currentSlot as { status?: string } | undefined)?.status === "refund";
  /** Can complete payment (3DS/retry) only if slot needs payment and lesson not past and not completed/missed */
  const canCompletePayment =
    slotNeedsPayment &&
    !isSlotLessonPast &&
    (currentSlot as { status?: string } | undefined)?.status !== "completed" &&
    (currentSlot as { status?: string } | undefined)?.status !== "missed";
  /** Slot-level cancelled: show refund UI for this slot (works for semi_cancelled bookings too) */
  const isSlotCancelled = Boolean(
    (currentSlot as { status?: string } | undefined)?.status === "cancelled"
  );
  /** Slot was actually paid (so refund is possible). Deferred booking cancelled before T-48 is not paid. */
  const isSlotPaid = Boolean(
    (currentSlot as { paymentStatus?: string } | undefined)?.paymentStatus === "paid" ||
    (currentSlot as { chargeAmount?: number } | undefined)?.chargeAmount != null
  );
  const isSlotRefunded = Boolean(
    currentSlot?.status === "refund" ||
      (currentSlot as { refundedAt?: string } | undefined)?.refundedAt ||
      (currentSlot as { paymentStatus?: string } | undefined)?.paymentStatus === "refunded"
  );
  const isPendingOrRefunded = pendingRefundForThisSlot || isSlotRefunded;
  const cancellationInfo = (() => {
    const cancelledBy = (currentSlot as { cancelledBy?: string } | undefined)?.cancelledBy;
    const cancellationDate = (currentSlot as { cancellationDate?: string } | undefined)
      ?.cancellationDate;
    const cancelledByLabel =
      cancelledBy === "student"
        ? "Student"
        : cancelledBy === "instructor"
          ? "Instructor"
          : cancelledBy === "admin"
            ? "Admin"
            : "Unknown";
    const parsed = cancellationDate ? new Date(cancellationDate) : null;
    const cancelledAt =
      parsed && !Number.isNaN(parsed.getTime())
        ? parsed.toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—";
    return { cancelledByLabel, cancelledAt };
  })();
  const handleOpenRefund = () => {
    if (!bookingId || !slotId) return;
    navigate("/student-dashboard/refund-request", {
      state: {
        bookingId,
        slotId,
        slot: currentSlot,
        instructor: { id: instructorId, name, email },
      },
    });
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
  // User returned from Stripe with checkout=cancelled; redirect loses location.state so show retry message
  if (paymentCancelledReturn && !instructorId) {
    return (
      <Box sx={{ py: 1, px: 3, bgcolor: "#f5f5f5", minHeight: "100vh" }}>
        <BackButton variant="outline" showIcon={true} />
        <Card sx={{ mb: 3, mt: 2, p: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Payment was cancelled. You can try again when ready.
          </Alert>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Your booking is still pending. Go to Book lesson to find your incomplete checkout and continue to payment.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate("/student-dashboard/book", { replace: true })}
            sx={{ textTransform: "none" }}
          >
            Go to Book lesson
          </Button>
        </Card>
      </Box>
    );
  }

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
              title={
                cannotCancel
                  ? "You can't reschedule: lesson is past or already completed/missed/refunded."
                  : ""
              }
              arrow
            >
              <span>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleReschedule}
                  disabled={cannotCancel}
                  sx={{
                    width: "200px",
                    opacity: cannotCancel ? 0.6 : 1,
                    pointerEvents: cannotCancel ? "none" : "auto",
                    bgcolor: cannotCancel ? "#d3d3d3" : "#5ec2d2",
                    mr: 2,
                    "&:hover": {
                      bgcolor: cannotCancel ? "#d3d3d3" : "rgba(65, 135, 147)",
                    },
                  }}
                >
                  Reschedule
                </Button>
              </span>
            </Tooltip>

            {!isCancelled && (
              <Tooltip
                title={
                  cannotCancel
                    ? "You can't cancel: lesson is past or already completed/missed/refunded."
                    : ""
                }
                arrow
              >
                <span>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={handleOpenCancel}
                    disabled={cannotCancel || cancelLoading}
                    sx={{
                      width: "200px",
                      opacity: cannotCancel ? 0.6 : 1,
                      pointerEvents: cannotCancel ? "none" : "auto",
                      bgcolor: cannotCancel ? "#d3d3d3" : "#f44336",
                      "&:hover": {
                        bgcolor: cannotCancel ? "#d3d3d3" : "#d32f2f",
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
          {isSlotCancelled && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Cancelled by: {cancellationInfo.cancelledByLabel} • Cancelled at:{" "}
              {cancellationInfo.cancelledAt}
            </Alert>
          )}
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
          {/* <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            <strong>Attention:</strong>
            {""} This doesn't apply to your current case, but just so you know —
            cancellations made less than 48 hours before a lesson are
            non-refundable, except in exceptional circumstances (e.g. medical
            emergencies).
          </Typography> */}
        </CardContent>
      </Card>

      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", mt: 3, gap: 1 }}>
        {isCurrentBooking ? (
          <>
            <Typography variant="body2" color="text.secondary">
              Next: pay CHF {finalAmount.toFixed(2)} securely on Stripe.
            </Typography>
            {error && (
              <Alert severity="error" onClose={() => setError(null)} sx={{ width: "100%", maxWidth: 400 }}>
                {error}
              </Alert>
            )}
            <Button
              variant="contained"
              onClick={handleRedirectToStripeCheckout}
              disabled={!initialPriceShown || checkoutLoading}
              sx={{
                width: "200px",
                bgcolor: "#5ec2d2",
                "&:hover": {
                  bgcolor: "rgba(65, 135, 147);",
                },
              }}
            >
              {checkoutLoading ? (
                <>
                  <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                  Redirecting…
                </>
              ) : (
                "Confirm Booking"
              )}
            </Button>
          </>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, alignItems: "stretch", width: "100%", maxWidth: 500 }}>
            {canCompletePayment && bookingId && slotId && (
              <Alert severity="warning" sx={{ width: "100%" }}>
                Please complete your payment before {paymentDeadlineLabel}. Otherwise, your lesson will be automatically cancelled.
              </Alert>
            )}
            {slotNeedsPayment && !canCompletePayment && bookingId && slotId && (
              <Alert severity="info" sx={{ width: "100%" }}>
                This lesson can no longer be paid (lesson date has passed or lesson was marked completed/missed).
              </Alert>
            )}
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 2,
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
                {isSlotCancelled && bookingId && slotId && pendingRefundForThisSlot && (
                  <Typography variant="body2" color="info.main" fontWeight={500}>
                    Refund pending admin approval
                  </Typography>
                )}
                {isSlotCancelled && bookingId && slotId && rejectedRefundForThisSlot && (
                  <Typography variant="body2" color="error.main" fontWeight={500}>
                    Your refund request was rejected.
                    {rejectedRefundForThisSlot.rejectionReason
                      ? ` Reason: ${rejectedRefundForThisSlot.rejectionReason}`
                      : ""}
                  </Typography>
                )}
                {isSlotCancelled && bookingId && slotId && !isSlotPaid && !isSlotRefunded && (
                  <Typography variant="body2" color="text.secondary">
                    This lesson was not paid (e.g. cancelled before charge); no refund applies.
                  </Typography>
                )}
                {isSlotCancelled && bookingId && slotId && isSlotRefunded && (
                  <Typography variant="body2" color="text.secondary">
                    This lesson has been refunded.
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexShrink: 0 }}>
                {isSlotCancelled && bookingId && slotId && isSlotPaid && !isPendingOrRefunded && !rejectedRefundForThisSlot && (
                  <Tooltip
                    title={
                      isSlotLessonPast
                        ? "Refund cannot be requested after the lesson date has passed."
                        : ""
                    }
                    arrow
                  >
                    <span>
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={handleOpenRefund}
                        disabled={isSlotLessonPast}
                      >
                        Request refund
                      </Button>
                    </span>
                  </Tooltip>
                )}
                {canCompletePayment && bookingId && slotId && (
                  <Button
                    variant="contained"
                    size="medium"
                    onClick={() =>
                      navigate(
                        `/student-dashboard/complete-payment?bookingId=${bookingId}&slotId=${slotId}`,
                      )
                    }
                  >
                    Complete payment
                  </Button>
                )}
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => navigate("/student-dashboard/book")}
                >
                  Back to Bookings
                </Button>
              </Box>
            </Box>
            {isSlotCancelled && bookingId && slotId && !isSlotRefunded && (
              <Typography variant="caption" color="text.secondary">
                {!isSlotPaid
                  ? "This lesson was not paid; no refund applies."
                  : pendingRefundForThisSlot
                    ? "Admin will review your refund request. You will be notified once processed."
                    : rejectedRefundForThisSlot
                      ? "A previous refund request for this lesson was rejected. Contact support if you have questions."
                      : "Refund will be sent to the card you used to pay after admin approval."}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Confirmation Dialog - Only show for current bookings - REMOVED: redirect goes directly to Stripe */}

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
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle sx={{ pb: 1.2 }}>
          {isTooLate ? "Cannot Reschedule Lesson" : "Reschedule Lesson"}
          <IconButton
            onClick={() => setIsRescheduleDialogOpen(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
          {!isTooLate && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Move this lesson to another available time slot.
            </Typography>
          )}
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          {rescheduleError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {rescheduleError}
            </Alert>
          )}
          {isTooLate ? (
            <Alert severity="error">
              You can&apos;t reschedule this lesson because the lesson date has already passed.
            </Alert>
          ) : (
            <>
              <Typography align="center" sx={{ mb: 1.5 }}>
                Are you sure you want to reschedule your lesson scheduled for{" "}
                {selectedAvailability?.[0]
                  ? formatLessonDateTime(
                      selectedAvailability[0].date,
                      selectedAvailability[0].startTime
                    )
                  : "Not selected"}
                ?
              </Typography>
              <Alert severity="info" sx={{ mt: 1.5 }}>
                Choose a new available slot. Your lesson will be moved directly without cancelling the full booking.
              </Alert>
              {isCurrentSlotPendingPayment && !selectedRescheduleSlot && (
                <Alert severity="info" sx={{ mt: 1.5 }}>
                  This lesson is on deferred payment. After you choose a new slot:
                  if it starts within 48 hours, payment becomes due immediately;
                  otherwise it stays deferred until T-48.
                </Alert>
              )}
              {isCurrentSlotPendingPayment && selectedRescheduleSlot && selectedRescheduleInT48Window && (
                <Alert severity="warning" sx={{ mt: 1.5 }}>
                  Due now: this selected time is within 48 hours, so payment will
                  be attempted on the next T-48 job tick (about 1 minute).
                </Alert>
              )}
              {isCurrentSlotPendingPayment &&
                selectedRescheduleSlot &&
                !selectedRescheduleInT48Window &&
                Number.isFinite(selectedRescheduleChargeAtMs) && (
                  <Alert severity="success" sx={{ mt: 1.5 }}>
                    Still deferred: payment remains pending and will be attempted at{" "}
                    {new Date(selectedRescheduleChargeAtMs).toLocaleString()}.
                  </Alert>
                )}
              <Box
                sx={{
                  bgcolor: "#f7fafc",
                  border: "1px solid #e2e8f0",
                  p: 2,
                  borderRadius: 2,
                  mt: 2,
                }}
              >
                <Box
                  sx={{
                    mb: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography variant="h6">Select New Slot</Typography>
                  <Chip
                    size="small"
                    label={`${availableRescheduleSlots.length} available`}
                    color="info"
                    variant="outlined"
                  />
                </Box>
                <Divider sx={{ mb: 1.5 }} />

                <Box sx={{ maxHeight: 360, overflowY: "auto", pr: 0.5 }}>
                  {availableRescheduleSlots.length > 0 ? (
                    <Grid container spacing={1}>
                      {availableRescheduleSlots.map((s: { id: string; date: string; startTime: string; endTime: string }) => {
                        const isSelected = selectedRescheduleSlotId === s.id;
                        return (
                          <Grid item xs={12} key={s.id}>
                            <Button
                              fullWidth
                              variant={isSelected ? "contained" : "outlined"}
                              onClick={() => setSelectedRescheduleSlotId(s.id)}
                              sx={{
                                justifyContent: "space-between",
                                textTransform: "none",
                                borderRadius: 2,
                                px: 1.8,
                                py: 1.2,
                                borderColor: isSelected ? "#5ec2d2" : "#b7dfea",
                                bgcolor: isSelected ? "#5ec2d2" : "#fff",
                                color: isSelected ? "#083b45" : "#1d4e89",
                                "&:hover": {
                                  borderColor: "#5ec2d2",
                                  bgcolor: isSelected ? "#4db1c1" : "#f0fbff",
                                },
                              }}
                            >
                              <Box sx={{ textAlign: "left" }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {new Date(s.date).toLocaleDateString("en-GB")}
                                </Typography>
                                <Typography variant="body2">
                                  {s.startTime} - {s.endTime}
                                </Typography>
                              </Box>
                              {isSelected && (
                                <Chip size="small" label="Selected" sx={{ bgcolor: "#fff", color: "#0f5563" }} />
                              )}
                            </Button>
                          </Grid>
                        );
                      })}
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No eligible slots available for reschedule right now.
                    </Typography>
                  )}
                </Box>
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            justifyContent: "space-between",
            px: 3,
            py: 2,
            borderTop: "1px solid #edf2f7",
            bgcolor: "#fff",
          }}
        >
          {!isTooLate && (
            <Button
              variant="contained"
              onClick={handleConfirmReschedule}
              disabled={rescheduleLoading || !selectedRescheduleSlotId}
              sx={{
                minWidth: "210px",
                bgcolor: "#5ec2d2",
                "&:hover": {
                  bgcolor: "rgba(65, 135, 147)",
                },
              }}
            >
              {rescheduleLoading ? (
                <CircularProgress size={20} />
              ) : (
                isCurrentSlotPendingPayment && selectedRescheduleInT48Window
                  ? "Confirm Reschedule (Due now)"
                  : "Confirm Reschedule"
              )}
            </Button>
          )}
          <Button
            onClick={() => setIsRescheduleDialogOpen(false)}
            variant="outlined"
            sx={{ minWidth: "120px" }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BookingDetails;
