const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEMO_ROLE_CONFIG,
  getConfiguredDemoEmail,
  getDemoRoleConfig,
} = require("./demoAccess");

test("demo access only accepts the three supported roles", () => {
  assert.equal(getDemoRoleConfig("ADMIN").role, "Admin");
  assert.equal(getDemoRoleConfig("instructor").role, "Instructor");
  assert.equal(getDemoRoleConfig("STUDENT").role, "Student");
  assert.equal(getDemoRoleConfig("SUPER_ADMIN"), null);
  assert.deepEqual(Object.keys(DEMO_ROLE_CONFIG), ["ADMIN", "INSTRUCTOR", "STUDENT"]);
});

test("demo email is resolved from server environment only", () => {
  const env = { DEMO_STUDENT_EMAIL: "  student.demo@example.test " };
  assert.equal(getConfiguredDemoEmail("STUDENT", env), "student.demo@example.test");
  assert.equal(getConfiguredDemoEmail("ADMIN", env), null);
  assert.equal(getConfiguredDemoEmail("INVALID", env), null);
});
