const {
  AuthenticationError,
  ForbiddenError,
} = require("apollo-server-express");
const Transaction = require("../../models/transaction.model");

function toIsoString(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
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
  },
  Query: {
    async getAdminTransactions(_, { filter = {} }, { user }) {
      if (!user || user.role !== "Admin") {
        throw new ForbiddenError("Not authorized");
      }
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
      return Transaction.find(query).sort({ occurredAt: -1, createdAt: -1 });
    },

    async getBookingTransactions(_, { bookingId }, { user }) {
      if (!user) throw new AuthenticationError("Not authenticated");
      // Admin or owner views only
      const query = { bookingId };
      if (user.role === "Instructor") query.instructorId = user.id;
      if (user.role === "Student") query.studentId = user.id;
      // Admin sees all
      return Transaction.find(query).sort({ occurredAt: 1, createdAt: 1 });
    },

    async getInstructorTransactions(_, { limit = 50, offset = 0 }, { user }) {
      if (!user || user.role !== "Instructor") {
        throw new ForbiddenError("Not authorized");
      }
      return Transaction.find({ instructorId: user.id })
        .sort({ occurredAt: -1, createdAt: -1 })
        .skip(offset)
        .limit(limit);
    },

    async getStudentTransactions(_, { limit = 50, offset = 0 }, { user }) {
      if (!user || user.role !== "Student") {
        throw new ForbiddenError("Not authorized");
      }
      return Transaction.find({ studentId: user.id })
        .sort({ occurredAt: -1, createdAt: -1 })
        .skip(offset)
        .limit(limit);
    },

    async getStudentBookingTransactions(_, { bookingId }, { user }) {
      if (!user || user.role !== "Student") {
        throw new ForbiddenError("Not authorized");
      }
      return Transaction.find({ bookingId, studentId: user.id }).sort({
        occurredAt: 1,
        createdAt: 1,
      });
    },
  },
};

module.exports = transactionResolver;
