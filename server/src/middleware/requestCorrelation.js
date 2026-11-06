const crypto = require("crypto");
const { normalizeId } = require("../utils/logger");
const metrics = require("../utils/metrics");
const { logger } = require("../utils/logger");

function requestCorrelationMiddleware(req, res, next) {
  const incoming = req.get?.("x-request-id") || req.get?.("x-correlation-id");
  const requestId = normalizeId(incoming) || crypto.randomUUID();
  req.requestId = requestId;
  req.correlationId = requestId;
  res.setHeader("x-request-id", requestId);
  const startedAt = Date.now();
  res.on?.("finish", () => {
    const durationMs = Date.now() - startedAt;
    metrics.increment("http.request.count", 1, { method: req.method, route: req.path || req.url || "unknown" });
    metrics.observe("http.request.duration_ms", durationMs, { method: req.method, route: req.path || req.url || "unknown" });
    if (res.statusCode >= 400) metrics.increment("http.error.count", 1, { status: res.statusCode });
    logger.info("http_request_completed", {
      requestId,
      correlationId: requestId,
      method: req.method,
      route: req.path || req.url || "unknown",
      status: res.statusCode,
      durationMs,
    });
  });
  next();
}

module.exports = { requestCorrelationMiddleware };
