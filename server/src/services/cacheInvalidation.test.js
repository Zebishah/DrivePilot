const test = require("node:test");
const assert = require("node:assert/strict");
const { createCacheInvalidation } = require("./cacheInvalidation");

function fakeCache() {
  const calls = [];
  return {
    calls,
    async delete(category, key) {
      calls.push(["delete", category, key]);
    },
    async deletePattern(category, suffix = "*") {
      calls.push(["deletePattern", category, suffix]);
    },
  };
}

test("profile invalidation clears the profile and all search variants", async () => {
  const fake = fakeCache();
  const { invalidateInstructorPublic } = createCacheInvalidation(fake);

  await invalidateInstructorPublic("teacher-1");

  assert.deepEqual(fake.calls, [
    ["delete", "instructor_profile", "teacher-1"],
    ["deletePattern", "instructor_search", "*"],
  ]);
});

test("tariff invalidation clears the tariff and search results", async () => {
  const fake = fakeCache();
  const { invalidateTariff } = createCacheInvalidation(fake);

  await invalidateTariff("teacher-1");

  assert.deepEqual(fake.calls, [
    ["delete", "instructor_tariff", "teacher-1"],
    ["deletePattern", "instructor_search", "*"],
  ]);
});

test("availability invalidation clears that instructor's month caches and public data", async () => {
  const fake = fakeCache();
  const { invalidateAvailability } = createCacheInvalidation(fake);

  await invalidateAvailability("teacher-1");

  assert.deepEqual(fake.calls, [
    ["deletePattern", "instructor_availability", "teacher-1:*"],
    ["delete", "instructor_profile", "teacher-1"],
    ["deletePattern", "instructor_search", "*"],
  ]);
});

test("FAQ invalidation clears the public FAQ cache key", async () => {
  const fake = fakeCache();
  const { invalidateFaqs } = createCacheInvalidation(fake);

  await invalidateFaqs();

  assert.deepEqual(fake.calls, [["delete", "faq", "public"]]);
});
