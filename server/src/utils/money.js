const DEFAULT_CURRENCY = "CHF";
const MINOR_UNITS_PER_CHF = 100;

function normalizeCurrency(currency = DEFAULT_CURRENCY) {
  const normalized = String(currency || DEFAULT_CURRENCY).trim().toUpperCase();
  if (normalized !== DEFAULT_CURRENCY) {
    throw new Error(`Unsupported currency: ${normalized}`);
  }
  return normalized;
}

function assertValidMoney(amountMinor, currency = DEFAULT_CURRENCY, { allowNegative = false } = {}) {
  normalizeCurrency(currency);
  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error("Money amount must be a safe integer minor-unit value");
  }
  if (!allowNegative && amountMinor < 0) {
    throw new Error("Money amount cannot be negative");
  }
  return amountMinor;
}

function parseMajorDecimal(value) {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error("Money amount must be finite");
  }
  const text = String(value ?? "").trim();
  if (!text || !/^-?\d+(?:\.\d+)?$/.test(text)) {
    throw new Error("Money amount must be a decimal number");
  }
  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;
  const [wholeText, fractionText = ""] = unsigned.split(".");
  let centsText = fractionText.padEnd(2, "0").slice(0, 2);
  const thirdDigit = fractionText[2] || "0";
  let minor = BigInt(wholeText) * 100n + BigInt(centsText || "0");
  if (thirdDigit >= "5") minor += 1n;
  return negative ? -minor : minor;
}

/** Convert one CHF major-unit amount to integer centimes using half-up rounding. */
function toMinorUnits(value, currency = DEFAULT_CURRENCY, options = {}) {
  normalizeCurrency(currency);
  const minorBigInt = parseMajorDecimal(value);
  if (!options.allowNegative && minorBigInt < 0n) {
    throw new Error("Money amount cannot be negative");
  }
  const minor = Number(minorBigInt);
  return assertValidMoney(minor, currency, options);
}

