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
import { useQuery } from "@apollo/client";
import {
  GET_STUDENT_TRANSACTIONS,
  GET_STUDENT_TRANSACTION_STATS,
} from "../../../graphql/Queries/transactionQueries";
import { format } from "date-fns";

function formatTransactionDate(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "dd MMM yyyy hh:mm a");
}

type StatusLabel = "Pending" | "Completed" | "Cancel" | "Refund";

function statusLabel(t: { type: string; status: string }): StatusLabel {
  if (t.type === "refund") return "Refund";
  if (t.status === "cancelled" || t.status === "failed") return "Cancel";
  if (t.status === "pending") return "Pending";
  return "Completed";
}

function statusColor(s: StatusLabel): "warning" | "success" | "error" | "info" | "default" {
  switch (s) {
    case "Pending": return "warning";
    case "Completed": return "success";
    case "Cancel": return "error";
    case "Refund": return "info";
    default: return "default";
  }
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
  occurredAt?: string | null;
  createdAt: string;
}

export default function StudentPaymentHistoryPage() {
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);

  const { data, loading, error } = useQuery(GET_STUDENT_TRANSACTIONS, {
    variables: { limit: 50, offset: 0 },
    fetchPolicy: "network-only",
  });
  const { data: statsData } = useQuery(GET_STUDENT_TRANSACTION_STATS, {
    fetchPolicy: "network-only",
  });

  const transactions: Transaction[] = data?.getStudentTransactions ?? [];
  const stats = statsData?.getStudentTransactionStats;

  const formatAmount = (t: Transaction) => {
    const sign = t.direction === "credit" ? "+" : "-";
    return `${sign} $${t.amount.toFixed(2)}`;
  };

  if (loading && !data) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error.message}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
        Payment History
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Your payments and refunds for lessons.
      </Typography>

      {stats && (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ mb: 3 }}
          flexWrap="wrap"
        >
          <Card
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
                <Typography variant="h6">${stats.totalSpent.toFixed(2)}</Typography>
              </Box>
            </CardContent>
          </Card>

          <Card
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
                <Typography variant="h6">${stats.totalRefunded.toFixed(2)}</Typography>
              </Box>
            </CardContent>
          </Card>

          <Card
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
              </Box>
            </CardContent>
          </Card>

          <Card
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
              </Box>
            </CardContent>
          </Card>
        </Stack>
      )}

      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        All Payment List
      </Typography>
      <TableContainer component={Paper} elevation={2}>
        <Table
          size="small"
          stickyHeader
          sx={{
            "& .MuiTableCell-head": {
              py: 2.5,
            },
            "& .MuiTableCell-body": {
              py: 2.5,
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Ref Number</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Date of Payment</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  No transactions yet. Payments and refunds will appear here.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>{t.id.slice(-9)}</TableCell>
                  <TableCell
                    sx={{
                      color: t.direction === "credit" ? "success.main" : "text.primary",
                      fontWeight: 500,
                    }}
                  >
                    {formatAmount(t)}
                  </TableCell>
                  <TableCell>{formatTransactionDate(t.occurredAt ?? t.createdAt)}</TableCell>
                  <TableCell>
                    <Chip
                      label={statusLabel(t)}
                      size="small"
                      color={statusColor(statusLabel(t))}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<VisibilityIcon />}
                      onClick={() => setViewTransaction(t)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
                      ? "error"
                      : statusLabel(viewTransaction) === "Completed"
                        ? "success"
                        : "default"
                  }
                  variant="outlined"
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
                  <DetailRow icon={<AccountBalanceIcon sx={{ fontSize: 20, color: "text.secondary" }} />} label="Funding Source" value="Card" />
                  <DetailRow icon={<SendIcon sx={{ fontSize: 20, color: "text.secondary" }} />} label="Sent to" value="Driving School Platform (DSP)" />
                  <DetailRow
                    icon={<AttachMoneyIcon sx={{ fontSize: 20, color: "text.secondary" }} />}
                    label="Amount"
                    value={`${viewTransaction.direction === "credit" ? "+" : "-"} $${viewTransaction.amount.toFixed(2)}`}
                    valueColor={viewTransaction.direction === "credit" ? "success.main" : undefined}
                  />
                  <DetailRow icon={<ReceiptLongIcon sx={{ fontSize: 20, color: "text.secondary" }} />} label="Fee" value="$0.00" />
                  <DetailRow icon={<AttachMoneyIcon sx={{ fontSize: 20, color: "text.secondary" }} />} label="Total Amount" value={`$${viewTransaction.amount.toFixed(2)}`} />
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
    </Box>
  );
}
