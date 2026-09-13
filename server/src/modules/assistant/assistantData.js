const StudentBooking = require("../../models/studentBooking.model");
const Transaction = require("../../models/transaction.model");
const RefundRequest = require("../../models/refundRequest.model");
const FinancialOperation = require("../../models/FinancialOperation");
const TeacherAvailability = require("../../models/teacherAvailability.model");
const { User } = require("../../models/User");

const MAX_RESULTS = 25;
const id = (value) => value?._id?.toString?.() || value?.toString?.() || null;
const minor = (value) => Number.isSafeInteger(value) ? value : null;
const slotView = (slot) => ({ id: id(slot?._id || slot?.id), date: slot?.date || null, startTime: slot?.startTime || null, endTime: slot?.endTime || null, status: slot?.status || null, paymentStatus: slot?.paymentStatus || null, payoutStatus: slot?.payoutStatus || null, amountMinor: minor(slot?.grossAmountMinor), instructorAmountMinor: minor(slot?.instructorAmountMinor) });
const personView = (person) => person ? { id: id(person), firstName: person.firstName || "", lastName: person.lastName || "" } : null;
const today = () => new Date().toISOString().slice(0, 10);

async function getMyUpcomingLessons(userId) {
  const bookings = await StudentBooking.find({ studentId: userId, status: { $nin: ["cancelled", "refund"] }, "slots.booked": true })
    .select("slots instructorId status currency")
    .populate("instructorId", "firstName lastName")
    .limit(MAX_RESULTS)
    .lean();
  return bookings.flatMap((booking) => (booking.slots || []).filter((slot) => slot.booked && slot.date >= today() && !["cancelled", "refund"].includes(slot.status)).map((slot) => ({ bookingId: id(booking), currency: booking.currency || "CHF", instructor: personView(booking.instructorId), slot: slotView(slot) }))).slice(0, MAX_RESULTS);
}

async function getMyBookingSummary(userId) {
  const [bookings, transactions] = await Promise.all([
    StudentBooking.find({ studentId: userId }).select("status slots currency").limit(MAX_RESULTS).lean(),
    Transaction.find({ studentId: userId, role: "student", type: "payment", direction: "debit", status: "succeeded" }).select("amountMinor currency").limit(MAX_RESULTS).lean(),
  ]);
  const statusCounts = {};
  let lessons = 0;
  let spentMinor = 0;
  let knownSpend = false;
  for (const booking of bookings) {
    statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1;
    lessons += (booking.slots || []).filter((slot) => slot.booked && slot.status !== "cancelled").length;
  }
  for (const transaction of transactions) {
    const amount = minor(transaction.amountMinor);
    if (amount != null) {
      spentMinor += amount;
      knownSpend = true;
    }
  }
  return { bookingCount: bookings.length, lessonCount: lessons, statusCounts, spentMinor: knownSpend ? spentMinor : null, currency: "CHF" };
}

async function getMyPaymentStatus(userId) {
  const bookings = await StudentBooking.find({ studentId: userId }).select("_id slots currency").limit(MAX_RESULTS).lean();
  const statuses = {};
  const items = [];
  for (const booking of bookings) for (const slot of booking.slots || []) {
    if (!slot.paymentStatus) continue;
    statuses[slot.paymentStatus] = (statuses[slot.paymentStatus] || 0) + 1;
    if (["requires_action", "payment_failed", "pending_payment"].includes(slot.paymentStatus)) items.push({ bookingId: id(booking), currency: booking.currency || "CHF", slot: slotView(slot) });
  }
  return { statuses, attentionRequired: items.slice(0, MAX_RESULTS) };
}

async function getMyRefundStatus(userId) {
  const requests = await RefundRequest.find({ studentId: userId }).select("bookingId slotId status amountMinor currency requestedAt processedAt rejectionReason").sort({ createdAt: -1 }).limit(MAX_RESULTS).lean();
  return requests.map((request) => ({ id: id(request), bookingId: id(request.bookingId), slotId: request.slotId, status: request.status, amountMinor: minor(request.amountMinor), currency: request.currency || "CHF", requestedAt: request.requestedAt, processedAt: request.processedAt || null, rejectionReason: request.status === "rejected" ? request.rejectionReason || null : null }));
}

async function getMyInstructorOptions() {
  const instructors = await User.find({ role: "Instructor", isUserVerified: true }).select("firstName lastName location description verificationStatus").limit(MAX_RESULTS).lean();
  return instructors.map((instructor) => ({ id: id(instructor), firstName: instructor.firstName || "", lastName: instructor.lastName || "", location: instructor.location || null, description: instructor.description || null, verificationStatus: instructor.verificationStatus || "verified" }));
}

async function getMyTeachingSchedule(userId) {
  const bookings = await StudentBooking.find({ instructorId: userId, "slots.booked": true, status: { $nin: ["cancelled", "refund"] } }).select("_id slots studentId status currency").populate("studentId", "firstName lastName").limit(MAX_RESULTS).lean();
  return bookings.flatMap((booking) => (booking.slots || []).filter((slot) => slot.booked && slot.date >= today() && !["cancelled", "refund"].includes(slot.status)).map((slot) => ({ bookingId: id(booking), student: personView(booking.studentId), currency: booking.currency || "CHF", slot: slotView(slot) }))).slice(0, MAX_RESULTS);
}

async function getMyStudentSummary(userId) {
  const bookings = await StudentBooking.find({ instructorId: userId }).select("studentId slots status").limit(MAX_RESULTS).lean();
  const students = new Map();
  for (const booking of bookings) {
    const studentId = id(booking.studentId);
    if (!studentId) continue;
    const current = students.get(studentId) || { studentId, bookingCount: 0, lessonCount: 0, completedLessons: 0 };
    current.bookingCount += 1;
    current.lessonCount += (booking.slots || []).length;
    current.completedLessons += (booking.slots || []).filter((slot) => slot.status === "completed").length;
    students.set(studentId, current);
  }
  return [...students.values()].slice(0, MAX_RESULTS);
}

