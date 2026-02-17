import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  Card,
  CardContent,
  CardActions,
  Divider,
} from "@mui/material";
import PaymentsIcon from "@mui/icons-material/Payments";
import LinkIcon from "@mui/icons-material/Link";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useQuery, useMutation } from "@apollo/client";

import toast from "react-hot-toast";
import {
  CREATE_STRIPE_ACCOUNT,
  GET_TEACHER_PROFILE,
  REGENERATE_STRIPE_LINK,
} from "../../../../graphql/mutations/profile";

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

  const status = (data?.teacherProfile?.onboardingStatus ??
    "not_started") as OnboardingStatus;
  const isActive = data?.teacherProfile?.isActive ?? false;
  const stripeFinancialStatus = data?.teacherProfile?.stripeFinancialStatus;

  const badgeLabel = useMemo(() => {
    if (!status) return "Stripe: Not started";
    switch (status) {
      case "not_started":
        return "Stripe: Not started";
      case "account_created":
      case "link_generated":
        return "Stripe: Setup in progress";
      case "submitted":
        return "Stripe: Under review";
      case "restricted":
        return "Stripe: Action required";
      case "disabled":
      case "rejected":
        return "Stripe: Disabled";
      case "verified":
        return isActive
          ? "Stripe: Payments enabled"
          : "Stripe: Verified, activating";
      default:
        return "Stripe: Unknown";
    }
  }, [status, isActive]);

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
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "40vh",
        }}
      >
        <CircularProgress size={40} />
      </Box>
    );
  }

  const renderStateContent = () => {
    switch (status) {
      case "not_started":
        return {
          icon: <PaymentsIcon sx={{ fontSize: 40, color: "primary.main" }} />,
          title: "Connect your Stripe account",
          description:
            "Start your payment onboarding so students can pay you securely through Stripe.",
          primaryLabel: "Connect with Stripe",
          primaryAction: handleConnect,
        };
      case "account_created":
      case "link_generated":
        return {
          icon: <LinkIcon sx={{ fontSize: 40, color: "primary.main" }} />,
          title: "Finish your Stripe setup",
          description:
            "You’ve started onboarding. Continue in Stripe to submit your details and enable payouts.",
          primaryLabel: "Continue setup",
          primaryAction: handleContinueSetup,
        };
      case "submitted":
        return {
          icon: (
            <CircularProgress
              size={40}
              thickness={4}
              sx={{ color: "info.main" }}
            />
          ),
          title: "Under review by Stripe",
          description:
            "Your details have been submitted and are being reviewed. We’ll update your status automatically once this is done.",
          alert: (
            <Alert severity="info" sx={{ mt: 2 }}>
              Under review — you will be able to receive payments once
              verification is complete.
            </Alert>
          ),
        };
      case "restricted":
      case "disabled":
      case "rejected":
        return {
          icon: (
            <ErrorOutlineIcon sx={{ fontSize: 40, color: "warning.main" }} />
          ),
          title: "Action required in Stripe",
          description:
            "Stripe needs additional information or has temporarily restricted your account. Resume onboarding to fix this.",
          alert: (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Action required — your Stripe account has issues that prevent
              receiving payments. Please resume onboarding in Stripe to fix
              this.
            </Alert>
          ),
          primaryLabel: "Fix now in Stripe",
          primaryAction: handleFixNow,
        };
      case "verified":
      default:
        return {
          icon: (
            <CheckCircleOutlineIcon
              sx={{
                fontSize: 40,
                color: isActive ? "success.main" : "info.main",
              }}
            />
          ),
          title: isActive
            ? "Payments are enabled"
            : "Verified — activating payouts",
          description: isActive
            ? "Your Stripe account is fully connected and you can now receive payments from students."
            : "Stripe has verified your details. Payments will be enabled once Stripe finishes activating your account.",
        };
    }
  };

  const stateContent = renderStateContent();

  return (
    <Box
      sx={{
        p: 2,
        width: "100%",
      }}
    >
      <Card
        elevation={3}
        sx={{
          width: "100%",
          borderRadius: 3,
          p: { xs: 2, sm: 3 },
        }}
      >
        <CardContent sx={{ pb: 1 ,width: "100%"}} className="w-full">
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Payment setup (Stripe Connect)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage your Stripe connection and see your current onboarding
                status.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip
                size="small"
                label={badgeLabel}
                color={
                  status === "verified" && isActive
                    ? "success"
                    : status === "restricted" || status === "disabled"
                      ? "warning"
                      : "default"
                }
                variant={
                  status === "verified" && isActive ? "filled" : "outlined"
                }
              />
            </Stack>
          </Stack>

          <Divider sx={{ mb: 3 }} />

          <Stack spacing={2.5} alignItems="flex-start">
            <Box display="flex" alignItems="center" gap={2}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  bgcolor: "rgba(94, 194, 210, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {stateContent.icon}
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {stateContent.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stateContent.description}
                </Typography>
              </Box>
            </Box>

            {stripeFinancialStatus && (
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {stripeFinancialStatus.hasDisputes && (
                  <Chip
                    size="small"
                    color="warning"
                    variant="outlined"
                    label="Stripe: disputes present"
                  />
                )}
                {stripeFinancialStatus.payoutsBlocked && (
                  <Chip
                    size="small"
                    color="warning"
                    variant="outlined"
                    label="Stripe: payouts may be blocked"
                  />
                )}
                {stripeFinancialStatus.currentlyDueRequirements && (
                  <Chip
                    size="small"
                    color="warning"
                    variant="outlined"
                    label="Stripe: additional requirements due"
                  />
                )}
              </Stack>
            )}

            {stateContent.alert}
          </Stack>
        </CardContent>

        <CardActions
          sx={{
            pt: 0,
            pb: 1,
            px: 2,
            justifyContent: "flex-end",
            gap: 1.5,
          }}
        >
          {stateContent.primaryLabel && stateContent.primaryAction && (
            <Button
              variant="contained"
              color={
                status === "restricted" || status === "disabled"
                  ? "warning"
                  : "primary"
              }
              disabled={connectLoading}
              onClick={stateContent.primaryAction}
              sx={{ textTransform: "none", minWidth: 170 }}
            >
              {connectLoading ? (
                <CircularProgress
                  size={20}
                  sx={{ color: "inherit", mr: 1 }}
                />
              ) : null}
              {connectLoading ? "Please wait..." : stateContent.primaryLabel}
            </Button>
          )}
        </CardActions>
      </Card>
    </Box>
  );
};