/** Convert integer centimes to a stable two-decimal major-unit string. */
function fromMinorUnits(amountMinor, currency = DEFAULT_CURRENCY) {
  assertValidMoney(amountMinor, currency, { allowNegative: true });
  const sign = amountMinor < 0 ? "-" : "";
  const absolute = Math.abs(amountMinor);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

function formatMoney(amountMinor, currency = DEFAULT_CURRENCY) {
  const normalized = normalizeCurrency(currency);
  return `${normalized} ${fromMinorUnits(amountMinor, normalized)}`;
}

function allocateAmount(totalMinor, count, currency = DEFAULT_CURRENCY) {
  assertValidMoney(totalMinor, currency);
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("Allocation count must be a positive integer");
  }
  const base = Math.floor(totalMinor / count);
  const remainder = totalMinor % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

function allocateProportionally(totalMinor, weights, currency = DEFAULT_CURRENCY) {
  assertValidMoney(totalMinor, currency);
  if (!Array.isArray(weights) || weights.length === 0 || weights.some((weight) => !Number.isSafeInteger(weight) || weight < 0)) {
    throw new Error("Allocation weights must be non-negative safe integers");
  }
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (!Number.isSafeInteger(totalWeight) || totalWeight <= 0) {
    throw new Error("Allocation weights must have a positive total");
  }

  const totalBigInt = BigInt(totalMinor);
  const totalWeightBigInt = BigInt(totalWeight);
  const allocations = weights.map((weight) => Number((totalBigInt * BigInt(weight)) / totalWeightBigInt));
  let remainder = totalMinor - allocations.reduce((sum, amount) => sum + amount, 0);
  const fractions = weights.map((weight, index) => ({
    index,
    fraction: (totalBigInt * BigInt(weight)) % totalWeightBigInt,
  })).sort((left, right) => {
    if (left.fraction === right.fraction) return left.index - right.index;
    return left.fraction > right.fraction ? -1 : 1;
  });
  for (let index = 0; index < fractions.length && remainder > 0; index += 1, remainder -= 1) {
    allocations[fractions[index].index] += 1;
  }
  return allocations;
}

function percentageToBasisPoints(rate) {
  // The decimal parser returns hundredths of a percentage point, which is
  // exactly the basis-point representation (15% -> 1500 bps).
  const bps = parseMajorDecimal(rate);
  const result = Number(bps);
  if (!Number.isSafeInteger(result) || result < 0 || result > 10000) {
    throw new Error("Commission percentage must be between 0 and 100");
  }
  return result;
}

function multiplyAndRoundHalfUp(amount, numerator, denominator) {
  const product = BigInt(amount) * BigInt(numerator);
  const divisor = BigInt(denominator);
  const rounded = (product + divisor / 2n) / divisor;
  const result = Number(rounded);
  if (!Number.isSafeInteger(result)) throw new Error("Money calculation exceeds safe integer range");
  return result;
}

/** Calculate the platform commission and instructor share in minor units. */
function calculateCommission(grossAmountMinor, instructor = {}, platformSettings = {}, currency = DEFAULT_CURRENCY) {
  assertValidMoney(grossAmountMinor, currency);
  const instructorCommission = instructor?.commission || {};
  const defaultRate = platformSettings.defaultRate ?? 20;
  const defaultInstructorRate = platformSettings.defaultInstructorRate;
  const defaultType = platformSettings.defaultType ?? "percentage";
  const defaultFixedAmount = platformSettings.defaultFixedAmount ?? 0;

  let commissionMinor;
  if (instructorCommission.instructorRate != null && Number.isFinite(Number(instructorCommission.instructorRate)) && Number(instructorCommission.instructorRate) >= 0 && Number(instructorCommission.instructorRate) <= 100) {
    const instructorRateBps = percentageToBasisPoints(instructorCommission.instructorRate);
    const instructorAmountMinor = multiplyAndRoundHalfUp(grossAmountMinor, instructorRateBps, 10000);
    return { commissionMinor: grossAmountMinor - instructorAmountMinor, instructorAmountMinor };
  }

  if (instructorCommission.type === "amount" || instructorCommission.type === "fixed") {
    commissionMinor = Math.min(toMinorUnits(instructorCommission.fixedAmount ?? 0, currency), grossAmountMinor);
    return { commissionMinor, instructorAmountMinor: grossAmountMinor - commissionMinor };
  }

  if (defaultType === "amount") {
    commissionMinor = Math.min(toMinorUnits(defaultFixedAmount, currency), grossAmountMinor);
    return { commissionMinor, instructorAmountMinor: grossAmountMinor - commissionMinor };
  }

  if (defaultInstructorRate != null && Number.isFinite(Number(defaultInstructorRate)) && Number(defaultInstructorRate) >= 0 && Number(defaultInstructorRate) <= 100) {
    const instructorRateBps = percentageToBasisPoints(defaultInstructorRate);
    const instructorAmountMinor = multiplyAndRoundHalfUp(grossAmountMinor, instructorRateBps, 10000);
    return { commissionMinor: grossAmountMinor - instructorAmountMinor, instructorAmountMinor };
  }

  const commissionRateBps = percentageToBasisPoints(defaultRate);
  commissionMinor = multiplyAndRoundHalfUp(grossAmountMinor, commissionRateBps, 10000);
  return { commissionMinor, instructorAmountMinor: grossAmountMinor - commissionMinor };
}

function sumMoney(amounts, currency = DEFAULT_CURRENCY) {
  const total = amounts.reduce((sum, amount) => sum + BigInt(assertValidMoney(amount, currency)), 0n);
  return assertValidMoney(Number(total), currency);
}

function assertBookingMoneyInvariants(snapshot) {
  const currency = normalizeCurrency(snapshot?.currency);
  const slots = snapshot?.slots || [];
  assertValidMoney(snapshot.grossAmountMinor, currency);
  assertValidMoney(snapshot.commissionAmountMinor, currency);
  assertValidMoney(snapshot.instructorAmountMinor, currency);
  if (sumMoney(slots.map((slot) => slot.grossAmountMinor), currency) !== snapshot.grossAmountMinor) {
    throw new Error("Booking gross amount does not equal slot gross total");
  }
  if (sumMoney(slots.map((slot) => slot.commissionAmountMinor), currency) !== snapshot.commissionAmountMinor) {
    throw new Error("Booking commission does not equal slot commission total");
  }
  if (sumMoney(slots.map((slot) => slot.instructorAmountMinor), currency) !== snapshot.instructorAmountMinor) {
    throw new Error("Booking instructor share does not equal slot instructor total");
  }
  for (const slot of slots) {
    assertValidMoney(slot.grossAmountMinor, currency);
    assertValidMoney(slot.commissionAmountMinor, currency);
    assertValidMoney(slot.instructorAmountMinor, currency);
    if (slot.commissionAmountMinor + slot.instructorAmountMinor !== slot.grossAmountMinor) {
      throw new Error("Slot commission plus instructor share must equal slot gross amount");
    }
  }
  return snapshot;
}

/** Build immutable booking and per-slot financial snapshots. */
function buildBookingMoneySnapshot({ grossAmountMinor, slotCount, instructor, platformSettings, currency = DEFAULT_CURRENCY }) {
  normalizeCurrency(currency);
  assertValidMoney(grossAmountMinor, currency);
  const grossBySlot = allocateAmount(grossAmountMinor, slotCount, currency);
  const bookingSplit = calculateCommission(grossAmountMinor, instructor, platformSettings, currency);
  const commissionBySlot = allocateProportionally(bookingSplit.commissionMinor, grossBySlot, currency);
  const slots = grossBySlot.map((slotGrossMinor, index) => ({
    grossAmountMinor: slotGrossMinor,
    commissionAmountMinor: commissionBySlot[index],
    instructorAmountMinor: slotGrossMinor - commissionBySlot[index],
  }));
  return assertBookingMoneyInvariants({
    currency: normalizeCurrency(currency),
    grossAmountMinor,
    commissionAmountMinor: sumMoney(slots.map((slot) => slot.commissionAmountMinor), currency),
    instructorAmountMinor: sumMoney(slots.map((slot) => slot.instructorAmountMinor), currency),
    slots,
  });
}

/** Read a persisted snapshot, falling back once for legacy decimal records. */
function getBookingMoneySnapshot({ booking, instructor, platformSettings, currency = DEFAULT_CURRENCY }) {
  const slots = booking?.slots || [];
  const hasSnapshot = Number.isSafeInteger(booking?.grossAmountMinor) &&
    Number.isSafeInteger(booking?.commissionAmountMinor) &&
    Number.isSafeInteger(booking?.instructorAmountMinor) &&
    slots.every((slot) => Number.isSafeInteger(slot?.grossAmountMinor) &&
      Number.isSafeInteger(slot?.commissionAmountMinor) &&
      Number.isSafeInteger(slot?.instructorAmountMinor));
  if (hasSnapshot) {
    return assertBookingMoneyInvariants({
      currency: normalizeCurrency(booking.currency || currency),
      grossAmountMinor: booking.grossAmountMinor,
      commissionAmountMinor: booking.commissionAmountMinor,
      instructorAmountMinor: booking.instructorAmountMinor,
      slots: slots.map((slot) => ({
        grossAmountMinor: slot.grossAmountMinor,
        commissionAmountMinor: slot.commissionAmountMinor,
        instructorAmountMinor: slot.instructorAmountMinor,
      })),
    });
  }
  const legacyGross = booking?.finalAmount ?? booking?.totalAmount;
  return buildBookingMoneySnapshot({
    grossAmountMinor: toMinorUnits(legacyGross, currency),
    slotCount: Math.max(1, slots.length),
    instructor,
    platformSettings,
    currency,
  });
}

module.exports = {
  DEFAULT_CURRENCY,
  MINOR_UNITS_PER_CHF,
  normalizeCurrency,
  assertValidMoney,
  toMinorUnits,
  fromMinorUnits,
  formatMoney,
  allocateAmount,
  allocateProportionally,
  calculateCommission,
  sumMoney,
  buildBookingMoneySnapshot,
  getBookingMoneySnapshot,
  assertBookingMoneyInvariants,
};
