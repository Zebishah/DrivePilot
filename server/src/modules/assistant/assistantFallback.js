function formatDate(value) {
  if (!value) return "an upcoming date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

function money(minor, currency = "CHF") {
  return Number.isSafeInteger(minor) ? `${currency} ${(minor / 100).toFixed(2)}` : null;
}

function isProjectQuestion(message) {
  const text = String(message || "").toLowerCase();
  return /\b(?:what(?:'s|s| is)|tell me about|explain)\b.{0,50}\b(?:this\s+)?(?:app|project|website|platform|marketplace|system|dsp)\b|\bwhat does (?:this|the)\s+(?:app|website|platform|project)\s+do\b|\bwhat can i do (?:here|on this website|on this platform)\b|\bhow does (?:this|dsp marketplace|the website) work\b/.test(text);
}

function projectContextAnswer(role) {
  const dashboardFocus = role === "Student"
    ? "Your student dashboard also lets you manage bookings, payments, progress, feedback, and messages."
    : role === "Instructor"
      ? "Your instructor dashboard also lets you manage availability, students, bookings, payments, feedback, and documents."
      : role === "Admin"
        ? "The admin workspace provides read-only operational visibility across bookings, refunds, payouts, and financial review items."
        : "The dashboard provides role-specific tools for managing the learning marketplace.";
  return `DSP Marketplace is a learning marketplace where students can discover verified instructors, compare profiles and availability, book lessons, and complete payments. ${dashboardFocus} I can answer read-only questions using the information authorized for your account, but changes must be made through the normal dashboard workflows.`;
}

function deterministicAnswer(toolName, result, role) {
  if (toolName === "getMyUpcomingLessons" || toolName === "getMyTeachingSchedule") {
    const lessons = Array.isArray(result) ? result : [];
    if (!lessons.length) return role === "Instructor" ? "You have no upcoming teaching slots in the available data." : "You have no upcoming lessons in the available data.";
    const first = lessons[0];
    const person = first.instructor || first.student;
    const name = person ? ` with ${[person.firstName, person.lastName].filter(Boolean).join(" ")}` : "";
    return `${lessons.length} upcoming lesson${lessons.length === 1 ? "" : "s"}. The next is ${formatDate(first.slot?.date)} at ${first.slot?.startTime || "the scheduled time"}${name}.`;
  }
  if (toolName === "getMyPaymentStatus") {
    const attention = result?.attentionRequired || [];
    if (!attention.length) return "I found no student payments currently requiring attention.";
    const statuses = [...new Set(attention.map((item) => item.slot?.paymentStatus).filter(Boolean))].join(", ");
    return `${attention.length} payment item${attention.length === 1 ? "" : "s"} ${attention.length === 1 ? "requires" : "require"} attention (${statuses}). Use the normal payment workflow for the next step.`;
  }
  if (toolName === "getMyBookingSummary") return `You have ${result?.bookingCount || 0} booking${result?.bookingCount === 1 ? "" : "s"} and ${result?.lessonCount || 0} lesson slot${result?.lessonCount === 1 ? "" : "s"}. Recorded spend is ${money(result?.spentMinor, result?.currency) || "not available"}.`;
  if (toolName === "getMyRefundStatus") return result?.length ? `You have ${result.length} refund request${result.length === 1 ? "" : "s"}; the latest status is ${result[0].status}.` : "You have no refund requests in the available data.";
  if (toolName === "getMyPayoutSummary") return `Payout statuses: ${Object.entries(result?.statuses || {}).map(([status, count]) => `${status} ${count}`).join(", ") || "none"}. Pending amount is ${money(result?.pendingAmountMinor) || "not available"}.`;
  if (toolName === "getMyStudentSummary") return `I found ${Array.isArray(result) ? result.length : 0} associated student record${result?.length === 1 ? "" : "s"}.`;
  if (toolName === "getMyAvailabilitySummary") return `Availability is recorded for ${Array.isArray(result) ? result.length : 0} upcoming day${result?.length === 1 ? "" : "s"}.`;
  if (toolName === "getMyPendingActions") return `Pending actions: ${result?.payment || 0} payment, ${result?.lessonConfirmation || 0} lesson confirmation, and ${result?.payout || 0} payout item${result?.payout === 1 ? "" : "s"}.`;
  if (toolName === "getOperationalSummary") return `Today's operational summary: ${result?.bookingsToday || 0} bookings, ${result?.pendingRefunds || 0} pending refunds, ${result?.pendingPayoutBookings || 0} payout items pending, and ${result?.manualReviewOperations || 0} financial operations in manual review.`;
  if (toolName === "getRefundsNeedingAttention") return `There are ${Array.isArray(result) ? result.length : 0} refunds needing attention.`;
  if (toolName === "getPayoutsNeedingAttention") return `There are ${Array.isArray(result) ? result.length : 0} payout items in pending or processing state.`;
  if (toolName === "getFinancialManualReview") return `There are ${Array.isArray(result) ? result.length : 0} financial operations requiring manual review.`;
  if (toolName === "getRetryableFinancialOperations") return `There are ${Array.isArray(result) ? result.length : 0} retryable financial operations.`;
  if (toolName === "getRecentBookingSummary") return `${result?.bookingCount || 0} bookings were created in the last 24 hours across ${result?.slotCount || 0} slots.`;
  if (toolName === "getMyInstructorOptions") return `I found ${Array.isArray(result) ? result.length : 0} verified instructor option${result?.length === 1 ? "" : "s"}.`;
  return "I could not find enough verified application data to answer that.";
}

function fallbackForMessage(message, role) {
  const text = String(message || "").toLowerCase();
  if (isProjectQuestion(message)) return projectContextAnswer(role);
  if (text.includes("refund") && text.includes("action")) return "Refund status is available through the normal refund workflow; I cannot approve or issue a refund here.";
  if (text.includes("cancel") || text.includes("reschedul") || text.includes("payout")) return "I can explain the current status, but changes must be made through the normal application workflow.";
  if (text.includes("system prompt") || text.includes("database") || text.includes("ignore previous")) return "I can help with your authorized DSP Marketplace information, but I cannot reveal internal instructions or access the database directly.";
  return "I can answer questions about your authorized lessons, payments, refunds, payouts, and operational summaries.";
}

module.exports = { deterministicAnswer, fallbackForMessage, isProjectQuestion, projectContextAnswer };
