import {
  Box,
  Typography,
  Avatar,
  Card,
  CardContent,
  Grid,
  Button,
  Skeleton,
  Stack,
  Alert,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChatIcon from "@mui/icons-material/Chat";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import {
  GET_STUDENT_BOOKINGS,
  CREATE_CHECKOUT_SESSION_FOR_PENDING_BOOKING,
} from "../../../graphql/mutations/studentBooking";
import { GET_MY_REFUND_REQUESTS } from "../../../graphql/mutations/refundRequest";
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
  const [createCheckoutForPending, { loading: checkoutPendingLoading }] =
    useMutation(CREATE_CHECKOUT_SESSION_FOR_PENDING_BOOKING);
  const { data: refundData } = useQuery(GET_MY_REFUND_REQUESTS, {
    fetchPolicy: "network-only",
  });

  const [loadingCheckoutBookingId, setLoadingCheckoutBookingId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);


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
        createdAt: booking.createdAt,
        stripeCustomerId: (booking as { stripeCustomerId?: string | null })
          .stripeCustomerId,
      },
    });
  };
  const handleRequestRefundFromList = (booking: Booking, slot: Slot) => {
    navigate("/student-dashboard/refund-request", {
      state: {
        bookingId: booking._id,
        slotId: slot._id,
        slot,
        instructor: booking.instructorId,
      },
    });
  };

  const bookings = data?.getStudentBookings || [];
  const myRefundRequests = refundData?.getMyRefundRequests ?? [];
  const refundRequestStateMap: Record<string, "pending" | "processing" | "approved" | "rejected"> =
    myRefundRequests.reduce(
      (
        acc: Record<string, "pending" | "processing" | "approved" | "rejected">,
        r: { bookingId: string; slotId: string; status: "pending" | "processing" | "approved" | "rejected" },
      ) => {
        const key = `${r.bookingId}:${r.slotId}`;
        acc[key] = r.status;
        return acc;
      },
      {},
    );
  // Calculate pagination

  if (loading) {
    return (
      <Box className="dsp-student-page dsp-student-bookings-page" sx={{ p: 3, bgcolor: "transparent", minHeight: "100vh" }}>
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
  }
  if (error) {
    return (
      <Box className="dsp-student-page dsp-student-bookings-page dsp-student-state-wrap"
        sx={{
          p: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "50vh",
          bgcolor: "var(--ws-surface, #f5f5f5)",
        }}
      >
        <Box
          sx={{
            maxWidth: 360,
            py: 4,
            px: 3,
            textAlign: "center",
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
            border: "1px solid",
            borderColor: "grey.200",
          }}
        >
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            We couldn’t load your bookings right now.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please try again in a moment.
          </Typography>
          <Button
            variant="contained"
            onClick={() => refetch()}
            sx={{
              bgcolor: "var(--ws-primary, #5fc2d3)",
              "&:hover": { bgcolor: "var(--ws-primary, #4bb1c2)" },
            }}
          >
            Try again
          </Button>
        </Box>
      </Box>
    );
  }

  // Abandoned = started checkout but didn't complete (closed tab). Same as "Abandoned" tab.
  const isAbandonedPending = (b: Booking & { stripeCustomerId?: string | null }) =>
    b.status === "pending" &&
    !b.stripeCustomerId &&
    !(b.slots ?? []).some((s: { paymentStatus?: string }) => s.paymentStatus === "paid");

  const abandonedCheckoutSlots = bookings
    .filter((b) => isAbandonedPending(b as Booking & { stripeCustomerId?: string | null }))
    .flatMap((b) =>
      (b.slots || [])
        .filter(
          (s: { status?: string; date?: string }) =>
            s.status === "booked" || s.status === "confirmed",
        )
        .map((s: Slot) => ({
          bookingId: b._id,
          slotId: s._id,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          instructorName: `${b.instructorId?.firstName || ""} ${b.instructorId?.lastName || ""}`.trim(),
        })),
    );
  const abandonedByBooking = abandonedCheckoutSlots.reduce<
    Array<{ bookingId: string; instructorName: string; slots: typeof abandonedCheckoutSlots }>
  >((acc, slot) => {
    const existing = acc.find((x) => x.bookingId === slot.bookingId);
    if (existing) {
      existing.slots.push(slot);
    } else {
      acc.push({ bookingId: slot.bookingId, instructorName: slot.instructorName, slots: [slot] });
    }
    return acc;
  }, []);

  const handleContinueToCheckout = async (bookingId: string) => {
    setCheckoutError(null);
    setLoadingCheckoutBookingId(bookingId);
    try {
      const { data } = await createCheckoutForPending({
        variables: { bookingId },
      });
      const url = data?.createCheckoutSessionForPendingBooking?.url;
      if (url) {
        window.location.href = url;
        return;
      }
      setCheckoutError("Checkout is unavailable for this booking. Refresh Booked lessons and check its status.");
    } catch {
      setCheckoutError("We couldn’t open checkout. Refresh Booked lessons and check the booking status before trying again.");
    } finally {
      setLoadingCheckoutBookingId(null);
    }
  };

  return (
    <Box className="dsp-student-page dsp-student-bookings-page" sx={{ px: 3, py: 1, bgcolor: "transparent", minHeight: "100vh" }}>
      <BackButton
        to="/student-dashboard/search"
        variant="outline"
        label="Back"
      />
      <div className="dsp-student-bookings-page__heading"><span>Student workspace</span><h1>Booked lessons</h1><p>Manage your upcoming lessons, payment status, and lesson history.</p></div>
      {/* Abandoned checkouts: resume payment for the same booking (no re-search, slot stays reserved). */}
      {abandonedByBooking.length > 0 && (
        <Card sx={{ mb: 3, mt: 2, borderLeft: "4px solid var(--ws-border, #9e9e9e)" }}>
          <Box
            sx={{
              pb: 1.6,
              px: 2,
              pt: 1.3,
              borderBottom: 1,
              borderBottomColor: "divider",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Incomplete checkouts
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You started checkout but didn’t complete payment (e.g. closed the tab). Use “Continue to checkout” to finish payment for the same lesson — no need to search again.
            </Typography>
          </Box>
          <CardContent>
            {checkoutError && (
              <Alert
                severity="error"
                onClose={() => setCheckoutError(null)}
                sx={{ mb: 2 }}
              >
                {checkoutError}
              </Alert>
            )}
            <Stack spacing={2}>
              {abandonedByBooking.map((item) => {
                const thisButtonLoading = loadingCheckoutBookingId === item.bookingId;
                return (
                  <Box
                    key={item.bookingId}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 1,
                      p: 1.5,
                      bgcolor: "action.hover",
                      borderRadius: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2">
                        {item.instructorName}
                      </Typography>
                      {item.slots.map((slot) => (
                        <Typography
                          key={`${slot.bookingId}-${slot.slotId}`}
                          variant="body2"
                          color="text.secondary"
                        >
                          {new Date(slot.date).toLocaleDateString([], {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          · {slot.startTime} – {slot.endTime}
                        </Typography>
                      ))}
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", fontWeight: 500 }}
                      >
                        Checkout not completed
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={loadingCheckoutBookingId != null || checkoutPendingLoading}
                      sx={{ bgcolor: "var(--ws-primary, #5fc2d3)", textTransform: "none" }}
                      onClick={() => handleContinueToCheckout(item.bookingId)}
                    >
                      {thisButtonLoading ? "Loading…" : "Continue to checkout"}
                    </Button>
                  </Box>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      )}
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
              <Avatar sx={{ bgcolor: "var(--ws-primary, #6a1b9a)", mr: 2 }}>S</Avatar>
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
                  borderColor: "var(--ws-info-border, #1976d2)",
                  color: "var(--ws-info, #1976d2)",
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
                          bgcolor: "var(--ws-surface, #e6f0fa)",
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
        onRequestRefund={handleRequestRefundFromList}
        refundRequestStateMap={refundRequestStateMap}
        showNewBookingButton={!selectedAvailability}
        onNewBooking={() => navigate("/student-dashboard/search")}
      />
    </Box>
  );
};

export default BookLesson;
