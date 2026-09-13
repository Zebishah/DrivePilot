const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

function isPresent(value) {
  return value != null && String(value).trim() !== "";
}

function booleanValue(name, value, fallback) {
  if (!isPresent(value)) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  throw new Error(`${name} must be true/false`);
}

function requireVariables(env, names) {
  return names.filter((name) => !isPresent(env[name]));
}

function requirePair(env, first, second) {
  const firstPresent = isPresent(env[first]);
  const secondPresent = isPresent(env[second]);
  if (firstPresent === secondPresent) return [];
  return [firstPresent ? second : first];
}

function hasFrontendUrl(env) {
  return isPresent(env.FRONTEND_URL) || isPresent(env.Frontend_URL);
}

/**
 * Validate only the environment needed by the process being started.
 * This intentionally does not log or interpolate values so startup failures
 * cannot disclose credentials, connection strings, or tokens.
 */
function validateEnvironment({ env = process.env } = {}) {
  const nodeEnv = String(env.NODE_ENV || "development").trim().toLowerCase();
  const production = nodeEnv === "production";
  const runApi = booleanValue("RUN_API", env.RUN_API, true);
  const runWorker = booleanValue(
    "RUN_WORKER",
    env.RUN_WORKER,
    booleanValue("CRON_RUNS", env.CRON_RUNS, false),
  );

  if (!runApi && !runWorker) {
    throw new Error("At least one of RUN_API or RUN_WORKER must be enabled");
  }

  const required = ["MONGODB_URI"];
  if (production) required.push("SLOT_TIMEZONE");

  if (runApi || runWorker) {
    required.push("STRIPE_SECRET_KEY");
    if (!hasFrontendUrl(env)) required.push("FRONTEND_URL");
  }

  if (runApi) {
    required.push("JWT_SECRET", "STRIPE_WEBHOOK_SECRET");
    if (production) {
      required.push(
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "AWS_REGION",
        "BUCKET_NAME",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
      );
    }
  }

  const emailEnabled = booleanValue("EMAIL_ENABLED", env.EMAIL_ENABLED, true);
  if (emailEnabled && (runApi || runWorker)) {
    required.push("RESEND_API_KEY", "EMAIL_FROM");
    const emailMode = String(env.EMAIL_MODE || "test").trim().toLowerCase();
    if (!["test", "production"].includes(emailMode)) {
      throw new Error("EMAIL_MODE must be test or production");
    }
    if (emailMode === "test") required.push("EMAIL_TEST_RECIPIENT");
    if (isPresent(env.EMAIL_PROVIDER) && String(env.EMAIL_PROVIDER).toLowerCase() !== "resend") {
      throw new Error("EMAIL_PROVIDER must be resend");
    }
  }

  const aiEnabled = booleanValue("AI_ENABLED", env.AI_ENABLED, true);
  const aiMode = String(env.AI_MODE || "fixture").trim().toLowerCase();
  const aiProvider = String(env.AI_PROVIDER || "gemini").trim().toLowerCase();
  if (aiEnabled && !["fixture", "live"].includes(aiMode)) {
    throw new Error("AI_MODE must be fixture or live");
  }
  if (aiEnabled && aiProvider !== "gemini") {
    throw new Error("AI_PROVIDER must be gemini");
  }
  if (production && aiEnabled && aiMode !== "live") {
    throw new Error("AI_MODE=fixture is not allowed when AI_ENABLED=true in production");
  }
  if (runApi && aiEnabled && aiMode === "live") required.push("GEMINI_API_KEY");

  if (production && isPresent(env.STRIPE_SECRET_KEY) && !String(env.STRIPE_SECRET_KEY).startsWith("sk_test_")) {
    throw new Error("Production deployment requires a Stripe test-mode secret key");
  }

  if (production && isPresent(env.STRIPE_WEBHOOK_SECRET) && !String(env.STRIPE_WEBHOOK_SECRET).startsWith("whsec_")) {
    throw new Error("STRIPE_WEBHOOK_SECRET must be a Stripe webhook signing secret");
  }

  if (production && runApi && isPresent(env.JWT_SECRET) && String(env.JWT_SECRET).length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production");
  }

  const missing = [
    ...new Set([
      ...requireVariables(env, required),
      ...(isPresent(env.GOOGLE_CLIENT_ID) || isPresent(env.GOOGLE_CLIENT_SECRET)
        ? requirePair(env, "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET")
        : []),
      ...(isPresent(env.FACEBOOK_APP_ID) || isPresent(env.FACEBOOK_APP_SECRET)
        ? requirePair(env, "FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET")
        : []),
    ]),
  ];

  if (missing.length) {
    throw new Error(`Missing required environment variable: ${missing[0]}`);
  }

  return { nodeEnv, production, runApi, runWorker, emailEnabled, aiEnabled, aiMode, aiProvider };
}

module.exports = { booleanValue, validateEnvironment };
