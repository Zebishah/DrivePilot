const test = require("node:test");
const assert = require("node:assert/strict");
const { TOOL_ROLES, createAssistantToolRegistry, toolDefinitions } = require("./assistantTools");

function fakeDataAccess() {
  const calls = [];
  const dataAccess = {};
  for (const name of [
    "getMyUpcomingLessons", "getMyBookingSummary", "getMyPaymentStatus", "getMyRefundStatus", "getMyInstructorOptions",
    "getMyTeachingSchedule", "getMyStudentSummary", "getMyPayoutSummary", "getMyAvailabilitySummary", "getMyPendingActions",
    "getOperationalSummary", "getRefundsNeedingAttention", "getPayoutsNeedingAttention", "getFinancialManualReview", "getRetryableFinancialOperations", "getRecentBookingSummary",
  ]) {
    dataAccess[name] = async (...args) => {
      calls.push({ name, args });
      return { source: name };
    };
  }
  return { dataAccess, calls };
}

test("tool registry exposes only approved read-only tools", () => {
  assert.equal(toolDefinitions.length, 16);
  assert.ok(toolDefinitions.every((tool) => tool.inputSchema.additionalProperties === false));
  assert.equal(toolDefinitions.some((tool) => /cancel|approve|modify|change|send|upload|delete/i.test(tool.name)), false);
});

test("student tools enforce role and pass only the authenticated student identity", async () => {
  const fake = fakeDataAccess();
  const registry = createAssistantToolRegistry({ dataAccess: fake.dataAccess });
  await registry.execute("getMyUpcomingLessons", {}, { id: "student-1", role: "Student" });
  assert.deepEqual(fake.calls[0], { name: "getMyUpcomingLessons", args: ["student-1"] });
  await assert.rejects(
    registry.execute("getMyUpcomingLessons", {}, { id: "student-2", role: "Instructor" }),
    (error) => error.name === "ForbiddenError",
  );
});

test("every registered tool is executable only by its declared role", async () => {
  const fake = fakeDataAccess();
  const registry = createAssistantToolRegistry({ dataAccess: fake.dataAccess });
  for (const [name, roles] of Object.entries(TOOL_ROLES)) {
    await registry.execute(name, {}, { id: "role-test-user", role: roles[0] });
    const wrongRole = roles[0] === "Student" ? "Instructor" : "Student";
    await assert.rejects(registry.execute(name, {}, { id: "role-test-user", role: wrongRole }), /Not authorized/);
  }
});

test("admin tools are unavailable to non-admin users and reject arbitrary arguments", async () => {
  const registry = createAssistantToolRegistry({ dataAccess: fakeDataAccess().dataAccess });
  await assert.rejects(
    registry.execute("getRefundsNeedingAttention", {}, { id: "student-1", role: "Student" }),
    (error) => error.name === "ForbiddenError",
  );
  await assert.rejects(
    registry.execute("getOperationalSummary", { query: "all users" }, { id: "admin-1", role: "Admin" }),
    (error) => error.code === "AI_TOOL_ARGUMENTS_INVALID",
  );
});

test("unknown tools cannot be executed", async () => {
  const registry = createAssistantToolRegistry({ dataAccess: fakeDataAccess().dataAccess });
  await assert.rejects(
    registry.execute("findInMongo", {}, { id: "admin-1", role: "Admin" }),
    (error) => error.code === "AI_UNKNOWN_TOOL",
  );
});
