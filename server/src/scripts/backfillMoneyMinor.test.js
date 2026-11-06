const test = require("node:test");
const assert = require("node:assert/strict");
const { convert, updateOne } = require("./backfillMoneyMinor");

test("backfill conversion is explicit and reports invalid legacy values", () => {
  assert.equal(convert("10.01", "Transaction", "tx-1"), 1001);
  assert.equal(convert("not-money", "Transaction", "tx-2"), null);
});

test("backfill dry-run performs no writes and apply mode uses a missing-field guard", async () => {
  const calls = [];
  const model = { updateOne: async (...args) => calls.push(args) };
  await updateOne(model, { _id: "tx-1", amountMinor: { $exists: false } }, { amountMinor: 1001 }, "Transaction", false);
  assert.equal(calls.length, 0);
  await updateOne(model, { _id: "tx-1", amountMinor: { $exists: false } }, { amountMinor: 1001 }, "Transaction", true);
  assert.deepEqual(calls[0], [
    { _id: "tx-1", amountMinor: { $exists: false } },
    { $set: { amountMinor: 1001 } },
  ]);
});
