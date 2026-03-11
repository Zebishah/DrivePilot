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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Modal,
  Tabs,
  Tab,
} from "@mui/material";
import PaymentsIcon from "@mui/icons-material/Payments";
import LinkIcon from "@mui/icons-material/Link";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client";

import toast from "react-hot-toast";
import {
  CREATE_STRIPE_ACCOUNT,
  GET_TEACHER_PROFILE,
  GET_STRIPE_EXPRESS_DASHBOARD_URL,
  REGENERATE_STRIPE_LINK,
  VERIFY_STRIPE_ONBOARDING,
} from "../../../../graphql/mutations/profile";
import {
  GET_INSTRUCTOR_TRANSACTIONS,
  GET_INSTRUCTOR_TRANSACTION_STATS,
} from "../../../../graphql/Queries/transactionQueries";

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

function formatTransactionDate(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type InstructorTransaction = {
  id: string;
  type: string;
  direction: string;
  amount: number;
  currency: string;
  status: string;
  description?: string | null;
  lessonSummary?: string | null;
  occurredAt?: string | null;
  createdAt?: string | null;
};

type SectionTab = "setup" | "history";
type HistoryFilter =
  | "all"
  | "payment"
  | "payout"
  | "refund"
  | "transfer_reversal";

function transactionTypeLabel(type: string): string {
  if (type === "transfer_reversal") return "Transfer reversal";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function lessonSlotLabel(t: InstructorTransaction): string {
  if (t.lessonSummary && t.lessonSummary.trim()) return t.lessonSummary.trim();
  return "—";
}

export const PaymentTab: React.FC = () => {
  const [connectLoading, setConnectLoading] = useState(false);
  const [viewTransaction, setViewTransaction] = useState<InstructorTransaction | null>(null);
  const [sectionTab] = useState<SectionTab>("setup");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const { data, loading: queryLoading, refetch: refetchProfile } = useQuery(GET_TEACHER_PROFILE);
  const { data: transactionsData } = useQuery(GET_INSTRUCTOR_TRANSACTIONS, {
    variables: { limit: 50, offset: 0 },
    fetchPolicy: "network-only",
  });
  const { data: statsData } = useQuery(GET_INSTRUCTOR_TRANSACTION_STATS, {
    fetchPolicy: "network-only",
  });
  const instructorTransactions: InstructorTransaction[] = useMemo(
    () => transactionsData?.getInstructorTransactions ?? [],
    [transactionsData],
  );
  const stats = statsData?.getInstructorTransactionStats;
  const filteredTransactions = useMemo(
    () =>
      historyFilter === "all"
        ? instructorTransactions
        : instructorTransactions.filter((t) => t.type === historyFilter),
    [instructorTransactions, historyFilter],
  );
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

  const [verifyStripeOnboarding, { loading: verifyLoading }] = useMutation(VERIFY_STRIPE_ONBOARDING, {
    onCompleted: async (res) => {
      const v = res?.verifyStripeOnboarding;
      await refetchProfile();
      if (v?.onboardingStatus === "verified") {
        toast.success("Stripe account verified. Payments are enabled.");
      } else if (v?.onboardingStatus === "restricted") {
        toast.error("Stripe has restricted your account. Please fix the issues in Stripe.");
      } else {
        toast.success("Status refreshed.");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to refresh status");
    },
  });

  const [getStripeDashboardUrl, { loading: dashboardLinkLoading }] = useLazyQuery(
    GET_STRIPE_EXPRESS_DASHBOARD_URL,
    {
      fetchPolicy: "network-only",
      onCompleted: (res) => {
        const url = res?.getStripeExpressDashboardUrl?.url;
        if (url) {
          window.open(url, "_blank", "noopener,noreferrer");
        } else {
          toast.error("Could not open Stripe dashboard.");
        }
      },
      onError: (err) => {
        toast.error(err.message || "Could not open Stripe dashboard. Try again in a moment.");
      },
    },
  );

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
              verification is complete. If Stripe has already decided, refresh to see the updated status.
            </Alert>
          ),
          primaryLabel: "Refresh status",
          primaryAction: () => verifyStripeOnboarding(),
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
      {sectionTab === "setup" && (
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
          {status === "verified" && (
            <Button
              variant="outlined"
              color="primary"
              disabled={dashboardLinkLoading}
              onClick={() => getStripeDashboardUrl()}
              sx={{ textTransform: "none", minWidth: 170 }}
            >
              {dashboardLinkLoading ? (
                <CircularProgress size={20} sx={{ color: "inherit", mr: 1 }} />
              ) : null}
              {dashboardLinkLoading ? "Opening..." : "Open Stripe Dashboard"}
            </Button>
          )}
          {stateContent.primaryLabel && stateContent.primaryAction && (
            <Button
              variant="contained"
              color={
                status === "restricted" || status === "disabled"
                  ? "warning"
                  : "primary"
              }
              disabled={connectLoading || verifyLoading}
              onClick={stateContent.primaryAction}
              sx={{ textTransform: "none", minWidth: 170 }}
            >
              {(connectLoading || verifyLoading) ? (
                <CircularProgress
                  size={20}
                  sx={{ color: "inherit", mr: 1 }}
                />
              ) : null}
              {(connectLoading || verifyLoading) ? "Please wait..." : stateContent.primaryLabel}
            </Button>
          )}
        </CardActions>
      </Card>
      )}

      {sectionTab === "history" && (
        <Card elevation={3} sx={{ borderRadius: 3, p: { xs: 2, sm: 3 } }}>
          <CardContent sx={{ p: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>
              Transaction history
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              View all payment, payout, refund, and transfer reversal activity.
            </Typography>

            {stats && (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2.5 }} flexWrap="wrap">
                <Card elevation={0} sx={{ flex: 1, minWidth: 170, borderRadius: 2.5, bgcolor: "rgba(0, 191, 165, 0.08)", border: "1px solid rgba(0, 191, 165, 0.35)" }}>
                  <CardContent sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: "rgba(0, 191, 165, 0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <AttachMoneyIcon sx={{ color: "teal.main", fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography color="text.secondary" variant="caption">Total received</Typography>
                      <Typography variant="h6">${stats.totalReceived.toFixed(2)}</Typography>
                    </Box>
                  </CardContent>
                </Card>
                <Card elevation={0} sx={{ flex: 1, minWidth: 170, borderRadius: 2.5, bgcolor: "rgba(33, 150, 243, 0.06)", border: "1px solid rgba(33, 150, 243, 0.3)" }}>
                  <CardContent sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: "rgba(33, 150, 243, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <AccountBalanceWalletIcon sx={{ color: "info.main", fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography color="text.secondary" variant="caption">Total payouts</Typography>
                      <Typography variant="h6">${stats.totalPayouts.toFixed(2)}</Typography>
                    </Box>
                  </CardContent>
                </Card>
                <Card elevation={0} sx={{ flex: 1, minWidth: 170, borderRadius: 2.5, bgcolor: "rgba(76, 175, 80, 0.06)", border: "1px solid rgba(76, 175, 80, 0.35)" }}>
                  <CardContent sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: "rgba(76, 175, 80, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ReceiptLongIcon sx={{ color: "success.main", fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography color="text.secondary" variant="caption">Transactions</Typography>
                      <Typography variant="h6">{stats.transactionCount}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Stack>
            )}

            <Tabs
              value={historyFilter}
              onChange={(_, value: HistoryFilter) => setHistoryFilter(value)}
              sx={{ mb: 1.5, borderBottom: 1, borderColor: "divider", "& .MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 40 } }}
              variant="scrollable"
              allowScrollButtonsMobile
            >
              <Tab value="all" label={`All (${instructorTransactions.length})`} />
              <Tab value="payment" label={`Payments (${instructorTransactions.filter((t) => t.type === "payment").length})`} />
              <Tab value="payout" label={`Payouts (${instructorTransactions.filter((t) => t.type === "payout").length})`} />
              <Tab value="refund" label={`Refunds (${instructorTransactions.filter((t) => t.type === "refund").length})`} />
              <Tab value="transfer_reversal" label={`Reversals (${instructorTransactions.filter((t) => t.type === "transfer_reversal").length})`} />
            </Tabs>

            {filteredTransactions.length > 0 ? (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="medium" stickyHeader sx={{ "& .MuiTableCell-head": { py: 1.8, bgcolor: "grey.50", fontWeight: 600 }, "& .MuiTableCell-body": { py: 1.9 } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Ref number</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Lesson slot</TableCell>
                      <TableCell>Type</TableCell>
                     
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTransactions.map((t) => (
                      <TableRow key={t.id} hover>
                        <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{t.id.slice(-9)}</TableCell>
                        <TableCell>{formatTransactionDate(t.occurredAt ?? t.createdAt)}</TableCell>
                        <TableCell sx={{ maxWidth: 180 }}>
                          <Typography variant="body2" noWrap title={lessonSlotLabel(t)}>
                            {lessonSlotLabel(t)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={transactionTypeLabel(t.type)} size="small" variant="outlined" />
                        </TableCell>

                        <TableCell align="right" sx={{ color: t.direction === "credit" ? "success.main" : "text.primary", fontWeight: 600 }}>
                          {t.direction === "credit" ? "+" : "-"} ${Number(t.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={t.status}
                            size="small"
                            color={t.status === "succeeded" ? "success" : t.status === "failed" ? "error" : "default"}
                            variant="filled"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityIcon />}
                            onClick={() => setViewTransaction(t)}
                            sx={{ textTransform: "none", fontWeight: 600 }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                No transactions found for this filter.
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      <Modal open={!!viewTransaction} onClose={() => setViewTransaction(null)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "95%", sm: 420 },
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 3,
            borderRadius: 2,
          }}
        >
          {viewTransaction && (
            <>
              <Typography variant="h6" gutterBottom>Transaction Details</Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                <Typography variant="body2"><strong>Ref Number:</strong> {viewTransaction.id.slice(-9)}</Typography>
                <Typography variant="body2"><strong>Type:</strong> {viewTransaction.type}</Typography>
                <Typography variant="body2">
                  <strong>Amount:</strong> {viewTransaction.direction === "credit" ? "+" : "-"} ${viewTransaction.amount.toFixed(2)}
                </Typography>
                <Typography variant="body2">
                  <strong>Date:</strong> {formatTransactionDate(viewTransaction.occurredAt ?? viewTransaction.createdAt)}
                </Typography>
                <Typography variant="body2"><strong>Status:</strong> {viewTransaction.status}</Typography>
                {viewTransaction.description && (
                  <Typography variant="body2"><strong>Description:</strong> {viewTransaction.description}</Typography>
                )}
              </Stack>
              <Button variant="outlined" onClick={() => setViewTransaction(null)} sx={{ mt: 2 }}>Close</Button>
            </>
          )}
        </Box>
      </Modal>
    </Box>
  );
};
