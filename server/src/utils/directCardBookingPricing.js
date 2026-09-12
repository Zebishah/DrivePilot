function buildDirectCardSlotSplits({
  finalAmount,
  numSlots,
  instructor,
  platformSettings,
  getCommissionSplit,
}) {
  if (!platformSettings) {
    throw new Error("Platform commission settings are required");
  }
  if (!Number.isInteger(numSlots) || numSlots < 1) {
    throw new Error("At least one booking slot is required");
  }

  const perSlotAmount = Number(finalAmount) / numSlots;
  return Array.from({ length: numSlots }, () =>
    getCommissionSplit(perSlotAmount, instructor, platformSettings),
  );
}

module.exports = { buildDirectCardSlotSplits };
