/*
 * Explicit, idempotent legacy money backfill.
 * Dry-run is the default. Use --apply only after taking a database backup.
 */
const connectDB = require("../config/database");
const StudentBooking = require("../models/studentBooking.model");
const Transaction = require("../models/transaction.model");
const RefundRequest = require("../models/refundRequest.model");
const FinancialOperation = require("../models/FinancialOperation");
const TeacherTariff = require("../models/teacherTariff.model");
const { normalizeCurrency, toMinorUnits } = require("../utils/money");

const APPLY = process.argv.includes("--apply");
const counts = {};
const invalid = [];

function count(name) {
  counts[name] = (counts[name] || 0) + 1;
}

function convert(value, label, id) {
  if (value == null) return null;
  try {
    return toMinorUnits(value);
  } catch (error) {
    invalid.push({ collection: label, id: String(id), value, error: error.message });
    return null;
  }
}

function convertCurrency(value, label, id) {
  try {
    return normalizeCurrency(value || "CHF");
  } catch (error) {
    invalid.push({ collection: label, id: String(id), value, error: error.message });
    return null;
  }
}

async function updateOne(model, filter, update, label) {
  count(`${label}.candidates`);
  if (APPLY) await model.updateOne(filter, { $set: update });
  count(`${label}.converted`);
}

async function backfillBookings() {
  for await (const booking of StudentBooking.find({}).lean().cursor()) {
    const update = {};
    const currency = convertCurrency(booking.currency, "StudentBooking", booking._id);
    if (!currency) continue;
    if (booking.grossAmountMinor == null) {
      const gross = convert(booking.finalAmount ?? booking.totalAmount, "StudentBooking", booking._id);
      if (gross != null) update.grossAmountMinor = gross;
    }
    const slotUpdates = {};
    let commissionTotal = 0;
    let instructorTotal = 0;
    let completeSlots = true;
    let invariantMismatch = false;
    (booking.slots || []).forEach((slot, index) => {
      const gross = slot.grossAmountMinor ?? convert(slot.chargeAmount, "StudentBooking.slot", `${booking._id}:${slot._id}`);
      const commission = slot.commissionAmountMinor ?? convert(slot.dspCommission, "StudentBooking.slot", `${booking._id}:${slot._id}`);
      const instructor = slot.instructorAmountMinor ?? convert(slot.instructorAmount, "StudentBooking.slot", `${booking._id}:${slot._id}`);
      const refund = slot.refundAmountMinor ?? convert(slot.refundAmount, "StudentBooking.slot.refund", `${booking._id}:${slot._id}`);
      if (gross == null || commission == null || instructor == null) {
        completeSlots = false;
        return;
      }
      if (slot.grossAmountMinor == null) slotUpdates[`slots.${index}.grossAmountMinor`] = gross;
      if (slot.commissionAmountMinor == null) slotUpdates[`slots.${index}.commissionAmountMinor`] = commission;
      if (slot.instructorAmountMinor == null) slotUpdates[`slots.${index}.instructorAmountMinor`] = instructor;
      if (slot.refundAmountMinor == null && refund != null) slotUpdates[`slots.${index}.refundAmountMinor`] = refund;
      commissionTotal += commission;
      instructorTotal += instructor;
    });
    if (completeSlots) {
      const grossMinor = booking.grossAmountMinor ?? update.grossAmountMinor;
      const slotGrossTotal = (booking.slots || []).reduce(
        (sum, slot) => sum + (slot.grossAmountMinor ?? convert(slot.chargeAmount, "StudentBooking.slot", `${booking._id}:${slot._id}`) ?? 0),
        0,
      );
      if (grossMinor != null && (grossMinor !== slotGrossTotal || grossMinor !== commissionTotal + instructorTotal)) {
        invalid.push({
          collection: "StudentBooking",
          id: String(booking._id),
          error: "slot totals do not equal booking gross amount",
          grossMinor,
          slotTotalMinor: commissionTotal + instructorTotal,
          slotGrossTotalMinor: slotGrossTotal,
        });
        completeSlots = false;
        invariantMismatch = true;
      }
      if (completeSlots) {
        if (booking.commissionAmountMinor == null) update.commissionAmountMinor = commissionTotal;
        if (booking.instructorAmountMinor == null) update.instructorAmountMinor = instructorTotal;
      }
    }
    if (booking.currency == null) update.currency = currency;
    if (!invariantMismatch) Object.assign(update, slotUpdates);
    else {
      for (const key of Object.keys(update)) delete update[key];
    }
    if (Object.keys(update).length) await updateOne(StudentBooking, { _id: booking._id }, update, "StudentBooking");
  }
}

async function backfillSimpleModels() {
  for await (const transaction of Transaction.find({ amountMinor: { $exists: false } }).lean().cursor()) {
    const amountMinor = convert(transaction.amount, "Transaction", transaction._id);
    if (amountMinor != null) await updateOne(Transaction, { _id: transaction._id, amountMinor: { $exists: false } }, { amountMinor, currency: transaction.currency || "CHF" }, "Transaction");
  }
  for await (const request of RefundRequest.find({ amountMinor: { $exists: false } }).lean().cursor()) {
    const amountMinor = convert(request.amount, "RefundRequest", request._id);
    if (amountMinor != null) await updateOne(RefundRequest, { _id: request._id, amountMinor: { $exists: false } }, { amountMinor, currency: request.currency || "CHF" }, "RefundRequest");
  }
  for await (const operation of FinancialOperation.find({ requestedAmountMinor: { $exists: false } }).lean().cursor()) {
    const amountMinor = convert(operation.requestedAmount, "FinancialOperation", operation._id);
    if (amountMinor != null) await updateOne(FinancialOperation, { _id: operation._id, requestedAmountMinor: { $exists: false } }, { requestedAmountMinor: amountMinor, currency: operation.currency || "CHF" }, "FinancialOperation");
  }
  for await (const tariff of TeacherTariff.find({}).lean().cursor()) {
    const update = {};
    if (tariff.lessonFeeMinor == null) update.lessonFeeMinor = convert(tariff.lessonFee, "TeacherTariff", tariff._id);
    if (tariff.FinalPricePerLessonMinor == null) update.FinalPricePerLessonMinor = convert(tariff.FinalPricePerLesson, "TeacherTariff", tariff._id);
    (tariff.bulkPackages || []).forEach((pkg, index) => {
      if (pkg.costMinor == null) update[`bulkPackages.${index}.costMinor`] = convert(pkg.cost, "TeacherTariff.bulkPackage", `${tariff._id}:${pkg._id || index}`);
      if (pkg.finalPackagePriceMinor == null) update[`bulkPackages.${index}.finalPackagePriceMinor`] = convert(pkg.finalPackagePrice, "TeacherTariff.bulkPackage", `${tariff._id}:${pkg._id || index}`);
    });
    if (Object.keys(update).length && Object.values(update).every((value) => value != null)) await updateOne(TeacherTariff, { _id: tariff._id }, update, "TeacherTariff");
  }
}

async function main() {
  console.log(`[MoneyBackfill] mode=${APPLY ? "APPLY" : "DRY_RUN"}`);
  await connectDB();
  await backfillBookings();
  await backfillSimpleModels();
  console.log(JSON.stringify({ counts, invalid }, null, 2));
  if (invalid.length) process.exitCode = 2;
  await require("mongoose").disconnect();
}

main().catch((error) => {
  console.error("[MoneyBackfill] failed", error);
  process.exitCode = 1;
});
