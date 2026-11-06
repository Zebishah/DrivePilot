const crypto = require("crypto");

const SENSITIVE_KEY = /(authorization|cookie|secret|password|token|otp|client.?secret|payment.?method|card|webhook.?payload|document)/i;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,128}$/;

function safeString(value, max = 1000) {
  return String(value).slice(0, max);
}

function sanitize(value, key = "", depth = 0) {
  if (SENSITIVE_KEY.test(key)) return undefined;
  if (value instanceof Error) {
    return {
      code: safeString(value.code || "INTERNAL", 120),
      message: safeString(value.message || value, 1000),
    };
  }
  if (value == null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return safeString(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toHexString === "function") return safeString(value.toHexString(), 128);
  if (depth > 2) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item, key, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([childKey]) => !SENSITIVE_KEY.test(childKey))
        .slice(0, 50)
        .map(([childKey, childValue]) => [childKey, sanitize(childValue, childKey, depth + 1)])
        .filter(([, childValue]) => childValue !== undefined),
    );
  }
  return safeString(value);
}

function normalizeId(value) {
  const id = String(value || "");
  return SAFE_ID.test(id) ? id : undefined;
}

function classifyError(error) {
  const code = String(error?.code || error?.type || "").toUpperCase();
  const status = Number(error?.statusCode || error?.status || 0);
  if (code.includes("VALID") || error?.name === "ValidationError") return "VALIDATION";
  if (code.includes("AUTH") || code.includes("FORBIDDEN") || status === 401 || status === 403) return "AUTHORIZATION";
  if (code.includes("CONFLICT") || code === "11000" || status === 409) return "CONFLICT";
  if (code.includes("TIMEOUT") || code.includes("ETIMEDOUT") || code.includes("ECONNRESET") || code.includes("EAI_AGAIN") || code.includes("NETWORK") || code.includes("RATE") || code.includes("503") || status >= 500) return "PROVIDER_RETRYABLE";
  if (code.includes("STRIPE") || code.includes("PROVIDER")) return "PROVIDER_PERMANENT";
  if (code.includes("DB") || code.includes("MONGO")) return "DATABASE_RETRYABLE";
  if (code.includes("MANUAL") || code.includes("AMBIGUOUS")) return "FINANCIAL_MANUAL_REVIEW";
  return "INTERNAL";
}

function emit(level, event, context = {}) {
  const record = {
    level,
    event: safeString(event, 160),
    timestamp: new Date().toISOString(),
    ...sanitize(context),
  };
  const writer = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  writer(JSON.stringify(record));
  return record;
}

function createLogger(baseContext = {}) {
  const withBase = (context) => ({ ...baseContext, ...(context || {}) });
  return {
    debug: (event, context) => emit("debug", event, withBase(context)),
    info: (event, context) => emit("info", event, withBase(context)),
    warn: (event, context) => emit("warn", event, withBase(context)),
    error: (event, context) => emit("error", event, withBase(context)),
    child: (context) => createLogger(withBase(context)),
  };
}

const logger = createLogger();

module.exports = {
  SAFE_ID,
  classifyError,
  normalizeId,
  sanitize,
  emit,
  createLogger,
  logger,
  requestId: () => crypto.randomUUID(),
};
