const {
  AuthenticationError,
  ForbiddenError,
} = require("apollo-server-express");
const mongoose = require("mongoose");
const Transaction = require("../../models/transaction.model");
const { Admin, User } = require("../../models/User");
const StudentBooking = require("../../models/studentBooking.model");

function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (mongoose.Types.ObjectId.isValid(id))
    return new mongoose.Types.ObjectId(id);
  return null;
}

function toIsoString(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

function formatLessonSummary(slot) {
  if (!slot?.date) return null;
  try {
    const start = slot.startTime || slot.time || null;
    const end = slot.endTime || null;
    const d = new Date(`${slot.date}T${start || "12:00"}`);
    const dateLabel = Number.isNaN(d.getTime())
      ? slot.date
      : d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
    if (start && end) {
      return `${dateLabel} · ${start} – ${end}`;
    }
    if (start) {
      return `${dateLabel} · ${start}`;
    }
    return dateLabel;
  } catch {
    return slot.date;
  }
}

async function toTransactionParty(userDoc) {
  if (!userDoc) return null;
  const id = userDoc._id?.toString() || userDoc.id;
  return {
    id,
    firstName: userDoc.firstName ?? "",
    lastName: userDoc.lastName ?? "",
    email: userDoc.email ?? "",
    profileImage: userDoc.profileImage ?? null,
    location: userDoc.location ?? userDoc.address ?? null,
  };
}

function buildAdminTransactionQuery(filter = {}) {
  const query = {};
  if (filter.type) query.type = filter.type;
  if (filter.role) query.role = filter.role;
  if (filter.status) query.status = filter.status;
  if (filter.instructorId) query.instructorId = filter.instructorId;
  if (filter.studentId) query.studentId = filter.studentId;
  if (filter.bookingId) query.bookingId = filter.bookingId;
  if (filter.from || filter.to) {
    query.occurredAt = {};
    if (filter.from) query.occurredAt.$gte = new Date(filter.from);
    if (filter.to) query.occurredAt.$lte = new Date(filter.to);
  }
  return query;
}

const transactionResolver = {
  Transaction: {
    id: (parent) => parent._id?.toString() || parent.id,
    occurredAt: (parent) => toIsoString(parent.occurredAt),
    createdAt: (parent) =>
      toIsoString(parent.createdAt) ??
      (parent.createdAt ? String(parent.createdAt) : ""),
    updatedAt: (parent) =>
      toIsoString(parent.updatedAt) ??
      (parent.updatedAt ? String(parent.updatedAt) : ""),
    lessonSummary: async (parent) => {
      if (!parent.bookingId) return null;
      const booking = await StudentBooking.findById(parent.bookingId)
        .select("slots")
        .lean();
      if (
        !booking ||
        !Array.isArray(booking.slots) ||
        booking.slots.length === 0
      )
        return null;
      let slot = null;
      if (parent.slotId) {
        const targetId = parent.slotId.toString();
        slot =
          booking.slots.find(
            (s) => s._id && s._id.toString && s._id.toString() === targetId,
          ) || null;
      }
      if (!slot) {
        // Fallback: use first slot
        slot = booking.slots[0];
      }
      return formatLessonSummary(slot);
    },
    student: async (parent) => {
      let id = parent.studentId;
      if (!id && parent.bookingId) {
        const booking = await StudentBooking.findById(parent.bookingId)
          .select("studentId")
          .lean();
        id = booking?.studentId;
      }
      id = id?._id ?? id; // handle populated ref
      if (!id) return null;
      const u = await User.findById(id).lean();
      return toTransactionParty(u);
    },
    instructor: async (parent) => {
      let id = parent.instructorId;
      if (!id && parent.bookingId) {
        const booking = await StudentBooking.findById(parent.bookingId)
          .select("instructorId")
          .lean();
        id = booking?.instructorId;
      }
      id = id?._id ?? id; // handle populated ref
      if (!id) return null;
      const u = await User.findById(id).lean();
      return toTransactionParty(u);
    },
  },
  Query: {
    async getAdminTransactions(
      _,
      { filter = {}, limit = 50, offset = 0 },
      { user },
    ) {
      if (!user || user.role !== "Admin") {
        throw new ForbiddenError("Not authorized");
      }
      const query = buildAdminTransactionQuery(filter);
      const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
      const safeOffset = Math.max(Number(offset) || 0, 0);
      return Transaction.find(query)
        .sort({ occurredAt: -1, createdAt: -1 })
        .skip(safeOffset)
        .limit(safeLimit);
    },

    async getAdminTransactionCount(_, { filter = {} }, { user }) {
      if (!user || user.role !== "Admin") {
        throw new ForbiddenError("Not authorized");
      }
      const query = buildAdminTransactionQuery(filter);
      return Transaction.countDocuments(query);
    },

    async getAdminTransactionStats(_, __, { user }) {
      if (!user || user.role !== "Admin") {
        throw new ForbiddenError("Not authorized");
      }
      // Gross volume = sum of "Platform gross receipt" only (one per payment). Matches Stripe dashboard "Gross volume".
      // We do NOT sum "Platform commission" here to avoid double-counting (gross receipt already includes the full payment).
      const [grossVolume, counts] = await Promise.all([
        Transaction.aggregate([
          {
            $match: {
              role: "platform",
              direction: "credit",
              status: "succeeded",
              type: "payment",
              description: { $regex: /gross receipt/i },
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Transaction.aggregate([
          { $match: { status: "succeeded" } },
          {
            $group: {
              _id: null,
              totalPayments: {
                $sum: { $cond: [{ $eq: ["$type", "payment"] }, 1, 0] },
              },
              totalRefunds: {
                $sum: { $cond: [{ $eq: ["$type", "refund"] }, 1, 0] },
              },
              totalPayouts: {
                $sum: { $cond: [{ $eq: ["$type", "payout"] }, 1, 0] },
              },
              transactionCount: { $sum: 1 },
            },
          },
        ]),
      ]);
      const c = counts[0] || {};
      const totalEarned = Math.round((grossVolume[0]?.total ?? 0) * 100) / 100;
      return {
        totalEarned,
        totalPayments: c.totalPayments ?? 0,
        totalRefunds: c.totalRefunds ?? 0,
        totalPayouts: c.totalPayouts ?? 0,
        transactionCount: c.transactionCount ?? 0,
      };
    },

    async getBookingTransactions(_, { bookingId }, { user }) {
      if (!user) throw new AuthenticationError("Not authenticated");
      const query = { bookingId };
      if (user.role === "Instructor") {
        query.instructorId = user.id;
        query.role = "instructor";
      }
      if (user.role === "Student") {
        query.studentId = user.id;
        query.role = "student";
      }
      return Transaction.find(query).sort({ occurredAt: 1, createdAt: 1 });
    },

    async getInstructorTransactions(
      _,
      { limit = 50, offset = 0, type },
      { user },
    ) {
      if (!user || user.role !== "Instructor") {
        throw new ForbiddenError("Not authorized");
      }
      const query = { instructorId: user.id, role: "instructor" };
      if (type) query.type = type;
      return Transaction.find(query)
        .sort({ occurredAt: -1, createdAt: -1 })
        .skip(offset)
        .limit(limit);
    },

    async getInstructorTransactionCount(_, { type }, { user }) {
      if (!user || user.role !== "Instructor") {
        throw new ForbiddenError("Not authorized");
      }
      const query = { instructorId: user.id, role: "instructor" };
      if (type) query.type = type;
      return Transaction.countDocuments(query);
    },

    async getInstructorTransactionStats(_, __, { user }) {
      if (!user || user.role !== "Instructor") {
        throw new ForbiddenError("Not authorized");
      }
      const instructorOid = toObjectId(user.id);
      if (!instructorOid) {
        return {
          totalReceived: 0,
          totalPayouts: 0,
          paymentCount: 0,
          payoutCount: 0,
          transactionCount: 0,
        };
      }
      const [received, payouts, counts] = await Promise.all([
        Transaction.aggregate([
          {
            $match: {
              instructorId: instructorOid,
              role: "instructor",
              type: "payment",
              direction: "credit",
              status: "succeeded",
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Transaction.aggregate([
          {
            $match: {
              instructorId: instructorOid,
              role: "instructor",
              type: "payout",
              direction: "credit",
              status: "succeeded",
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Transaction.aggregate([
          { $match: { instructorId: instructorOid, role: "instructor" } },
          {
            $group: {
              _id: null,
              paymentCount: {
                $sum: { $cond: [{ $eq: ["$type", "payment"] }, 1, 0] },
              },
              payoutCount: {
                $sum: { $cond: [{ $eq: ["$type", "payout"] }, 1, 0] },
              },
              transactionCount: { $sum: 1 },
            },
          },
        ]),
      ]);
      const c = counts[0] || {};
      return {
        totalReceived: Math.round((received[0]?.total ?? 0) * 100) / 100,
        totalPayouts: Math.round((payouts[0]?.total ?? 0) * 100) / 100,
        paymentCount: c.paymentCount ?? 0,
        payoutCount: c.payoutCount ?? 0,
        transactionCount: c.transactionCount ?? 0,
      };
    },

    async getStudentTransactions(
      _,
      { limit = 50, offset = 0, view = "all" },
      { user },
    ) {
      if (!user || user.role !== "Student") {
        throw new ForbiddenError("Not authorized");
      }
      const query = { studentId: user.id, role: "student" };
      if (view === "refund") {
        query.type = "refund";
      } else if (view === "rejected") {
        query.status = { $in: ["failed", "cancelled"] };
      } else if (view === "completed") {
        query.type = { $ne: "refund" };
        query.status = { $nin: ["pending", "failed", "cancelled"] };
      }
      return Transaction.find(query)
        .sort({ occurredAt: -1, createdAt: -1 })
        .skip(offset)
        .limit(limit);
    },

    async getStudentTransactionCount(_, { view = "all" }, { user }) {
      if (!user || user.role !== "Student") {
        throw new ForbiddenError("Not authorized");
      }
      const query = { studentId: user.id, role: "student" };
      if (view === "refund") {
        query.type = "refund";
      } else if (view === "rejected") {
        query.status = { $in: ["failed", "cancelled"] };
      } else if (view === "completed") {
        query.type = { $ne: "refund" };
        query.status = { $nin: ["pending", "failed", "cancelled"] };
      }
      return Transaction.countDocuments(query);
    },

    async getStudentTransactionStats(_, __, { user }) {
      if (!user || user.role !== "Student") {
        throw new ForbiddenError("Not authorized");
      }
      const studentOid = toObjectId(user.id);
      if (!studentOid) {
        return {
          totalSpent: 0,
          totalRefunded: 0,
          paymentCount: 0,
          refundCount: 0,
          transactionCount: 0,
        };
      }
      const [spent, refunded, counts] = await Promise.all([
        Transaction.aggregate([
          {
            $match: {
              studentId: studentOid,
              role: "student",
              type: "payment",
              direction: "debit",
              status: "succeeded",
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Transaction.aggregate([
          {
            $match: {
              studentId: studentOid,
              role: "student",
              type: "refund",
              direction: "credit",
              status: "succeeded",
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Transaction.aggregate([
          { $match: { studentId: studentOid, role: "student" } },
          {
            $group: {
              _id: null,
              paymentCount: {
                $sum: { $cond: [{ $eq: ["$type", "payment"] }, 1, 0] },
              },
              refundCount: {
                $sum: { $cond: [{ $eq: ["$type", "refund"] }, 1, 0] },
              },
              transactionCount: { $sum: 1 },
            },
          },
        ]),
      ]);
      const c = counts[0] || {};
      return {
        totalSpent: Math.round((spent[0]?.total ?? 0) * 100) / 100,
        totalRefunded: Math.round((refunded[0]?.total ?? 0) * 100) / 100,
        paymentCount: c.paymentCount ?? 0,
        refundCount: c.refundCount ?? 0,
        transactionCount: c.transactionCount ?? 0,
      };
    },

    async getStudentBookingTransactions(_, { bookingId }, { user }) {
      if (!user || user.role !== "Student") {
        throw new ForbiddenError("Not authorized");
      }
      return Transaction.find({
        bookingId,
        studentId: user.id,
        role: "student",
      }).sort({
        occurredAt: 1,
        createdAt: 1,
      });
    },

    async getPlatformCommissionSettings(_, __, { user }) {
      if (!user || user.role !== "Admin") {
        throw new ForbiddenError("Not authorized");
      }
      const admin = await Admin.findOne().lean();
      const pc = admin?.platformCommission || {};
      return {
        defaultRate: pc.defaultRate ?? 20,
        defaultInstructorRate: pc.defaultInstructorRate ?? null,
        defaultType: pc.defaultType ?? "percentage",
        defaultFixedAmount: pc.defaultFixedAmount ?? 0,
        minFare: pc.minFare ?? null,
        maxFare: pc.maxFare ?? null,
        payoutMethods: Array.isArray(pc.payoutMethods)
          ? pc.payoutMethods
          : ["Stripe"],
      };
    },
  },
  Mutation: {
    async updatePlatformCommissionSettings(_, { input }, { user }) {
      if (!user || user.role !== "Admin") {
        throw new ForbiddenError("Not authorized");
      }
      const admin = await Admin.findOne();
      if (!admin) throw new ForbiddenError("No admin found");
      const pc = admin.platformCommission || {};
      if (input.defaultRate != null) pc.defaultRate = input.defaultRate;
      if (input.defaultInstructorRate !== undefined)
        pc.defaultInstructorRate = input.defaultInstructorRate;
      if (input.defaultType != null) pc.defaultType = input.defaultType;
      if (input.defaultFixedAmount != null)
        pc.defaultFixedAmount = input.defaultFixedAmount;
      if (input.minFare !== undefined) pc.minFare = input.minFare;
      if (input.maxFare !== undefined) pc.maxFare = input.maxFare;
      if (input.payoutMethods != null) pc.payoutMethods = input.payoutMethods;
      await admin.save();
      return {
        defaultRate: pc.defaultRate ?? 20,
        defaultInstructorRate: pc.defaultInstructorRate ?? null,
        defaultType: pc.defaultType ?? "percentage",
        defaultFixedAmount: pc.defaultFixedAmount ?? 0,
        minFare: pc.minFare ?? null,
        maxFare: pc.maxFare ?? null,
        payoutMethods: Array.isArray(pc.payoutMethods)
          ? pc.payoutMethods
          : ["Stripe"],
      };
    },
  },
};

module.exports = transactionResolver;
