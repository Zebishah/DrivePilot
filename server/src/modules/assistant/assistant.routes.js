const express = require("express");
const { ipKeyGenerator, rateLimit } = require("express-rate-limit");
const authMiddleware = require("../../middleware/auth");
const { assistantService } = require("./assistantService");
const { publicAssistantService } = require("./publicAssistantService");
const { logger } = require("../../utils/logger");

const router = express.Router();
const configuredWindow = Number(process.env.AI_RATE_LIMIT_WINDOW_MS);
const configuredMax = Number(process.env.AI_RATE_LIMIT_MAX);
function assistantRateLimitKey(req) {
  return req.assistantUser?.id
    ? `user:${req.assistantUser.id}`
    : `ip:${ipKeyGenerator(req.ip)}`;
}

const aiRateLimit = rateLimit({
  windowMs: Number.isInteger(configuredWindow) && configuredWindow > 0 ? configuredWindow : 60_000,
  limit: Number.isInteger(configuredMax) && configuredMax > 0 ? configuredMax : 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: assistantRateLimitKey,
  handler: (_req, res) => res.status(429).json({ error: "Assistant rate limit exceeded. Please try again shortly." }),
});

async function requireAssistantAuth(req, res, next) {
  const auth = await authMiddleware(req);
  if (!auth.user) return res.status(401).json({ error: "Authentication required" });
  req.assistantUser = auth.user;
  return next();
}

router.use(express.json({ limit: "32kb" }));
const publicRateLimit = rateLimit({
  windowMs: Number.isInteger(configuredWindow) && configuredWindow > 0 ? configuredWindow : 60_000,
  limit: Number.isInteger(configuredMax) && configuredMax > 0 ? configuredMax : 10,
  standardHeaders: "draft-7", legacyHeaders: false,
  keyGenerator: req => `public:${ipKeyGenerator(req.ip)}`,
  handler: (_req, res) => res.status(429).json({ error: "Please wait a moment before sending another message." }),
});
router.post("/api/v1/assistant/public/chat", publicRateLimit, async (req, res) => {
  try {
    return res.json(await publicAssistantService.chat({ message: req.body?.message, history: req.body?.history, requestId: req.requestId }));
  } catch (error) {
    const status = ["AI_INPUT_INVALID", "AI_INPUT_TOO_LARGE"].includes(error.code) ? 400 : 500;
    return res.status(status).json({ error: status === 400 ? error.message : "The product guide is temporarily unavailable." });
  }
});
router.post("/api/v1/assistant/chat", requireAssistantAuth, aiRateLimit, async (req, res) => {
  try {
    const result = await assistantService.chat({
      message: req.body?.message,
      history: req.body?.history,
      pageContext: req.body?.pageContext,
      user: req.assistantUser,
      requestId: req.requestId || req.correlationId,
    });
    return res.status(200).json(result);
  } catch (error) {
    const status = error?.code === "AI_INPUT_INVALID" || error?.code === "AI_INPUT_TOO_LARGE" ? 400 : error?.code === "AI_ROLE_UNSUPPORTED" ? 403 : 500;
    logger.warn("ai_request_rejected", { requestId: req.requestId, userRole: req.assistantUser?.role, code: error?.code || "AI_FAILURE" });
    return res.status(status).json({ error: status === 500 ? "Assistant is temporarily unavailable" : error.message });
  }
});

module.exports = router;
module.exports.assistantRateLimitKey = assistantRateLimitKey;
