const test = require("node:test");
const assert = require("node:assert/strict");

test("StudentBooking has one canonical model regardless of import path", () => {
  const canonical = require("./studentBooking.model");
  const compatibilityImport = require("./StudentBooking");
  assert.equal(compatibilityImport, canonical);
  assert.equal(compatibilityImport.collection.name, "studentbookings");
});
