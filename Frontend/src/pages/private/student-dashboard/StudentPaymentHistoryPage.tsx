"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Card,
  CardContent,
  Stack,
  Modal,
  Tabs,
  Tab,
  Pagination,
  LinearProgress,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import PaymentIcon from "@mui/icons-material/Payment";
import ReplayIcon from "@mui/icons-material/Replay";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import SendIcon from "@mui/icons-material/Send";
import InfoIcon from "@mui/icons-material/Info";
import LessonIcon from "@mui/icons-material/School";
import { useQuery } from "@apollo/client";
import {
  GET_STUDENT_TRANSACTIONS,
  GET_STUDENT_TRANSACTIONS_COUNT,
  GET_STUDENT_TRANSACTION_STATS,
} from "../../../graphql/Queries/transactionQueries";
import { format } from "date-fns";
import { formatCHF } from "../../../utils/money";

function formatTransactionDate(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "dd MMM yyyy hh:mm a");
}

type StatusLabel = "Pending" | "Completed" | "Rejected" | "Refund";

function statusLabel(t: { type: string; status: string }): StatusLabel {
  if (t.type === "refund") return "Refund";
  if (t.status === "cancelled" || t.status === "failed") return "Rejected";
  if (t.status === "pending") return "Pending";
  return "Completed";
}

function statusColor(s: StatusLabel): "warning" | "success" | "error" | "info" | "default" {
  switch (s) {
    case "Pending": return "warning";
    case "Completed": return "success";
    case "Rejected": return "error";
    case "Refund": return "info";
    default: return "default";
  }
}

export type TransactionFilter = "all" | "completed" | "refund" | "rejected";

function lessonLabel(t: Transaction): string {
  if (t.lessonSummary && t.lessonSummary.trim()) return t.lessonSummary.trim();
  if (t.description && t.description.trim()) return t.description.trim();
  if (t.type === "refund") return "Refund";
  return "Lesson payment";
}

function DetailRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5}>
      <Box sx={{ width: 28, display: "flex", justifyContent: "center" }}>{icon}</Box>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>{label}</Typography>
      <Typography variant="body2" fontWeight={500} sx={{ color: valueColor }}>{value}</Typography>
    </Stack>
  );
}

interface Transaction {
  id: string;
  type: string;
  role: string;
  direction: string;
  amount: number;
  currency: string;
  status: string;
  bookingId?: string | null;
  description?: string | null;
   lessonSummary?: string | null;
  occurredAt?: string | null;
  createdAt: string;
}

