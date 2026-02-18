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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from "@mui/material";
import { useQuery } from "@apollo/client";
import { GET_ADMIN_TRANSACTIONS } from "../../../graphql/Queries/transactionQueries";
import { format } from "date-fns";

function formatTransactionDate(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "MMM d, yyyy HH:mm");
}

type TransactionType =
  | "payment"
  | "payout"
  | "refund"
  | "transfer_reversal"
  | "adjustment";
type TransactionRole = "platform" | "instructor" | "student";
type TransactionStatus = "pending" | "succeeded" | "failed" | "cancelled";

interface Transaction {
  id: string;
  type: TransactionType;
  role: TransactionRole;
  direction: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  bookingId?: string;
  description?: string;
  occurredAt?: string;
  createdAt: string;
}

export default function AdminTransactionsPage() {
  const [typeFilter, setTypeFilter] = useState<TransactionType | "">("");
  const [roleFilter, setRoleFilter] = useState<TransactionRole | "">("");

  const { data, loading, error } = useQuery(GET_ADMIN_TRANSACTIONS, {
    variables: {
      filter: {
        ...(typeFilter && { type: typeFilter }),
        ...(roleFilter && { role: roleFilter }),
      },
    },
    fetchPolicy: "network-only",
  });

  const transactions: Transaction[] = data?.getAdminTransactions ?? [];

  const formatAmount = (t: Transaction) => {
    const sign = t.direction === "credit" ? "+" : "-";
    return `${sign} ${t.amount.toFixed(2)} ${t.currency}`;
  };

  if (loading) {
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
        All transactions
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Platform-wide payment, payout, and refund activity.
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={typeFilter}
            label="Type"
            onChange={(e) => setTypeFilter(e.target.value as TransactionType | "")}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="payment">Payment</MenuItem>
            <MenuItem value="payout">Payout</MenuItem>
            <MenuItem value="refund">Refund</MenuItem>
            <MenuItem value="transfer_reversal">Transfer reversal</MenuItem>
            <MenuItem value="adjustment">Adjustment</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Role</InputLabel>
          <Select
            value={roleFilter}
            label="Role"
            onChange={(e) => setRoleFilter(e.target.value as TransactionRole | "")}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="platform">Platform</MenuItem>
            <MenuItem value="instructor">Instructor</MenuItem>
            <MenuItem value="student">Student</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <TableContainer component={Paper} elevation={2}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Direction</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  No transactions found.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>
                    {formatTransactionDate(t.occurredAt ?? t.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Chip label={t.type} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{t.role}</TableCell>
                  <TableCell>{t.direction}</TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: t.direction === "credit" ? "success.main" : "text.primary",
                    }}
                  >
                    {formatAmount(t)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={t.status}
                      size="small"
                      color={
                        t.status === "succeeded"
                          ? "success"
                          : t.status === "failed"
                            ? "error"
                            : "default"
                      }
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>{t.description ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
