import React, { useEffect, useState } from "react";
import { Box, Typography, Button, CircularProgress, Alert } from "@mui/material";
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
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          p: 3,
        }}
      >
        <CircularProgress size={48} sx={{ mb: 2 }} />
        <Typography>Verifying your payment setup...</Typography>
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
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        p: 3,
      }}
    >
      {status.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {status.error}
        </Alert>
      )}

      {isVerified && (
        <>
          <Typography variant="h6" color="success.main" sx={{ mb: 1 }}>
            Payment setup complete
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            You can now receive payments from students.
          </Typography>
          <Button variant="contained" onClick={goToSettings}>
            Go to Settings
          </Button>
        </>
      )}

      {isSubmitted && (
        <>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Under review
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Your details have been submitted. We will notify you once verification is complete.
          </Typography>
          <Button variant="contained" onClick={goToSettings}>
            Go to Settings
          </Button>
        </>
      )}

      {isRestricted && (
        <>
          <Typography variant="h6" color="warning.main" sx={{ mb: 1 }}>
            Action required
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Please complete the required steps in Stripe to enable payments.
          </Typography>
          <Button
            variant="contained"
            onClick={() => regenerateLink()}
            disabled={regenLoading}
          >
            Fix now
          </Button>
          <Button variant="text" sx={{ mt: 1 }} onClick={goToSettings}>
            Back to Settings
          </Button>
        </>
      )}

      {!isVerified && !isSubmitted && !isRestricted && !status.error && (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Payment setup
          </Typography>
          <Button variant="contained" onClick={goToSettings}>
            Go to Settings
          </Button>
        </>
      )}
    </Box>
  );
}
