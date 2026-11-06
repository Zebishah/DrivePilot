import { useMutation, useQuery } from "@apollo/client";
import { Alert, Box, CircularProgress, FormControlLabel, Paper, Switch, Typography } from "@mui/material";
import { useState } from "react";
import { GET_NOTIFICATION_PREFERENCES, UPDATE_NOTIFICATION_PREFERENCES } from "../../../graphql/Queries/productCapabilities";

const labels: Record<string, string> = { bookingUpdates: "Booking updates", lessonReminders: "Lesson reminders", messages: "Messages", paymentUpdates: "Payment and refund updates", feedbackNotifications: "Feedback notifications", emailNotifications: "Email notifications", reviews: "Reviews", documentStatus: "Document status" };
export default function NotificationPreferencesPage() {
  const { data, loading, error } = useQuery(GET_NOTIFICATION_PREFERENCES);
  const [update] = useMutation(UPDATE_NOTIFICATION_PREFERENCES);
  const [saving, setSaving] = useState<string | null>(null);
  if (loading) return <Box sx={{ p: 5, textAlign: "center" }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ p: 4 }}><Alert severity="error">Notification preferences could not be loaded.</Alert></Box>;
  const preferences = data?.notificationPreferences || {};
  const change = async (key: string, value: boolean) => { setSaving(key); try { await update({ variables: { input: { [key]: value } }, optimisticResponse: { updateNotificationPreferences: { __typename: "NotificationPreferences", ...preferences, [key]: value } } }); } finally { setSaving(null); } };
  return <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 820, mx: "auto" }}><Typography sx={{ color: "secondary.main", fontWeight: 800, letterSpacing: 1, fontSize: 12 }}>ACCOUNT SETTINGS</Typography><Typography variant="h4" sx={{ fontWeight: 800 }}>Notification preferences</Typography><Typography color="text.secondary" sx={{ mb: 3 }}>Choose which updates appear in your notification center and inbox.</Typography><Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>{Object.entries(labels).map(([key, label]) => <Box key={key} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}><FormControlLabel control={<Switch checked={preferences[key] !== false} disabled={saving === key} onChange={(event) => change(key, event.target.checked)} />} label={<Box><Typography fontWeight={700}>{label}</Typography><Typography variant="body2" color="text.secondary">{key === "emailNotifications" ? "Uses email delivery when that channel is available." : "Show this update in your shared notification center."}</Typography></Box>} /></Box>)}</Paper></Box>;
}
