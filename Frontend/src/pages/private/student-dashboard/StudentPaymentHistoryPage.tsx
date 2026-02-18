"use client";

import React from "react";
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
} from "@mui/material";
import { useQuery } from "@apollo/client";
import { GET_STUDENT_TRANSACTIONS } from "../../../graphql/Queries/transactionQueries";
import { format } from "date-fns";

function formatTransactionDate(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "MMM d, yyyy HH:mm");
}

interface Transaction {
  id: string;
  type: string;
  role: string;
  direction: string;
  amount: number;
  currency: string;
  status: string;
  description?: string;
  occurredAt?: string;
  createdAt: string;
}

export default function StudentPaymentHistoryPage() {
  const { data, loading, error } = useQuery(GET_STUDENT_TRANSACTIONS, {
    variables: { limit: 50, offset: 0 },
    fetchPolicy: "network-only",
  });

  const transactions: Transaction[] = data?.getStudentTransactions ?? [];

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
        Payment history
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Your payments and refunds for lessons.
      </Typography>

      <TableContainer component={Paper} elevation={2}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Direction</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  No transactions yet. Payments and refunds will appear here.
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
