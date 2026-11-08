const { logger } = require("../utils/logger");

const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";

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

function parseEmailAddress(value) {
  const raw = String(value || "").trim();
  const displayAddress = raw.match(/^(.+?)\s*<([^<>@\s]+@[^<>@\s]+)>$/);
  if (displayAddress) {
    const displayName = displayAddress[1].trim().replace(/^['"]|['"]$/g, "").trim();
    const email = displayAddress[2].trim();
    return { displayName, email };
  }
  if (/^[^<>@\s]+@[^<>@\s]+$/.test(raw)) return { displayName: "", email: raw };
  throw new EmailProviderError("Configured sender must be a valid email address", {
    code: "EMAIL_FROM_INVALID",
    retryable: false,
  });
}

function resolveConfiguredFrom(env = process.env) {
  const address = String(env.EMAIL_FROM_ADDRESS || "").trim();
  if (address) {
    const name = String(env.EMAIL_FROM_NAME || "Drive Pilot").trim();
    return name ? `${name} <${address}>` : address;
  }
  return String(env.EMAIL_FROM || "").trim();
}

function normalizeReplyTo(value) {
  if (!value) return undefined;
  const values = Array.isArray(value) ? value : [value];
  return values.map((item) => {
    const parsed = parseEmailAddress(item);
    return parsed.displayName ? `${parsed.displayName} <${parsed.email}>` : parsed.email;
  });
}

function createResendEmailProvider({ fetchImpl = global.fetch, env = process.env } = {}) {
  const enabled = boolEnv(env.EMAIL_ENABLED, true);
  const mode = String(env.EMAIL_MODE || "test").trim().toLowerCase();
  const timeoutMs = Math.max(Number(env.EMAIL_REQUEST_TIMEOUT_MS) || 10000, 1000);

  return {
    isEnabled: () => enabled,
    async send({ to, from, subject, html, text, replyTo, metadata }) {
      if (!enabled) return { skipped: true, reason: "EMAIL_DISABLED" };
      if (typeof fetchImpl !== "function") {
        throw new EmailProviderError("Fetch is unavailable for Resend", {
          code: "EMAIL_FETCH_UNAVAILABLE",
          retryable: false,
        });
      }
      if (!["test", "production"].includes(mode)) {
        throw new EmailProviderError("EMAIL_MODE must be test or production", {
          code: "EMAIL_MODE_INVALID",
          retryable: false,
        });
      }

      const intendedRecipients = (Array.isArray(to) ? to : [to])
        .map((value) => String(value || "").trim())
        .filter(Boolean);
      if (!intendedRecipients.length) {
        throw new EmailProviderError("At least one email recipient is required", {
          code: "EMAIL_RECIPIENT_INVALID",
          retryable: false,
        });
      }
      const recipients = mode === "test"
        ? [String(env.EMAIL_TEST_RECIPIENT || "").trim()]
        : intendedRecipients;
      if (!recipients[0]) {
        throw new EmailProviderError("EMAIL_TEST_RECIPIENT is required in test mode", {
          code: "EMAIL_TEST_RECIPIENT_MISSING",
          retryable: false,
        });
      }
      const apiKey = String(env.RESEND_API_KEY || "").trim();
      if (!apiKey) {
        throw new EmailProviderError("RESEND_API_KEY is not configured", {
          code: "RESEND_API_KEY_MISSING",
          retryable: false,
        });
      }
      if (!from || !subject || !html || !text) {
        throw new EmailProviderError("Email message is incomplete", {
          code: "EMAIL_MESSAGE_INVALID",
          retryable: false,
        });
      }

      const sender = parseEmailAddress(from);
      const payload = {
        from: sender.displayName ? `${sender.displayName} <${sender.email}>` : sender.email,
        to: recipients,
        subject: String(subject),
        html: String(html),
        text: String(text),
      };
      const normalizedReplyTo = normalizeReplyTo(replyTo);
      if (normalizedReplyTo?.length) payload.reply_to = normalizedReplyTo;

      const headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };
      // An outbox event ID stays stable across retries; Resend deduplicates for 24 hours.
      const eventId = String(metadata?.outboxEventId || "").trim();
      if (eventId) headers["Idempotency-Key"] = `drive-pilot-email/${eventId}`.slice(0, 256);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(RESEND_EMAIL_ENDPOINT, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        let body = null;
        try { body = await response.json(); } catch (_) { body = null; }
        if (!response.ok) {
          const retryable = response.status === 429 || response.status >= 500 ||
            (response.status === 409 && body?.name === "concurrent_idempotent_requests");
          throw new EmailProviderError(`Resend request failed with status ${response.status}`, {
            code: `RESEND_${response.status}`,
            status: response.status,
            retryable,
          });
        }
        const providerMessageId = body?.id;
        if (typeof providerMessageId !== "string" || !providerMessageId.trim()) {
          throw new EmailProviderError("Resend returned an invalid response", {
            code: "RESEND_RESPONSE_INVALID",
            status: response.status,
            retryable: false,
          });
        }
        logger.info("email_sent", {
          provider: "resend",
          providerMessageId,
          testMode: mode === "test",
        });
        return { provider: "resend", providerMessageId, intendedRecipients };
      } catch (error) {
        if (error instanceof EmailProviderError) throw error;
        if (error?.name === "AbortError") {
          throw new EmailProviderError("Resend request timed out", {
            code: "EMAIL_TIMEOUT",
            retryable: true,
          });
        }
        throw new EmailProviderError("Resend request failed", {
          code: "EMAIL_NETWORK_ERROR",
          retryable: true,
        });
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

function createEmailProvider({ fetchImpl = global.fetch, env = process.env } = {}) {
  const provider = String(env.EMAIL_PROVIDER || "resend").trim().toLowerCase();
  if (provider !== "resend") {
    throw new Error(`Unsupported EMAIL_PROVIDER: ${provider || "(empty)"}. Expected resend`);
  }
  return createResendEmailProvider({ fetchImpl, env });
}

const emailProvider = createEmailProvider();

module.exports = {
  RESEND_EMAIL_ENDPOINT,
  EmailProviderError,
  createResendEmailProvider,
  createEmailProvider,
  resolveConfiguredFrom,
  parseEmailAddress,
  emailProvider,
};