export default function StudentPaymentHistoryPage() {
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const {
    data,
    previousData,
    loading,
    error,
  } = useQuery(GET_STUDENT_TRANSACTIONS, {
    variables: {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      view: filter,
    },
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
  });
  const {
    data: countData,
    previousData: previousCountData,
    loading: countLoading,
  } = useQuery(GET_STUDENT_TRANSACTIONS_COUNT, {
    variables: { view: filter },
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
  });
  const { data: statsData } = useQuery(GET_STUDENT_TRANSACTION_STATS, {
    fetchPolicy: "network-only",
  });

  const effectiveData = data ?? previousData;
  const effectiveCountData = countData ?? previousCountData;
  const transactions: Transaction[] = effectiveData?.getStudentTransactions ?? [];
  const stats = statsData?.getStudentTransactionStats;
  const totalCount: number = effectiveCountData?.getStudentTransactionCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const isTableLoading = (loading || countLoading) && Boolean(previousData || previousCountData);

  const formatAmount = (t: Transaction) => {
    const sign = t.direction === "credit" ? "+" : "-";
    return `${sign} ${formatCHF(t.amount)}`;
  };

  if (loading && !effectiveData) {
    return (
      <Box className="dsp-student-page dsp-student-state-wrap" display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="dsp-student-page dsp-student-payment-page" p={3}>
        <Alert severity="error">{error.message}</Alert>
      </Box>
    );
  }

  return (
    <Box className="dsp-student-page dsp-student-payment-page" sx={{ p: 3 }}>
      <div className="dsp-student-page__content">
      <div className="dsp-student-page-heading"><span className="dsp-student-page-heading__eyebrow">Student workspace</span><Typography component="h1">Payment history</Typography><Typography component="p">Review your lesson payments, refunds, and receipts in one place.</Typography></div>

      {stats && (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ mb: 3 }}
          flexWrap="wrap"
        >
          <Card className="dsp-student-metric-card dsp-student-metric-card--green"
            elevation={0}
            sx={{
              flex: 1,
              minWidth: 180,
              borderRadius: 3,
              bgcolor: "rgba(0, 191, 165, 0.08)",
              border: "1px solid rgba(0, 191, 165, 0.4)",
            }}
          >
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  bgcolor: "rgba(0, 191, 165, 0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AttachMoneyIcon sx={{ color: "teal.main" }} />
              </Box>
              <Box>
                <Typography color="text.secondary" variant="body2">Total spent</Typography>
                <Typography variant="h6">{formatCHF(stats.totalSpent)}</Typography>
                <Typography className="dsp-student-metric-helper">Across recorded lesson payments</Typography>
              </Box>
            </CardContent>
          </Card>

          <Card className="dsp-student-metric-card dsp-student-metric-card--blue"
            elevation={0}
            sx={{
              flex: 1,
              minWidth: 180,
              borderRadius: 3,
              bgcolor: "rgba(33, 150, 243, 0.06)",
              border: "1px solid rgba(33, 150, 243, 0.35)",
            }}
          >
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  bgcolor: "rgba(33, 150, 243, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ReplayIcon sx={{ color: "info.main" }} />
              </Box>
              <Box>
                <Typography color="text.secondary" variant="body2">Total refunded</Typography>
                <Typography variant="h6">{formatCHF(stats.totalRefunded)}</Typography>
                <Typography className="dsp-student-metric-helper">Returned to your account</Typography>
              </Box>
            </CardContent>
          </Card>

          <Card className="dsp-student-metric-card dsp-student-metric-card--green"
            elevation={0}
            sx={{
              flex: 1,
              minWidth: 180,
              borderRadius: 3,
              bgcolor: "rgba(76, 175, 80, 0.06)",
              border: "1px solid rgba(76, 175, 80, 0.4)",
            }}
          >
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  bgcolor: "rgba(76, 175, 80, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <PaymentIcon sx={{ color: "success.main" }} />
              </Box>
              <Box>
                <Typography color="text.secondary" variant="body2">Payments</Typography>
                <Typography variant="h6">{stats.paymentCount}</Typography>
                <Typography className="dsp-student-metric-helper">Completed payment activity</Typography>
              </Box>
            </CardContent>
          </Card>

          <Card className="dsp-student-metric-card dsp-student-metric-card--rose"
            elevation={0}
            sx={{
              flex: 1,
              minWidth: 180,
              borderRadius: 3,
              bgcolor: "rgba(244, 67, 54, 0.05)",
              border: "1px solid rgba(244, 67, 54, 0.35)",
            }}
          >
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  bgcolor: "rgba(244, 67, 54, 0.14)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ReceiptLongIcon sx={{ color: "error.main" }} />
              </Box>
              <Box>
                <Typography color="text.secondary" variant="body2">Refunds</Typography>
                <Typography variant="h6">{stats.refundCount}</Typography>
                <Typography className="dsp-student-metric-helper">Refund activity recorded</Typography>
              </Box>
            </CardContent>
          </Card>
        </Stack>
      )}

      <Box sx={{ mb: 2 }}>
        <Tabs
          value={filter}
          onChange={(_, v: TransactionFilter) => {
            setFilter(v);
            setPage(1);
          }}
          sx={{
            minHeight: 44,
            "& .MuiTab-root": { textTransform: "none", fontWeight: 600 },
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Tab label="All" value="all" />
          <Tab label="Completed" value="completed" />
          <Tab label="Refund" value="refund" />
          <Tab label="Rejected" value="rejected" />
        </Tabs>
      </Box>

      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        Payment list
      </Typography>
      {isTableLoading && <LinearProgress sx={{ mb: 1 }} />}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
        <Table
          size="medium"
          stickyHeader
          sx={{
            "& .MuiTableCell-head": {
              py: 2,
              fontWeight: 600,
              bgcolor: "grey.50",
            },
            "& .MuiTableCell-body": {
              py: 2,
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Ref number</TableCell>
              <TableCell>Lesson</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                  <Typography color="text.secondary">
                    No transactions yet. Payments and refunds will appear here.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => (
                <TableRow key={t.id} hover sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
                    {t.id.slice(-9)}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 220 }}>
                    <Typography variant="body2" noWrap title={lessonLabel(t)}>
                      {lessonLabel(t)}
                    </Typography>
                  </TableCell>
                  <TableCell
                    sx={{
                      color: t.direction === "credit" ? "success.main" : "text.primary",
                      fontWeight: 600,
                    }}
                  >
                    {formatAmount(t)}
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>
                    {formatTransactionDate(t.occurredAt ?? t.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusLabel(t)}
                      size="small"
                      color={statusColor(statusLabel(t))}
                      variant="filled"
                      sx={{ fontWeight: 500 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<VisibilityIcon />}
                      onClick={() => setViewTransaction(t)}
                      sx={{ textTransform: "none", fontWeight: 600 }}
                    >
                      View details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mt: 1.5 }}
      >
        <Typography variant="body2" color="text.secondary">
          Showing {(page - 1) * PAGE_SIZE + (transactions.length ? 1 : 0)}-
          {(page - 1) * PAGE_SIZE + transactions.length} of {totalCount}
        </Typography>
        <Pagination
          page={page}
          count={totalPages}
          onChange={(_, p) => setPage(p)}
          color="primary"
          shape="rounded"
        />
      </Stack>

      <Modal open={!!viewTransaction} onClose={() => setViewTransaction(null)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "95%", sm: 520 },
            maxHeight: "90vh",
            overflow: "auto",
            bgcolor: "background.paper",
            boxShadow: 24,
            borderRadius: 3,
            p: 3,
          }}
        >
          {viewTransaction && (
            <>
              <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>
                  Payment Details
                </Typography>
                <Chip
                  size="small"
                  label={statusLabel(viewTransaction)}
                  color={
                    statusLabel(viewTransaction) === "Refund"
                      ? "info"
                      : statusLabel(viewTransaction) === "Rejected"
                        ? "error"
                        : statusLabel(viewTransaction) === "Completed"
                          ? "success"
                          : "warning"
                  }
                  variant="filled"
                  sx={{ fontWeight: 600 }}
                />
              </Stack>

              <Stack spacing={2}>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                  sx={{ py: 1.5, px: 2, bgcolor: "action.hover", borderRadius: 2 }}
                >
                  <CreditCardIcon sx={{ color: "primary.main", fontSize: 28 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Payment method</Typography>
                    <Typography variant="body2" fontWeight={500}>Credit card · ****</Typography>
                  </Box>
                </Stack>

                <Stack spacing={1.5}>
                  <DetailRow icon={<LessonIcon sx={{ fontSize: 20, color: "text.secondary" }} />} label="Lesson" value={lessonLabel(viewTransaction)} />
                  <DetailRow icon={<AccountBalanceIcon sx={{ fontSize: 20, color: "text.secondary" }} />} label="Funding Source" value="Card" />
                  <DetailRow icon={<SendIcon sx={{ fontSize: 20, color: "text.secondary" }} />} label="Sent to" value="Driving School Platform (DSP)" />
                  <DetailRow
                    icon={<AttachMoneyIcon sx={{ fontSize: 20, color: "text.secondary" }} />}
                    label="Amount"
                    value={`${viewTransaction.direction === "credit" ? "+" : "-"} ${formatCHF(viewTransaction.amount)}`}
                    valueColor={viewTransaction.direction === "credit" ? "success.main" : undefined}
                  />
                  <DetailRow icon={<ReceiptLongIcon sx={{ fontSize: 20, color: "text.secondary" }} />} label="Fee" value="CHF 0.00" />
                  <DetailRow icon={<AttachMoneyIcon sx={{ fontSize: 20, color: "text.secondary" }} />} label="Total Amount" value={formatCHF(viewTransaction.amount)} />
                  <DetailRow icon={<FingerprintIcon sx={{ fontSize: 20, color: "text.secondary" }} />} label="Ref Number" value={viewTransaction.id.slice(-9)} />
                  <DetailRow icon={<CalendarTodayIcon sx={{ fontSize: 20, color: "text.secondary" }} />} label="Date" value={formatTransactionDate(viewTransaction.occurredAt ?? viewTransaction.createdAt)} />
                  <DetailRow icon={<InfoIcon sx={{ fontSize: 20, color: "text.secondary" }} />} label="Status" value={statusLabel(viewTransaction)} />
                </Stack>

                {viewTransaction.description && (
                  <Box sx={{ mt: 1, p: 1.5, bgcolor: "grey.50", borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Description</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{viewTransaction.description}</Typography>
                  </Box>
                )}

                <Button
                  variant="contained"
                  onClick={() => setViewTransaction(null)}
                  sx={{ mt: 2, alignSelf: "flex-start", borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                >
                  Close
                </Button>
              </Stack>
            </>
          )}
        </Box>
      </Modal>
      </div>
    </Box>
  );
}
