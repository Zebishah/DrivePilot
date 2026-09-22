const { AuthenticationError, ForbiddenError, UserInputError } = require("apollo-server-express");
const mongoose = require("mongoose");
const Notification = require("../../models/Notification");
const FavoriteInstructor = require("../../models/FavoriteInstructor");
const BookingEvent = require("../../models/BookingEvent");
const StudentBooking = require("../../models/studentBooking.model");
const { User, Student, Instructor } = require("../../models/User");
const { requireRole, requireBookingParticipantOrAdmin, requireStudentDataAccess } = require("../../utils/authorization");

const preferenceKeys = [
  "bookingUpdates", "lessonReminders", "messages", "paymentUpdates",
  "feedbackNotifications", "emailNotifications", "reviews", "documentStatus",
];

function auth(user) {
  if (!user?.id) throw new AuthenticationError("Not authenticated");
  return user;
}

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function preferences(value = {}) {
  return Object.fromEntries(preferenceKeys.map((key) => [key, value[key] !== false]));
}

async function findBookingForParticipant(bookingId, user) {
  auth(user);
  if (!mongoose.Types.ObjectId.isValid(bookingId)) throw new UserInputError("Invalid booking id");
  const booking = await StudentBooking.findById(bookingId)
    .populate("studentId", "_id firstName lastName email profileImage phone location description")
    .populate("instructorId", "_id firstName lastName email profileImage phone location description experience carName transmissionType")
    .lean();
  if (!booking) throw new UserInputError("Booking not found");
  requireBookingParticipantOrAdmin(user, booking);
  return booking;
}

