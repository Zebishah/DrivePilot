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
  Stack,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  Avatar,
  Modal,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormGroup,
  FormControlLabel,
  TextField,
  Menu
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import PaymentIcon from "@mui/icons-material/Payment";
import ReplayIcon from "@mui/icons-material/Replay";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import PlaceIcon from "@mui/icons-material/Place";
import CategoryIcon from "@mui/icons-material/Category";
import InfoIcon from "@mui/icons-material/Info";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import { useQuery, useMutation } from "@apollo/client";
import {
  GET_ADMIN_TRANSACTIONS_WITH_PARTIES,
  GET_ADMIN_TRANSACTION_STATS,
  GET_PLATFORM_COMMISSION_SETTINGS,
  UPDATE_PLATFORM_COMMISSION_SETTINGS,
} from "../../../graphql/Queries/transactionQueries";
import { format } from "date-fns";

function formatTransactionDate(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "dd-MM-yyyy hh:mm a");
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

type TransactionType =
  | "payment"
  | "payout"
  | "refund"
  | "transfer_reversal"
  | "adjustment";
type TransactionRole = "platform" | "instructor" | "student";
type TransactionStatus = "pending" | "succeeded" | "failed" | "cancelled";

interface TransactionParty {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string | null;
  location?: string | null;
}

interface Transaction {
  id: string;
  type: TransactionType;
  role: TransactionRole;
  direction: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  bookingId?: string | null;
  studentId?: string | null;
  instructorId?: string | null;
  student?: TransactionParty | null;
  instructor?: TransactionParty | null;
  description?: string | null;
  occurredAt?: string | null;
  createdAt: string;
}

interface AdminStats {
  totalEarned: number;
  totalPayments: number;
  totalRefunds: number;
  totalPayouts: number;
  transactionCount: number;
}

interface CommissionSettings {
  defaultRate: number;
  defaultType: string;
  defaultFixedAmount: number;
  minFare: number | null;
  maxFare: number | null;
  payoutMethods: string[];
}

