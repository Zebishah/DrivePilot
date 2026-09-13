function booleanValue(value, fallback) {
  if (value == null || value === "") return fallback;
  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const aiConfig = {
  enabled: booleanValue(process.env.AI_ENABLED, true),
  mode: String(process.env.AI_MODE || "fixture").toLowerCase(),
  provider: String(process.env.AI_PROVIDER || "gemini").toLowerCase(),
  apiKey: process.env.GEMINI_API_KEY || "",
  model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
  requestTimeoutMs: positiveInteger(process.env.AI_REQUEST_TIMEOUT_MS, 15_000),
  maxToolRounds: Math.min(positiveInteger(process.env.AI_MAX_TOOL_ROUNDS, 4), 8),
  maxToolsPerRequest: Math.min(positiveInteger(process.env.AI_MAX_TOOLS_PER_REQUEST, 6), 12),
  maxToolResultBytes: Math.min(positiveInteger(process.env.AI_MAX_TOOL_RESULT_BYTES, 32 * 1024), 128 * 1024),
  maxMessageChars: Math.min(positiveInteger(process.env.AI_MAX_MESSAGE_CHARS, 4_000), 10_000),
  maxHistoryMessages: Math.min(positiveInteger(process.env.AI_MAX_HISTORY_MESSAGES, 8), 20),
  maxHistoryChars: Math.min(positiveInteger(process.env.AI_MAX_HISTORY_CHARS, 12_000), 30_000),
  toolTimeoutMs: Math.min(positiveInteger(process.env.AI_TOOL_TIMEOUT_MS, 2_500), 10_000),
};

module.exports = aiConfig;
