"use client";

import { useState } from "react";
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
  Tabs,
  Tab,
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
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [rejectDialog, setRejectDialog] = useState<{ id: string; reason: string } | null>(null);

  const { data, loading, error, refetch } = useQuery(GET_REFUND_REQUESTS, {
    variables: { status: statusFilter === "all" ? undefined : statusFilter },
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
  const isProcessing = approving || rejecting;

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

      <Tabs
        value={statusFilter}
        onChange={(
          _,
          v: "all" | "pending" | "approved" | "rejected",
        ) => setStatusFilter(v)}
        sx={{
          mb: 2,
          borderBottom: 1,
          borderColor: "divider",
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 600,
            minHeight: 42,
          },
        }}
      >
        <Tab label="All" value="all" />
        <Tab label="Pending" value="pending" />
        <Tab label="Approved" value="approved" />
        <Tab label="Rejected" value="rejected" />
      </Tabs>

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
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}
        >
          <Table
            size="medium"
            stickyHeader
            sx={{
              "& .MuiTableCell-head": {
                py: 1.8,
                bgcolor: "grey.50",
                borderBottom: "1px solid",
                borderBottomColor: "divider",
                fontWeight: 600,
              },
              "& .MuiTableCell-body": {
                py: 1.8,
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell>Instructor</TableCell>
                <TableCell>Lesson</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Requested</TableCell>
                <TableCell>Status</TableCell>
                {(statusFilter === "pending" || statusFilter === "all") && (
                  <TableCell align="right">Action</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      statusFilter === "pending" || statusFilter === "all"
                        ? 7
                        : 6
                    }
                    align="center"
                    sx={{ py: 4 }}
                  >
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
                        label={r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        size="small"
                        color={
                          r.status === "approved"
                            ? "success"
                            : r.status === "rejected"
                              ? "default"
                              : "warning"
                        }
                        variant="filled"
                      />
                    </TableCell>
                    {(statusFilter === "pending" || statusFilter === "all") && (
                      <TableCell align="right">
                        {r.status === "pending" ? (
                          <Stack
                            direction="row"
                            spacing={1}
                            justifyContent="flex-end"
                          >
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={
                                approving ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <CheckCircleIcon />
                                )
                              }
                              disabled={isProcessing}
                              onClick={() => handleApprove(r.id)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<CancelIcon />}
                              disabled={isProcessing}
                              onClick={() =>
                                setRejectDialog({ id: r.id, reason: "" })
                              }
                            >
                              Reject
                            </Button>
                          </Stack>
                        ) : (
                          "—"
                        )}
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
          <Button onClick={() => setRejectDialog(null)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleRejectSubmit} disabled={isProcessing}>
            {rejecting ? <CircularProgress size={24} /> : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
