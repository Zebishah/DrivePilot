const test = require("node:test");
const assert = require("node:assert/strict");
const { cacheService, maxPayloadBytes } = require("./cacheService");

function createFakeRedis() {
  const values = new Map();
  const calls = { get: 0, set: 0, del: 0 };
  const matches = (value, pattern) => {
    const expression = new RegExp(
      `^${String(pattern)
        .split("*")
        .map((part) => part.replace(/[.+?^${}()|[\\]\\]/g, "\\$&"))
        .join(".*")}$`,
    );
    return expression.test(value);
  };
  return {
    isReady: true,
    calls,
    async get(key) {
      calls.get += 1;
      return values.get(key) ?? null;
    },
    async set(key, value) {
      calls.set += 1;
      values.set(key, value);
      return "OK";
    },
    async del(key) {
      calls.del += 1;
      return values.delete(key) ? 1 : 0;
    },
    async *scanIterator({ MATCH }) {
      for (const key of values.keys()) {
        if (matches(key, MATCH)) yield key;
      }
    },
  };
}

test("cache-aside serves the first value from the loader and subsequent values from Redis", async () => {
  const redis = createFakeRedis();
  const service = cacheService({ clientProvider: async () => redis });
  let databaseReads = 0;
  const loader = async () => {
    databaseReads += 1;
    return { id: "instructor-1", name: "Ava" };
  };

  assert.deepEqual(
    await service.getOrSet({ category: "instructor_profile", key: "instructor-1", loader }),
    { id: "instructor-1", name: "Ava" },
  );
  assert.deepEqual(
    await service.getOrSet({ category: "instructor_profile", key: "instructor-1", loader }),
    { id: "instructor-1", name: "Ava" },
  );
  assert.equal(databaseReads, 1);
  assert.equal(redis.calls.set, 1);
});

test("Redis outage falls back to the authoritative loader without throwing", async () => {
  const service = cacheService({ clientProvider: async () => null });
  let databaseReads = 0;
  const value = await service.getOrSet({
    category: "faq",
    key: "public",
    loader: async () => {
      databaseReads += 1;
      return [{ question: "Q", answer: "A" }];
    },
  });

  assert.deepEqual(value, [{ question: "Q", answer: "A" }]);
  assert.equal(databaseReads, 1);
});

test("a cache client error also falls back to the authoritative loader", async () => {
  const service = cacheService({
    clientProvider: async () => {
      throw new Error("redis unavailable");
    },
  });

  assert.deepEqual(
    await service.getOrSet({
      category: "instructor_tariff",
      key: "teacher-1",
      loader: async () => ({ lessonFee: 75 }),
    }),
    { lessonFee: 75 },
  );
});

test("concurrent misses use one loader flight", async () => {
  const redis = createFakeRedis();
  const service = cacheService({ clientProvider: async () => redis });
  let loaderCalls = 0;
  const loader = async () => {
    loaderCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { result: "authoritative" };
  };

  const results = await Promise.all(
    Array.from({ length: 20 }, () =>
      service.getOrSet({ category: "instructor_search", key: "same-query", loader }),
    ),
  );

  assert.equal(loaderCalls, 1);
  assert.equal(redis.calls.set, 1);
  assert.equal(results.every((result) => result.result === "authoritative"), true);
});

test("pattern invalidation removes only keys in the requested namespace", async () => {
  const redis = createFakeRedis();
  const service = cacheService({ clientProvider: async () => redis });
  await service.set("instructor_availability", "teacher-1:2026-09", { slots: [] });
  await service.set("instructor_availability", "teacher-2:2026-09", { slots: [] });

  assert.equal(
    await service.deletePattern("instructor_availability", "teacher-1:*"),
    1,
  );
  assert.equal(
    await service.get("instructor_availability", "teacher-1:2026-09"),
    undefined,
  );
  assert.deepEqual(
    await service.get("instructor_availability", "teacher-2:2026-09"),
    { slots: [] },
  );
});

test("oversized values are not written to Redis", async () => {
  const redis = createFakeRedis();
  const service = cacheService({ clientProvider: async () => redis });
  const result = await service.set("instructor_profile", "large", "x".repeat(maxPayloadBytes));

  assert.equal(result, false);
  assert.equal(redis.calls.set, 0);
});
