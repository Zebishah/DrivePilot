const Notification = require("../models/Notification");
const { User } = require("../models/User");

const preferenceForNotification = {
  booking_created: "bookingUpdates",
  booking_confirmed: "bookingUpdates",
  booking_cancelled: "bookingUpdates",
  booking_status_updated: "bookingUpdates",
  reschedule_requested: "bookingUpdates",
  reschedule_accepted: "bookingUpdates",
  reschedule_rejected: "bookingUpdates",
  lesson_completed: "bookingUpdates",
  lesson_no_show: "bookingUpdates",
  lesson_reminder: "lessonReminders",
  payment_completed: "paymentUpdates",
  refund_issued: "paymentUpdates",
  feedback_received: "feedbackNotifications",
  review_received: "reviews",
  review_submitted: "reviews",
  document_status: "documentStatus",
  message_received: "messages",
};

async function getPreference(recipientUserId, preferenceKey) {
  if (!preferenceKey) return true;
  const user = await User.findById(recipientUserId)
    .select("notificationPreferences")
    .lean();
  return user?.notificationPreferences?.[preferenceKey] !== false;
}

/**
 * Persist one in-product notification. The dedupe key is deliberately
 * supplied by the caller so retries are safe and domain-specific.
 */
async function createNotification({
  recipientUserId,
  type,
  title,
  body,
  entityType,
  entityId,
  dedupeKey,
  metadata = {},
  preferenceKey = preferenceForNotification[type],
  session,
}) {
  if (!recipientUserId || !type || !title || !body || !dedupeKey) return null;
  if (!(await getPreference(recipientUserId, preferenceKey))) return null;

  const notification = new Notification({
    recipientUserId,
    type,
    title,
    body,
    entityType,
    entityId: entityId == null ? undefined : String(entityId),
    dedupeKey,
    metadata,
  });

  try {
    await notification.save(session ? { session } : undefined);
    return notification;
  } catch (error) {
    if (error?.code !== 11000) throw error;
    const existingQuery = Notification.findOne({ dedupeKey });
    if (session) existingQuery.session(session);
    return existingQuery;
  }
}

module.exports = { createNotification, getPreference, preferenceForNotification };
