import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItemButton,
  Popover,
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
  Star,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  GET_NOTIFICATIONS,
  GET_UNREAD_NOTIFICATION_COUNT,
  MARK_ALL_NOTIFICATIONS_READ,
  MARK_NOTIFICATION_READ,
} from "../../graphql/Queries/productCapabilities";

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

const icons: Record<string, typeof Bell> = {
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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const basePath = user?.role === "Instructor"
    ? "/teacher-dashboard"
    : user?.role === "Admin"
      ? "/admin-dashboard"
      : "/student-dashboard";
  const { data, loading } = useQuery(GET_NOTIFICATIONS, {
    variables: { limit: 6 },
    pollInterval: 60000,
  });
  const { data: countData } = useQuery(GET_UNREAD_NOTIFICATION_COUNT, { pollInterval: 60000 });
  const [markRead] = useMutation(MARK_NOTIFICATION_READ, {
    refetchQueries: [GET_NOTIFICATIONS, GET_UNREAD_NOTIFICATION_COUNT],
  });
  const [markAll] = useMutation(MARK_ALL_NOTIFICATIONS_READ, {
    refetchQueries: [GET_NOTIFICATIONS, GET_UNREAD_NOTIFICATION_COUNT],
  });
  const notifications = (data?.notifications || []) as NotificationItem[];
  const unreadCount = Number(countData?.unreadNotificationCount || 0);

  const openNotification = async (notification: NotificationItem) => {
    if (!notification.readAt) await markRead({ variables: { notificationId: notification.id } });
    setAnchorEl(null);
    if (notification.entityType === "booking" && notification.entityId) {
      navigate(user?.role === "Instructor" || user?.role === "Admin" ? `${basePath}/bookingManagement` : `${basePath}/lesson/${notification.entityId}`);
    } else if (notification.type.includes("message")) {
      navigate(`${basePath}/chat`);
    } else if (notification.type.includes("review") || notification.type.includes("feedback")) {
      navigate(`${basePath}/reviews`);
    }
  };

  return (
    <>
      <IconButton
        className="dsp-notification-bell"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        onClick={(event) => setAnchorEl(event.currentTarget)}
      >
        <Badge badgeContent={unreadCount} max={99} className="dsp-notification-bell__badge">
          <Bell size={19} />
        </Badge>
      </IconButton>
      <Popover
        className="dsp-notification-popover"
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box className="dsp-notification-popover__body">
          <Box className="dsp-notification-popover__header">
            <Box>
              <Typography component="h2">Notifications</Typography>
              <Typography component="p">{unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "You’re all caught up"}</Typography>
            </Box>
            <IconButton size="small" aria-label="Mark all notifications read" disabled={!unreadCount} onClick={() => markAll()}>
              <CheckCheck size={17} />
            </IconButton>
          </Box>
          <Divider />
          {loading && !data ? (
            <Box className="dsp-notification-popover__state"><CircularProgress size={22} /></Box>
          ) : notifications.length === 0 ? (
            <Box className="dsp-notification-popover__empty">
              <span><Bell size={20} /></span>
              <Typography component="strong">No new updates</Typography>
              <Typography component="p">Important lesson and payment activity will appear here.</Typography>
            </Box>
          ) : (
            <List className="dsp-notification-popover__list" disablePadding>
              {notifications.map((notification) => {
                const Icon = icons[notification.type] || Bell;
                return (
                  <ListItemButton
                    key={notification.id}
                    className={`dsp-notification-popover__item ${!notification.readAt ? "is-unread" : ""}`}
                    onClick={() => openNotification(notification)}
                    alignItems="flex-start"
                  >
                    <span className="dsp-notification-popover__icon"><Icon size={16} /></span>
                    <Box className="dsp-notification-popover__copy">
                      <Typography component="strong">{notification.title}</Typography>
                      <Typography component="p">{notification.body}</Typography>
                      <Typography component="time">{formatDate(notification.createdAt)}</Typography>
                    </Box>
                    <ArrowUpRight className="dsp-notification-popover__arrow" size={15} />
                  </ListItemButton>
                );
              })}
            </List>
          )}
          <Divider />
          <Box className="dsp-notification-popover__footer">
            <Button onClick={() => { setAnchorEl(null); navigate(`${basePath}/notifications`); }} endIcon={<ArrowUpRight size={15} />}>
              View all notifications
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
}
