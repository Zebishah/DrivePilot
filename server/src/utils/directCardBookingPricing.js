function buildDirectCardSlotSplits({
  finalAmount,
  numSlots,
  instructor,
  platformSettings,
  getCommissionSplit,
  getCommissionSplitMinor,
}) {
  if (!platformSettings) {
    throw new Error("Platform commission settings are required");
  }
  if (!Number.isInteger(numSlots) || numSlots < 1) {
    throw new Error("At least one booking slot is required");
  }

  if (getCommissionSplitMinor) {
    const { buildBookingMoneySnapshot, toMinorUnits, fromMinorUnits } = require("./money");
    const snapshot = buildBookingMoneySnapshot({
      grossAmountMinor: toMinorUnits(finalAmount),
      slotCount: numSlots,
      instructor,
      platformSettings,
    });
    return snapshot.slots.map((slot) => ({
      dspCommission: Number(fromMinorUnits(slot.commissionAmountMinor)),
      instructorAmount: Number(fromMinorUnits(slot.instructorAmountMinor)),
      grossAmountMinor: slot.grossAmountMinor,
      commissionAmountMinor: slot.commissionAmountMinor,
      instructorAmountMinor: slot.instructorAmountMinor,
    }));
  }

  // Compatibility path for isolated legacy callers. Production booking paths
  // provide getCommissionSplitMinor and use the deterministic snapshot above.
  const { allocateAmount, toMinorUnits, fromMinorUnits } = require("./money");
  const grossBySlot = allocateAmount(toMinorUnits(finalAmount), numSlots);
  return Array.from({ length: numSlots }, (_, index) => {
    const split = getCommissionSplit(
      Number(fromMinorUnits(grossBySlot[index])),
      instructor,
      platformSettings,
    );
    const commissionAmountMinor = toMinorUnits(split.dspCommission);
    return {
      ...split,
      grossAmountMinor: grossBySlot[index],
      commissionAmountMinor,
      instructorAmountMinor: grossBySlot[index] - commissionAmountMinor,
    };
  });
}

module.exports = { buildDirectCardSlotSplits };