const resolver = {
  NotificationItem: {
    id: (parent) => parent._id?.toString() || parent.id,
    readAt: (parent) => iso(parent.readAt),
    createdAt: (parent) => iso(parent.createdAt),
  },
  FavoriteInstructor: {
    id: (parent) => parent._id?.toString() || parent.id,
    createdAt: (parent) => iso(parent.createdAt),
    instructor: (parent) => parent.instructorId,
  },
  BookingEventItem: {
    id: (parent) => parent._id?.toString() || parent.id,
    occurredAt: (parent) => iso(parent.createdAt),
  },
  StudentLearningTimelineItem: {
    id: (parent) => parent._id?.toString() || parent.id,
    occurredAt: (parent) => iso(parent.createdAt || parent.occurredAt),
  },
  NotificationPreferences: {
    bookingUpdates: (parent) => parent.bookingUpdates !== false,
    lessonReminders: (parent) => parent.lessonReminders !== false,
    messages: (parent) => parent.messages !== false,
    paymentUpdates: (parent) => parent.paymentUpdates !== false,
    feedbackNotifications: (parent) => parent.feedbackNotifications !== false,
    emailNotifications: (parent) => parent.emailNotifications !== false,
    reviews: (parent) => parent.reviews !== false,
    documentStatus: (parent) => parent.documentStatus !== false,
  },
  Query: {
    notifications: async (_, { limit = 30, unreadOnly = false }, { user }) => {
      auth(user);
      const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
      const query = { recipientUserId: user.id };
      if (unreadOnly) query.readAt = null;
      return Notification.find(query).sort({ createdAt: -1 }).limit(safeLimit).lean();
    },
    unreadNotificationCount: async (_, __, { user }) => {
      auth(user);
      return Notification.countDocuments({ recipientUserId: user.id, readAt: null });
    },
    notificationPreferences: async (_, __, { user }) => {
      auth(user);
      const current = await User.findById(user.id).select("notificationPreferences").lean();
      return preferences(current?.notificationPreferences);
    },
    favoriteInstructors: async (_, __, { user }) => {
      requireRole(user, "Student");
      return FavoriteInstructor.find({ studentId: user.id })
        .populate("instructorId")
        .sort({ createdAt: -1 })
        .lean();
    },
    isInstructorFavorite: async (_, { instructorId }, { user }) => {
      requireRole(user, "Student");
      return !!(await FavoriteInstructor.exists({ studentId: user.id, instructorId }));
    },
    getBookingDetail: async (_, { bookingId }, { user }) => findBookingForParticipant(bookingId, user),
    getBookingTimeline: async (_, { bookingId }, { user }) => {
      await findBookingForParticipant(bookingId, user);
      return BookingEvent.find({ bookingId }).sort({ createdAt: 1 }).lean();
    },
    getStudentLearningTimeline: async (_, { limit = 80 }, { user }) => {
      requireRole(user, "Student");
      const safeLimit = Math.min(Math.max(Number(limit) || 80, 1), 200);
      const bookings = await StudentBooking.find({ studentId: user.id })
        .select("_id slots")
        .lean();
      const bookingIds = bookings.map((booking) => booking._id);
      if (!bookingIds.length) return [];
      const slotsById = new Map();
      for (const booking of bookings) {
        for (const slot of booking.slots || []) {
          slotsById.set(`${booking._id}:${slot._id}`, slot);
        }
      }
      const events = await BookingEvent.find({ bookingId: { $in: bookingIds } })
        .sort({ createdAt: -1, _id: -1 })
        .limit(safeLimit)
        .lean();
      return events.map((event) => {
        const slot = event.slotId ? slotsById.get(`${event.bookingId}:${event.slotId}`) : null;
        return {
          ...event,
          title: String(event.eventType || "update").replaceAll("_", " "),
          slotDate: slot?.date || event.metadata?.newDate || null,
          startTime: slot?.startTime || event.metadata?.newStartTime || null,
          endTime: slot?.endTime || event.metadata?.newEndTime || null,
        };
      });
    },
    getInstructorStudentDetail: async (_, { studentId }, { user }) => {
      requireRole(user, "Instructor", "Admin");
      await requireStudentDataAccess(user, studentId);
      const student = await Student.findById(studentId).lean();
      if (!student) throw new UserInputError("Student not found");
      const query = user.role === "Admin"
        ? { studentId }
        : { studentId, instructorId: user.id };
      const bookings = await StudentBooking.find(query)
        .populate("studentId", "_id firstName lastName email profileImage phone location description")
        .populate("instructorId", "_id firstName lastName email profileImage")
        .sort({ createdAt: -1 })
        .lean();
      const completedLessons = bookings.reduce((count, booking) => count + (booking.slots || []).filter((slot) => slot.status === "completed").length, 0);
      const upcomingLessons = bookings.reduce((count, booking) => count + (booking.slots || []).filter((slot) => ["booked", "confirmed"].includes(slot.status)).length, 0);
      return {
        student: { ...student, _id: student._id },
        totalLessons: bookings.reduce((count, booking) => count + (booking.slots || []).length, 0),
        completedLessons,
        upcomingLessons,
        historyBookings: bookings,
      };
    },
  },
  Mutation: {
    markNotificationRead: async (_, { notificationId }, { user }) => {
      auth(user);
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipientUserId: user.id, readAt: null },
        { $set: { readAt: new Date() } },
        { new: true },
      ) || await Notification.findOne({ _id: notificationId, recipientUserId: user.id });
      if (!notification) throw new UserInputError("Notification not found");
      return notification;
    },
    markAllNotificationsRead: async (_, __, { user }) => {
      auth(user);
      const result = await Notification.updateMany({ recipientUserId: user.id, readAt: null }, { $set: { readAt: new Date() } });
      return result.modifiedCount || 0;
    },
    saveInstructor: async (_, { instructorId }, { user }) => {
      requireRole(user, "Student");
      if (!mongoose.Types.ObjectId.isValid(instructorId) || !(await Instructor.exists({ _id: instructorId }))) throw new UserInputError("Instructor not found");
      try {
        return await FavoriteInstructor.findOneAndUpdate(
          { studentId: user.id, instructorId },
          { $setOnInsert: { studentId: user.id, instructorId } },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        ).populate("instructorId");
      } catch (error) {
        if (error?.code === 11000) return FavoriteInstructor.findOne({ studentId: user.id, instructorId }).populate("instructorId");
        throw error;
      }
    },
    unsaveInstructor: async (_, { instructorId }, { user }) => {
      requireRole(user, "Student");
      await FavoriteInstructor.deleteOne({ studentId: user.id, instructorId });
      return true;
    },
    updateNotificationPreferences: async (_, { input }, { user }) => {
      auth(user);
      const updates = {};
      for (const key of preferenceKeys) if (input[key] !== undefined) updates[`notificationPreferences.${key}`] = Boolean(input[key]);
      const current = await User.findByIdAndUpdate(user.id, { $set: updates }, { new: true }).select("notificationPreferences").lean();
      return preferences(current?.notificationPreferences);
    },
  },
};

module.exports = resolver;
