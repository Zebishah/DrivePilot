import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useQuery, useMutation } from "@apollo/client";

import toast from "react-hot-toast";
import { CREATE_STRIPE_ACCOUNT, GET_TEACHER_PROFILE, REGENERATE_STRIPE_LINK } from "../../../../graphql/mutations/profile";

type OnboardingStatus =
  | "not_started"
  | "account_created"
  | "link_generated"
  | "submitted"
  | "verified"
  | "restricted"
  | "disabled"
  | "rejected"
  | null;

export const PaymentTab: React.FC = () => {
  const [connectLoading, setConnectLoading] = useState(false);
  const { data, loading: queryLoading } = useQuery(GET_TEACHER_PROFILE);
  const [createStripeAccount] = useMutation(CREATE_STRIPE_ACCOUNT, {
    onCompleted: (res) => {
      const url = res?.createStripeAccount?.onboardingUrl;
      if (url) {
        window.location.href = url;
        return;
      }
      setConnectLoading(false);
      toast.error("Could not get Stripe link");
    },
    onError: (err) => {
      setConnectLoading(false);
      toast.error(err.message || "Failed to connect Stripe");
    },
  });
  const [regenerateStripeLink] = useMutation(REGENERATE_STRIPE_LINK, {
    onCompleted: (res) => {
      const url = res?.regenerateStripeLink?.onboardingUrl;
      if (url) {
        window.location.href = url;
        return;
      }
      setConnectLoading(false);
      toast.error("Could not get link");
    },
    onError: (err) => {
      setConnectLoading(false);
      toast.error(err.message || "Failed to continue setup");
    },
  });

  const status = (data?.teacherProfile?.onboardingStatus ?? "not_started") as OnboardingStatus;
  const isActive = data?.teacherProfile?.isActive ?? false;
  const chargesEnabled = data?.teacherProfile?.stripeAccount?.chargesEnabled ?? false;
  const payoutsEnabled = data?.teacherProfile?.stripeAccount?.payoutsEnabled ?? false;

  const handleConnect = () => {
    setConnectLoading(true);
    createStripeAccount();
  };

  const handleContinueSetup = () => {
    setConnectLoading(true);
    regenerateStripeLink();
  };

  const handleFixNow = () => {
    setConnectLoading(true);
    regenerateStripeLink();
  };

  if (queryLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Payment setup (Stripe Connect)
      </Typography>

      {status === "not_started" && (
        <Box>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Connect your Stripe account to receive payments from students. You will complete identity and bank details on Stripe.
          </Typography>
          <Button
            variant="contained"
            onClick={handleConnect}
            disabled={connectLoading}
          >
            {connectLoading ? <CircularProgress size={24} /> : "Connect with Stripe"}
          </Button>
        </Box>
      )}

      {(status === "account_created" || status === "link_generated") && (
        <Box>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Complete your payment setup on Stripe to start receiving payouts.
          </Typography>
          <Button
            variant="contained"
            onClick={handleContinueSetup}
            disabled={connectLoading}
          >
            {connectLoading ? <CircularProgress size={24} /> : "Continue Setup"}
          </Button>
        </Box>
      )}

      {status === "submitted" && (
        <Alert severity="info" sx={{ maxWidth: 480 }}>
          Under review — your details have been submitted. You will be able to receive payments once verification is complete.
        </Alert>
      )}

      {status === "restricted" && (
        <Box>
          <Alert severity="warning" sx={{ mb: 2, maxWidth: 480 }}>
            Action required — please complete the required steps in Stripe to enable payments.
          </Alert>
          <Button
            variant="contained"
            color="warning"
            onClick={handleFixNow}
            disabled={connectLoading}
          >
            {connectLoading ? <CircularProgress size={24} /> : "Fix Now"}
          </Button>
        </Box>
      )}

      {status === "verified" && (
        <Alert severity="success" sx={{ maxWidth: 480 }}>
          Payment setup complete — you can receive payments from students.
        </Alert>
      )}

      {status === "disabled" && (
        <Alert severity="error" sx={{ maxWidth: 480 }}>
          Your Stripe connection was disabled. Please contact support or reconnect from Stripe.
        </Alert>
      )}

      {status === "rejected" && (
        <Alert severity="error" sx={{ maxWidth: 480 }}>
          Your payment setup was not approved. Please contact support.
        </Alert>
      )}
    </Box>
  );
};
