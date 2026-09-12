const { connectRedis } = require("./redisClient");
const metrics = require("../utils/metrics");
const { logger } = require("../utils/logger");

const prefix = String(process.env.CACHE_KEY_PREFIX || "dsp").replace(/[^A-Za-z0-9:_-]/g, "_");
const version = String(process.env.CACHE_SCHEMA_VERSION || "v1").replace(/[^A-Za-z0-9:_-]/g, "_");
const defaultTtl = Math.max(Number(process.env.CACHE_DEFAULT_TTL_SECONDS) || 300, 1);
const maxPayloadBytes = 512 * 1024;
const flights = new Map();

function fullKey(category, key) {
  return `${prefix}:${version}:${String(category).replace(/[^A-Za-z0-9:_-]/g, "_")}:${String(key).slice(0, 300)}`;
}

function observeLatency(category, operation, startedAt) {
  metrics.observe("cache_latency_ms", Date.now() - startedAt, { category, operation });
}

async function getClientSafely(clientProvider, category, operation) {
  try {
    return await clientProvider();
  } catch (error) {
    metrics.increment("cache_error", 1, { category });
    logger.warn("cache_client_unavailable", {
      category,
      operation,
      error,
      fallback: "mongodb",
    });
    return null;
  }
}

function cacheService({ clientProvider = connectRedis } = {}) {
  async function get(category, key) {
    const startedAt = Date.now();
    const client = await getClientSafely(clientProvider, category, "get");
    if (!client?.isReady) {
      metrics.increment("cache_fallback_db", 1, { category });
      observeLatency(category, "get", startedAt);
      return undefined;
    }
    try {
      const raw = await client.get(fullKey(category, key));
      if (raw == null) {
        metrics.increment("cache_miss", 1, { category });
        observeLatency(category, "get", startedAt);
        return undefined;
      }
      metrics.increment("cache_hit", 1, { category });
      const value = JSON.parse(raw);
      observeLatency(category, "get", startedAt);
      return value;
    } catch (error) {
      metrics.increment("cache_error", 1, { category });
      logger.warn("cache_get_failed", { category, operation: "get", error, fallback: "mongodb" });
      observeLatency(category, "get", startedAt);
      return undefined;
    }
  }

  async function set(category, key, value, ttlSeconds = defaultTtl) {
    const startedAt = Date.now();
    let serialized;
    try {
      serialized = JSON.stringify(value);
    } catch (error) {
      metrics.increment("cache_error", 1, { category });
      logger.warn("cache_serialize_failed", { category, operation: "set", error });
      observeLatency(category, "set", startedAt);
      return false;
    }
    if (Buffer.byteLength(serialized, "utf8") > maxPayloadBytes) {
      logger.warn("cache_payload_skipped", { category, operation: "set" });
      observeLatency(category, "set", startedAt);
      return false;
    }
    const client = await getClientSafely(clientProvider, category, "set");
    if (!client?.isReady) {
      observeLatency(category, "set", startedAt);
      return false;
    }
    try {
      await client.set(fullKey(category, key), serialized, { EX: Math.max(Number(ttlSeconds) || defaultTtl, 1) });
      metrics.increment("cache_set", 1, { category });
      observeLatency(category, "set", startedAt);
      return true;
    } catch (error) {
      metrics.increment("cache_error", 1, { category });
      logger.warn("cache_set_failed", { category, operation: "set", error });
      observeLatency(category, "set", startedAt);
      return false;
    }
  }

  async function del(category, key) {
    const startedAt = Date.now();
    const client = await getClientSafely(clientProvider, category, "delete");
    if (!client?.isReady) {
      observeLatency(category, "delete", startedAt);
      return false;
    }
    try {
      await client.del(fullKey(category, key));
      metrics.increment("cache_invalidation", 1, { category });
      observeLatency(category, "delete", startedAt);
      return true;
    } catch (error) {
      metrics.increment("cache_error", 1, { category });
      logger.warn("cache_delete_failed", { category, operation: "delete", error });
      observeLatency(category, "delete", startedAt);
      return false;
    }
  }

  async function deletePattern(category, suffix = "*") {
    const startedAt = Date.now();
    const client = await getClientSafely(clientProvider, category, "delete_pattern");
    if (!client?.isReady) {
      observeLatency(category, "delete_pattern", startedAt);
      return 0;
    }
    let deleted = 0;
    try {
      for await (const key of client.scanIterator({ MATCH: fullKey(category, suffix), COUNT: 100 })) {
        if (key) deleted += await client.del(key);
      }
      if (deleted) metrics.increment("cache_invalidation", deleted, { category });
      observeLatency(category, "delete_pattern", startedAt);
    } catch (error) {
      metrics.increment("cache_error", 1, { category });
      logger.warn("cache_pattern_delete_failed", { category, operation: "delete_pattern", error });
      observeLatency(category, "delete_pattern", startedAt);
    }
    return deleted;
  }

  async function getOrSet({ category, key, ttlSeconds = defaultTtl, loader }) {
    const flightKey = fullKey(category, key);
    if (flights.has(flightKey)) {
      metrics.increment("cache_stampede_wait", 1, { category });
      return flights.get(flightKey);
    }
    const flight = (async () => {
      const cached = await get(category, key);
      if (cached !== undefined) return cached;
      const value = await loader();
      await set(category, key, value, ttlSeconds);
      return value;
    })();
    flights.set(flightKey, flight);
    try { return await flight; } finally { flights.delete(flightKey); }
  }

  return { get, set, delete: del, deletePattern, getOrSet, fullKey };
}

const cache = cacheService();
module.exports = { cache, cacheService, fullKey, maxPayloadBytes };
