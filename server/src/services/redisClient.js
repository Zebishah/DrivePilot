const { createClient } = require("redis");
const { logger } = require("../utils/logger");

const enabled = ["1", "true", "yes", "on"].includes(
  String(process.env.CACHE_ENABLED || "true").toLowerCase(),
);
const redisUrl = String(process.env.REDIS_URL || "").trim();
let client = null;
let connectPromise = null;
let lastConnectFailureAt = 0;
const retryCooldownMs = 5000;

function redisConfigured() {
  return enabled && Boolean(redisUrl);
}

function getClient() {
  if (!redisConfigured()) return null;
  if (!client) {
    client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 1000,
        reconnectStrategy: (retries) =>
          retries >= 3
            ? new Error("Redis reconnect limit reached")
            : Math.min(1000 * 2 ** retries, 30000),
      },
    });
    client.on("error", (error) => logger.warn("redis_client_error", { error }));
    client.on("ready", () => logger.info("redis_client_ready"));
    client.on("end", () => logger.warn("redis_client_disconnected"));
  }
  return client;
}

async function connectRedis() {
  const redis = getClient();
  if (!redis || redis.isReady) return redis;
  if (Date.now() - lastConnectFailureAt < retryCooldownMs) return null;
  if (!connectPromise) {
    connectPromise = redis.connect()
      .then(() => {
        lastConnectFailureAt = 0;
        return redis;
      })
      .catch((error) => {
        lastConnectFailureAt = Date.now();
        logger.warn("redis_connect_failed", { error, fallback: "mongodb" });
        return null;
      })
      .finally(() => { connectPromise = null; });
  }
  return connectPromise;
}

async function closeRedis() {
  if (client?.isOpen) await client.quit().catch(() => client.disconnect());
  client = null;
  connectPromise = null;
  lastConnectFailureAt = 0;
}

function redisStatus() {
  return { configured: redisConfigured(), ready: Boolean(client?.isReady) };
}

module.exports = { connectRedis, closeRedis, getClient, redisStatus };
