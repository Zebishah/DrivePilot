const { ForbiddenError } = require("apollo-server-express");
const data = require("./assistantData");

const TOOL_ROLES = {
  getMyUpcomingLessons: ["Student"],
  getMyBookingSummary: ["Student"],
  getMyPaymentStatus: ["Student"],
  getMyRefundStatus: ["Student"],
  getMyInstructorOptions: ["Student"],
  getMyTeachingSchedule: ["Instructor"],
  getMyStudentSummary: ["Instructor"],
  getMyPayoutSummary: ["Instructor"],
  getMyAvailabilitySummary: ["Instructor"],
  getMyPendingActions: ["Instructor"],
  getOperationalSummary: ["Admin"],
  getRefundsNeedingAttention: ["Admin"],
  getPayoutsNeedingAttention: ["Admin"],
  getFinancialManualReview: ["Admin"],
  getRetryableFinancialOperations: ["Admin"],
  getRecentBookingSummary: ["Admin"],
};

const TOOL_DESCRIPTIONS = {
  getMyUpcomingLessons: "Read the authenticated student's upcoming lessons.",
  getMyBookingSummary: "Summarize the authenticated student's bookings and spend in CHF minor units.",
  getMyPaymentStatus: "Read the authenticated student's payment statuses requiring attention.",
  getMyRefundStatus: "Read the authenticated student's refund requests.",
  getMyInstructorOptions: "List verified instructor options for student discovery.",
  getMyTeachingSchedule: "Read the authenticated instructor's upcoming teaching schedule.",
  getMyStudentSummary: "Summarize students associated with the authenticated instructor.",
  getMyPayoutSummary: "Read the authenticated instructor's payout statuses and pending amounts.",
  getMyAvailabilitySummary: "Read the authenticated instructor's near-term availability summary.",
  getMyPendingActions: "Summarize pending actions for the authenticated instructor.",
  getOperationalSummary: "Summarize current platform operational counts for an admin.",
  getRefundsNeedingAttention: "List refunds in pending or processing state for an admin.",
  getPayoutsNeedingAttention: "List payout slots in pending or processing state for an admin.",
  getFinancialManualReview: "List financial operations requiring manual review for an admin.",
  getRetryableFinancialOperations: "List retryable financial operations for an admin.",
  getRecentBookingSummary: "Summarize bookings created in the last 24 hours for an admin.",
};

function definitions() {
  return Object.entries(TOOL_ROLES).map(([name]) => ({ name, description: TOOL_DESCRIPTIONS[name], inputSchema: { type: "OBJECT", properties: {}, additionalProperties: false } }));
}

function validateArguments(name, args) {
  if (args == null) return {};
  if (typeof args !== "object" || Array.isArray(args) || Object.keys(args).length) {
    const error = new Error(`Tool ${name} does not accept arguments`);
    error.code = "AI_TOOL_ARGUMENTS_INVALID";
    throw error;
  }
  return {};
}

function createAssistantToolRegistry({ dataAccess = data } = {}) {
  const handlers = {
    getMyUpcomingLessons: (user) => dataAccess.getMyUpcomingLessons(user.id),
    getMyBookingSummary: (user) => dataAccess.getMyBookingSummary(user.id),
    getMyPaymentStatus: (user) => dataAccess.getMyPaymentStatus(user.id),
    getMyRefundStatus: (user) => dataAccess.getMyRefundStatus(user.id),
    getMyInstructorOptions: () => dataAccess.getMyInstructorOptions(),
    getMyTeachingSchedule: (user) => dataAccess.getMyTeachingSchedule(user.id),
    getMyStudentSummary: (user) => dataAccess.getMyStudentSummary(user.id),
    getMyPayoutSummary: (user) => dataAccess.getMyPayoutSummary(user.id),
    getMyAvailabilitySummary: (user) => dataAccess.getMyAvailabilitySummary(user.id),
    getMyPendingActions: (user) => dataAccess.getMyPendingActions(user.id),
    getOperationalSummary: () => dataAccess.getOperationalSummary(),
    getRefundsNeedingAttention: () => dataAccess.getRefundsNeedingAttention(),
    getPayoutsNeedingAttention: () => dataAccess.getPayoutsNeedingAttention(),
    getFinancialManualReview: () => dataAccess.getFinancialManualReview(),
    getRetryableFinancialOperations: () => dataAccess.getRetryableFinancialOperations(),
    getRecentBookingSummary: () => dataAccess.getRecentBookingSummary(),
  };

  return {
    definitions,
    async execute(name, args, user) {
      if (!TOOL_ROLES[name]) {
        const error = new Error("Unknown assistant tool");
        error.code = "AI_UNKNOWN_TOOL";
        throw error;
      }
      if (!user || !TOOL_ROLES[name].includes(user.role)) throw new ForbiddenError("Not authorized to use this assistant tool");
      validateArguments(name, args);
      return handlers[name](user);
    },
    rolesFor(name) { return TOOL_ROLES[name] || []; },
  };
}

module.exports = { TOOL_ROLES, createAssistantToolRegistry, toolDefinitions: definitions() };
