const { logger } = require("../utils/logger");

class EmailProviderError extends Error {
  constructor(message, { code = "EMAIL_PROVIDER_ERROR", status, retryable = true } = {}) {
    super(message);
    this.name = "EmailProviderError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

function boolEnv(value, fallback) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function createResendProvider({ fetchImpl = global.fetch, env = process.env } = {}) {
  const enabled = boolEnv(env.EMAIL_ENABLED, true);
  const mode = String(env.EMAIL_MODE || "test").toLowerCase();
  const timeoutMs = Math.max(Number(env.EMAIL_REQUEST_TIMEOUT_MS) || 10000, 1000);

  return {
    isEnabled: () => enabled,
    async send({ to, from, subject, html, text }) {
      if (!enabled) return { skipped: true, reason: "EMAIL_DISABLED" };
      if (typeof fetchImpl !== "function") {
        throw new EmailProviderError("Fetch is unavailable for Resend", { code: "EMAIL_FETCH_UNAVAILABLE", retryable: false });
      }
      const intendedRecipients = Array.isArray(to) ? to : [to];
      const recipient = mode === "test" ? env.EMAIL_TEST_RECIPIENT : intendedRecipients[0];
      if (!recipient) {
        throw new EmailProviderError("EMAIL_TEST_RECIPIENT is required in test mode", { code: "EMAIL_TEST_RECIPIENT_MISSING", retryable: false });
      }
      if (!env.RESEND_API_KEY) {
        throw new EmailProviderError("RESEND_API_KEY is not configured", { code: "RESEND_API_KEY_MISSING", retryable: false });
      }
      if (!from || !subject || !html || !text) {
        throw new EmailProviderError("Email message is incomplete", { code: "EMAIL_MESSAGE_INVALID", retryable: false });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from, to: [recipient], subject, html, text }),
          signal: controller.signal,
        });
        let body = null;
        try { body = await response.json(); } catch (_) { body = null; }
        if (!response.ok) {
          const retryable = response.status === 429 || response.status >= 500;
          throw new EmailProviderError(`Resend request failed with status ${response.status}`, {
            code: `RESEND_${response.status}`,
            status: response.status,
            retryable,
          });
        }
        logger.info("email_sent", { provider: "resend", providerMessageId: body?.id || null, testMode: mode === "test" });
        return { provider: "resend", providerMessageId: body?.id || null, intendedRecipients };
      } catch (error) {
        if (error instanceof EmailProviderError) throw error;
        throw new EmailProviderError(error.name === "AbortError" ? "Resend request timed out" : "Resend request failed", {
          code: error.name === "AbortError" ? "EMAIL_TIMEOUT" : "EMAIL_NETWORK_ERROR",
          retryable: true,
        });
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

const emailProvider = createResendProvider();

module.exports = { EmailProviderError, createResendProvider, emailProvider };
