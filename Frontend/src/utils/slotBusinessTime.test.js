import assert from "node:assert/strict";
import test from "node:test";
import { isBusinessSlotStartPast } from "./slotBusinessTime.ts";

test("19:30 Zurich is not past at 17:10 Zurich / 20:10 Pakistan", () => {
  // 2026-08-05 20:10 in Pakistan (UTC+5) = 15:10 UTC = 17:10 Zurich (UTC+2)
  const nowMs = Date.parse("2026-08-05T15:10:00.000Z");
  assert.equal(
    isBusinessSlotStartPast("2026-08-05", "19:30", nowMs),
    false,
  );
});

test("19:30 Zurich is past after 19:30 Zurich", () => {
  const nowMs = Date.parse("2026-08-05T17:35:00.000Z"); // 19:35 Zurich
  assert.equal(
    isBusinessSlotStartPast("2026-08-05", "19:30", nowMs),
    true,
  );
});
