const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET ||= "demo-login-test-secret-at-least-32-characters";
// Stub provider initialization; this resolver test does not make Stripe API calls.
process.env.STRIPE_SECRET_KEY ||= "sk_test_demo_login_fixture_000000000000";
process.env.DEMO_ADMIN_EMAIL = "admin.demo@example.test";
process.env.DEMO_INSTRUCTOR_EMAIL = "instructor.demo@example.test";
process.env.DEMO_STUDENT_EMAIL = "student.demo@example.test";

const { User } = require("../models/User");
const resolvers = require("./resolvers");

test("loginDemo creates an authenticated payload for each configured role", async () => {
  const previousFindOne = User.findOne;
  const calls = [];
  User.findOne = async (query) => {
    calls.push(query);
    return {
      _id: { toString: () => `demo-${query.role.toLowerCase()}` },
      role: query.role,
      toObject: () => ({
        _id: `demo-${query.role.toLowerCase()}`,
        id: `demo-${query.role.toLowerCase()}`,
        email: query.email,
        firstName: "Demo",
        lastName: query.role,
        role: query.role,
        isDemo: true,
        password: "must-not-be-returned",
      }),
    };
  };

  try {
    for (const [role, expectedRole] of [
      ["ADMIN", "Admin"],
      ["INSTRUCTOR", "Instructor"],
      ["STUDENT", "Student"],
    ]) {
      const result = await resolvers.Mutation.loginDemo(null, { role });
      assert.equal(result.success, true);
      assert.equal(typeof result.token, "string");
      assert.equal(result.user.role, expectedRole);
      assert.equal(result.user.isDemo, true);
      assert.equal(Object.hasOwn(result.user, "password"), false);
    }
    assert.deepEqual(calls.map((query) => query.isDemo), [true, true, true]);
  } finally {
    User.findOne = previousFindOne;
  }
});
