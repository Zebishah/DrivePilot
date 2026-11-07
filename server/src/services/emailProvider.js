const { logger } = require("../utils/logger");

const ELASTIC_EMAIL_ENDPOINT = "https://api.elasticemail.com/v4/emails/transactional";

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
  // Keep deployments using the original single-variable configuration working.
  return String(env.EMAIL_FROM || "").trim();
}

function normalizeReplyTo(value) {
  if (!value) return undefined;
  const values = Array.isArray(value) ? value : [value];
  return values.map((item) => {
    const parsed = parseEmailAddress(item);
    return parsed.displayName ? `${parsed.displayName} <${parsed.email}>` : parsed.email;
  }).join(",");
}

function createElasticEmailProvider({ fetchImpl = global.fetch, env = process.env } = {}) {
  const enabled = boolEnv(env.EMAIL_ENABLED, true);
  const mode = String(env.EMAIL_MODE || "test").trim().toLowerCase();
  const timeoutMs = Math.max(Number(env.EMAIL_REQUEST_TIMEOUT_MS) || 10000, 1000);

  return {
    isEnabled: () => enabled,
    async send({ to, from, subject, html, text, replyTo, tracking }) {
      if (!enabled) return { skipped: true, reason: "EMAIL_DISABLED" };
      if (typeof fetchImpl !== "function") {
        throw new EmailProviderError("Fetch is unavailable for Elastic Email", {
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
      if (!String(env.ELASTIC_EMAIL_API_KEY || "").trim()) {
        throw new EmailProviderError("ELASTIC_EMAIL_API_KEY is not configured", {
          code: "ELASTIC_EMAIL_API_KEY_MISSING",
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
      const content = {
        Body: [
          { ContentType: "HTML", Charset: "utf-8", Content: String(html) },
          { ContentType: "PlainText", Charset: "utf-8", Content: String(text) },
        ],
        From: sender.displayName ? `${sender.displayName} <${sender.email}>` : sender.email,
        Subject: String(subject),
      };
      const normalizedReplyTo = normalizeReplyTo(replyTo);
      if (normalizedReplyTo) content.ReplyTo = normalizedReplyTo;

      const options = {};
      if (tracking && tracking.trackOpens !== undefined) {
        options.TrackOpens = String(Boolean(tracking.trackOpens));
      }
      if (tracking && tracking.trackClicks !== undefined) {
        options.TrackClicks = String(Boolean(tracking.trackClicks));
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(ELASTIC_EMAIL_ENDPOINT, {
          method: "POST",
          headers: {
            "X-ElasticEmail-ApiKey": String(env.ELASTIC_EMAIL_API_KEY).trim(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Recipients: { To: recipients },
            Content: content,
            ...(Object.keys(options).length ? { Options: options } : {}),
          }),
          signal: controller.signal,
        });
        let body = null;
        try { body = await response.json(); } catch (_) { body = null; }
        if (!response.ok) {
          const retryable = response.status === 429 || response.status >= 500;
          throw new EmailProviderError(`Elastic Email request failed with status ${response.status}`, {
            code: `ELASTICEMAIL_${response.status}`,
            status: response.status,
            retryable,
          });
        }

        const providerMessageId = body?.MessageID || body?.TransactionID;
        if (!providerMessageId) {
          throw new EmailProviderError("Elastic Email returned an invalid response", {
            code: "ELASTICEMAIL_RESPONSE_INVALID",
            status: response.status,
            retryable: false,
          });
        }
        logger.info("email_sent", {
          provider: "elasticemail",
          providerMessageId,
          testMode: mode === "test",
        });
        return { provider: "elasticemail", providerMessageId, intendedRecipients };
      } catch (error) {
        if (error instanceof EmailProviderError) throw error;
        if (error?.name === "AbortError") {
          throw new EmailProviderError("Elastic Email request timed out", {
            code: "EMAIL_TIMEOUT",
            retryable: true,
          });
        }
        throw new EmailProviderError("Elastic Email request failed", {
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
  const provider = String(env.EMAIL_PROVIDER || "elasticemail").trim().toLowerCase();
  if (provider !== "elasticemail") {
    throw new Error(`Unsupported EMAIL_PROVIDER: ${provider || "(empty)"}. Expected elasticemail`);
  }
  return createElasticEmailProvider({ fetchImpl, env });
}

const emailProvider = createEmailProvider();

module.exports = {
  ELASTIC_EMAIL_ENDPOINT,
  EmailProviderError,
  createElasticEmailProvider,
  createEmailProvider,
  resolveConfiguredFrom,
  parseEmailAddress,
  emailProvider,
};
