const { logger } = require("../../utils/logger");
const aiConfig = require("../../config/aiConfig");

class AiProviderError extends Error {
  constructor(message, { code = "AI_PROVIDER_ERROR", status, retryable = true } = {}) {
    super(message);
    this.name = "AiProviderError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

function responseText(parts = []) {
  return parts.filter((part) => typeof part?.text === "string").map((part) => part.text).join("\n").trim();
}

function geminiContent(message) {
  if (message.role === "tool") {
    return {
      role: "user",
      parts: [{ functionResponse: { name: message.name, response: { content: message.content } } }],
    };
  }
  return {
    role: message.role === "assistant" ? "model" : "user",
    parts: message.parts || [{ text: String(message.content || "") }],
  };
}

function geminiTools(tools = []) {
  return [{
    functionDeclarations: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema || { type: "OBJECT", properties: {}, additionalProperties: false },
    })),
  }];
}

function createGeminiProvider({ fetchImpl = global.fetch, env = process.env, config = aiConfig } = {}) {
  return {
    isEnabled: () => config.enabled && config.mode === "live" && config.provider === "gemini",
    async generate({ system, messages, tools, temperature = 0.2, maxTokens = 500, metadata = {} }) {
      if (!config.enabled || config.mode === "disabled") {
        throw new AiProviderError("AI assistant is disabled", { code: "AI_DISABLED", retryable: false });
      }
      if (config.mode !== "live" || config.provider !== "gemini") {
        throw new AiProviderError("Gemini live mode is not selected", { code: "AI_MODE_NOT_LIVE", retryable: false });
      }
      if (!env.GEMINI_API_KEY || typeof fetchImpl !== "function") {
        throw new AiProviderError("Gemini is not configured", { code: "AI_CONFIGURATION_MISSING", retryable: false });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
      try {
        const response = await fetchImpl(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents: messages.map(geminiContent),
              ...(tools?.length ? { tools: geminiTools(tools) } : {}),
              generationConfig: { temperature, maxOutputTokens: maxTokens },
            }),
            signal: controller.signal,
          },
        );
        let body = null;
        try { body = await response.json(); } catch (_) { body = null; }
        if (!response.ok) {
          const retryable = response.status === 429 || response.status >= 500;
          throw new AiProviderError(`Gemini request failed with status ${response.status}`, {
            code: `AI_PROVIDER_${response.status}`,
            status: response.status,
            retryable,
          });
        }
        const parts = body?.candidates?.[0]?.content?.parts || [];
        const toolCalls = parts
          .filter((part) => part?.functionCall?.name)
          .map((part) => ({ name: part.functionCall.name, arguments: part.functionCall.args || {} }));
        const usage = body?.usageMetadata
          ? { inputTokens: body.usageMetadata.promptTokenCount || 0, outputTokens: body.usageMetadata.candidatesTokenCount || 0 }
          : undefined;
        logger.info("ai_provider_success", { provider: "gemini", model: config.model, toolCount: toolCalls.length, requestId: metadata.requestId });
        return { text: responseText(parts), toolCalls, usage, assistantParts: parts };
      } catch (error) {
        if (error instanceof AiProviderError) throw error;
        throw new AiProviderError(error?.name === "AbortError" ? "Gemini request timed out" : "Gemini request failed", {
          code: error?.name === "AbortError" ? "AI_PROVIDER_TIMEOUT" : "AI_PROVIDER_NETWORK_ERROR",
          retryable: true,
        });
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

function fixtureToolCall(message, role) {
  const text = String(message || "").toLowerCase();
  if (role === "Student") {
    if (text.includes("refund")) return { name: "getMyRefundStatus", arguments: {} };
    if (text.includes("instructor")) return { name: "getMyInstructorOptions", arguments: {} };
    if (text.includes("payment") || text.includes("charge") || text.includes("action")) return { name: "getMyPaymentStatus", arguments: {} };
    if (text.includes("spent") || text.includes("cost")) return { name: "getMyBookingSummary", arguments: {} };
    return { name: "getMyUpcomingLessons", arguments: {} };
  }
  if (role === "Instructor") {
    if (text.includes("payout") || text.includes("paid")) return { name: "getMyPayoutSummary", arguments: {} };
    if (text.includes("availability")) return { name: "getMyAvailabilitySummary", arguments: {} };
    if (text.includes("action") && text.includes("pending")) return { name: "getMyPendingActions", arguments: {} };
    if (text.includes("student") || text.includes("attention")) return { name: "getMyStudentSummary", arguments: {} };
    return { name: "getMyTeachingSchedule", arguments: {} };
  }
  if (text.includes("refund")) return { name: "getRefundsNeedingAttention", arguments: {} };
  if (text.includes("payout")) return { name: "getPayoutsNeedingAttention", arguments: {} };
  if (text.includes("manual") || text.includes("retry")) return { name: "getFinancialManualReview", arguments: {} };
  if (text.includes("operational") || text.includes("issue")) {
    return [
      { name: "getOperationalSummary", arguments: {} },
      { name: "getFinancialManualReview", arguments: {} },
    ];
  }
  return { name: "getRecentBookingSummary", arguments: {} };
}

function createFixtureProvider({ config = aiConfig } = {}) {
  return {
    isEnabled: () => config.enabled && config.mode === "fixture",
    async generate({ messages, metadata = {} }) {
      if (process.env.AI_FIXTURE_FAILURE === "true") {
        throw new AiProviderError("Fixture provider failure", { code: "AI_FIXTURE_FAILURE", retryable: true });
      }
      const lastTool = [...messages].reverse().find((message) => message.role === "tool");
      if (lastTool) return { text: "Verified application data is available below." };
      const latestUser = [...messages].reverse().find((message) => message.role === "user")?.content || "";
      const selected = fixtureToolCall(latestUser, metadata.userRole);
      return { text: "", toolCalls: Array.isArray(selected) ? selected : [selected] };
    },
  };
}

function createAiProvider(options = {}) {
  if (aiConfig.mode === "fixture") return createFixtureProvider(options);
  return createGeminiProvider(options);
}

const aiProvider = createAiProvider();
module.exports = { AiProviderError, createAiProvider, createFixtureProvider, createGeminiProvider, aiProvider };