async function getMyPayoutSummary(userId) {
  const bookings = await StudentBooking.find({ instructorId: userId }).select("slots currency").limit(MAX_RESULTS).lean();
  const statuses = {};
  let pendingAmountMinor = 0;
  for (const booking of bookings) for (const slot of booking.slots || []) {
    if (!slot.payoutStatus) continue;
    statuses[slot.payoutStatus] = (statuses[slot.payoutStatus] || 0) + 1;
    if (["pending", "processing"].includes(slot.payoutStatus) && minor(slot.instructorAmountMinor) != null) pendingAmountMinor += slot.instructorAmountMinor;
  }
  return { statuses, pendingAmountMinor, currency: "CHF" };
}

async function getMyAvailabilitySummary(userId) {
  const days = await TeacherAvailability.find({ teacherId: userId, date: { $gte: new Date() } }).select("date status availableSlots slots").sort({ date: 1 }).limit(14).lean();
  return days.map((day) => ({ date: day.date, status: day.status, availableCount: (day.availableSlots || []).filter((slot) => !slot.booked).length, bookedCount: (day.slots || []).filter((slot) => slot.booked).length }));
}

async function getMyPendingActions(userId) {
  const bookings = await StudentBooking.find({ $or: [{ studentId: userId }, { instructorId: userId }] }).select("studentId instructorId slots").limit(MAX_RESULTS).lean();
  const counts = { payment: 0, lessonConfirmation: 0, payout: 0 };
  for (const booking of bookings) for (const slot of booking.slots || []) {
    if (booking.studentId?.toString?.() === userId && ["pending_payment", "requires_action", "payment_failed"].includes(slot.paymentStatus)) counts.payment += 1;
    if (booking.instructorId?.toString?.() === userId && slot.status === "booked" && slot.lessonEndReminderSent !== true) counts.lessonConfirmation += 1;
    if (booking.instructorId?.toString?.() === userId && ["pending", "processing"].includes(slot.payoutStatus)) counts.payout += 1;
  }
  return counts;
}

async function getOperationalSummary() {
  const [bookingsToday, pendingRefunds, processingRefunds, retryableOperations, manualReviewOperations, pendingPayoutBookings] = await Promise.all([
    StudentBooking.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
    RefundRequest.countDocuments({ status: "pending" }),
    RefundRequest.countDocuments({ status: "processing" }),
    FinancialOperation.countDocuments({ status: "RETRYABLE" }),
    FinancialOperation.countDocuments({ status: "FAILED_MANUAL_REVIEW" }),
    StudentBooking.countDocuments({ "slots.payoutStatus": { $in: ["pending", "processing"] } }),
  ]);
  return { bookingsToday, pendingRefunds, processingRefunds, retryableOperations, manualReviewOperations, pendingPayoutBookings };
}

async function getRefundsNeedingAttention() {
  const requests = await RefundRequest.find({ status: { $in: ["pending", "processing"] } }).select("_id bookingId slotId status amountMinor currency requestedAt studentName instructorName").sort({ requestedAt: 1 }).limit(MAX_RESULTS).lean();
  return requests.map((request) => ({ id: id(request), bookingId: id(request.bookingId), slotId: request.slotId, status: request.status, amountMinor: minor(request.amountMinor), currency: request.currency || "CHF", requestedAt: request.requestedAt, studentName: request.studentName || null, instructorName: request.instructorName || null }));
}

async function getPayoutsNeedingAttention() {
  const bookings = await StudentBooking.find({ "slots.payoutStatus": { $in: ["pending", "processing"] } }).select("_id instructorId slots").limit(MAX_RESULTS).lean();
  return bookings.flatMap((booking) => (booking.slots || []).filter((slot) => ["pending", "processing"].includes(slot.payoutStatus)).map((slot) => ({ bookingId: id(booking), instructorId: id(booking.instructorId), slot: slotView(slot) }))).slice(0, MAX_RESULTS);
}

async function getFinancialManualReview() {
  return FinancialOperation.find({ status: "FAILED_MANUAL_REVIEW" }).select("operationId operationType aggregateType aggregateId status providerStatus lastErrorCode updatedAt").sort({ updatedAt: 1 }).limit(MAX_RESULTS).lean();
}

async function getRetryableFinancialOperations() {
  return FinancialOperation.find({ status: "RETRYABLE" }).select("operationId operationType aggregateType aggregateId status providerStatus lastErrorCode nextAttemptAt attemptCount").sort({ nextAttemptAt: 1 }).limit(MAX_RESULTS).lean();
}

async function getRecentBookingSummary() {
  const bookings = await StudentBooking.find({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }).select("status slots currency").limit(100).lean();
  const statusCounts = {};
  let slotCount = 0;
  for (const booking of bookings) {
    statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1;
    slotCount += (booking.slots || []).length;
  }
  return { bookingCount: bookings.length, slotCount, statusCounts, window: "last_24_hours" };
}

module.exports = { getMyUpcomingLessons, getMyBookingSummary, getMyPaymentStatus, getMyRefundStatus, getMyInstructorOptions, getMyTeachingSchedule, getMyStudentSummary, getMyPayoutSummary, getMyAvailabilitySummary, getMyPendingActions, getOperationalSummary, getRefundsNeedingAttention, getPayoutsNeedingAttention, getFinancialManualReview, getRetryableFinancialOperations, getRecentBookingSummary, Transaction };
