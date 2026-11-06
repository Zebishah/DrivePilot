const { AuthenticationError, ForbiddenError } = require("apollo-server-express");

function identityId(value) {
  if (value == null) return null;
  if (typeof value === "object") {
    if (typeof value.toHexString === "function") return value.toHexString();
    if (value._id != null && value._id !== value) return identityId(value._id);
    if (value.id != null && value.id !== value) return identityId(value.id);
  }
  return String(value);
}

function requireAuthenticatedUser(user) {
  if (!user || !identityId(user)) {
    throw new AuthenticationError("Not authenticated");
  }
  return user;
}

function requireRole(user, ...roles) {
  const authenticatedUser = requireAuthenticatedUser(user);
  if (!roles.includes(authenticatedUser.role)) {
    throw new ForbiddenError("Not authorized");
  }
  return authenticatedUser;
}

function requireAdmin(user) {
  return requireRole(user, "Admin");
}

function requireLiveWorkspace(user) {
  const authenticatedUser = requireAuthenticatedUser(user);
  if (authenticatedUser.isDemo) {
    throw new ForbiddenError(
      "Demo mode: this action is disabled in the recruiter preview.",
    );
  }
  return authenticatedUser;
}

function requireSuperAdmin(user) {
  const admin = requireAdmin(user);
  if (admin.adminLevel !== "super") {
    throw new ForbiddenError("Super-admin access required");
  }
  return admin;
}

function requireSelfServiceRole(role) {
  if (!["Student", "Instructor"].includes(role)) {
    throw new ForbiddenError("Only student or instructor accounts may select this role");
  }
  return role;
}

function sameIdentity(left, right) {
  return identityId(left) != null && identityId(left) === identityId(right);
}

function requireStudentOwnership(user, studentId) {
  const authenticatedUser = requireAuthenticatedUser(user);
  if (
    authenticatedUser.role !== "Admin" &&
    (authenticatedUser.role !== "Student" ||
      !sameIdentity(authenticatedUser, studentId))
  ) {
    throw new ForbiddenError("Not authorized to access this student");
  }
  return authenticatedUser;
}

function requireInstructorOwnership(user, instructorId) {
  const authenticatedUser = requireAuthenticatedUser(user);
  if (
    authenticatedUser.role !== "Admin" &&
    (authenticatedUser.role !== "Instructor" ||
      !sameIdentity(authenticatedUser, instructorId))
  ) {
    throw new ForbiddenError("Not authorized to access this instructor");
  }
  return authenticatedUser;
}

function requireBookingParticipantOrAdmin(user, booking) {
  const authenticatedUser = requireAuthenticatedUser(user);
  if (authenticatedUser.role === "Admin") return authenticatedUser;

  const isStudent =
    authenticatedUser.role === "Student" &&
    sameIdentity(authenticatedUser, booking?.studentId);
  const isInstructor =
    authenticatedUser.role === "Instructor" &&
    sameIdentity(authenticatedUser, booking?.instructorId);

  if (!isStudent && !isInstructor) {
    throw new ForbiddenError("Not authorized for this booking");
  }
  return authenticatedUser;
}

function requireAssignedInstructorOrAdmin(user, booking) {
  const authenticatedUser = requireAuthenticatedUser(user);
  if (
    authenticatedUser.role !== "Admin" &&
    (authenticatedUser.role !== "Instructor" ||
      !sameIdentity(authenticatedUser, booking?.instructorId))
  ) {
    throw new ForbiddenError("Only the assigned instructor or an admin may perform this action");
  }
  return authenticatedUser;
}

function requireStudentOwnerOrAdmin(user, booking) {
  const authenticatedUser = requireAuthenticatedUser(user);
  if (
    authenticatedUser.role !== "Admin" &&
    (authenticatedUser.role !== "Student" ||
      !sameIdentity(authenticatedUser, booking?.studentId))
  ) {
    throw new ForbiddenError("Only the student or an admin may perform this action");
  }
  return authenticatedUser;
}

async function requireStudentDataAccess(user, studentId) {
  const authenticatedUser = requireAuthenticatedUser(user);
  if (
    authenticatedUser.role === "Admin" ||
    (authenticatedUser.role === "Student" &&
      sameIdentity(authenticatedUser, studentId))
  ) {
    return authenticatedUser;
  }

  if (authenticatedUser.role === "Instructor") {
    const StudentBooking = require("../models/studentBooking.model");
    const hasBooking = await StudentBooking.exists({
      studentId,
      instructorId: identityId(authenticatedUser),
      status: { $ne: "cancelled" },
    });
    if (hasBooking) return authenticatedUser;
  }

  throw new ForbiddenError("Not authorized to access this student");
}

module.exports = {
  identityId,
  requireAuthenticatedUser,
  requireRole,
  requireAdmin,
  requireLiveWorkspace,
  requireSuperAdmin,
  requireSelfServiceRole,
  requireStudentOwnership,
  requireInstructorOwnership,
  requireBookingParticipantOrAdmin,
  requireAssignedInstructorOrAdmin,
  requireStudentOwnerOrAdmin,
  requireStudentDataAccess,
};
