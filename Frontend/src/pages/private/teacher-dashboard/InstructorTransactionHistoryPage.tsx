import { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Modal,
  Pagination,
  LinearProgress,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useQuery, useLazyQuery } from "@apollo/client";
import toast from "react-hot-toast";
import { formatCHF } from "../../../utils/money";
import { GET_STRIPE_EXPRESS_DASHBOARD_URL } from "../../../graphql/mutations/profile";
import { DashboardPageHeader } from "../../../components/dashboard/OverviewWidgets";
import {
  GET_INSTRUCTOR_TRANSACTIONS,
  GET_INSTRUCTOR_TRANSACTIONS_COUNT,
  GET_INSTRUCTOR_TRANSACTION_STATS,
} from "../../../graphql/Queries/transactionQueries";

type HistoryFilter =
  | "all"
  | "payment"
  | "payout"
  | "refund"
  | "transfer_reversal";

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

function transactionTypeLabel(type: string): string {
  if (type === "transfer_reversal") return "Transfer reversal";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function lessonSlotLabel(t: InstructorTransaction): string {
  if (t.lessonSummary && t.lessonSummary.trim()) return t.lessonSummary.trim();
  return "—";
}

export default function InstructorTransactionHistoryPage() {
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [page, setPage] = useState(1);
  const [viewTransaction, setViewTransaction] =
    useState<InstructorTransaction | null>(null);
  const PAGE_SIZE = 15;

  const {
    data: transactionsData,
    previousData: previousTransactionsData,
    loading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useQuery(GET_INSTRUCTOR_TRANSACTIONS, {
    variables: {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      type: historyFilter === "all" ? undefined : historyFilter,
    },
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
  });
  const {
    data: countData,
    previousData: previousCountData,
    loading: countLoading,
    error: countError,
    refetch: refetchCount,
  } = useQuery(GET_INSTRUCTOR_TRANSACTIONS_COUNT, {
    variables: { type: historyFilter === "all" ? undefined : historyFilter },
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
  });
  const { data: statsData } = useQuery(GET_INSTRUCTOR_TRANSACTION_STATS, {
    fetchPolicy: "network-only",
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

  const effectiveTransactionsData = transactionsData ?? previousTransactionsData;
  const effectiveCountData = countData ?? previousCountData;
  const instructorTransactions: InstructorTransaction[] =
    effectiveTransactionsData?.getInstructorTransactions ?? [];
  const stats = statsData?.getInstructorTransactionStats;
  const totalCount: number = effectiveCountData?.getInstructorTransactionCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const isTableLoading =
    (transactionsLoading || countLoading) &&
    Boolean(previousTransactionsData || previousCountData);

  if (transactionsError || countError) {
    return (
      <Box className="dsp-instructor-page dsp-transactions-page">
        <Card className="dsp-page-error" sx={{ maxWidth: 720, mx: "auto" }}>
          <Typography variant="h6">We couldn’t load your transactions</Typography>
          <Typography variant="body2">Try again to refresh your payment history.</Typography>
          <Button variant="contained" onClick={() => { void refetchTransactions(); void refetchCount(); }}>Try again</Button>
        </Card>
      </Box>
    );
  }

  return (
    <Box className="dsp-instructor-page dsp-transactions-page" sx={{ p: 3, bgcolor: "#f5f7fa", minHeight: "100vh" }}>
      <DashboardPageHeader
        title="Transaction history"
        description="Track payments, payouts, refunds, and transfer reversals in one place."
        action={(
          <Button
            variant="outlined"
            color="primary"
            disabled={dashboardLinkLoading}
            onClick={() => getStripeDashboardUrl()}
            sx={{ textTransform: "none", flexShrink: 0 }}
          >
            {dashboardLinkLoading ? "Opening..." : "Open Stripe Dashboard"}
          </Button>
        )}
      />
      <Card elevation={3} sx={{ borderRadius: 3, p: { xs: 2, sm: 3 } }}>
        <CardContent sx={{ p: 0 }}>
          {stats && (
            <Stack
              className="dsp-transaction-kpi-grid"
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ mb: 2.5 }}
              flexWrap="wrap"
            >
              <Card
                className="dsp-transaction-kpi dsp-transaction-kpi--received"
                elevation={0}
                sx={{
                  flex: 1,
                  minWidth: 170,
                  borderRadius: 2.5,
                  bgcolor: "rgba(0, 191, 165, 0.08)",
                  border: "1px solid rgba(0, 191, 165, 0.35)",
                }}
              >
                <CardContent
                  className="dsp-transaction-kpi__content"
                >
                  <Box
                    className="dsp-transaction-kpi__icon"
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      bgcolor: "rgba(0, 191, 165, 0.18)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <AttachMoneyIcon sx={{ color: "#0EA5E9", fontSize: 20 }} />
                  </Box>
                  <Box className="dsp-transaction-kpi__copy">
                    <Typography className="dsp-transaction-kpi__label" color="text.secondary" variant="caption">
                      Total received
                    </Typography>
                    <Typography className="dsp-transaction-kpi__value" variant="h6">
                      {formatCHF(stats.totalReceived)}
                    </Typography>
                    <Typography className="dsp-transaction-kpi__helper" variant="caption">
                      Across {stats.transactionCount} transaction{stats.transactionCount === 1 ? "" : "s"}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              <Card
                className="dsp-transaction-kpi dsp-transaction-kpi--payouts"
                elevation={0}
                sx={{
                  flex: 1,
                  minWidth: 170,
                  borderRadius: 2.5,
                  bgcolor: "rgba(33, 150, 243, 0.06)",
                  border: "1px solid rgba(33, 150, 243, 0.3)",
                }}
              >
                <CardContent
                  className="dsp-transaction-kpi__content"
                >
                  <Box
                    className="dsp-transaction-kpi__icon"
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      bgcolor: "rgba(33, 150, 243, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <AccountBalanceWalletIcon
                      sx={{ color: "info.main", fontSize: 20 }}
                    />
                  </Box>
                  <Box className="dsp-transaction-kpi__copy">
                    <Typography className="dsp-transaction-kpi__label" color="text.secondary" variant="caption">
                      Total payouts
                    </Typography>
                    <Typography className="dsp-transaction-kpi__value" variant="h6">
                      {formatCHF(stats.totalPayouts)}
                    </Typography>
                    <Typography className="dsp-transaction-kpi__helper" variant="caption">
                      {stats.totalPayouts > 0 ? "Recorded payout activity" : "No payouts recorded"}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              <Card
                className="dsp-transaction-kpi dsp-transaction-kpi--count"
                elevation={0}
                sx={{
                  flex: 1,
                  minWidth: 170,
                  borderRadius: 2.5,
                  bgcolor: "rgba(76, 175, 80, 0.06)",
                  border: "1px solid rgba(76, 175, 80, 0.35)",
                }}
              >
                <CardContent
                  className="dsp-transaction-kpi__content"
                >
                  <Box
                    className="dsp-transaction-kpi__icon"
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      bgcolor: "rgba(76, 175, 80, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ReceiptLongIcon
                      sx={{ color: "success.main", fontSize: 20 }}
                    />
                  </Box>
                  <Box className="dsp-transaction-kpi__copy">
                    <Typography className="dsp-transaction-kpi__label" color="text.secondary" variant="caption">
                      Transactions
                    </Typography>
                    <Typography className="dsp-transaction-kpi__value" variant="h6">{stats.transactionCount}</Typography>
                    <Typography className="dsp-transaction-kpi__helper" variant="caption">
                      All payment activity
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Stack>
          )}

          <Tabs
            value={historyFilter}
            onChange={(_, value: HistoryFilter) => {
              setHistoryFilter(value);
              setPage(1);
            }}
            sx={{
              mb: 1.5,
              borderBottom: 1,
              borderColor: "divider",
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
                minHeight: 40,
              },
            }}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            <Tab value="all" label="All" />
            <Tab value="payment" label="Payments" />
            <Tab value="payout" label="Payouts" />
            <Tab value="refund" label="Refunds" />
            <Tab value="transfer_reversal" label="Reversals" />
          </Tabs>
          {isTableLoading && <LinearProgress sx={{ mb: 1 }} />}

          {transactionsLoading && !effectiveTransactionsData ? (
            <div className="dsp-dashboard-loading dsp-dashboard-loading--compact" role="status" aria-live="polite">Loading transactions…</div>
          ) : instructorTransactions.length > 0 ? (
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              <Table
                size="medium"
                stickyHeader
                sx={{
                  "& .MuiTableCell-head": {
                    py: 1.8,
                    bgcolor: "grey.50",
                    fontWeight: 600,
                  },
                  "& .MuiTableCell-body": { py: 1.9 },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>Ref number</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Lesson slot</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {instructorTransactions.map((t) => (
                    <TableRow key={t.id} hover>
                      <TableCell
                        sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}
                      >
                        {t.id.slice(-9)}
                      </TableCell>
                      <TableCell>
                        {formatTransactionDate(t.occurredAt ?? t.createdAt)}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 180 }}>
                        <Typography
                          variant="body2"
                          noWrap
                          title={lessonSlotLabel(t)}
                        >
                          {lessonSlotLabel(t)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={transactionTypeLabel(t.type)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 260 }}>
                        <Typography
                          variant="body2"
                          noWrap
                          title={t.description || ""}
                        >
                          {t.description || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color:
                            t.direction === "credit"
                              ? "success.main"
                              : "text.primary",
                          fontWeight: 600,
                        }}
                      >
                        {t.direction === "credit" ? "+" : "-"} {formatCHF(Number(t.amount))}
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
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mt: 1.5 }}
          >
            <Typography variant="body2" color="text.secondary">
              Showing {(page - 1) * PAGE_SIZE + (instructorTransactions.length ? 1 : 0)}-
              {(page - 1) * PAGE_SIZE + instructorTransactions.length} of {totalCount}
            </Typography>
            <Pagination
              page={page}
              count={totalPages}
              onChange={(_, p) => setPage(p)}
              color="primary"
              shape="rounded"
            />
          </Stack>
        </CardContent>
      </Card>

      <Modal
        className="dsp-instructor-modal-root"
        open={!!viewTransaction}
        onClose={() => setViewTransaction(null)}
        sx={{ zIndex: 1400 }}
      >
        <Box
          className="dsp-transaction-detail-modal"
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "94%", sm: 560 },
            bgcolor: "background.paper",
            boxShadow: 24,
            borderRadius: 3,
            maxHeight: "85vh",
            overflowY: "auto",
          }}
        >
          {viewTransaction && (
            <>
              <Box className="dsp-transaction-detail-modal__header">
                <Box>
                  <span>Financial receipt</span>
                  <Typography variant="h6">Transaction details</Typography>
                </Box>
                <Chip
                  icon={<CheckCircleOutlineIcon />}
                  label={viewTransaction.status}
                  color={viewTransaction.status === "succeeded" ? "success" : "default"}
                  size="small"
                />
              </Box>
              <Box className="dsp-transaction-detail-modal__amount">
                <span>{transactionTypeLabel(viewTransaction.type)}</span>
                <strong>{viewTransaction.direction === "credit" ? "+" : "-"} {formatCHF(viewTransaction.amount)}</strong>
              </Box>
              <Box className="dsp-transaction-detail-modal__grid">
                <div><span>Reference</span><strong>{viewTransaction.id.slice(-9)}</strong></div>
                <div><span>Transaction type</span><strong>{transactionTypeLabel(viewTransaction.type)}</strong></div>
                <div><span>Lesson</span><strong>{lessonSlotLabel(viewTransaction)}</strong></div>
                <div><span>Created</span><strong>{formatTransactionDate(viewTransaction.occurredAt ?? viewTransaction.createdAt)}</strong></div>
                <div><span>Status</span><strong>{viewTransaction.status}</strong></div>
                <div><span>Description</span><strong>{viewTransaction.description || "—"}</strong></div>
              </Box>
              <Box className="dsp-transaction-detail-modal__footer">
                <Button
                  variant="text"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => {
                    void navigator.clipboard?.writeText(viewTransaction.id);
                    toast.success("Reference copied");
                  }}
                >
                  Copy reference
                </Button>
                <Button variant="contained" onClick={() => setViewTransaction(null)}>Close</Button>
              </Box>
            </>
          )}
        </Box>
      </Modal>
    </Box>
  );
}
