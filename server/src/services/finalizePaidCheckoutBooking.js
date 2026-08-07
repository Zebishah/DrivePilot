const StudentBooking = require("../models/studentBooking.model");
const Transaction = require("../models/transaction.model");
const teacherAvailabilityModel = require("../models/teacherAvailability.model");
const { Instructor, Admin } = require("../models/User");
const { createTransaction } = require("./transactionService");
const {
  getCommissionSplit,
  getTransferIdFromPaymentIntent,
  getChargeIdFromPaymentIntent,
  DEFAULT_CURRENCY,
} = require("./stripeService");
const { notifyBookingParties } = require("../utils/SendOtpEmail");
const { getIOInstance } = require("../socket");
const { canReviveAutoCancelledCheckout } = require("../utils/checkoutPaymentGuard");

async function getPlatformCommissionForSplit() {
  const admin = await Admin.findOne().lean();
  const pc = admin?.platformCommission || {};
  return {
    defaultRate: pc.defaultRate ?? 20,
    defaultInstructorRate: pc.defaultInstructorRate ?? null,
    defaultType: pc.defaultType ?? "percentage",
    defaultFixedAmount: pc.defaultFixedAmount ?? 0,
  };
}

async function reholdCancelledSlots(booking) {
  for (const slot of booking.slots || []) {
    const teacherAvailability = await teacherAvailabilityModel.findOne({
      teacherId: booking.instructorId,
      date: new Date(slot.date),
    });
    if (!teacherAvailability) continue;

    const slotIdString = String(slot._id);
    const alreadyHeld = teacherAvailability.slots.some(
      (held) => String(held.id) === slotIdString,
    );
    if (!alreadyHeld) {
      teacherAvailability.slots.push({
        id: slotIdString,
        bookingId: String(booking._id),
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        booked: true,
        status: "booked",
      });
    }

    const availableSlot = teacherAvailability.availableSlots.find(
      (s) =>
        s.date === slot.date &&
        s.startTime === slot.startTime &&
        s.endTime === slot.endTime,
    );
    if (availableSlot) {
      availableSlot.booked = true;
      availableSlot.status = "booked";
    }

    const allBooked =
      teacherAvailability.availableSlots.length > 0 &&
      teacherAvailability.availableSlots.every((s) => s.booked === true);
    teacherAvailability.status = allBooked ? "booked" : "available";
    await teacherAvailability.save();
  }
}

