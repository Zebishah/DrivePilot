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
  Button,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { useQuery, useMutation } from "@apollo/client";
import {
  GET_REFUND_REQUESTS,
  APPROVE_REFUND_REQUEST,
  REJECT_REFUND_REQUEST,
} from "../../../graphql/mutations/refundRequest";
import { format } from "date-fns";
import toast from "react-hot-toast";

function formatDate(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "dd MMM yyyy HH:mm");
}

function formatTime24(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  const [rawH, rawM] = value.split(":");
  const h = Number(rawH);
  const m = Number(rawM ?? "0");
  if (Number.isNaN(h) || Number.isNaN(m)) return value;
  const hh = h.toString().padStart(2, "0");
  const mm = m.toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

interface RefundRequestRow {
  id: string;
  bookingId: string;
  slotId: string;
  studentName?: string | null;
  instructorName?: string | null;
  amount: number;
  currency: string;
  status: string;
  requestedAt: string;
  slotDate?: string | null;
  slotStartTime?: string | null;
  slotEndTime?: string | null;
  rejectionReason?: string | null;
}

export default function AdminRefundRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [rejectDialog, setRejectDialog] = useState<{ id: string; reason: string } | null>(null);

  const { data, loading, error, refetch } = useQuery(GET_REFUND_REQUESTS, {
    variables: { status: statusFilter || undefined },
    fetchPolicy: "network-only",
  });

  const [approveRefund, { loading: approving }] = useMutation(APPROVE_REFUND_REQUEST, {
    onCompleted: () => {
      toast.success("Refund approved and processed.");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to approve refund");
    },
  });

  const [rejectRefund, { loading: rejecting }] = useMutation(REJECT_REFUND_REQUEST, {
    onCompleted: () => {
      toast.success("Refund request rejected.");
      setRejectDialog(null);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to reject");
    },
  });

  const requests: RefundRequestRow[] = data?.getRefundRequests ?? [];

  const handleApprove = (id: string) => {
    approveRefund({ variables: { id } });
  };

  const handleRejectSubmit = () => {
    if (!rejectDialog) return;
    rejectRefund({
      variables: { id: rejectDialog.id, rejectionReason: rejectDialog.reason || undefined },
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
        Refund Requests
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Students request refunds after cancelling a lesson. Approve or reject each request here.
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        {["pending", "approved", "rejected"].map((s) => (
          <Chip
            key={s}
            label={s.charAt(0).toUpperCase() + s.slice(1)}
            onClick={() => setStatusFilter(s)}
            color={s === "pending" ? "warning" : s === "approved" ? "success" : "default"}
            variant={statusFilter === s ? "filled" : "outlined"}
          />
        ))}
      </Stack>

      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      {!loading && !error && (
        <TableContainer component={Paper} elevation={2}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell>Instructor</TableCell>
                <TableCell>Lesson</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Requested</TableCell>
                <TableCell>Status</TableCell>
                {statusFilter === "pending" && <TableCell align="right">Action</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={statusFilter === "pending" ? 7 : 6} align="center" sx={{ py: 4 }}>
                    No refund requests found.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.studentName ?? "—"}</TableCell>
                    <TableCell>{r.instructorName ?? "—"}</TableCell>
                    <TableCell>
                      {r.slotDate ?? "—"}{" "}
                      {formatTime24(r.slotStartTime)}
                      {r.slotStartTime || r.slotEndTime ? "–" : ""}
                      {formatTime24(r.slotEndTime)}
                    </TableCell>
                    <TableCell align="right">
                      {r.currency} {r.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{formatDate(r.requestedAt)}</TableCell>
                    <TableCell>
                      <Chip
                        label={r.status}
                        size="small"
                        color={
                          r.status === "approved"
                            ? "success"
                            : r.status === "rejected"
                              ? "default"
                              : "warning"
                        }
                        variant="outlined"
                      />
                    </TableCell>
                    {statusFilter === "pending" && (
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircleIcon />}
                            disabled={approving}
                            onClick={() => handleApprove(r.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<CancelIcon />}
                            disabled={rejecting}
                            onClick={() => setRejectDialog({ id: r.id, reason: "" })}
                          >
                            Reject
                          </Button>
                        </Stack>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={!!rejectDialog} onClose={() => setRejectDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject refund request</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Optional: add a reason for the student (e.g. &quot;Payout already sent&quot;).
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Reason (optional)"
            value={rejectDialog?.reason ?? ""}
            onChange={(e) =>
              setRejectDialog((prev) => (prev ? { ...prev, reason: e.target.value } : null))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleRejectSubmit} disabled={rejecting}>
            {rejecting ? <CircularProgress size={24} /> : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