export default function AdminTransactionsPage() {
  const [tab, setTab] = useState(0);
  const [roleFilter, setRoleFilter] = useState<TransactionRole | "">("");
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "">("");
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);
  const [profileParty, setProfileParty] = useState<TransactionParty | null>(null);

  const { data: statsData } = useQuery(GET_ADMIN_TRANSACTION_STATS, {
    fetchPolicy: "network-only",
  });
  const { data, loading, error } = useQuery(GET_ADMIN_TRANSACTIONS_WITH_PARTIES, {
    variables: {
      filter: {
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { status: statusFilter }),
      },
    },
    fetchPolicy: "network-only",
  });

  const transactions: Transaction[] = data?.getAdminTransactions ?? [];
  const stats: AdminStats | null = statsData?.getAdminTransactionStats ?? null;

  const formatAmount = (t: Transaction) => {
    const sign = t.direction === "credit" ? "+" : "-";
    return `${sign} $${t.amount.toFixed(2)}`;
  };

  // Show the party that the transaction belongs to: instructor for instructor share/payout; platform for commission; student for payment/refund
  const displayParty = (t: Transaction): TransactionParty | null => {
    if (t.role === "instructor" && t.instructor) return t.instructor;
    if (t.role === "platform") return null; // Platform commission: show "Platform" in UI, not student
    return t.student ?? t.instructor ?? null;
  };
  const isPlatformTransaction = (t: Transaction) => t.role === "platform";
  const isRefund = (t: Transaction) => t.type === "refund";
  const commissionDisplay = (t: Transaction) => {
    if (t.role === "platform" && t.type === "payment" && t.description?.toLowerCase().includes("commission"))
      return `$${t.amount.toFixed(2)}`;
    return "—";
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
        Payment Management
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tab label="Payments and Transactions" />
        <Tab label="Commission Management" />
      </Tabs>

      {tab === 0 && (
        <>
          {stats && (
            <Stack
              direction={{ xs: "column", md: "row" }}
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
                    <Typography color="text.secondary" variant="body2">
                      Total earned
                    </Typography>
                    <Typography variant="h6">${stats.totalEarned.toFixed(2)}</Typography>
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
                    <PaymentIcon color="primary" />
                  </Box>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Payments
                    </Typography>
                    <Typography variant="h6">{stats.totalPayments}</Typography>
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
                    <ReplayIcon sx={{ color: "error.main" }} />
                  </Box>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Refunds
                    </Typography>
                    <Typography variant="h6">{stats.totalRefunds}</Typography>
                  </Box>
                </CardContent>
              </Card>

              <Card
                elevation={0}
                sx={{
                  flex: 1,
                  minWidth: 180,
                  borderRadius: 3,
                  bgcolor: "rgba(156, 39, 176, 0.05)",
                  border: "1px solid rgba(156, 39, 176, 0.35)",
                }}
              >
                <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      bgcolor: "rgba(156, 39, 176, 0.16)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <AccountBalanceWalletIcon sx={{ color: "secondary.main" }} />
                  </Box>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Payouts
                    </Typography>
                    <Typography variant="h6">{stats.totalPayouts}</Typography>
                  </Box>
                </CardContent>
              </Card>

              <Card
                elevation={0}
                sx={{
                  flex: 1,
                  minWidth: 180,
                  borderRadius: 3,
                  bgcolor: "rgba(0, 0, 0, 0.03)",
                  border: "1px solid rgba(158, 158, 158, 0.35)",
                }}
              >
                <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      bgcolor: "rgba(158, 158, 158, 0.18)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ReceiptLongIcon sx={{ color: "text.secondary" }} />
                  </Box>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Transactions
                    </Typography>
                    <Typography variant="h6">{stats.transactionCount}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Stack>
          )}

          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
            <Button
              startIcon={<FilterListIcon />}
              onClick={(e) => setFilterAnchor(e.currentTarget)}
              variant="outlined"
              size="small"
            >
              Filters
            </Button>
            <Menu
              anchorEl={filterAnchor}
              open={Boolean(filterAnchor)}
              onClose={() => setFilterAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
              <Box sx={{ px: 2, py: 1, minWidth: 200 }}>
                <Typography variant="subtitle2" color="text.secondary">User</Typography>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={roleFilter === ""}
                        onChange={() => setRoleFilter("")}
                      />
                    }
                    label="All"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={roleFilter === "student"}
                        onChange={() => setRoleFilter(roleFilter === "student" ? "" : "student")}
                      />
                    }
                    label="Student"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={roleFilter === "instructor"}
                        onChange={() => setRoleFilter(roleFilter === "instructor" ? "" : "instructor")}
                      />
                    }
                    label="Instructor"
                  />
                </FormGroup>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>Status</Typography>
                <FormGroup>
                  <FormControlLabel
                    control={<Checkbox checked={statusFilter === ""} onChange={() => setStatusFilter("")} />}
                    label="All"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={statusFilter === "succeeded"} onChange={() => setStatusFilter(statusFilter === "succeeded" ? "" : "succeeded")} />}
                    label="Succeeded"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={statusFilter === "pending"} onChange={() => setStatusFilter(statusFilter === "pending" ? "" : "pending")} />}
                    label="Pending"
                  />
                </FormGroup>
              </Box>
            </Menu>
          </Stack>

          {loading && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>
          )}
          {!loading && !error && (
            <TableContainer component={Paper} elevation={2}>
              <Table
                size="small"
                stickyHeader
                sx={{
                  "& .MuiTableCell-head": {
                    py: 2.5,
                    borderRadius: "10px",
                  },
                  "& .MuiTableCell-body": {
                    py: 2.5,
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>Users</TableCell>
                    <TableCell>Transaction ID</TableCell>
                    <TableCell>Date &amp; Time</TableCell>
                    <TableCell>Refund</TableCell>
                    <TableCell>Commission</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Action</TableCell>
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
                    transactions.map((t) => {
                      const party = displayParty(t);
                      return (
                        <TableRow key={t.id} hover>
                          <TableCell>
                            {isPlatformTransaction(t) ? (
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
                                  <AccountBalanceIcon sx={{ fontSize: 18 }} />
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight={500}>
                                    Platform
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Commission / admin
                                  </Typography>
                                </Box>
                              </Stack>
                            ) : party ? (
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Avatar
                                  src={party.profileImage ?? undefined}
                                  sx={{ width: 32, height: 32 }}
                                >
                                  {party.firstName?.[0]}{party.lastName?.[0]}
                                </Avatar>
                                <Box>
                                  <Typography
                                    variant="body2"
                                    sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                                    onClick={() => setProfileParty(party)}
                                  >
                                    {party.firstName} {party.lastName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {party.email}
                                  </Typography>
                                </Box>
                              </Stack>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>{t.id.slice(-9)}</TableCell>
                          <TableCell>{formatTransactionDate(t.occurredAt ?? t.createdAt)}</TableCell>
                          <TableCell>
                            {isRefund(t) ? (
                              <Chip label="Initiated Refund" size="small" color="error" variant="outlined" />
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>{commissionDisplay(t)}</TableCell>
                          <TableCell align="right" sx={{ color: t.direction === "credit" ? "success.main" : "text.primary" }}>
                            {formatAmount(t)}
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" color="primary" onClick={() => setViewTransaction(t)} title="View">
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {tab === 1 && (
        <CommissionManagementTab />
      )}

      <Modal open={!!viewTransaction} onClose={() => setViewTransaction(null)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "95%", sm: 720 },
            maxWidth: "95vw",
            maxHeight: "90vh",
            overflow: "auto",
            bgcolor: "background.paper",
            boxShadow: 24,
            borderRadius: 3,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {viewTransaction && (() => {
            const isPlatform = viewTransaction.role === "platform";
            const party = isPlatform
              ? null
              : (viewTransaction.role === "instructor" && viewTransaction.instructor
                  ? viewTransaction.instructor
                  : (viewTransaction.student ?? viewTransaction.instructor ?? null));
            const isRefundTx = viewTransaction.type === "refund";
            const dateStr = formatTransactionDate(viewTransaction.occurredAt ?? viewTransaction.createdAt);
            return (
              <>
                <Stack direction={{ xs: "column", md: "row" }} sx={{ flex: 1, minHeight: 0 }}>
                  {/* Left: User / Profile or Platform */}
                  <Box
                    sx={{
                      width: { xs: "100%", md: 280 },
                      flexShrink: 0,
                      p: 3,
                      bgcolor: "grey.50",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
     
                      textAlign: "center",
                      borderRight: { xs: "none", md: "1px solid" },
                      borderColor: { md: "divider" },
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={700} color="text.primary" sx={{ mb: 2, alignSelf: "flex-start" }}>
                      {isPlatform ? "Transaction party" : "My Profile"}
                    </Typography>
                    {isPlatform ? (
                      <>
                        <Avatar
                          sx={{ width: 100, height: 100, mb: 1.5, border: "3px solid", borderColor: "primary.main", bgcolor: "primary.main" }}
                        >
                          <AccountBalanceIcon sx={{ fontSize: 48 }} />
                        </Avatar>
                        <Typography variant="h6" fontWeight={600}>Platform</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Commission / admin</Typography>
                      </>
                    ) : party ? (
                      <>
                        <Avatar
                          src={party.profileImage ?? undefined}
                          sx={{ width: 100, height: 100, mb: 1.5, border: "3px solid",
                            borderColor: "primary.main", bgcolor: "primary.light" }}
                        >
                          {party.firstName?.[0]}{party.lastName?.[0]}
                        </Avatar>
                        <Typography variant="h6" fontWeight={600}>{party.firstName} {party.lastName}</Typography>
                        {party.location && (
                          <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} sx={{ mt: 0.5 }}>
                            <PlaceIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                            <Typography variant="body2" color="text.secondary">{party.location}</Typography>
                          </Stack>
                        )}
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{party.email}</Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">No user linked to this transaction</Typography>
                    )}
                  </Box>

                  {/* Right: Payment Details */}
                  <Box sx={{ flex: 1, p: 3, display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                        Payment Details
                      </Typography>
                      <Chip
                        size="small"
                        label={isRefundTx ? "Initiated Refund" : viewTransaction.status}
                        color={isRefundTx ? "error" : viewTransaction.status === "succeeded" ? "success" : "default"}
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </Stack>

                    <Stack spacing={2}>
                      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 1, px: 1.5, bgcolor: "action.hover", borderRadius: 2 }}>
                        <CreditCardIcon sx={{ color: "primary.main", fontSize: 28 }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">Payment method</Typography>
                          <Typography variant="body2" fontWeight={500}>Credit card · ****</Typography>
                        </Box>
                      </Stack>

                      <Stack spacing={1.5}>
                        <DetailRow icon={<FingerprintIcon sx={{ fontSize: 20, color: "text.secondary" }} />} label="Transaction ID" value={viewTransaction.id} />
                        <DetailRow icon={<CategoryIcon sx={{ fontSize: 20, color: "text.secondary" }} />} label="Type" value={viewTransaction.type} />
                        <DetailRow icon={<InfoIcon sx={{ fontSize: 20, color: "text.secondary" }} />} label="Role" value={viewTransaction.role} />
                        <DetailRow icon={<AttachMoneyIcon sx={{ fontSize: 20, color: "text.secondary" }} />} label="Amount" value={formatAmount(viewTransaction)} valueColor={viewTransaction.direction === "credit" ? "success.main" : undefined} />
                        <DetailRow icon={<CalendarTodayIcon sx={{ fontSize: 20, color: "text.secondary" }} />} label="Date" value={dateStr} />
                        <DetailRow icon={<ReceiptLongIcon sx={{ fontSize: 20, color: "text.secondary" }} />} label="Status" value={viewTransaction.status} />
                      </Stack>

                      {viewTransaction.description && (
                        <Box sx={{ mt: 1, p: 1.5, bgcolor: "grey.50", borderRadius: 2 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>Description</Typography>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>{viewTransaction.description}</Typography>
                        </Box>
                      )}
                    </Stack>

                    <Button
                      variant="contained"
                      onClick={() => setViewTransaction(null)}
                      sx={{ mt: 3, alignSelf: "flex-start", borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                    >
                      Close
                    </Button>
                  </Box>
                </Stack>
              </>
            );
          })()}
        </Box>
      </Modal>

      <Modal open={!!profileParty} onClose={() => setProfileParty(null)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 320,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 3,
            borderRadius: 2,
          }}
        >
          {profileParty && (
            <>
              <Typography variant="subtitle1" gutterBottom>My Profile</Typography>
              <Stack alignItems="center" spacing={1}>
                <Avatar src={profileParty.profileImage ?? undefined} sx={{ width: 80, height: 80 }}>
                  {profileParty.firstName?.[0]}{profileParty.lastName?.[0]}
                </Avatar>
                <Typography variant="h6">{profileParty.firstName} {profileParty.lastName}</Typography>
                {profileParty.location && (
                  <Typography variant="body2" color="text.secondary">{profileParty.location}</Typography>
                )}
              </Stack>
              <Button variant="outlined" onClick={() => setProfileParty(null)} sx={{ mt: 2 }} fullWidth>Close</Button>
            </>
          )}
        </Box>
      </Modal>
    </Box>
  );
}

function CommissionManagementTab() {
  const { data, loading } = useQuery(GET_PLATFORM_COMMISSION_SETTINGS, { fetchPolicy: "network-only" });
  const [updateSettings, { loading: updating }] = useMutation(UPDATE_PLATFORM_COMMISSION_SETTINGS, {
    refetchQueries: [{ query: GET_PLATFORM_COMMISSION_SETTINGS }],
  });

  const settings: CommissionSettings | null = data?.getPlatformCommissionSettings ?? null;
  const [commissionType, setCommissionType] = useState<string>("percentage");
  const [commissionValue, setCommissionValue] = useState<string>("20");
  const [minFare, setMinFare] = useState<string>("");
  const [maxFare, setMaxFare] = useState<string>("");
  const [payoutMethods, setPayoutMethods] = useState<string[]>(["Stripe"]);

  React.useEffect(() => {
    if (!settings) return;
    setCommissionType(settings.defaultType ?? "percentage");
    setCommissionValue(String(settings.defaultRate ?? 20));
    setMinFare(settings.minFare != null ? String(settings.minFare) : "");
    setMaxFare(settings.maxFare != null ? String(settings.maxFare) : "");
    setPayoutMethods(Array.isArray(settings.payoutMethods) && settings.payoutMethods.length ? settings.payoutMethods : ["Stripe"]);
  }, [settings]);

  const handleSave = async () => {
    const numVal = parseFloat(commissionValue);
    await updateSettings({
      variables: {
        input: {
          defaultType: commissionType,
          defaultRate: commissionType === "percentage" ? (Number.isFinite(numVal) ? numVal : 20) : (settings?.defaultRate ?? 20),
          defaultFixedAmount: commissionType === "amount" ? (Number.isFinite(numVal) ? numVal : 0) : (settings?.defaultFixedAmount ?? 0),
          minFare: minFare === "" ? null : parseFloat(minFare),
          maxFare: maxFare === "" ? null : parseFloat(maxFare),
          payoutMethods,
        },
      },
    });
  };

  if (loading && !data) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper
      sx={{
        p: 4,
        px: 5,
        width: "100%",
        maxWidth: 720,
        borderRadius: 3,
        boxShadow: 3,
      }}
    >
      <Typography variant="h6" gutterBottom>
        Commission Management
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure how commission is split between the platform and instructors.
      </Typography>
      <Stack spacing={2.5}>
        <FormControl
          fullWidth
          size="small"
          sx={{
            "& .MuiOutlinedInput-root": {
              paddingTop: 0,
              paddingBottom: 0,
            },
            "& .MuiSelect-select": {
              paddingTop: "14px",
              paddingBottom: "14px",
            },
          }}
        >
          <InputLabel>Commission Type</InputLabel>
          <Select
            value={commissionType}
            label="Commission Type"
            onChange={(e) => setCommissionType(e.target.value)}
          >
            <MenuItem value="percentage">Percentage</MenuItem>
            <MenuItem value="amount">Amount</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Commission Value"
          fullWidth
          type="number"
          value={commissionValue}
          onChange={(e) => setCommissionValue(e.target.value)}
          inputProps={commissionType === "percentage" ? { min: 0, max: 100 } : { min: 0 }}
          sx={{
            "& .MuiInputBase-input": {
              padding: "14px !important", // override the shorthand directly
            },
          }}
        />
        <TextField
          label="Payout Methods"
          fullWidth
          value={payoutMethods.join(", ")}
          onChange={(e) =>
            setPayoutMethods(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          placeholder="e.g. Stripe"
   sx={{
    "& .MuiInputBase-input": {
      padding: "14px !important", // override the shorthand directly
    },
  }}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5}>
          <TextField
            label="Min Fare"
            type="number"
            value={minFare}
            onChange={(e) => setMinFare(e.target.value)}
            inputProps={{ min: 0 }}
            fullWidth
            sx={{
              "& .MuiInputBase-input, & .MuiOutlinedInput-input": {
                padding: "14px !important", // override the shorthand directly

              },
            }}
          />
          <TextField
            label="Max Fare"
            type="number"
            value={maxFare}
            onChange={(e) => setMaxFare(e.target.value)}
            inputProps={{ min: 0 }}
            fullWidth
            sx={{
              "& .MuiInputBase-input, & .MuiOutlinedInput-input": {
                padding: "14px !important", // override the shorthand directly
          
              },
            }}
          />
        </Stack>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={updating}
          sx={{ mt: 1, py: 1.4, fontWeight: 600, letterSpacing: 0.5, alignSelf: "flex-start", minWidth: 180 }}
        >
          {updating ? "Saving..." : "Save"}
        </Button>
      </Stack>
    </Paper>
  );
}