async function finalizePaidCheckoutBooking({
  bookingId,
  paymentIntentId,
  expectedStudentId = null,
}) {
  if (!bookingId) return null;
  const booking = await StudentBooking.findById(bookingId);
  if (!booking) return null;
  if (
    expectedStudentId &&
    String(booking.studentId) !== String(expectedStudentId)
  ) {
    return null;
  }

  const alreadyPaid =
    String(booking.status) === "confirmed" &&
    (booking.slots || []).every(
      (slot) => String(slot.paymentStatus || "").toLowerCase() === "paid",
    );
  if (alreadyPaid) return booking;

  if (!canReviveAutoCancelledCheckout(booking) && String(booking.status) !== "pending") {
    return booking;
  }

  const instructor = await Instructor.findById(booking.instructorId).lean();
  if (!instructor) return booking;

  const wasCancelled = ["cancelled", "semi_cancelled"].includes(
    String(booking.status || "").toLowerCase(),
  );

  const finalAmount = Number(booking.finalAmount);
  const numSlots = booking.slots.length;
  const perSlotAmount = numSlots > 0 ? finalAmount / numSlots : 0;
  const transferId = paymentIntentId
    ? await getTransferIdFromPaymentIntent(paymentIntentId).catch(() => null)
    : null;
  const chargeId = paymentIntentId
    ? await getChargeIdFromPaymentIntent(paymentIntentId).catch(() => null)
    : null;
  const platformSettingsConfirm = await getPlatformCommissionForSplit();
  const { dspCommission: slotDsp, instructorAmount: slotInstructor } =
    getCommissionSplit(perSlotAmount, instructor, platformSettingsConfirm);

  const updateResult = await StudentBooking.updateOne(
    {
      _id: bookingId,
      ...(expectedStudentId ? { studentId: expectedStudentId } : {}),
      status: { $in: ["pending", "cancelled", "semi_cancelled"] },
    },
    {
      $set: {
        status: "confirmed",
        stripePaymentIntentId: paymentIntentId,
        "slots.$[].status": "booked",
        "slots.$[].booked": true,
        "slots.$[].paymentIntentId": paymentIntentId,
        ...(chargeId ? { "slots.$[].connectChargeId": chargeId } : {}),
        ...(transferId ? { "slots.$[].transferId": transferId } : {}),
        "slots.$[].paymentStatus": "paid",
        "slots.$[].chargeAmount": perSlotAmount,
        "slots.$[].dspCommission": slotDsp,
        "slots.$[].instructorAmount": slotInstructor,
        "slots.$[].payoutStatus": "not_applicable",
        updatedAt: new Date(),
      },
      $unset: {
        cancellationDate: "",
        "slots.$[].cancelledBy": "",
        "slots.$[].cancellationDate": "",
      },
    },
  );

  if (updateResult.matchedCount === 0) {
    return StudentBooking.findById(bookingId);
  }

  const bookingUpdated = await StudentBooking.findById(bookingId);
  if (!bookingUpdated) return null;

  if (wasCancelled) {
    await reholdCancelledSlots(bookingUpdated);
  }

  const existingPaymentTx = await Transaction.findOne({
    bookingId,
    stripePaymentIntentId: paymentIntentId,
    type: "payment",
    role: "student",
  }).catch(() => null);
  if (!existingPaymentTx) {
    const occurredAt = new Date();
    await createTransaction({
      type: "payment",
      role: "student",
      direction: "debit",
      amount: finalAmount,
      currency: DEFAULT_CURRENCY.toUpperCase(),
      status: "succeeded",
      bookingId,
      studentId: bookingUpdated.studentId,
      stripePaymentIntentId: paymentIntentId,
      description: `${numSlots} lesson(s) with instructor ${instructor.firstName} ${instructor.lastName}`,
      occurredAt,
    });
    await createTransaction({
      type: "payment",
      role: "platform",
      direction: "credit",
      amount: finalAmount,
      currency: DEFAULT_CURRENCY.toUpperCase(),
      status: "succeeded",
      bookingId,
      studentId: bookingUpdated.studentId,
      instructorId: instructor._id,
      stripePaymentIntentId: paymentIntentId,
      description: "Platform gross receipt for booking",
      occurredAt,
    });
    for (const slot of bookingUpdated.slots) {
      if (slot.instructorAmount != null) {
        await createTransaction({
          type: "payment",
          role: "instructor",
          direction: "credit",
          amount: slot.instructorAmount,
          currency: DEFAULT_CURRENCY.toUpperCase(),
          status: "succeeded",
          bookingId,
          instructorId: instructor._id,
          studentId: bookingUpdated.studentId,
          stripePaymentIntentId: paymentIntentId,
          description: "Instructor share for booked slot",
          occurredAt,
        });
      }
      if (slot.dspCommission != null) {
        await createTransaction({
          type: "payment",
          role: "platform",
          direction: "credit",
          amount: slot.dspCommission,
          currency: DEFAULT_CURRENCY.toUpperCase(),
          status: "succeeded",
          bookingId,
          studentId: bookingUpdated.studentId,
          description: "Platform commission for booked slot",
          occurredAt,
        });
      }
    }
  }

  const savedBooking = await StudentBooking.findById(bookingId)
    .populate(
      "instructorId",
      "_id firstName lastName email phone description profileImage address",
    )
    .populate(
      "studentId",
      "_id firstName lastName email phone profileImage homeAddress",
    );

  try {
    const bookingData = JSON.parse(JSON.stringify(savedBooking));
    await notifyBookingParties(bookingData, "booking_created");
  } catch (emailError) {
    console.error("Failed to send booking creation emails:", emailError);
  }
  const io = getIOInstance();
  if (io && io.notifyNewBooking) {
    io.notifyNewBooking(JSON.parse(JSON.stringify(savedBooking)));
  }
  return savedBooking;
}

module.exports = { finalizePaidCheckoutBooking };
