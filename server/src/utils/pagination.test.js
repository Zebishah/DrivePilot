const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizePagination } = require("./pagination");

test("pagination applies defaults, integer offsets, and safe maximums", () => {
  assert.deepEqual(normalizePagination({}), { limit: 50, offset: 0 });
  assert.deepEqual(normalizePagination({ limit: 999, offset: -4 }), { limit: 200, offset: 0 });
  assert.deepEqual(normalizePagination({ limit: 20.8, offset: 3.9 }), { limit: 20, offset: 3 });
});
