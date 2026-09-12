const test = require("node:test");
const assert = require("node:assert/strict");
process.env.STRIPE_SECRET_KEY ||= "sk_test_phase1_authorization_only";

const {
  requireAuthenticatedUser,
  requireAdmin,
  requireSuperAdmin,
  requireStudentOwnership,
  requireInstructorOwnership,
  requireBookingParticipantOrAdmin,
  requireAssignedInstructorOrAdmin,
  requireSelfServiceRole,
} = require("./authorization");

const adminBookingResolvers = require("../graphql/resolvers/AdminBookingType.resolver");
const userResolvers = require("../graphql/resolvers");
const chatResolvers = require("../graphql/resolvers/chat.resolvers");

test("authorization rejects anonymous users and non-admin admin operations", () => {
  assert.throws(() => requireAuthenticatedUser(null), /Not authenticated/);
  assert.throws(
    () => requireAdmin({ id: "student-1", role: "Student" }),
    /Not authorized/,
  );
});

test("student ownership checks prevent cross-account access", () => {
  const student = { id: "student-1", role: "Student" };
  assert.doesNotThrow(() => requireStudentOwnership(student, "student-1"));
  assert.throws(
    () => requireStudentOwnership(student, "student-2"),
    /Not authorized/,
  );
  assert.doesNotThrow(() =>
    requireStudentOwnership({ id: "admin-1", role: "Admin" }, "student-2"),
  );
});

test("identity comparisons support _id and ObjectId-shaped values", () => {
  const objectId = { toHexString: () => "student-1" };
  assert.doesNotThrow(() =>
    requireStudentOwnership({ _id: objectId, role: "Student" }, objectId),
  );
  assert.doesNotThrow(() =>
    requireInstructorOwnership(
      { _id: { toHexString: () => "instructor-1" }, role: "Instructor" },
      { id: "instructor-1" },
    ),
  );
});

test("instructor ownership and admin-level checks are enforced", () => {
  assert.doesNotThrow(() =>
    requireInstructorOwnership(
      { id: "instructor-1", role: "Instructor" },
      "instructor-1",
    ),
  );
  assert.throws(
    () =>
      requireInstructorOwnership(
        { id: "instructor-1", role: "Instructor" },
        "instructor-2",
      ),
    /Not authorized/,
  );
  assert.doesNotThrow(() =>
    requireSuperAdmin({ id: "admin-1", role: "Admin", adminLevel: "super" }),
  );
  assert.throws(
    () => requireSuperAdmin({ id: "admin-2", role: "Admin" }),
    /Super-admin/,
  );
});

test("booking access is limited to the assigned student or instructor", () => {
  const booking = { studentId: "student-1", instructorId: "instructor-1" };
  assert.doesNotThrow(() =>
    requireBookingParticipantOrAdmin({ id: "student-1", role: "Student" }, booking),
  );
  assert.doesNotThrow(() =>
    requireBookingParticipantOrAdmin(
      { id: "instructor-1", role: "Instructor" },
      booking,
    ),
  );
  assert.throws(
    () =>
      requireBookingParticipantOrAdmin(
        { id: "instructor-2", role: "Instructor" },
        booking,
      ),
    /Not authorized/,
  );
  assert.doesNotThrow(() =>
    requireAssignedInstructorOrAdmin(
      { id: "instructor-1", role: "Instructor" },
      booking,
    ),
  );
  assert.throws(
    () =>
      requireAssignedInstructorOrAdmin(
        { id: "student-1", role: "Student" },
        booking,
      ),
    /Only the assigned instructor/,
  );
});

test("admin booking operations reject anonymous and non-admin callers before database access", async () => {
  const protectedOperations = [
    () => adminBookingResolvers.Query.getAllStudentBookings(null, null, { user: null }),
    () =>
      adminBookingResolvers.Query.getInstructorBookingsById(
        null,
        { instructorId: "instructor-1" },
        { user: { id: "student-1", role: "Student" } },
      ),
    () =>
      adminBookingResolvers.Mutation.updateBookingStatusAdmin(
        null,
        { input: {} },
        { user: { id: "instructor-1", role: "Instructor" } },
      ),
    () =>
      adminBookingResolvers.Mutation.cancelBookingAdmin(
        null,
        { input: {} },
        { user: null },
      ),
  ];

  for (const operation of protectedOperations) {
    await assert.rejects(operation, /Not authenticated|Not authorized/);
  }
});

test("self-service role selection cannot create an Admin account", () => {
  assert.equal(requireSelfServiceRole("Student"), "Student");
  assert.equal(requireSelfServiceRole("Instructor"), "Instructor");
  assert.throws(() => requireSelfServiceRole("Admin"), /student or instructor/);
});

test("role selection and upload boundaries reject unauthorized inputs before database/provider work", async () => {
  await assert.rejects(
    () =>
      userResolvers.Mutation.selectRole(
        null,
        { role: "Admin" },
        { user: { id: "userbase-1", role: "UserBase" } },
      ),
    /student or instructor/,
  );
  await assert.rejects(
    () =>
      userResolvers.Mutation.generateUploadUrl(
        null,
        {
          userId: "student-2",
          role: "Student",
          fileName: "license.pdf",
          fileType: "application/pdf",
          fileSize: 1024,
        },
        { user: { id: "student-1", role: "Student" } },
      ),
    /own account/,
  );
  await assert.rejects(
    () =>
      userResolvers.Mutation.generateUploadUrl(
        null,
        {
          userId: "student-1",
          role: "Student",
          fileName: "license.pdf",
          fileType: "application/pdf",
          fileSize: 10 * 1024 * 1024 + 1,
        },
        { user: { id: "student-1", role: "Student" } },
      ),
    /10 MB/,
  );
});

test("GraphQL chat rejects anonymous access and does not reach persistence", async () => {
  await assert.rejects(
    () => chatResolvers.Query.getMessages(null, { user1Id: "a", user2Id: "b" }, { user: null }),
    /Failed to fetch messages/,
  );
  await assert.rejects(
    () =>
      chatResolvers.Mutation.sendMessage(
        null,
        {
          senderId: "student-1",
          receiverId: "instructor-1",
          content: "hello",
          senderModel: "Student",
          receiverModel: "Instructor",
        },
        { user: null },
      ),
    /Failed to send message/,
  );
});
