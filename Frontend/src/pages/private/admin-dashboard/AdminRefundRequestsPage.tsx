"use client";

import { useState } from "react";
import {
  Box,
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
import { AdminButton, AdminPage, AdminPageHeader, AdminStatus } from "../../../components/admin/AdminPrimitives";
import { AdminModal, AdminDetailGrid, AdminDetailRow } from "../../../components/admin/AdminModal";

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
  message?: string | null;
  attachments?: Array<{
    url: string;
    fileName: string;
    mimeType: string;
  }>;
}

export default function AdminRefundRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "processing" | "approved" | "rejected"
  >("all");
  const [rejectDialog, setRejectDialog] = useState<{ id: string; reason: string } | null>(null);
  const [detailsRow, setDetailsRow] = useState<RefundRequestRow | null>(null);

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
    <AdminPage>
      <AdminPageHeader title="Refund requests" description="Review and resolve Student refund requests without changing the existing payment workflow." />

      <Tabs
        value={statusFilter}
        onChange={(
          _,
          v: "all" | "pending" | "processing" | "approved" | "rejected",
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
        <Tab label="Processing" value="processing" />
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
                <TableCell align="right">Details</TableCell>
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
                        ? 8
                        : 7
                    }
                    align="center"
                    sx={{ py: 4 }}
                  >
                    No refund requests to review. New Student requests will appear here.
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
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setDetailsRow(r)}
                        sx={{ textTransform: "none" }}
                      >
                        View details
                      </Button>
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

      <AdminModal open={Boolean(rejectDialog)} onClose={() => setRejectDialog(null)} title="Reject refund request" subtitle="Add an optional reason for the Student." size="sm" closeOnBackdrop={!isProcessing} closeOnEscape={!isProcessing} footer={<><AdminButton variant="secondary" onClick={() => setRejectDialog(null)} disabled={isProcessing}>Cancel</AdminButton><AdminButton variant="danger" onClick={handleRejectSubmit} disabled={isProcessing}>{rejecting ? "Rejecting..." : "Reject request"}</AdminButton></>}>
        <label className="dsp-admin-form-field">Reason (optional)<textarea className="dsp-admin-input" rows={4} value={rejectDialog?.reason ?? ""} onChange={(event) => setRejectDialog((prev) => (prev ? { ...prev, reason: event.target.value } : null))} placeholder="For example: payout already sent" /></label>
      </AdminModal>
      <AdminModal open={Boolean(detailsRow)} onClose={() => setDetailsRow(null)} title="Refund request details" subtitle={detailsRow ? `${detailsRow.currency} ${detailsRow.amount.toFixed(2)} refund request` : undefined} size="lg" footer={<AdminButton variant="secondary" onClick={() => setDetailsRow(null)}>Close</AdminButton>}>
        {detailsRow && <div className="dsp-admin-modal-stack"><AdminDetailGrid><AdminDetailRow label="Student" value={detailsRow.studentName} /><AdminDetailRow label="Instructor" value={detailsRow.instructorName} /><AdminDetailRow label="Lesson" value={`${detailsRow.slotDate ?? "Not provided"} ${formatTime24(detailsRow.slotStartTime)}${detailsRow.slotStartTime || detailsRow.slotEndTime ? "–" : ""}${formatTime24(detailsRow.slotEndTime)}`} /><AdminDetailRow label="Amount" value={`${detailsRow.currency} ${detailsRow.amount.toFixed(2)}`} /><AdminDetailRow label="Requested at" value={formatDate(detailsRow.requestedAt)} /><AdminDetailRow label="Status" value={<AdminStatus tone={detailsRow.status === "approved" ? "success" : detailsRow.status === "rejected" ? "danger" : "warning"}>{detailsRow.status}</AdminStatus>} />{detailsRow.rejectionReason && <AdminDetailRow label="Rejection reason" value={detailsRow.rejectionReason} />}</AdminDetailGrid><section className="dsp-admin-modal-section"><h3>Student message</h3><p className="dsp-admin-feedback-detail__message">{detailsRow.message?.trim() || "No message provided."}</p></section><section className="dsp-admin-modal-section"><h3>Uploaded documents</h3>{detailsRow.attachments?.length ? <div className="dsp-admin-attachment-list">{detailsRow.attachments.map((file) => <a key={`${detailsRow.id}-${file.url}`} href={file.url} target="_blank" rel="noreferrer" className="dsp-admin-attachment-row"><span>{file.fileName}</span><span>Open</span></a>)}</div> : <p className="dsp-admin-muted">No documents uploaded.</p>}</section></div>}
      </AdminModal>
    </AdminPage>
  );
}
