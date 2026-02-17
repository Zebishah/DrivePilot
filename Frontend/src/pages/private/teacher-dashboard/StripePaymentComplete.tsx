import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActions,
  Stack,
  Divider,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@apollo/client";
import { VERIFY_STRIPE_ONBOARDING, REGENERATE_STRIPE_LINK } from "../../../graphql/mutations/profile";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";

/**
 * Shown when Stripe redirects to return_url after onboarding.
 * Verifies status and shows result; offers "Fix now" for restricted.
 */
export default function StripePaymentComplete() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<{
    loading: boolean;
    onboardingStatus?: string;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    error?: string;
  }>({ loading: true });

  const [verifyOnboarding] = useMutation(VERIFY_STRIPE_ONBOARDING, {
    onCompleted: (data) => {
      const v = data?.verifyStripeOnboarding;
      setStatus({
        loading: false,
        onboardingStatus: v?.onboardingStatus,
        chargesEnabled: v?.chargesEnabled,
        payoutsEnabled: v?.payoutsEnabled,
      });
      if (v?.onboardingStatus === "verified") {
        toast.success("Payment setup complete");
      }
    },
    onError: (err) => {
      setStatus({ loading: false, error: err.message });
      toast.error(err.message || "Failed to verify status");
    },
  });

  const [regenerateLink, { loading: regenLoading }] = useMutation(REGENERATE_STRIPE_LINK, {
    onCompleted: (data) => {
      const url = data?.regenerateStripeLink?.onboardingUrl;
      if (url) window.location.href = url;
      else toast.error("Could not get link");
    },
    onError: (err) => toast.error(err.message || "Failed to get link"),
  });

  useEffect(() => {
    if (!user || user.role !== "Instructor") {
      navigate("/teacher-dashboard/overview");
      return;
    }
    verifyOnboarding();
  }, [user, navigate]);

  if (status.loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#f5f7fb",
          px: 2,
        }}
      >
        <Card
          elevation={3}
          sx={{
            maxWidth: 520,
            width: "100%",
            borderRadius: 3,
            p: 3,
          }}
        >
          <Stack spacing={3} alignItems="center">
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                bgcolor: "rgba(94, 194, 210, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress size={36} sx={{ color: "#5ec2d2" }} />
            </Box>
            <Box textAlign="center">
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Verifying your payment setup
              </Typography>
              <Typography variant="body2" color="text.secondary">
                We&apos;re talking to Stripe to confirm your account status.
                This usually only takes a few seconds.
              </Typography>
            </Box>
          </Stack>
        </Card>
      </Box>
    );
  }

  const goToSettings = () => navigate("/teacher-dashboard/settings");
  const isVerified = status.onboardingStatus === "verified";
  const isRestricted = status.onboardingStatus === "restricted";
  const isSubmitted = status.onboardingStatus === "submitted";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#f5f7fb",
        px: 2,
      }}
    >
      <Card
        elevation={3}
        sx={{
          maxWidth: 640,
          width: "100%",
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3} alignItems="center">
            {status.error && (
              <Alert severity="error" sx={{ width: "100%" }}>
                {status.error}
              </Alert>
            )}

            {/* Icon + headline */}
            {isVerified && (
              <Box textAlign="center" sx={{ width: "100%" ,  display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                mb: 2,
              }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    bgcolor: "rgba(46, 204, 113, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                  }}
                >
                  <CheckCircleOutlineIcon
                    sx={{ fontSize: 42, color: "#2ecc71" }}
                  />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                  Payment setup complete
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Your Stripe account is connected and you can now receive
                  payments from students.
                </Typography>
              </Box>
            )}

            {isSubmitted && !isVerified && (
              <Box textAlign="center">
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    bgcolor: "rgba(255, 193, 7, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                  }}
                >
                  <HourglassEmptyIcon
                    sx={{ fontSize: 42, color: "#f6a700" }}
                  />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                  Stripe is reviewing your details
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Your information has been submitted to Stripe. You&apos;ll be
                  able to receive payments as soon as verification is complete.
                </Typography>
              </Box>
            )}

            {isRestricted && !isVerified && (
              <Box textAlign="center">
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    bgcolor: "rgba(255, 152, 0, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                  }}
                >
                  <ReportProblemOutlinedIcon
                    sx={{ fontSize: 42, color: "#ff9800" }}
                  />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                  Action required in Stripe
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Stripe needs a bit more information before your payouts can be
                  enabled. Continue onboarding to fix this.
                </Typography>
              </Box>
            )}

            {!isVerified && !isSubmitted && !isRestricted && !status.error && (
              <Box textAlign="center">
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    bgcolor: "rgba(94, 194, 210, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                  }}
                >
                  <PaymentsOutlinedIcon
                    sx={{ fontSize: 42, color: "#5ec2d2" }}
                  />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                  Payment setup
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Review your payment settings to finish connecting your Stripe
                  account.
                </Typography>
              </Box>
            )}

            {/* Status summary row */}
            <Box sx={{ width: "100%", mt: 1 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 0.5 }}
              >
                Current Stripe status
              </Typography>
              <Typography variant="body2">
                {isVerified && "Verified — payments are enabled."}
                {isSubmitted &&
                  !isVerified &&
                  "Submitted — Stripe is reviewing your account."}
                {isRestricted &&
                  !isVerified &&
                  "Restricted — additional information is required in Stripe."}
                {!isVerified &&
                  !isSubmitted &&
                  !isRestricted &&
                  !status.error &&
                  "Pending — complete the remaining steps in your payment settings."}
              </Typography>
            </Box>
          </Stack>
        </CardContent>

        <CardActions
          sx={{
            px: 4,
            pb: 3,
            pt: 0,
            display: "flex",
            justifyContent: "center",
            gap: 2,
          }}
        >
          {isRestricted && !isVerified && (
            <>
              <Button
                variant="contained"
                onClick={() => regenerateLink()}
                disabled={regenLoading}
                sx={{
                  minWidth: 160,
                  textTransform: "none",
                  bgcolor: "#ff9800",
                  "&:hover": { bgcolor: "#fb8c00" },
                }}
              >
                {regenLoading ? "Opening Stripe..." : "Fix now in Stripe"}
              </Button>
              <Button
                variant="outlined"
                onClick={goToSettings}
                sx={{ textTransform: "none", minWidth: 140 }}
              >
                Back to settings
              </Button>
            </>
          )}

          {isVerified && (
            <Button
              variant="contained"
              onClick={goToSettings}
              sx={{ textTransform: "none", minWidth: 180 }}
            >
              Go to payment settings
            </Button>
          )}

          {isSubmitted && !isVerified && (
            <Button
              variant="contained"
              onClick={goToSettings}
              sx={{ textTransform: "none", minWidth: 180 }}
            >
              View payment settings
            </Button>
          )}

          {!isVerified && !isSubmitted && !isRestricted && !status.error && (
            <Button
              variant="contained"
              onClick={goToSettings}
              sx={{ textTransform: "none", minWidth: 180 }}
            >
              Go to payment setup
            </Button>
          )}
        </CardActions>
      </Card>
    </Box>
  );
}
