import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  Paper,
  Typography,
} from "@mui/material";
import {
  ArrowUpRight,
  Bell,
  CalendarCheck2,
  CheckCheck,
  CreditCard,
  FileText,
  MessageCircle,
  Settings2,
  Star,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import {
  GET_NOTIFICATIONS,
  GET_UNREAD_NOTIFICATION_COUNT,
  MARK_ALL_NOTIFICATIONS_READ,
  MARK_NOTIFICATION_READ,
} from "../../../graphql/Queries/productCapabilities";

type NotificationFilter = "all" | "unread";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  entityType?: string | null;
  entityId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

const iconByType = {
  booking_created: CalendarCheck2,
  booking_confirmed: CalendarCheck2,
  booking_cancelled: CalendarCheck2,
  reschedule_requested: CalendarCheck2,
  reschedule_accepted: CalendarCheck2,
  reschedule_rejected: CalendarCheck2,
  lesson_completed: CalendarCheck2,
  lesson_no_show: CalendarCheck2,
  lesson_reminder: CalendarCheck2,
  lesson_completion_reminder: CalendarCheck2,
  payment_completed: WalletCards,
  refund_issued: CreditCard,
  feedback_received: Star,
  review_received: Star,
  document_status: FileText,
  message_received: MessageCircle,
};

const toneByType: Record<string, string> = {
  booking_created: "is-purple",
  booking_confirmed: "is-green",
  booking_cancelled: "is-coral",
  reschedule_requested: "is-amber",
  reschedule_accepted: "is-green",
  reschedule_rejected: "is-coral",
  lesson_completed: "is-blue",
  lesson_no_show: "is-amber",
  lesson_reminder: "is-blue",
  lesson_completion_reminder: "is-blue",
  payment_completed: "is-green",
  refund_issued: "is-purple",
  feedback_received: "is-amber",
  review_received: "is-amber",
  document_status: "is-blue",
  message_received: "is-purple",
};

function formatNotificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function NotificationCenterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const basePath = user?.role === "Instructor"
    ? "/teacher-dashboard"
    : user?.role === "Admin"
      ? "/admin-dashboard"
      : "/student-dashboard";
  const { data, loading, error } = useQuery(GET_NOTIFICATIONS, {
    variables: { limit: 60, unreadOnly: filter === "unread" },
    fetchPolicy: "cache-and-network",
    pollInterval: 60000,
  });
  const { data: countData } = useQuery(GET_UNREAD_NOTIFICATION_COUNT, {
    pollInterval: 60000,
  });
  const [markRead] = useMutation(MARK_NOTIFICATION_READ, {
    refetchQueries: [GET_NOTIFICATIONS, GET_UNREAD_NOTIFICATION_COUNT],
  });
  const [markAll] = useMutation(MARK_ALL_NOTIFICATIONS_READ, {
    refetchQueries: [GET_NOTIFICATIONS, GET_UNREAD_NOTIFICATION_COUNT],
  });

  const notifications = (data?.notifications || []) as NotificationItem[];
  const unreadCount = Number(countData?.unreadNotificationCount || 0);
  const iconCount = notifications.length;

  const goToNotification = async (notification: NotificationItem) => {
    if (!notification.readAt) {
      await markRead({ variables: { notificationId: notification.id } });
    }

    if (notification.entityType === "booking" && notification.entityId) {
      navigate(user?.role === "Instructor" ? `${basePath}/bookingManagement` : user?.role === "Admin" ? `${basePath}/bookingManagement` : `${basePath}/lesson/${notification.entityId}`);
      return;
    }
    if (notification.type.includes("message")) {
      navigate(`${basePath}/chat`);
      return;
    }
    if (notification.type.includes("document")) {
      navigate(user?.role === "Admin" ? `${basePath}/documentsManagement` : `${basePath}/documents`);
      return;
    }
    if (notification.type.includes("payment") || notification.type.includes("refund")) {
      navigate(user?.role === "Instructor" ? `${basePath}/payment-management` : user?.role === "Admin" ? `${basePath}/transactions` : `${basePath}/payment-history`);
      return;
    }
    if (notification.type.includes("review") || notification.type.includes("feedback")) {
      navigate(`${basePath}/reviews`);
    }
  };

  return (
    <Box className="dsp-notification-page">
      <Box className="dsp-notification-page__content">
        <Box className="dsp-notification-page__header">
          <Box>
            <span className="dsp-notification-page__eyebrow">Account activity</span>
            <Typography component="h1">Notifications</Typography>
            <Typography component="p">Review booking, lesson, payment, and account updates in one place.</Typography>
          </Box>
          <Button
            className="dsp-notification-page__settings"
            variant="outlined"
            startIcon={<Settings2 size={16} />}
            onClick={() => navigate(`${basePath}/notification-settings`)}
          >
            Notification settings
          </Button>
        </Box>

        <Box className="dsp-notification-page__summary">
          <Paper className="dsp-notification-page__summary-card is-purple">
            <span className="dsp-notification-page__summary-icon"><Bell size={18} /></span>
            <span>All notifications</span>
            <strong>{iconCount}</strong>
            <small>Updates currently loaded</small>
          </Paper>
          <Paper className="dsp-notification-page__summary-card is-coral">
            <span className="dsp-notification-page__summary-icon"><CheckCheck size={18} /></span>
            <span>Unread updates</span>
            <strong>{unreadCount}</strong>
            <small>Ready for your attention</small>
          </Paper>
        </Box>

        <Paper className="dsp-notification-page__panel">
          <Box className="dsp-notification-page__toolbar">
            <Box>
              <Typography component="h2">Your notification center</Typography>
              <Typography component="p">Stay informed without leaving your workspace.</Typography>
            </Box>
            <Button
              className="dsp-notification-page__mark-all"
              variant="text"
              startIcon={<CheckCheck size={16} />}
              disabled={unreadCount === 0}
              onClick={() => markAll()}
            >
              Mark all as read
            </Button>
          </Box>
          <Divider />
          <Box className="dsp-notification-page__filters" role="tablist" aria-label="Notification filters">
            {(["all", "unread"] as NotificationFilter[]).map((value) => (
              <Button
                key={value}
                className={filter === value ? "is-active" : ""}
                role="tab"
                aria-selected={filter === value}
                onClick={() => setFilter(value)}
              >
                {value === "all" ? "All updates" : `Unread${unreadCount ? ` (${unreadCount})` : ""}`}
              </Button>
            ))}
          </Box>

          {loading && !data ? (
            <Box className="dsp-notification-page__state"><CircularProgress size={28} /></Box>
          ) : error ? (
            <Box className="dsp-notification-page__state"><Alert severity="error">Notifications could not be loaded right now.</Alert></Box>
          ) : notifications.length === 0 ? (
            <Box className="dsp-notification-page__empty">
              <span><Bell size={24} /></span>
              <Typography component="h3">You’re all caught up</Typography>
              <Typography component="p">New updates will appear here as your lessons and payments change.</Typography>
            </Box>
          ) : (
            <List className="dsp-notification-page__list" disablePadding>
              {notifications.map((notification) => {
                const Icon = iconByType[notification.type as keyof typeof iconByType] || Bell;
                const tone = toneByType[notification.type] || "is-purple";
                return (
                  <ListItemButton
                    key={notification.id}
                    className={`dsp-notification-page__item ${!notification.readAt ? "is-unread" : ""}`}
                    onClick={() => goToNotification(notification)}
                    alignItems="flex-start"
                  >
                    <span className={`dsp-notification-page__item-icon ${tone}`}><Icon size={18} /></span>
                    <Box className="dsp-notification-page__item-copy">
                      <Box className="dsp-notification-page__item-heading">
                        <Typography component="h3">{notification.title}</Typography>
                        {!notification.readAt && <Chip label="New" size="small" />}
                      </Box>
                      <Typography component="p">{notification.body}</Typography>
                      <Typography component="time">{formatNotificationDate(notification.createdAt)}</Typography>
                    </Box>
                    <ArrowUpRight className="dsp-notification-page__item-arrow" size={17} />
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
