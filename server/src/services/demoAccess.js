const DEMO_ROLE_CONFIG = Object.freeze({
  ADMIN: Object.freeze({ role: "Admin", emailEnv: "DEMO_ADMIN_EMAIL" }),
  INSTRUCTOR: Object.freeze({ role: "Instructor", emailEnv: "DEMO_INSTRUCTOR_EMAIL" }),
  STUDENT: Object.freeze({ role: "Student", emailEnv: "DEMO_STUDENT_EMAIL" }),
});

function getDemoRoleConfig(role) {
  return DEMO_ROLE_CONFIG[String(role || "").trim().toUpperCase()] || null;
}

function getConfiguredDemoEmail(role, env = process.env) {
  const config = getDemoRoleConfig(role);
  if (!config) return null;
  const email = String(env[config.emailEnv] || "").trim().toLowerCase();
  return email || null;
}

module.exports = {
  DEMO_ROLE_CONFIG,
  getDemoRoleConfig,
  getConfiguredDemoEmail,
};
