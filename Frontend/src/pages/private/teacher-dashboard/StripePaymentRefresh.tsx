import React, { useEffect, useState } from "react";
import { Box, Typography, Button, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@apollo/client";
import { CREATE_STRIPE_ACCOUNT } from "../../../graphql/mutations/profile";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";

/**
 * Shown when Stripe redirects to refresh_url (e.g. user closed onboarding or link expired).
 * Creates account if needed and gets a new onboarding link, then redirects back to Stripe.
 */
export default function StripePaymentRefresh() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [createStripeAccount, { loading }] = useMutation(CREATE_STRIPE_ACCOUNT, {
    onCompleted: (data) => {
      const url = data?.createStripeAccount?.onboardingUrl;
      if (url) {
        window.location.href = url;
        return;
      }
      toast.error("Could not get a new link. Please try from Settings → Payment.");
      navigate("/teacher-dashboard/settings");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to continue setup");
      navigate("/teacher-dashboard/settings");
    },
  });

  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "Instructor") {
      navigate("/teacher-dashboard/overview");
      return;
    }
    if (!started) {
      setStarted(true);
      createStripeAccount();
    }
  }, [user, started, createStripeAccount, navigate]);

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
      {loading ? (
        <>
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography>Continuing payment setup...</Typography>
        </>
      ) : (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Continue payment setup
          </Typography>
          <Button
            variant="contained"
            onClick={() => createStripeAccount()}
            disabled={loading}
          >
            Get new link
          </Button>
          <Button
            variant="text"
            sx={{ mt: 2 }}
            onClick={() => navigate("/teacher-dashboard/settings")}
          >
            Back to Settings
          </Button>
        </>
      )}
    </Box>
  );
}
