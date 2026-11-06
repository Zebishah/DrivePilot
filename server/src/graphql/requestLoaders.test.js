const test = require("node:test");
const assert = require("node:assert/strict");
const { createBatchLoader, createRequestLoaders } = require("./requestLoaders");

test("request-scoped batch loader performs one bounded batch and caches by ID", async () => {
  const calls = [];
  const loader = createBatchLoader(async (ids) => {
    calls.push(ids);
    return ids.map((id) => ({ _id: id, value: id }));
  });

  const values = await Promise.all([
    loader.load("booking-1"),
    loader.load("booking-2"),
    loader.load("booking-1"),
  ]);

  assert.deepEqual(calls, [["booking-1", "booking-2"]]);
  assert.equal(values[0], values[2]);
  assert.equal(values[1].value, "booking-2");
});

test("booking and user fields stay bounded for a transaction list", async () => {
  const calls = { users: 0, bookings: 0 };
  const fakeModel = (kind) => ({
    find: ({ _id: { $in: ids } }) => {
      calls[kind] += 1;
      return {
        select() { return this; },
        lean: async () => ids.map((id) => ({ _id: id })),
      };
    },
  });
  const loaders = createRequestLoaders({
    userModel: fakeModel("users"),
    bookingModel: fakeModel("bookings"),
  });

  await Promise.all(
    Array.from({ length: 20 }, (_, index) =>
      Promise.all([
        loaders.user.load(`user-${index % 5}`),
        loaders.booking.load(`booking-${index % 5}`),
      ]),
    ),
  );

  assert.equal(calls.users, 1);
  assert.equal(calls.bookings, 1);
});
