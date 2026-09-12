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
import { useQuery, useLazyQuery } from "@apollo/client";
import toast from "react-hot-toast";
import { formatCHF } from "../../../utils/money";
import { GET_STRIPE_EXPRESS_DASHBOARD_URL } from "../../../graphql/mutations/profile";
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

  return (
    <Box sx={{ p: 3, bgcolor: "#f5f7fa", minHeight: "100vh" }}>
      <Card elevation={3} sx={{ borderRadius: 3, p: { xs: 2, sm: 3 } }}>
        <CardContent sx={{ p: 0 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            sx={{ mb: 2.5 }}
            gap={1.5}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                Transaction history
              </Typography>
              <Typography variant="body2" color="text.secondary">
                View all payment, payout, refund, and transfer reversal activity.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="primary"
              disabled={dashboardLinkLoading}
              onClick={() => getStripeDashboardUrl()}
              sx={{ textTransform: "none", flexShrink: 0 }}
            >
              {dashboardLinkLoading ? "Opening..." : "Open Stripe Dashboard"}
            </Button>
          </Stack>

          {stats && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ mb: 2.5 }}
              flexWrap="wrap"
            >
              <Card
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
                  sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                >
                  <Box
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
                    <AttachMoneyIcon sx={{ color: "teal.main", fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography color="text.secondary" variant="caption">
                      Total received
                    </Typography>
                    <Typography variant="h6">
                      {formatCHF(stats.totalReceived)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              <Card
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
                  sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                >
                  <Box
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
                  <Box>
                    <Typography color="text.secondary" variant="caption">
                      Total payouts
                    </Typography>
                    <Typography variant="h6">
                      {formatCHF(stats.totalPayouts)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              <Card
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
                  sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                >
                  <Box
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
                  <Box>
                    <Typography color="text.secondary" variant="caption">
                      Transactions
                    </Typography>
                    <Typography variant="h6">{stats.transactionCount}</Typography>
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

          {instructorTransactions.length > 0 ? (
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
              <Typography variant="h6" gutterBottom>
                Transaction Details
              </Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>Ref Number:</strong> {viewTransaction.id.slice(-9)}
                </Typography>
                <Typography variant="body2">
                  <strong>Type:</strong>{" "}
                  {transactionTypeLabel(viewTransaction.type)}
                </Typography>
                <Typography variant="body2">
                  <strong>Lesson slot:</strong> {lessonSlotLabel(viewTransaction)}
                </Typography>
                <Typography variant="body2">
                  <strong>Amount:</strong>{" "}
                  {viewTransaction.direction === "credit" ? "+" : "-"} {formatCHF(viewTransaction.amount)}
                </Typography>
                <Typography variant="body2">
                  <strong>Date:</strong>{" "}
                  {formatTransactionDate(
                    viewTransaction.occurredAt ?? viewTransaction.createdAt,
                  )}
                </Typography>
                <Typography variant="body2">
                  <strong>Status:</strong> {viewTransaction.status}
                </Typography>
                {viewTransaction.description && (
                  <Typography variant="body2">
                    <strong>Description:</strong> {viewTransaction.description}
                  </Typography>
                )}
              </Stack>
              <Button
                variant="outlined"
                onClick={() => setViewTransaction(null)}
                sx={{ mt: 2 }}
              >
                Close
              </Button>
            </>
          )}
        </Box>
      </Modal>
    </Box>
  );
}
