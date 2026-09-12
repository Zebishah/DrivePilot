const { studentBookingSchema } = require("../../schemas/studentBooking.schema");
const StudentBooking = require("../../models/studentBooking.model");
const {
  getSlotEndTimestampUtc,
  getSlotStartTimestampUtc,
} = require("../../utils/slotTimezone");
const {
  slotsOverlap,
  isActiveUnpaidOrPaidSlot,
} = require("../../utils/slotTimeOverlap");

// Production payout delay: 3 days after lesson completion/missed outcome.
const PAYOUT_DELAY_MS = 3 * 24 * 60 * 60 * 1000;
const {
  AuthenticationError,
  UserInputError,
} = require("apollo-server-express");
const { validateUser } = require("../../utils/auth");
const teacherAvailabilityModel = require("../../models/teacherAvailability.model");
const { default: mongoose } = require("mongoose");
const { User, Instructor, Admin } = require("../../models/User");

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
const checkAllSlotsBooked = require("../../utils/CheckAllSlotsBooked");
const studentBookingModel = require("../../models/studentBooking.model");
const { notifyBookingParties, sendBookingEmail } = require("../../utils/SendOtpEmail");
const teacherTariffModel = require("../../models/teacherTariff.model");
const { getIOInstance } = require("../../socket");
const {
  claimAvailabilitySlots,
  releaseAvailabilitySlots,
  recordBookedAvailabilitySlots,
} = require("../../services/availabilityService");
const { createTransaction } = require("../../services/transactionService");
const { invalidateAvailability } = require("../../services/cacheInvalidation");
const { isInstructorPaymentReady } = require("../utils/instructorPaymentReady");
const { buildDirectCardSlotSplits } = require("../../utils/directCardBookingPricing");
const {
  toMinorUnits,
  fromMinorUnits,
  buildBookingMoneySnapshot,
} = require("../../utils/money");
const {
  requireAdmin,
  requireRole,
  requireStudentDataAccess,
  requireBookingParticipantOrAdmin,
  requireAssignedInstructorOrAdmin,
  requireStudentOwnerOrAdmin,
} = require("../../utils/authorization");
const {
  getOrCreateOperation,
  claimOperation,
  markAttempt,
  markProviderSuccess,
  markLocalSuccess,
  markCompleted,
  markRetryable,
  attachBooking,
  getOperationByProviderObjectId,
  getLatestOperation,
} = require("../../services/financialOperationService");
const {
  finalizePaidCheckoutBooking,
} = require("../../services/finalizePaidCheckoutBooking");
const {
  getCommissionSplit,
  getCommissionSplitMinor,
  createPaymentIntentForBooking,
  createCheckoutSessionForBooking,
  createCustomer,
  retrieveCheckoutSession,
  retrieveSetupIntent,
  retrievePaymentMethod,
  retrievePaymentIntent,
  confirmPaymentIntent,
  createRefund,
  getTransferIdFromPaymentIntent,
  getChargeIdFromPaymentIntent,
  createTransferReversal,
  DEFAULT_CURRENCY,
  CENTIMES_PER_UNIT,
  FRONTEND_BASE,
} = require("../../services/stripeService");

/**
 * True if booking was created for Stripe checkout but payment/card was never completed
 * (user closed tab or cancelled). These should not appear as booked/upcoming.
 */
function isAbandonedPendingBooking(booking) {
  if (!booking || booking.status !== "pending") return false;
  if (booking.stripeCustomerId) return false; // deferred flow completed (card saved)
  const slots = booking.slots || [];
  const hasPaidSlot = slots.some(
    (s) => s && String(s.paymentStatus) === "paid",
  );
  if (hasPaidSlot) return false; // instant payment completed for at least one slot
  return true;
}

function toIsoString(value) {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

const studentBookingResolver = {
  StudentBooking: {
    createdAt: (parent) => toIsoString(parent.createdAt) || parent.createdAt,
    updatedAt: (parent) => toIsoString(parent.updatedAt) || parent.updatedAt,
    paymentMethod: (parent) => parent.paymentMethod || { type: "card" },
  },
  Slot: {
    paymentReminderStartedAt: (parent) => toIsoString(parent.paymentReminderStartedAt),
    paymentReminderDeadlineAt: (parent) => toIsoString(parent.paymentReminderDeadlineAt),
    paymentReminder1SentAt: (parent) => toIsoString(parent.paymentReminder1SentAt),
    paymentReminder2SentAt: (parent) => toIsoString(parent.paymentReminder2SentAt),
    paymentReminder3SentAt: (parent) => toIsoString(parent.paymentReminder3SentAt),
    chargedAt: (parent) => toIsoString(parent.chargedAt),
    cancellationDate: (parent) => toIsoString(parent.cancellationDate),
    completionMarkedAt: (parent) => toIsoString(parent.completionMarkedAt),
    refundedAt: (parent) => toIsoString(parent.refundedAt),
  },
  Query: {
    // getStudentBookings: async (_, __, { user }) => {
    //   validateUser(user);
    //   const bookings = await StudentBooking.find({ studentId: user.id })
    //     .populate("instructorId", "_id firstName lastName email description")
    //     .sort({ createdAt: -1 });

    //   return bookings;
    // },

    getStudentBookings: async (_, __, { user }) => {
      requireRole(user, "Student");

      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0); // start of today

      // Get all bookings for this student (exclude abandoned pending: checkout started but never completed)
      const allBookings = await StudentBooking.find({ studentId: user.id })
        .populate(
          "instructorId",
          "_id firstName lastName email description profileImage",
        )
        .sort({ createdAt: -1 });

      const filteredBookings = [];

      for (const booking of allBookings) {
        // Include abandoned pending so frontend can show them in "Abandoned" tab
        if (!booking.instructorId) continue;

        // keep only today/future slots
        const futureSlots = booking.slots.filter((slot) => {
          return slot;
        });

        if (!futureSlots.length) continue;

        // 🔑 Fetch the instructor's tariff (default or first)
        const teacherTariff = await teacherTariffModel
          .findOne({
            teacherId: booking.instructorId._id,
          })
          .lean();

        // Safely handle if no tariff found
        const tariffDetails = teacherTariff
          ? {
              lessonFee: teacherTariff.lessonFee,
              finalPricePerLesson: teacherTariff.FinalPricePerLesson,
              lessonDiscount: teacherTariff.lessonDiscount,
            }
          : {
              lessonFee: null,
              finalPricePerLesson: null,
              lessonDiscount: null,
            };

        filteredBookings.push({
          ...booking.toObject(),
          slots: futureSlots,
          teacherTariff: tariffDetails, // ✅ Add tariff info here
        });
      }

      return filteredBookings;
    },
    getUnseenBookingsCount: async (_, __, { user }) => {
      try {
        requireAdmin(user);

        // Get the last time admin viewed bookings
        // You can store this in a separate AdminActivity collection or in the Admin model
        const admin = await Admin.findById(user.id);
        const lastViewedAt = admin?.lastBookingViewedAt || new Date(0);

        // Count bookings created after last viewed time
        const unseenCount = await StudentBooking.countDocuments({
          createdAt: { $gt: lastViewedAt },
        });

        console.log(`📊 Admin ${user.id} has ${unseenCount} unseen bookings`);

        return {
          count: unseenCount,
          lastViewedAt,
        };
      } catch (error) {
        console.error("Error getting unseen bookings count:", error);
        throw error;
      }
    },

    getCompletedStudentBookings: async (_, __, { user }) => {
      requireRole(user, "Instructor");

      const allBookings = await StudentBooking.find({
        instructorId: user?.id,
        status: { $in: ["confirmed", "semi_cancelled", "completed"] },
      })
        .populate("instructorId", "_id firstName lastName email profileImage")
        .populate("studentId", "_id firstName lastName email profileImage");

      const completedLessons = [];

      for (const booking of allBookings) {
        if (!booking.slots?.length) continue;

        // ✅ gather only slots explicitly marked completed, and booked (exclude cancelled/refund)
        const completedSlots = booking.slots.filter((slot) => {
          if (
            !slot.booked ||
            slot.status === "cancelled" ||
            slot.status === "refund"
          )
            return false;
          return slot.status === "completed";
        });

        if (completedSlots.length) {
          // ✅ push only one object per booking, with all its completed slots
          completedLessons.push({
            ...booking.toObject(),
            slots: completedSlots,
          });
        }
      }

      // Sort by latest slot end time in each booking (descending)
      completedLessons.sort((a, b) => {
        const aLatest = Math.max(
          ...a.slots.map((s) =>
            new Date(`${s.date}T${s.endTime}:00`).getTime(),
          ),
        );
        const bLatest = Math.max(
          ...b.slots.map((s) =>
            new Date(`${s.date}T${s.endTime}:00`).getTime(),
          ),
        );
        return bLatest - aLatest;
      });

      return completedLessons;
    },

    getInstructorBookings: async (_, __, { user }) => {
      requireRole(user, "Instructor");
      const bookings = await StudentBooking.find({ instructorId: user.id })
        .populate("studentId", "_id firstName lastName email description")
        .sort({ createdAt: -1 });
      return bookings;
    },
    getStudentDashboardDetails: async (_, { studentId }, { user }) => {
      await requireStudentDataAccess(user, studentId);

      const student = await User.findById(studentId).lean();
      if (!student) throw new Error("Student not found");

      const allBookings = await StudentBooking.find({
        studentId,
        instructorId: user.id,
        status: { $in: ["confirmed", "semi_cancelled", "completed"] },
      })
        .populate("instructorId", "_id firstName lastName email profileImage")
        .populate("studentId", "_id firstName lastName email profileImage") // Add this line
        .lean();

      const now = new Date();

      // These stats should reflect only actually completed lessons
      let totalLessonCount = 0;
      let totalDurationMinutes = 0;
      const graphMap = new Map();

      const completedBookings = [];
      const uncompletedBookings = [];
      const upcomingBookings = [];
      const cancelledBookings = [];
      const historyBookings = [];

      for (const booking of allBookings) {
        if (!booking.slots || booking.slots.length === 0) continue;

        const finalBookingBase = {
          ...booking,
          profileImage: student.profileImage || "",
          instructorId: {
            ...booking.instructorId,
            profileImage: booking.instructorId?.profileImage || "",
          },
        };

        // Use all booking slots for categorisation.
        // `booked` becomes false for statuses like missed/cancelled/refund,
        // and filtering by `booked` would hide them from History.
        const bookedSlots = booking.slots || [];
        const upcomingSlots = [];
        const cancelledSlots = [];
        const historySlots = [];

        for (const slot of bookedSlots) {
          const slotEnd = new Date(`${slot.date}T${slot.endTime}:00`);
          const isCancelledOrRefund =
            slot.status === "cancelled" || slot.status === "refund";
          if (isCancelledOrRefund) {
            cancelledSlots.push(slot);
          } else if (slotEnd > now) {
            upcomingSlots.push(slot);
          } else {
            historySlots.push(slot);
          }
        }

        // Legacy: completed = history, uncompleted = upcoming (for lessonStats / TotalLessonsCard)
        const completedSlots = historySlots;
        const inProgressSlots = upcomingSlots;

        if (completedSlots.length > 0) {
          completedBookings.push({
            ...finalBookingBase,
            slots: completedSlots,
          });
        }
        if (inProgressSlots.length > 0) {
          uncompletedBookings.push({
            ...finalBookingBase,
            slots: inProgressSlots,
          });
        }
        if (upcomingSlots.length > 0) {
          upcomingBookings.push({
            ...finalBookingBase,
            slots: upcomingSlots,
          });
        }
        if (cancelledSlots.length > 0) {
          cancelledBookings.push({
            ...finalBookingBase,
            slots: cancelledSlots,
          });
        }
        if (historySlots.length > 0) {
          historyBookings.push({
            ...finalBookingBase,
            slots: historySlots,
          });
        }

        // Stats and graph: only lessons the instructor marked completed (same as Total Lessons card)
        for (const slot of historySlots) {
          if (slot.status !== "completed") continue;
          totalLessonCount += 1;
          const start = new Date(`${slot.date}T${slot.startTime}:00`);
          const end = new Date(`${slot.date}T${slot.endTime}:00`);
          const duration = (end - start) / (1000 * 60);
          totalDurationMinutes += duration;
          const count = graphMap.get(slot.date) || 0;
          graphMap.set(slot.date, count + 1);
        }
      }

      const graphStats = Array.from(graphMap.entries()).map(
        ([date, lessonsBooked]) => ({
          date,
          lessonsBooked,
        }),
      );

      return {
        studentInfo: {
          _id: student._id,
          // Fix: Use fallback values and check multiple possible locations for firstName/lastName
          firstName: student.firstName || student.firstName || "N/A",
          lastName: student.lastName || student.lastName || "N/A",
          email: student.paymentInfo?.email || student.email || "N/A",
          phone: student.phone || "",
          profileImage: student.profileImage || "",
          dateOfBirth: student.dateOfBirth || "",
          fatherName: student.fatherName || "",
          description: student.description || "",
          homeAddress: student.homeAddress || "",
          location: student.location || "",
          zipCode: student.zipCode || "",
          languagePreference: student.languagePreference || [],
        },
        lessonStats: {
          totalLessons: totalLessonCount,
          totalLessonDurationInMinutes: totalDurationMinutes,
        },
        graphStats,
        completedBookings,
        uncompletedBookings,
        upcomingBookings,
        cancelledBookings,
        historyBookings,
      };
    },
  },

  Mutation: {
    createBooking: async (_, { input }, { user }) => {
      requireRole(user, "Student");
      const paymentCorrelationId = new mongoose.Types.ObjectId().toString();
      let availabilityClaims = [];
      let availabilityCommitted = false;
      let directPaymentIntentId = null;
      try {
        const validatedInput = studentBookingSchema.parse({
          ...input,
          studentId: user.id,
        });

        const { instructorId } = validatedInput;

        const instructor = await Instructor.findById(instructorId).lean();
        if (!instructor) {
          throw new UserInputError("Instructor not found");
        }
        // Ensure instructor is fully Stripe-onboarded and payment ready
        if (!isInstructorPaymentReady(instructor)) {
          throw new UserInputError(
            "This instructor is not available for paid bookings yet. Please choose another instructor.",
          );
        }

        const isCardPayment =
          validatedInput.paymentMethod?.type === "card" &&
          validatedInput.paymentMethod?.paymentMethodId;

        let stripePaymentIntentId = null;
        let stripeTransferId = null;
        let stripeChargeId = null;
        let directPaymentOperation = null;
        const numSlots = validatedInput.slots.length;
        const finalAmount = Number(validatedInput.finalAmount);
        const platformSettings = await getPlatformCommissionForSplit();
        const bookingMoney = buildBookingMoneySnapshot({
          grossAmountMinor: toMinorUnits(validatedInput.finalAmount),
          slotCount: numSlots,
          instructor,
          platformSettings,
        });

        if (isCardPayment) {
          const instructorAccountId = instructor.stripeAccount?.accountId;
          if (!instructorAccountId) {
            throw new UserInputError(
              "Instructor payment account is not set up. Please try another instructor.",
            );
          }
          const amountCentimes = bookingMoney.grossAmountMinor;
          const instructorShareCentimes = bookingMoney.instructorAmountMinor;
          const operationKey = `direct-${validatedInput.operationId || paymentCorrelationId}`;
          directPaymentOperation = await getOrCreateOperation({
            operationType: "DIRECT_PAYMENT",
            aggregateType: "BOOKING_REQUEST",
            aggregateId: validatedInput.operationId || paymentCorrelationId,
            studentId: user.id,
            instructorId: instructor._id,
            currency: DEFAULT_CURRENCY.toUpperCase(),
            requestedAmount: finalAmount,
            requestedAmountMinor: bookingMoney.grossAmountMinor,
            idempotencyKey: operationKey,
            metadata: {
              studentId: String(user.id),
              instructorId: String(instructorId),
              paymentCorrelationId,
            },
          });

          if (directPaymentOperation.bookingId) {
            const existingBooking = await StudentBooking.findById(
              directPaymentOperation.bookingId,
            );
            if (existingBooking) return { booking: existingBooking };
          }

          // Reserve the advertised slots before contacting Stripe. The claim
          // is released below if payment fails or requires customer action.
          availabilityClaims = await claimAvailabilitySlots({
            teacherId: instructorId,
            slots: validatedInput.slots,
          });

          let paymentResult;
          if (directPaymentOperation.providerObjectId) {
            const existingPi = await retrievePaymentIntent(
              directPaymentOperation.providerObjectId,
            );
            paymentResult = {
              paymentIntentId: existingPi.id,
              status: existingPi.status,
              clientSecret: existingPi.client_secret,
              requiresAction: existingPi.status === "requires_action",
            };
          } else {
            const claimedOperation = await claimOperation(directPaymentOperation);
            if (!claimedOperation) {
              throw new UserInputError(
                "This payment is already being processed. Please retry shortly.",
              );
            }
            await markAttempt(claimedOperation, claimedOperation.leaseOwner);
            directPaymentOperation = claimedOperation;
            try {
              paymentResult = await createPaymentIntentForBooking({
                amountCentimes,
                paymentMethodId: validatedInput.paymentMethod.paymentMethodId,
                metadata: {
                  studentId: String(user.id),
                  instructorId: String(instructorId),
                  paymentCorrelationId,
                  operationId: directPaymentOperation.operationId,
                },
                confirm: true,
                transferData: {
                  destinationAccountId: instructorAccountId,
                  amountCentimes: instructorShareCentimes,
                },
                idempotencyKey: directPaymentOperation.idempotencyKey,
              });
              await markProviderSuccess(directPaymentOperation, {
                providerObjectId: paymentResult.paymentIntentId,
                providerStatus: paymentResult.status,
                localStatus: paymentResult.requiresAction
                  ? "requires_action"
                  : "provider_succeeded",
              });
            } catch (providerError) {
              await markRetryable(directPaymentOperation, providerError);
              throw providerError;
            }
          }
          directPaymentIntentId = paymentResult.paymentIntentId;
          if (paymentResult.requiresAction) {
            await releaseAvailabilitySlots({ claims: availabilityClaims });
            availabilityClaims = [];
            return {
              booking: null,
              requiresAction: true,
              clientSecret: paymentResult.clientSecret,
              paymentIntentId: paymentResult.paymentIntentId,
            };
          }
          if (paymentResult.status !== "succeeded") {
            throw new UserInputError(
              "Payment could not be completed. Please try again.",
            );
          }
          stripePaymentIntentId = paymentResult.paymentIntentId;
          stripeTransferId = await getTransferIdFromPaymentIntent(
            stripePaymentIntentId,
          ).catch(() => null);
          stripeChargeId = await getChargeIdFromPaymentIntent(
            stripePaymentIntentId,
          ).catch(() => null);
        } else {
          availabilityClaims = await claimAvailabilitySlots({
            teacherId: instructorId,
            slots: validatedInput.slots,
          });
        }

        const directCardSlotSplits =
          isCardPayment && stripePaymentIntentId
            ? buildDirectCardSlotSplits({
                finalAmount,
                numSlots,
                instructor,
                platformSettings,
                getCommissionSplit,
                getCommissionSplitMinor,
              })
            : null;

        const enrichedSlots = validatedInput.slots.map((slot, index) => {
          const base = {
            ...slot,
            booked: true,
            status: "booked",
            review: false,
          };
          if (isCardPayment && stripePaymentIntentId) {
            const { dspCommission: slotDsp, instructorAmount: slotInstructor } =
              directCardSlotSplits[index];
            base.paymentIntentId = stripePaymentIntentId;
            if (stripeChargeId) base.connectChargeId = stripeChargeId;
            if (stripeTransferId) base.transferId = stripeTransferId;
            base.paymentStatus = "paid";
            base.chargeAmount = Number(
              fromMinorUnits(directCardSlotSplits[index].grossAmountMinor),
            );
            base.dspCommission = slotDsp;
            base.instructorAmount = slotInstructor;
            base.grossAmountMinor = directCardSlotSplits[index].grossAmountMinor;
            base.commissionAmountMinor =
              directCardSlotSplits[index].commissionAmountMinor;
            base.instructorAmountMinor =
              directCardSlotSplits[index].instructorAmountMinor;
            base.payoutStatus = "not_applicable";
          } else {
            base.paymentStatus = "pending_payment";
            base.payoutStatus = "not_applicable";
          }
          return base;
        });

        // 1. Check for overlapping bookings WITH THE SAME INSTRUCTOR
        const existingBookings = await StudentBooking.find({
          studentId: user.id,
          instructorId: instructorId,
          status: { $ne: "cancelled" },
        });

        for (const newSlot of enrichedSlots) {
          const conflictingBooking = existingBookings.find((booking) =>
            booking.slots.some(
              (existingSlot) =>
                existingSlot.date === newSlot.date &&
                existingSlot.booked &&
                ((newSlot.startTime >= existingSlot.startTime &&
                  newSlot.startTime < existingSlot.endTime) ||
                  (newSlot.endTime > existingSlot.startTime &&
                    newSlot.endTime <= existingSlot.endTime) ||
                  (newSlot.startTime <= existingSlot.startTime &&
                    newSlot.endTime >= existingSlot.endTime)),
            ),
          );

          if (conflictingBooking) {
            throw new UserInputError(
              `You already have a booking with this instructor on ${newSlot.date} between ${newSlot.startTime} and ${newSlot.endTime}`,
            );
          }
        }

        const bookingPayload = {
          ...validatedInput,
          slots: enrichedSlots,
          status: "confirmed",
          currency: bookingMoney.currency,
          grossAmountMinor: bookingMoney.grossAmountMinor,
          commissionAmountMinor: bookingMoney.commissionAmountMinor,
          instructorAmountMinor: bookingMoney.instructorAmountMinor,
        };
        if (stripePaymentIntentId) {
          bookingPayload.stripePaymentIntentId = stripePaymentIntentId;
          bookingPayload.paymentCorrelationId = paymentCorrelationId;
          if (validatedInput.paymentMethod?.paymentMethodId)
            bookingPayload.paymentMethod = {
              ...validatedInput.paymentMethod,
              paymentMethodId: validatedInput.paymentMethod.paymentMethodId,
              cardLast4: validatedInput.paymentMethod.cardLast4 || undefined,
              cardBrand: validatedInput.paymentMethod.cardBrand || undefined,
            };
        }
        const booking = new StudentBooking(bookingPayload);
        await booking.save();
        availabilityCommitted = true;
        if (directPaymentOperation) {
          await attachBooking(directPaymentOperation, booking._id);
        }

        // Log transactions for initial payment (student, instructor, platform) if card payment succeeded
        if (isCardPayment && stripePaymentIntentId) {
          const occurredAt = new Date();
          // Student payment
          await createTransaction({
            type: "payment",
            role: "student",
            direction: "debit",
            amount: finalAmount,
            amountMinor: bookingMoney.grossAmountMinor,
            currency: DEFAULT_CURRENCY.toUpperCase(),
            status: "succeeded",
            bookingId: booking._id,
            studentId: user.id,
            stripePaymentIntentId: stripePaymentIntentId,
            financialOperationId: directPaymentOperation.operationId,
            eventType: "DIRECT_PAYMENT_STUDENT_DEBIT",
            description: `${numSlots} lesson(s) with instructor ${instructor.firstName} ${instructor.lastName}`,
            occurredAt,
          });
          // Platform gross receipt (link student so admin table shows who paid)
          await createTransaction({
            type: "payment",
            role: "platform",
            direction: "credit",
            amount: finalAmount,
            amountMinor: bookingMoney.grossAmountMinor,
            currency: DEFAULT_CURRENCY.toUpperCase(),
            status: "succeeded",
            bookingId: booking._id,
            studentId: user.id,
            instructorId: instructor._id,
            stripePaymentIntentId: stripePaymentIntentId,
            financialOperationId: directPaymentOperation.operationId,
            eventType: "DIRECT_PAYMENT_PLATFORM_GROSS",
            description: "Platform gross receipt for booking",
            occurredAt,
          });
          // Per-slot instructor share and platform commission
          for (const slot of enrichedSlots) {
            if (slot.instructorAmount != null) {
              await createTransaction({
                type: "payment",
                role: "instructor",
                direction: "credit",
                amount: slot.instructorAmount,
                amountMinor: slot.instructorAmountMinor,
                currency: DEFAULT_CURRENCY.toUpperCase(),
                status: "succeeded",
                bookingId: booking._id,
                instructorId: instructor._id,
                studentId: user.id,
                stripePaymentIntentId: stripePaymentIntentId,
                financialOperationId: directPaymentOperation.operationId,
                eventType: `DIRECT_PAYMENT_INSTRUCTOR_${String(slot._id)}`,
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
                amountMinor: slot.commissionAmountMinor,
                currency: DEFAULT_CURRENCY.toUpperCase(),
                status: "succeeded",
                bookingId: booking._id,
                slotId: slot._id,
                studentId: user.id,
                instructorId: instructor._id,
                stripePaymentIntentId: stripePaymentIntentId,
                financialOperationId: directPaymentOperation.operationId,
                eventType: `DIRECT_PAYMENT_COMMISSION_${String(slot._id)}`,
                description: "Platform commission for booked slot",
                occurredAt,
              });
            }
          }
          await markLocalSuccess(
            directPaymentOperation,
            "booking_and_transactions_applied",
          );
          await markCompleted(directPaymentOperation);
        }

        // Record the embedded booking entry with atomic updates. This avoids
        // saving a stale day document over another request's slot claim.
        await recordBookedAvailabilitySlots({
          teacherId: instructorId,
          bookingId: booking._id,
          slots: booking.slots,
        });
        await invalidateAvailability(instructorId);
        // 4. Optional: populate instructor
        const savedBooking = await StudentBooking.findById(booking._id)
          .populate(
            "instructorId",
            "_id firstName lastName email phone description profileImage address",
          )
          .populate(
            "studentId",
            "_id firstName lastName email phone profileImage homeAddress",
          );

        const bookingData = JSON.parse(JSON.stringify(savedBooking));
        // 5. Send email notifications to all parties

        try {
          await notifyBookingParties(bookingData, "booking_created");
        } catch (emailError) {
          console.error("Failed to send booking creation emails:", emailError);
          // Don't throw error here as booking was successful
        }
        // ✅ NOTIFY ALL ADMINS VIA SOCKET.IO
        const io = getIOInstance();
        if (io && io.notifyNewBooking) {
          io.notifyNewBooking(bookingData);
        } else {
          console.warn("⚠️ Socket.IO instance not available for notifications");
        }
        return { booking: savedBooking };
      } catch (error) {
        if (!availabilityCommitted) {
          await releaseAvailabilitySlots({ claims: availabilityClaims }).catch(() => {});
        }
        if (directPaymentIntentId) {
          console.error("[HIGH] Direct card booking failed after Stripe operation", {
            paymentIntentId: directPaymentIntentId,
            paymentCorrelationId,
            studentId: String(user.id),
            error: error.message,
          });
        }
        console.error("Booking creation error:", error);
        if (error.errors) {
          throw new UserInputError("Invalid input", { errors: error.errors });
        }
        throw error;
      }
    },

    createBookingCheckoutSession: async (_, { input }, { user }) => {
      requireRole(user, "Student");
      let availabilityClaims = [];
      let availabilityCommitted = false;
      try {
        const validatedInput = studentBookingSchema.parse({
          ...input,
          studentId: user.id,
        });
        const { instructorId } = validatedInput;
        const instructor = await Instructor.findById(instructorId).lean();
        if (!instructor) {
          throw new UserInputError("Instructor not found");
        }
        if (!isInstructorPaymentReady(instructor)) {
          throw new UserInputError(
            "This instructor is not available for paid bookings yet. Please choose another instructor.",
          );
        }
        const instructorAccountId = instructor.stripeAccount?.accountId;
        if (!instructorAccountId) {
          throw new UserInputError(
            "Instructor payment account is not set up. Please try another instructor.",
          );
        }

        const numSlots = validatedInput.slots.length;
        const finalAmount = Number(validatedInput.finalAmount);
        const platformSettings = await getPlatformCommissionForSplit();
        const bookingMoney = buildBookingMoneySnapshot({
          grossAmountMinor: toMinorUnits(validatedInput.finalAmount),
          slotCount: numSlots,
          instructor,
          platformSettings,
        });
        const amountCentimes = bookingMoney.grossAmountMinor;
        const instructorShareCentimes = bookingMoney.instructorAmountMinor;

        const enrichedSlots = validatedInput.slots.map((slot, index) => ({
          ...slot,
          booked: true,
          status: "booked",
          review: false,
          paymentStatus: "pending_payment",
          payoutStatus: "not_applicable",
          ...bookingMoney.slots[index],
          chargeAmount: Number(fromMinorUnits(bookingMoney.slots[index].grossAmountMinor)),
          dspCommission: Number(fromMinorUnits(bookingMoney.slots[index].commissionAmountMinor)),
          instructorAmount: Number(fromMinorUnits(bookingMoney.slots[index].instructorAmountMinor)),
        }));

        // Decide instant vs deferred by gap between now and earliest slot start
        const now = new Date();
        const slotStartUtcTimes = enrichedSlots
          .map((slot) => getSlotStartTimestampUtc(slot.date, slot.startTime))
          .filter((ms) => Number.isFinite(ms));
        const earliestSlotStart =
          slotStartUtcTimes.length > 0
            ? new Date(Math.min(...slotStartUtcTimes))
            : null;
        const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
        const isDeferred =
          earliestSlotStart &&
          earliestSlotStart.getTime() - now.getTime() > FORTY_EIGHT_HOURS_MS;

        const gapHours = earliestSlotStart
          ? (earliestSlotStart.getTime() - now.getTime()) / (60 * 60 * 1000)
          : null;
        const checkoutRequestId =
          validatedInput.operationId || new mongoose.Types.ObjectId().toString();
        let checkoutOperation = await getOrCreateOperation({
          operationType: "CHECKOUT_SESSION",
          aggregateType: "BOOKING_REQUEST",
          aggregateId: checkoutRequestId,
          studentId: user.id,
          instructorId: instructor._id,
          currency: DEFAULT_CURRENCY.toUpperCase(),
          requestedAmount: finalAmount,
          requestedAmountMinor: bookingMoney.grossAmountMinor,
          idempotencyKey: `checkout-${checkoutRequestId}`,
          metadata: {
            studentId: String(user.id),
            instructorId: String(instructorId),
            deferred: isDeferred ? "true" : "false",
          },
        });

        if (checkoutOperation.bookingId && checkoutOperation.providerObjectId) {
          const existingSession = await retrieveCheckoutSession(
            checkoutOperation.providerObjectId,
          );
          if (existingSession?.status === "open" && existingSession.url) {
            return {
              url: existingSession.url,
              bookingId: checkoutOperation.bookingId,
              deferred: isDeferred,
            };
          }
          if (existingSession?.status === "complete") {
            throw new UserInputError(
              "This checkout has already been completed. Please refresh your bookings.",
            );
          }
        }
        if (checkoutOperation.bookingId) {
          throw new UserInputError(
            "This booking already has a checkout attempt. Use the pending booking payment action to resume it.",
          );
        }
        if (!checkoutOperation.providerObjectId) {
          const claimedCheckout = await claimOperation(checkoutOperation);
          if (!claimedCheckout) {
            throw new UserInputError(
              "This checkout is already being processed. Please retry shortly.",
            );
          }
          await markAttempt(claimedCheckout, claimedCheckout.leaseOwner);
          checkoutOperation = claimedCheckout;
        }
        console.log(
          `[createBookingCheckoutSession] Earliest slot: ${earliestSlotStart?.toISOString()}, gap ${gapHours != null ? gapHours.toFixed(1) : "n/a"}h → ${isDeferred ? "DEFERRED (setup mode, charge at T-48)" : "INSTANT (payment now)"}`,
        );

        const existingBookings = await StudentBooking.find({
          studentId: user.id,
          instructorId,
          status: { $ne: "cancelled" },
        });
        for (const newSlot of enrichedSlots) {
          const conflictingBooking = existingBookings.find((booking) =>
            booking.slots.some(
              (existingSlot) =>
                isActiveUnpaidOrPaidSlot(existingSlot) &&
                slotsOverlap(newSlot, existingSlot),
            ),
          );
          if (conflictingBooking) {
            throw new UserInputError(
              `You already have a booking with this instructor on ${newSlot.date} between ${newSlot.startTime} and ${newSlot.endTime}`,
            );
          }
        }

        availabilityClaims = await claimAvailabilitySlots({
          teacherId: instructorId,
          slots: enrichedSlots,
        });

        const bookingPayload = {
          ...validatedInput,
          slots: enrichedSlots,
          status: "pending",
          currency: bookingMoney.currency,
          grossAmountMinor: bookingMoney.grossAmountMinor,
          commissionAmountMinor: bookingMoney.commissionAmountMinor,
          instructorAmountMinor: bookingMoney.instructorAmountMinor,
        };
        const booking = new StudentBooking(bookingPayload);
        await booking.save();
        availabilityCommitted = true;
        await attachBooking(checkoutOperation, booking._id);

        await recordBookedAvailabilitySlots({
          teacherId: instructorId,
          bookingId: booking._id,
          slots: booking.slots,
        });
        await invalidateAvailability(instructorId);

        let customerEmail = null;
        let stripeCustomerIdForSession = null;
        if (isDeferred) {
          const student = await User.findById(user.id).select("email").lean();
          customerEmail = student?.email || null;
          if (!customerEmail) {
            throw new UserInputError(
              "Student email is required for saving your card. Please complete your profile.",
            );
          }
          // Create Stripe Customer before Checkout so session.customer is set when they return.
          stripeCustomerIdForSession = await createCustomer({
            email: customerEmail,
          });
        }

        let checkoutSession;
        try {
          checkoutSession = await createCheckoutSessionForBooking({
            amountCentimes,
            transferAmountCentimes: instructorShareCentimes,
            destinationAccountId: instructorAccountId,
            metadata: {
              bookingId: String(booking._id),
              studentId: String(user.id),
              instructorId: String(instructorId),
              operationId: checkoutOperation.operationId,
              deferred: isDeferred ? "true" : "false",
            },
            successPath: "/student-dashboard/booking-details",
            cancelPath: "/student-dashboard/booking-details",
            description: `${numSlots} lesson(s) — CHF ${finalAmount.toFixed(2)}`,
            mode: isDeferred ? "setup" : "payment",
            customerEmail: customerEmail || undefined,
            customerId: stripeCustomerIdForSession || undefined,
            idempotencyKey: checkoutOperation.idempotencyKey,
          });
        } catch (providerError) {
          await markRetryable(checkoutOperation, providerError);
          throw providerError;
        }
        const { url, sessionId } = checkoutSession;
        await markProviderSuccess(checkoutOperation, {
          providerObjectId: sessionId,
          providerStatus: "created",
        });
        await StudentBooking.updateOne(
          { _id: booking._id },
          { $set: { checkoutSessionId: sessionId, updatedAt: new Date() } },
        );
        await markLocalSuccess(checkoutOperation, "booking_and_session_persisted");
        await markCompleted(checkoutOperation);
        return { url, bookingId: booking._id, deferred: isDeferred };
      } catch (error) {
        if (!availabilityCommitted) {
          await releaseAvailabilitySlots({ claims: availabilityClaims }).catch(() => {});
        }
        console.error("createBookingCheckoutSession error:", error);
        if (error.errors) {
          throw new UserInputError("Invalid input", { errors: error.errors });
        }
        throw error;
      }
    },

    createCheckoutSessionForPendingBooking: async (
      _,
      { bookingId },
      { user },
    ) => {
      requireRole(user, "Student");
      const booking = await StudentBooking.findOne({
        _id: bookingId,
        studentId: user.id,
      })
        .populate("instructorId", "stripeAccount commission")
        .lean();
      if (!booking) {
        throw new UserInputError("Booking not found or access denied.");
      }
      if (booking.status !== "pending") {
        throw new UserInputError(
          "This booking is no longer pending. Use your booked lessons to view it.",
        );
      }
      if (isAbandonedPendingBooking(booking)) {
        // Keep going: this is exactly the case we want (resume checkout).
      } else if (
        booking.stripeCustomerId ||
        (booking.slots || []).some((s) => String(s.paymentStatus) === "paid")
      ) {
        throw new UserInputError(
          "This booking is already confirmed or paid. Check your booked lessons.",
        );
      }
      const instructor = booking.instructorId;
      if (!instructor?.stripeAccount?.accountId) {
        throw new UserInputError(
          "This instructor is not available for payment. Please contact support.",
        );
      }
      if (booking.checkoutSessionId) {
        const existingSession = await retrieveCheckoutSession(
          booking.checkoutSessionId,
        );
        if (existingSession?.status === "open" && existingSession.url) {
          return {
            url: existingSession.url,
            bookingId: booking._id,
            deferred: existingSession.mode === "setup",
          };
        }
        if (existingSession?.status === "complete") {
          throw new UserInputError(
            "This checkout has already been completed. Please refresh your bookings.",
          );
        }
      }
      const now = new Date();
      const slotStartUtcTimes = (booking.slots || [])
        .map((slot) => getSlotStartTimestampUtc(slot.date, slot.startTime))
        .filter((ms) => Number.isFinite(ms));
      const earliestSlotStart =
        slotStartUtcTimes.length > 0
          ? new Date(Math.min(...slotStartUtcTimes))
          : null;
      if (earliestSlotStart && earliestSlotStart <= now) {
        throw new UserInputError(
          "Cannot complete checkout: lesson date has passed.",
        );
      }
      const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
      const isDeferred =
        earliestSlotStart &&
        earliestSlotStart.getTime() - now.getTime() > FORTY_EIGHT_HOURS_MS;

      const finalAmount = Number(
        booking.finalAmount || booking.totalAmount || 0,
      );
      const numSlots = booking.slots?.length || 1;
      const admin = await Admin.findOne().lean();
      const platformCommission = admin?.platformCommission || {};
      const bookingMoney = getBookingMoneySnapshot({
        booking,
        instructor,
        platformSettings: platformCommission,
      });
      const amountCentimes = bookingMoney.grossAmountMinor;
      const instructorShareCentimes = bookingMoney.instructorAmountMinor;
      const instructorAccountId = instructor.stripeAccount.accountId;
      const checkoutAttempt = (booking.checkoutAttempt || 0) + 1;
      const unfinishedCheckoutOperation = await getLatestOperation({
        bookingId: booking._id,
        operationType: "CHECKOUT_SESSION",
        status: { $in: ["PENDING", "PROCESSING", "RETRYABLE"] },
      });
      let resumeCheckoutOperation = unfinishedCheckoutOperation ||
        (await getOrCreateOperation({
          operationType: "CHECKOUT_SESSION",
          aggregateType: "BOOKING",
          aggregateId: String(booking._id),
          bookingId: booking._id,
          studentId: user.id,
          instructorId: instructor._id,
          currency: DEFAULT_CURRENCY.toUpperCase(),
          requestedAmount: finalAmount,
          requestedAmountMinor: bookingMoney.grossAmountMinor,
          idempotencyKey: `checkout-${String(booking._id)}-resume-${checkoutAttempt}`,
          metadata: { bookingId: String(booking._id), resumed: "true" },
        }));
      if (resumeCheckoutOperation.providerObjectId) {
        const existingSession = await retrieveCheckoutSession(
          resumeCheckoutOperation.providerObjectId,
        );
        if (existingSession?.status === "open" && existingSession.url) {
          return {
            url: existingSession.url,
            bookingId: booking._id,
            deferred: isDeferred,
          };
        }
        if (existingSession?.status === "complete") {
          throw new UserInputError(
            "This checkout has already been completed. Please refresh your bookings.",
          );
        }
      }
      const claimedResumeOperation = await claimOperation(resumeCheckoutOperation);
      if (!claimedResumeOperation) {
        throw new UserInputError(
          "This checkout is already being processed. Please retry shortly.",
        );
      }
      await markAttempt(claimedResumeOperation, claimedResumeOperation.leaseOwner);
      resumeCheckoutOperation = claimedResumeOperation;

      const resumePaymentFields = { updatedAt: new Date() };
      (booking.slots || []).forEach((slot, index) => {
        const pay = String(slot.paymentStatus || "").toLowerCase();
        if (pay === "paid" || pay === "refunded") return;
        resumePaymentFields[`slots.${index}.paymentStatus`] = "pending_payment";
        resumePaymentFields[`slots.${index}.paymentIntentId`] = null;
        resumePaymentFields[`slots.${index}.paymentReminderStartedAt`] = null;
        resumePaymentFields[`slots.${index}.paymentReminderDeadlineAt`] = null;
        resumePaymentFields[`slots.${index}.paymentReminder1SentAt`] = null;
        resumePaymentFields[`slots.${index}.paymentReminder2SentAt`] = null;
        resumePaymentFields[`slots.${index}.paymentReminder3SentAt`] = null;
      });
      await StudentBooking.updateOne(
        { _id: booking._id },
        { $set: resumePaymentFields },
      );

      let customerEmail = null;
      let stripeCustomerIdForSession = null;
      if (isDeferred) {
        const student = await User.findById(user.id).select("email").lean();
        customerEmail = student?.email || null;
        if (!customerEmail) {
          throw new UserInputError(
            "Student email is required for saving your card. Please complete your profile.",
          );
        }
        stripeCustomerIdForSession = await createCustomer({
          email: customerEmail,
        });
      }

      let resumedSession;
      try {
        resumedSession = await createCheckoutSessionForBooking({
        amountCentimes,
        transferAmountCentimes: instructorShareCentimes,
        destinationAccountId: instructorAccountId,
        metadata: {
          bookingId: String(booking._id),
          studentId: String(user.id),
          instructorId: String(instructor._id),
          deferred: isDeferred ? "true" : "false",
        },
        successPath: "/student-dashboard/booking-details",
        cancelPath: "/student-dashboard/booking-details",
        description: `${numSlots} lesson(s) — CHF ${finalAmount.toFixed(2)}`,
        mode: isDeferred ? "setup" : "payment",
        customerEmail: customerEmail || undefined,
          customerId: stripeCustomerIdForSession || undefined,
          idempotencyKey: resumeCheckoutOperation.idempotencyKey,
        });
      } catch (providerError) {
        await markRetryable(resumeCheckoutOperation, providerError);
        throw providerError;
      }
      await markProviderSuccess(resumeCheckoutOperation, {
        providerObjectId: resumedSession.sessionId,
        providerStatus: "created",
      });
      await StudentBooking.updateOne(
        { _id: booking._id },
        {
          $set: {
            checkoutSessionId: resumedSession.sessionId,
            checkoutAttempt,
            updatedAt: new Date(),
          },
        },
      );
      await markLocalSuccess(resumeCheckoutOperation, "booking_and_session_persisted");
      await markCompleted(resumeCheckoutOperation);
      return {
        url: resumedSession.url,
        bookingId: booking._id,
        deferred: isDeferred,
      };
    },

    completeBookingFromCheckout: async (_, { sessionId }, { user }) => {
      requireRole(user, "Student");
      const session = await retrieveCheckoutSession(sessionId);
      if (
        !session ||
        session.mode !== "payment" ||
        session.payment_status !== "paid"
      ) {
        throw new UserInputError(
          "Payment was not completed. Please try again or contact support.",
        );
      }
      const paymentIntent = session.payment_intent;
      const bookingId =
        session.metadata?.bookingId || paymentIntent?.metadata?.bookingId;
      if (!bookingId) {
        throw new UserInputError("Invalid checkout session.");
      }
      const piId =
        typeof paymentIntent === "object" && paymentIntent?.id
          ? paymentIntent.id
          : session.payment_intent;
      const savedBooking = await finalizePaidCheckoutBooking({
        bookingId,
        paymentIntentId: piId,
        expectedStudentId: user.id,
      });
      const checkoutOperation = await getOperationByProviderObjectId(session.id);
      if (checkoutOperation) {
        await markProviderSuccess(checkoutOperation, {
          providerObjectId: session.id,
          secondaryProviderObjectId: piId,
          providerStatus: session.payment_status,
          localStatus: "checkout_payment_succeeded",
        });
        await markLocalSuccess(checkoutOperation, "booking_and_transactions_applied");
        await markCompleted(checkoutOperation);
      }
      if (!savedBooking) {
        throw new UserInputError("Booking not found.");
      }
      if (String(savedBooking.status) !== "confirmed") {
        throw new UserInputError(
          "Payment succeeded in Stripe, but this booking can no longer be confirmed automatically. Please contact support.",
        );
      }
      return savedBooking;
    },

    // For deferred bookings: Checkout in setup mode saves a payment method via SetupIntent.
    // This resolver finalizes the booking after successful setup (no immediate charge).
    completeDeferredBookingFromCheckout: async (_, { sessionId }, { user }) => {
      requireRole(user, "Student");
      console.log(
        "[completeDeferredBookingFromCheckout] called, sessionId:",
        sessionId?.slice(0, 20) + "...",
      );
      const session = await retrieveCheckoutSession(sessionId);
      if (!session || session.mode !== "setup") {
        console.warn(
          "[completeDeferredBookingFromCheckout] invalid or non-setup session, mode:",
          session?.mode,
        );
        throw new UserInputError(
          "Invalid checkout session for deferred booking.",
        );
      }
      const setupIntent = session.setup_intent;
      if (
        !setupIntent ||
        typeof setupIntent === "string" ||
        setupIntent.status !== "succeeded"
      ) {
        throw new UserInputError(
          "Payment method was not saved. Please try again or contact support.",
        );
      }

      const bookingId = session.metadata?.bookingId;
      if (!bookingId) {
        throw new UserInputError("Invalid checkout session.");
      }
      const booking = await StudentBooking.findById(bookingId);
      if (!booking) {
        throw new UserInputError("Booking not found.");
      }
      if (String(booking.studentId) !== String(user.id)) {
        throw new UserInputError("This booking does not belong to you.");
      }
      const checkoutOperation = await getOperationByProviderObjectId(session.id);
      if (checkoutOperation) {
        await markProviderSuccess(checkoutOperation, {
          providerObjectId: session.id,
          secondaryProviderObjectId: setupIntent.id,
          providerStatus: setupIntent.status,
          localStatus: "setup_succeeded",
        });
      }
      if (booking.status !== "pending") {
        console.log(
          "[completeDeferredBookingFromCheckout] booking already completed, id:",
          bookingId,
        );
        return booking;
      }

      // Save payment method and Stripe Customer ID for future T-48 off-session charges
      const paymentMethodId =
        typeof setupIntent.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent.payment_method?.id;
      if (!paymentMethodId) {
        throw new UserInputError("Could not determine saved payment method.");
      }

      // Customer ID is required for T-48 off-session charges. Try session, SetupIntent, PaymentMethod, then direct SetupIntent retrieve.
      let stripeCustomerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id || null;
      if (!stripeCustomerId && setupIntent.customer) {
        stripeCustomerId =
          typeof setupIntent.customer === "string"
            ? setupIntent.customer
            : setupIntent.customer?.id || null;
      }
      if (!stripeCustomerId && paymentMethodId) {
        try {
          const pm = await retrievePaymentMethod(paymentMethodId);
          if (pm?.customer) {
            stripeCustomerId =
              typeof pm.customer === "string"
                ? pm.customer
                : pm.customer?.id || null;
          }
        } catch (pmErr) {
          // ignore
        }
      }
      // Fallback: retrieve SetupIntent directly with customer expanded (Checkout sometimes doesn't return customer on session)
      if (!stripeCustomerId && setupIntent.id) {
        try {
          const si = await retrieveSetupIntent(setupIntent.id);
          if (si?.customer) {
            stripeCustomerId =
              typeof si.customer === "string"
                ? si.customer
                : si.customer?.id || null;
          }
        } catch (siErr) {
          // ignore
        }
      }
      if (!stripeCustomerId) {
        console.warn(
          "[completeDeferredBookingFromCheckout] no stripeCustomerId — session.customer:",
          session.customer,
          "setupIntent.customer:",
          setupIntent.customer,
          "bookingId:",
          bookingId,
        );
        throw new UserInputError(
          "We could not link your card to your account. Please try again or contact support.",
        );
      }

      console.log(
        "[completeDeferredBookingFromCheckout] saving stripeCustomerId for booking",
        bookingId,
      );
      booking.status = "confirmed";
      booking.paymentMethod = {
        ...(booking.paymentMethod || { type: "card" }),
        paymentMethodId,
        setupIntentId: setupIntent.id,
      };
      booking.stripeCustomerId = stripeCustomerId;

      // Ensure all slots remain pending_payment (they were created that way)
      booking.slots.forEach((slot) => {
        if (!slot.paymentStatus || slot.paymentStatus === "pending_payment") {
          slot.paymentStatus = "pending_payment";
          slot.payoutStatus = slot.payoutStatus || "not_applicable";
        }
      });

      await booking.save();
      await invalidateAvailability(booking.instructorId._id);
      if (checkoutOperation) {
        await markLocalSuccess(checkoutOperation, "booking_and_setup_persisted");
        await markCompleted(checkoutOperation);
      }

      const savedBooking = await StudentBooking.findById(booking._id)
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
        console.error(
          "Failed to send deferred booking creation emails:",
          emailError,
        );
      }
      const io = getIOInstance();
      if (io && io.notifyNewBooking) {
        io.notifyNewBooking(JSON.parse(JSON.stringify(savedBooking)));
      }
      return savedBooking;
    },

    getT48ClientSecret: async (_, { bookingId, slotId }, { user }) => {
      requireRole(user, "Student");
      const booking = await StudentBooking.findOne({
        _id: bookingId,
        studentId: user.id,
      }).lean();
      if (!booking) {
        throw new UserInputError("Booking not found or access denied.");
      }
      const slot = booking.slots?.find((s) => String(s._id) === String(slotId));
      if (!slot) {
        throw new UserInputError("Slot not found.");
      }
      // If already paid (e.g. user just returned from 3DS or webhook fired first), do NOT throw —
      // return null so the frontend renders the success state smoothly.
      if (slot.paymentStatus === "paid") {
        return null;
      }

      let slotNeedsCompletion =
        slot.paymentStatus === "requires_action" ||
        slot.paymentStatus === "payment_failed";

      // Self-heal state drift: if DB status is stale but PI still needs action, allow completion.
      if (!slotNeedsCompletion && slot.paymentIntentId) {
        try {
          const existingPi = await retrievePaymentIntent(slot.paymentIntentId);
          const piStatus = String(existingPi?.status || "");
          if (piStatus === "succeeded") {
            return null; // Stripe finalized payment; frontend will treat as success
          }
          if (
            ["requires_action", "requires_confirmation", "requires_payment_method"].includes(
              piStatus,
            )
          ) {
            slotNeedsCompletion = true;
            await StudentBooking.updateOne(
              { _id: bookingId, "slots._id": slotId },
              {
                $set: {
                  "slots.$.paymentStatus": "requires_action",
                  updatedAt: new Date(),
                },
              },
            );
          }
        } catch (_) {
          // Best-effort read only; fall through to standard validation message.
        }
      }

      if (!slotNeedsCompletion) {
        throw new UserInputError(
          "This slot does not require payment completion right now. Please refresh Booked lessons and try again.",
        );
      }
      // Do not allow completing 3DS/payment if lesson date passed or instructor marked completed/missed
      if (slot.status === "completed" || slot.status === "missed") {
        throw new UserInputError(
          "Cannot complete payment: this lesson was marked completed or missed.",
        );
      }
      const slotEnd = new Date(
        `${slot.date}T${slot.endTime || slot.startTime}`,
      );
      if (slotEnd <= new Date()) {
        throw new UserInputError(
          "Cannot complete payment: lesson date has passed.",
        );
      }
      // Only reuse existing PI when it's not already in requires_action. A PI in requires_action
      // from T-48 was confirmed without return_url, so it has use_stripe_sdk (no redirect) and the
      // in-page 3DS modal often never appears. Creating a new PI and confirming with return_url
      // ensures the frontend gets redirect_to_url and can send the user to the bank.
      const paymentIntentId = slot.paymentIntentId;
      if (paymentIntentId) {
        const pi = await retrievePaymentIntent(paymentIntentId);
        if (pi?.client_secret && pi.status === "succeeded") {
          return pi.client_secret; // e.g. user just returned from 3DS; frontend will complete flow
        }
        const canUse =
          pi?.client_secret &&
          ["requires_confirmation", "requires_payment_method"].includes(
            pi.status,
          );
        if (canUse) return pi.client_secret;
        // If status is requires_action, do NOT return it — fall through to create new PI with return_url
        // PI canceled, expired, or requires_action — fall through to create a new one
      }

      // No valid PI: create a new PaymentIntent so the student can complete payment (e.g. link expired after 24h)
      if (
        !booking.paymentMethod?.paymentMethodId ||
        !booking.stripeCustomerId
      ) {
        throw new UserInputError(
          "No payment method found for this booking. Please re-book or contact support.",
        );
      }
      const bookingWithInstructor = await StudentBooking.findOne({
        _id: bookingId,
        studentId: user.id,
      })
        .populate("instructorId", "stripeAccount commission")
        .lean();
      const instructor = bookingWithInstructor?.instructorId;
      if (!instructor?.stripeAccount?.accountId) {
        throw new UserInputError(
          "Instructor payment setup is missing. Please contact support.",
        );
      }
      const admin = await Admin.findOne().lean();
      const platformCommission = admin?.platformCommission || {};
      const bookingMoney = getBookingMoneySnapshot({
        booking: bookingWithInstructor,
        instructor,
        platformSettings: platformCommission,
      });
      const slotIndex = bookingWithInstructor.slots.findIndex(
        (candidate) => String(candidate._id) === String(slotId),
      );
      const slotMoney = bookingMoney.slots[slotIndex];
      if (!slotMoney) throw new UserInputError("Slot financial snapshot is missing.");
      const perSlotAmount = Number(fromMinorUnits(slotMoney.grossAmountMinor));
      const instructorAmount = Number(fromMinorUnits(slotMoney.instructorAmountMinor));
      const amountCentimes = slotMoney.grossAmountMinor;
      const instructorShareCentimes = slotMoney.instructorAmountMinor;
      const completionOperation = await getOrCreateOperation({
        operationType: "T48_PAYMENT",
        aggregateType: "BOOKING_SLOT",
        aggregateId: `${String(bookingId)}:${String(slotId)}:3ds`,
        bookingId,
        slotId,
        studentId: user.id,
        instructorId: instructor._id,
        currency: "CHF",
        requestedAmount: perSlotAmount,
        requestedAmountMinor: slotMoney.grossAmountMinor,
        idempotencyKey: `complete-${String(bookingId)}-${String(slotId)}`,
        metadata: { bookingId: String(bookingId), slotId: String(slotId) },
      });
      let paymentResult;
      if (completionOperation.providerObjectId) {
        const existingPi = await retrievePaymentIntent(
          completionOperation.providerObjectId,
        );
        paymentResult = {
          paymentIntentId: existingPi.id,
          status: existingPi.status,
          clientSecret: existingPi.client_secret,
        };
      } else {
        const claimedCompletion = await claimOperation(completionOperation);
        if (!claimedCompletion) {
          throw new UserInputError(
            "This payment is already being processed. Please retry shortly.",
          );
        }
        await markAttempt(claimedCompletion, claimedCompletion.leaseOwner);
        try {
          paymentResult = await createPaymentIntentForBooking({
            amountCentimes,
            paymentMethodId: booking.paymentMethod.paymentMethodId,
            customerId: booking.stripeCustomerId,
            metadata: {
              bookingId: String(bookingId),
              slotId: String(slotId),
              studentId: String(user.id),
              instructorId: String(instructor._id),
              operationId: completionOperation.operationId,
            },
            confirm: false,
            offSession: false,
            transferData: {
              destinationAccountId: instructor.stripeAccount.accountId,
              amountCentimes: instructorShareCentimes,
            },
            idempotencyKey: completionOperation.idempotencyKey,
          });
          await markProviderSuccess(completionOperation, {
            providerObjectId: paymentResult.paymentIntentId,
            providerStatus: paymentResult.status,
            localStatus: "provider_succeeded",
          });
        } catch (providerError) {
          await markRetryable(completionOperation, providerError);
          throw providerError;
        }
      }
      const newPiId = paymentResult?.paymentIntentId;
      const newSecret = paymentResult?.clientSecret;
      if (!newPiId || !newSecret) {
        throw new UserInputError(
          "Could not create payment session. Please try again or contact support.",
        );
      }
      const paymentSlotIndex = bookingWithInstructor.slots.findIndex(
        (s) => String(s._id) === String(slotId),
      );
      if (paymentSlotIndex !== -1) {
        await StudentBooking.updateOne(
          { _id: bookingId },
          {
            $set: {
              [`slots.${paymentSlotIndex}.paymentIntentId`]: newPiId,
              updatedAt: new Date(),
            },
          },
        );
      }
      // If the PI is already succeeded (e.g. user just returned from 3DS; idempotency returned same PI), do not confirm again.
      if (paymentResult.status === "succeeded") {
        return newSecret;
      }
      // Confirm with return_url so when the frontend retrieves the PI it gets requires_action
      // with redirect_to_url and can redirect the user to the bank (no stuck modal).
      const returnUrl = `${FRONTEND_BASE.replace(/\/$/, "")}/student-dashboard/complete-payment?bookingId=${bookingId}&slotId=${slotId}`;
      await confirmPaymentIntent(newPiId, returnUrl);
      await markLocalSuccess(completionOperation, "requires_action");
      return newSecret;
    },

    completeT48SlotPayment: async (_, { paymentIntentId }, { user }) => {
      requireRole(user, "Student");
      const pi = await retrievePaymentIntent(paymentIntentId);
      if (!pi || pi.status !== "succeeded") {
        throw new UserInputError(
          "Payment has not been completed yet. Please complete 3D Secure in the payment form.",
        );
      }
      const bookingId = pi.metadata?.bookingId;
      const slotId = pi.metadata?.slotId;
      if (!bookingId || !slotId) {
        throw new UserInputError("Invalid payment intent.");
      }
      const booking = await StudentBooking.findOne({
        _id: bookingId,
        studentId: user.id,
      })
        .populate(
          "instructorId",
          "_id firstName lastName email stripeAccount commission",
        )
        .populate("studentId", "_id");
      if (!booking) {
        throw new UserInputError("Booking not found or access denied.");
      }
      const slot = booking.slots?.find((s) => String(s._id) === String(slotId));
      if (!slot) {
        throw new UserInputError("Slot not found.");
      }
      let paymentOperation = await getOperationByProviderObjectId(
        paymentIntentId,
      );
      if (!paymentOperation) {
        const bookingMoneyForRecovery = getBookingMoneySnapshot({
          booking,
          instructor: booking.instructorId,
          platformSettings: {},
        });
        paymentOperation = await getOrCreateOperation({
          operationType: "T48_PAYMENT",
          aggregateType: "BOOKING_SLOT",
          aggregateId: `${String(booking._id)}:${String(slot._id)}`,
          bookingId: booking._id,
          slotId: slot._id,
          studentId: booking.studentId._id,
          instructorId: booking.instructorId._id,
          currency: "CHF",
          requestedAmount: Number(
            fromMinorUnits(bookingMoneyForRecovery.slots[booking.slots.findIndex((candidate) => String(candidate._id) === String(slot._id))].grossAmountMinor),
          ),
          requestedAmountMinor: bookingMoneyForRecovery.slots[booking.slots.findIndex((candidate) => String(candidate._id) === String(slot._id))].grossAmountMinor,
          idempotencyKey: `t48-recovered-${paymentIntentId}`,
          metadata: { recoveredFromProvider: true },
        });
        await markProviderSuccess(paymentOperation, {
          providerObjectId: paymentIntentId,
          providerStatus: pi.status,
          localStatus: "provider_succeeded",
        });
      }
      if (slot.paymentStatus === "paid") {
        return booking;
      }
      // Do not allow completing payment if lesson date passed or instructor marked completed/missed
      if (slot.status === "completed" || slot.status === "missed") {
        throw new UserInputError(
          "Cannot complete payment: this lesson was marked completed or missed.",
        );
      }
      const slotEndDate = new Date(
        `${slot.date}T${slot.endTime || slot.startTime}`,
      );
      if (slotEndDate <= new Date()) {
        throw new UserInputError(
          "Cannot complete payment: lesson date has passed.",
        );
      }
      const admin = await Admin.findOne().lean();
      const platformCommission = admin?.platformCommission || {};
      const bookingMoney = getBookingMoneySnapshot({
        booking,
        instructor: booking.instructorId,
        platformSettings: platformCommission,
      });
      const slotIndex = booking.slots.findIndex((candidate) => String(candidate._id) === String(slot._id));
      const slotMoney = bookingMoney.slots[slotIndex];
      const perSlotAmount = Number(fromMinorUnits(slotMoney.grossAmountMinor));
      const instructorAmount = Number(fromMinorUnits(slotMoney.instructorAmountMinor));
      const dspCommission = Number(fromMinorUnits(slotMoney.commissionAmountMinor));
      const occurredAt = new Date();
      slot.paymentStatus = "paid";
      slot.paymentIntentId = paymentIntentId;
      slot.chargedAt = occurredAt;
      slot.chargeAmount = perSlotAmount;
      slot.dspCommission = dspCommission;
      slot.instructorAmount = instructorAmount;
      slot.grossAmountMinor = slotMoney.grossAmountMinor;
      slot.commissionAmountMinor = slotMoney.commissionAmountMinor;
      slot.instructorAmountMinor = slotMoney.instructorAmountMinor;
      slot.payoutStatus = "not_applicable";
      await booking.save();

      await createTransaction({
        type: "payment",
        role: "student",
        direction: "debit",
        amount: perSlotAmount,
        amountMinor: slotMoney.grossAmountMinor,
        currency: "CHF",
        status: "succeeded",
        bookingId: booking._id,
        slotId: slot._id,
        studentId: booking.studentId._id,
        stripePaymentIntentId: paymentIntentId,
        financialOperationId: paymentOperation.operationId,
        eventType: "T48_PAYMENT_STUDENT_DEBIT",
        description: "Lesson payment (T-48 3DS completed)",
        occurredAt,
      });
      await createTransaction({
        type: "payment",
        role: "platform",
        direction: "credit",
        amount: perSlotAmount,
        amountMinor: slotMoney.grossAmountMinor,
        bookingId: booking._id,
        slotId: slot._id,
        studentId: booking.studentId._id,
        stripePaymentIntentId: paymentIntentId,
        financialOperationId: paymentOperation.operationId,
        eventType: "T48_PAYMENT_PLATFORM_GROSS",
        description: "Platform gross receipt for lesson (T-48)",
        occurredAt,
      });
      if (instructorAmount != null) {
        await createTransaction({
          type: "payment",
          role: "instructor",
          direction: "credit",
          amount: instructorAmount,
          amountMinor: slotMoney.instructorAmountMinor,
          currency: "CHF",
          status: "succeeded",
          bookingId: booking._id,
          slotId: slot._id,
          instructorId: booking.instructorId._id,
          studentId: booking.studentId._id,
          stripePaymentIntentId: paymentIntentId,
          financialOperationId: paymentOperation.operationId,
          eventType: "T48_PAYMENT_INSTRUCTOR_SHARE",
          description: "Instructor share for lesson (T-48)",
          occurredAt,
        });
      }
      if (dspCommission != null) {
        await createTransaction({
          type: "payment",
          role: "platform",
          direction: "credit",
          amount: dspCommission,
          amountMinor: slotMoney.commissionAmountMinor,
          currency: "CHF",
          bookingId: booking._id,
          slotId: slot._id,
          studentId: booking.studentId._id,
          financialOperationId: paymentOperation.operationId,
          eventType: "T48_PAYMENT_COMMISSION",
          description: "Platform commission for lesson (T-48)",
          occurredAt,
        });
      }
      await markLocalSuccess(paymentOperation, "slot_and_transactions_applied");
      await markCompleted(paymentOperation);
      const updated = await StudentBooking.findById(booking._id)
        .populate(
          "instructorId",
          "_id firstName lastName email description profileImage",
        )
        .populate("studentId", "_id firstName lastName email profileImage");
      return updated;
    },

    completeBookingAfterPayment: async (
      _,
      { paymentIntentId, input },
      { user },
    ) => {
      requireRole(user, "Student");
      const { retrievePaymentIntent } = require("../../services/stripeService");
      const pi = await retrievePaymentIntent(paymentIntentId);
      if (!pi || pi.status !== "succeeded") {
        throw new UserInputError(
          "Payment was not completed. Please try again.",
        );
      }
      if (String(pi.metadata?.studentId) !== String(user.id)) {
        throw new UserInputError("Payment does not match this user.");
      }
      let directPaymentOperation = await getOperationByProviderObjectId(
        paymentIntentId,
      );
      if (!directPaymentOperation) {
        directPaymentOperation = await getOrCreateOperation({
          operationType: "DIRECT_PAYMENT",
          aggregateType: "BOOKING_REQUEST",
          aggregateId: String(pi.metadata?.operationId || paymentIntentId),
          studentId: user.id,
          instructorId: pi.metadata?.instructorId,
          currency: DEFAULT_CURRENCY.toUpperCase(),
          idempotencyKey: `direct-recovered-${paymentIntentId}`,
          metadata: { recoveredFromProvider: true },
        });
        await markProviderSuccess(directPaymentOperation, {
          providerObjectId: paymentIntentId,
          providerStatus: pi.status,
          localStatus: "provider_succeeded",
        });
      }
      const validatedInput = studentBookingSchema.parse({
        ...input,
        studentId: user.id,
      });
      const { instructorId } = validatedInput;
      const instructor = await Instructor.findById(instructorId).lean();
      if (!instructor) throw new UserInputError("Instructor not found");
      if (!isInstructorPaymentReady(instructor)) {
        throw new UserInputError(
          "This instructor is not available for paid bookings yet.",
        );
      }
      const numSlots = validatedInput.slots.length;
      const finalAmount = Number(validatedInput.finalAmount);
      const platformSettingsPay = await getPlatformCommissionForSplit();
      const bookingMoney = buildBookingMoneySnapshot({
        grossAmountMinor: toMinorUnits(validatedInput.finalAmount),
        slotCount: numSlots,
        instructor,
        platformSettings: platformSettingsPay,
      });
      if (Number.isSafeInteger(pi.amount) && pi.amount !== bookingMoney.grossAmountMinor) {
        throw new UserInputError("Payment amount does not match the booking total.");
      }
      const enrichedSlots = validatedInput.slots.map((slot, index) => {
        const slotMoney = bookingMoney.slots[index];
        return {
          ...slot,
          booked: true,
          status: "booked",
          review: false,
          paymentStatus: "paid",
          paymentIntentId,
          chargeAmount: Number(fromMinorUnits(slotMoney.grossAmountMinor)),
          dspCommission: Number(fromMinorUnits(slotMoney.commissionAmountMinor)),
          instructorAmount: Number(fromMinorUnits(slotMoney.instructorAmountMinor)),
          ...slotMoney,
          payoutStatus: "not_applicable",
        };
      });
      const existingBookings = await StudentBooking.find({
        studentId: user.id,
        instructorId,
        status: { $ne: "cancelled" },
      });
      for (const newSlot of enrichedSlots) {
        const conflictingBooking = existingBookings.find((booking) =>
          booking.slots.some(
            (existingSlot) =>
              existingSlot.date === newSlot.date &&
              existingSlot.booked &&
              ((newSlot.startTime >= existingSlot.startTime &&
                newSlot.startTime < existingSlot.endTime) ||
                (newSlot.endTime > existingSlot.startTime &&
                  newSlot.endTime <= existingSlot.endTime) ||
                (newSlot.startTime <= existingSlot.startTime &&
                  newSlot.endTime >= existingSlot.endTime)),
          ),
        );
        if (conflictingBooking) {
          throw new UserInputError(
            `You already have a booking with this instructor on ${newSlot.date}.`,
          );
        }
      }
      const bookingPayload = {
        ...validatedInput,
        slots: enrichedSlots,
        status: "confirmed",
        currency: bookingMoney.currency,
        grossAmountMinor: bookingMoney.grossAmountMinor,
        commissionAmountMinor: bookingMoney.commissionAmountMinor,
        instructorAmountMinor: bookingMoney.instructorAmountMinor,
        stripePaymentIntentId: paymentIntentId,
        paymentMethod: validatedInput.paymentMethod
          ? {
              ...validatedInput.paymentMethod,
              paymentMethodId: validatedInput.paymentMethod.paymentMethodId,
              cardLast4: validatedInput.paymentMethod.cardLast4,
              cardBrand: validatedInput.paymentMethod.cardBrand,
            }
          : validatedInput.paymentMethod,
      };
      const booking = new StudentBooking(bookingPayload);
      await booking.save();
      await attachBooking(directPaymentOperation, booking._id);
      const occurredAt = new Date();
      await createTransaction({
        type: "payment",
        role: "student",
        direction: "debit",
        amount: finalAmount,
        amountMinor: bookingMoney.grossAmountMinor,
        currency: DEFAULT_CURRENCY.toUpperCase(),
        status: "succeeded",
        bookingId: booking._id,
        studentId: user.id,
        stripePaymentIntentId: paymentIntentId,
        financialOperationId: directPaymentOperation.operationId,
        eventType: "DIRECT_PAYMENT_STUDENT_DEBIT",
        description: `${numSlots} lesson(s) with instructor ${instructor.firstName} ${instructor.lastName}`,
        occurredAt,
      });
      await createTransaction({
        type: "payment",
        role: "platform",
        direction: "credit",
        amount: finalAmount,
        amountMinor: bookingMoney.grossAmountMinor,
        currency: DEFAULT_CURRENCY.toUpperCase(),
        status: "succeeded",
        bookingId: booking._id,
        studentId: user.id,
        instructorId: instructor._id,
        stripePaymentIntentId: paymentIntentId,
        financialOperationId: directPaymentOperation.operationId,
        eventType: "DIRECT_PAYMENT_PLATFORM_GROSS",
        description: "Platform gross receipt for booking",
        occurredAt,
      });
      for (const slot of enrichedSlots) {
        if (slot.instructorAmount != null) {
          await createTransaction({
            type: "payment",
            role: "instructor",
            direction: "credit",
            amount: slot.instructorAmount,
            amountMinor: slot.instructorAmountMinor,
            currency: DEFAULT_CURRENCY.toUpperCase(),
            status: "succeeded",
            bookingId: booking._id,
            instructorId: instructor._id,
            studentId: user.id,
            stripePaymentIntentId: paymentIntentId,
            financialOperationId: directPaymentOperation.operationId,
            eventType: `DIRECT_PAYMENT_INSTRUCTOR_${String(slot._id)}`,
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
            amountMinor: slot.commissionAmountMinor,
            currency: DEFAULT_CURRENCY.toUpperCase(),
            status: "succeeded",
            bookingId: booking._id,
            studentId: user.id,
            instructorId: instructor._id,
            stripePaymentIntentId: paymentIntentId,
            financialOperationId: directPaymentOperation.operationId,
            eventType: `DIRECT_PAYMENT_COMMISSION_${String(slot._id)}`,
            description: "Platform commission for booked slot",
            occurredAt,
          });
        }
      }
      await markLocalSuccess(directPaymentOperation, "booking_and_transactions_applied");
      await markCompleted(directPaymentOperation);
      await recordBookedAvailabilitySlots({
        teacherId: instructorId,
        bookingId: booking._id,
        slots: booking.slots,
      });
      await invalidateAvailability(instructorId);
      const savedBooking = await StudentBooking.findById(booking._id)
        .populate(
          "instructorId",
          "_id firstName lastName email phone description profileImage address",
        )
        .populate(
          "studentId",
          "_id firstName lastName email phone profileImage homeAddress",
        );
      const bookingData = JSON.parse(JSON.stringify(savedBooking));
      try {
        await notifyBookingParties(bookingData, "booking_created");
      } catch (emailError) {
        console.error("Failed to send booking creation emails:", emailError);
      }
      const io = getIOInstance();
      if (io && io.notifyNewBooking) io.notifyNewBooking(bookingData);
      return savedBooking;
    },

    updateSlotStatus: async (_, { input }, { user }) => {
      try {
        requireRole(user, "Student", "Instructor", "Admin");
        const { bookingId, slotId, status } = input;

        // Validate status
        const validStatuses = [
          "available",
          "booked",
          "completed",
          "refund",
          "cancelled",
          "missed",
        ];
        if (!validStatuses.includes(status)) {
          throw new Error(
            `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
          );
        }

        // Find and populate the booking
        const booking = await studentBookingModel
          .findById(bookingId)
          .populate({
            path: "studentId",
            model: "User",
            select:
              "_id firstName lastName email phone profileImage homeAddress location zipCode",
          })
          .populate({
            path: "instructorId",
            model: "Instructor",
            select:
              "_id firstName lastName email phone profileImage carName transmissionType experience location",
          });

        if (!booking) {
          throw new Error("Booking not found");
        }

        if (user.role === "Student") {
          if (status !== "cancelled") {
            throw new Error("Students may only cancel their own lesson slots");
          }
          requireStudentOwnerOrAdmin(user, booking);
        } else {
          requireAssignedInstructorOrAdmin(user, booking);
        }

        // Find the slot index
        const slotIndex = booking.slots.findIndex(
          (slot) => slot._id.toString() === slotId,
        );

        if (slotIndex === -1) {
          throw new Error("Slot not found in this booking");
        }

        const oldStatus = booking.slots[slotIndex].status;
        const oldLower = String(oldStatus || "").toLowerCase();
        const newLower = String(status || "").toLowerCase();
        const slotPaymentStatus = String(
          booking.slots[slotIndex].paymentStatus || "",
        ).toLowerCase();
        const paymentPendingForSlot =
          slotPaymentStatus === "requires_action" ||
          slotPaymentStatus === "payment_failed";

        // Instructors/students cannot change a final lesson outcome; Admin may correct data.
        if (user?.role !== "Admin") {
          if (paymentPendingForSlot && newLower !== "cancelled") {
            throw new UserInputError(
              "This lesson is awaiting payment. Status cannot be updated until payment is completed.",
            );
          }
          if (
            ["completed", "missed", "refund"].includes(oldLower) &&
            newLower !== oldLower
          ) {
            throw new UserInputError(
              "This lesson outcome is final and cannot be changed. Contact support if a correction is needed.",
            );
          }
        }

        // Block marking as completed before the slot end time in all environments
        // Slot times are in business timezone (SLOT_TIMEZONE, default Europe/Zurich) so clients worldwide get correct "lesson ended" check
        if (status === "completed") {
          const slot = booking.slots[slotIndex];
          const endTimeStr =
            slot.endTime && slot.endTime.split(":").length >= 3
              ? slot.endTime
              : `${slot.endTime || "17:00"}:00`;
          const slotEndMs = getSlotEndTimestampUtc(slot.date, endTimeStr);
          const nowMs = Date.now();
          if (isNaN(slotEndMs)) {
            throw new Error(
              "Cannot mark this slot as completed: invalid slot end time.",
            );
          }
          if (slotEndMs > nowMs) {
            throw new Error(
              "Cannot mark this slot as completed before its end time.",
            );
          }
        }

        // Update the specific slot
        booking.slots[slotIndex].status = status;

        // Set booked flag based on status
        booking.slots[slotIndex].booked =
          status === "booked" || status === "completed";

        // Set cancellation date / who cancelled.
        // Important: UI treats both `cancelled` and `refund` as part of "Cancelled" lists.
        // So we must store `cancelledBy` for both statuses.
        if (status === "cancelled" && oldStatus !== status) {
          booking.slots[slotIndex].cancellationDate = new Date().toISOString();
          const actor =
            user?.role === "Instructor"
              ? "instructor"
              : user?.role === "Admin"
                ? "admin"
                : "student";
          booking.slots[slotIndex].cancelledBy = actor;
        }

        // When marking completed/missed: set completion and payout-eligible (see PAYOUT_DELAY_MS) for paid slots.
        // Missed follows the same payout flow as completed.
        if (status === "completed" || status === "missed") {
          const now = new Date();
          booking.slots[slotIndex].completionMarkedAt = now;
          const payoutEligibleAt = new Date(now.getTime() + PAYOUT_DELAY_MS);
          booking.slots[slotIndex].payoutEligibleAt = payoutEligibleAt;
          if (
            booking.slots[slotIndex].paymentStatus === "paid" &&
            booking.slots[slotIndex].instructorAmount != null
          ) {
            booking.slots[slotIndex].payoutStatus = "pending";
          }
        }

        // Update booking-level status based on all slots
        const statusCounts = booking.slots.reduce((acc, slot) => {
          acc[slot.status] = (acc[slot.status] || 0) + 1;
          return acc;
        }, {});

        const totalSlots = booking.slots.length;

        // Determine overall booking status
        if (statusCounts.cancelled === totalSlots) {
          booking.status = "cancelled";
          booking.cancellationDate = new Date();
        } else if (statusCounts.completed === totalSlots) {
          booking.status = "completed";
        } else if (statusCounts.refund === totalSlots) {
          booking.status = "refund";
        } else if (statusCounts.cancelled > 0) {
          booking.status = "semi_cancelled";
        } else if (statusCounts.completed > 0 && statusCounts.booked > 0) {
          booking.status = "confirmed"; // Some completed, some pending
        } else {
          booking.status = "confirmed";
        }

        booking.updatedAt = new Date();
        await booking.save();

        // Sync slot status to instructor availability (same as createBooking: both booking slots and availability slots stay in sync)
        const slot = booking.slots[slotIndex];
        const availability = await teacherAvailabilityModel.findOne({
          teacherId: booking.instructorId._id,
          date: new Date(slot.date),
        });

        if (availability) {
          const matchSlot = (s) =>
            s.date === slot.date &&
            s.startTime === slot.startTime &&
            s.endTime === slot.endTime;

          if (status === "cancelled" || status === "available") {
            // Remove from booked slots and mark availableSlots as available again
            availability.slots = availability.slots.filter(
              (s) => !(s.id === slotId || matchSlot(s)),
            );

            const availableSlot = availability.availableSlots.find(matchSlot);
            if (availableSlot) {
              availableSlot.booked = false;
              availableSlot.status = "available";
            }
          } else {
            // For booked | completed | missed | refund: update status in both availability.slots and availability.availableSlots.
            // Booked and completed both stay in slots array (can't book them again); same as createBooking.
            const bookedValue = status === "booked" || status === "completed";

            let bookedSlotEntry = availability.slots.find(
              (s) => s.id === slotId || matchSlot(s),
            );
            if (bookedSlotEntry) {
              bookedSlotEntry.status = status;
              bookedSlotEntry.booked = bookedValue;
            } else if (status === "booked" || status === "completed") {
              // Ensure completed (and booked) also go into slots array like on createBooking
              availability.slots.push({
                id: slotId,
                bookingId: booking._id.toString(),
                date: slot.date,
                startTime: slot.startTime,
                endTime: slot.endTime,
                booked: bookedValue,
                status,
              });
            }

            const availableSlot = availability.availableSlots.find(matchSlot);
            if (availableSlot) {
              availableSlot.status = status;
              availableSlot.booked = bookedValue;
            }
          }

          // Recompute day-level status
          const allBooked =
            availability.availableSlots.length > 0 &&
            availability.availableSlots.every((s) => s.booked === true);
          availability.status = allBooked ? "booked" : "available";
          await availability.save();
          await invalidateAvailability(booking.instructorId._id);
        }

        // Send email notifications if status changed
        if (oldStatus !== status) {
          try {
            let emailType = "booking_status_updated";
            if (status === "cancelled") {
              emailType = "booking_cancelled";
            } else if (status === "completed") {
              emailType = "booking_completed";
            }

            await notifyBookingParties(booking, emailType);
            console.log(`Slot status update emails sent: ${emailType}`);
          } catch (emailError) {
            console.error(
              "Failed to send slot status update emails:",
              emailError,
            );
          }
        }

        return booking;
      } catch (error) {
        console.error("Error updating slot status:", error);
        throw new Error(`Failed to update slot status: ${error.message}`);
      }
    },

    markBookingsAsViewed: async (_, __, { user }) => {
      try {
        requireAdmin(user);

        // Update the admin's last viewed timestamp
        await Admin.findByIdAndUpdate(user.id, {
          lastBookingViewedAt: new Date(),
        });

        console.log(`✅ Admin ${user.id} marked bookings as viewed`);

        return { success: true };
      } catch (error) {
        console.error("Error marking bookings as viewed:", error);
        throw error;
      }
    },
    updateBookingStatus: async (_, { bookingId, status }, { user }) => {
      requireRole(user, "Instructor", "Admin");

      const booking = await StudentBooking.findById(bookingId)
        .populate("instructorId", "_id firstName lastName email phone")
        .populate("studentId", "_id firstName lastName email phone");

      if (!booking) {
        throw new UserInputError("Booking not found");
      }
      requireAssignedInstructorOrAdmin(user, booking);

      const oldStatus = booking.status;
      booking.status = status;
      await booking.save();

      // Send email notifications if status actually changed
      if (oldStatus !== status) {
        try {
          await notifyBookingParties(booking, "booking_status_updated");
          console.log("Booking status update emails sent successfully");
        } catch (emailError) {
          console.error(
            "Failed to send booking status update emails:",
            emailError,
          );
        }
      }

      return booking;
    },

    cancelBookingSlot: async (_, { bookingId, slotId }, { user }) => {
      requireRole(user, "Student", "Instructor", "Admin");

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // 1. Find the booking with populated data
        const booking = await StudentBooking.findById(bookingId)
          .populate("instructorId", "_id firstName lastName email phone")
          .populate("studentId", "_id firstName lastName email phone")
          .session(session);

        if (!booking) throw new UserInputError("Booking not found");
        requireBookingParticipantOrAdmin(user, booking);

        // 2. Find the specific slot in the booking
        const slot = booking.slots.id(slotId);
        if (!slot) throw new UserInputError("Slot not found");

        if (slot.status === "cancelled") {
          throw new UserInputError("Slot is already cancelled");
        }
        if (
          slot.status === "completed" ||
          slot.status === "missed" ||
          slot.status === "refund"
        ) {
          throw new UserInputError(
            "Cannot cancel: lesson is already completed, missed, or refunded.",
          );
        }

        // Cancel only before the booking date (slot date)
        const slotDate = new Date(slot.date);
        slotDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (slotDate < today) {
          throw new UserInputError(
            "Cancellation is only allowed before the booking date.",
          );
        }

        // 3. Mark the slot as cancelled in the booking
        slot.status = "cancelled";
        slot.booked = false;
        slot.cancellationDate = new Date();
        const actor =
          user.role === "Instructor"
            ? "instructor"
            : user.role === "Admin"
              ? "admin"
              : "student";
        slot.cancelledBy = actor;

        // 4. Check if all slots are cancelled to determine booking status
        const allSlotsCancelled = booking.slots.every(
          (s) => s.status === "cancelled",
        );

        const oldStatus = booking.status;
        if (allSlotsCancelled) {
          booking.status = "cancelled";
          booking.cancellationDate = new Date();
        } else {
          booking.status = "semi_cancelled";
        }

        await booking.save({ session });

        // 5. Remove the slot from teacher availability
        const teacherAvailability = await teacherAvailabilityModel
          .findOne({
            teacherId: booking.instructorId._id,
            date: new Date(slot.date),
          })
          .session(session);

        if (teacherAvailability) {
          // 1️⃣ Remove from booked slots
          teacherAvailability.slots = teacherAvailability.slots.filter(
            (s) => s.id !== slotId,
          );

          // 2️⃣ Add or mark slot as available again
          const existingAvailable = teacherAvailability.availableSlots.find(
            (s) =>
              s.date === slot.date &&
              s.startTime === slot.startTime &&
              s.endTime === slot.endTime,
          );

          if (existingAvailable) {
            existingAvailable.booked = false;
            existingAvailable.status = "available";
          } else {
            teacherAvailability.availableSlots.push({
              id: new mongoose.Types.ObjectId().toString(),
              date: slot.date,
              startTime: slot.startTime,
              endTime: slot.endTime,
              booked: false,
              status: "available",
            });
          }

          // 3️⃣ Update overall status
          const hasAvailable = teacherAvailability.availableSlots.some(
            (s) => s.booked === false,
          );
          teacherAvailability.status = hasAvailable ? "available" : "booked";

          await teacherAvailability.save({ session });
        }

        // Keep the cancellation state and its notification intent atomic.
        await notifyBookingParties(
          booking,
          "booking_cancelled",
          process.env.ADMIN_EMAIL,
          { session },
        );

        await session.commitTransaction();
        await invalidateAvailability(booking.instructorId._id);

        return booking;
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }
    },
    rescheduleBookingSlot: async (_, { input }, { user }) => {
      requireRole(user, "Student", "Admin");
      const { bookingId, slotId, newDate, newStartTime, newEndTime } = input;

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const booking = await StudentBooking.findById(bookingId)
          .populate("instructorId", "_id firstName lastName email phone")
          .populate("studentId", "_id firstName lastName email phone")
          .session(session);

        if (!booking) {
          throw new UserInputError("Booking not found.");
        }

        requireStudentOwnerOrAdmin(user, booking);
        const isOwner = user?.role === "Student";
        const isAdmin = user?.role === "Admin";

        const slot = booking.slots.id(slotId);
        if (!slot) {
          throw new UserInputError("Slot not found in booking.");
        }
        const previousSlotSnapshot = {
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        };

        const currentStatus = String(slot.status || "").toLowerCase();
        if (["completed", "missed", "refund", "cancelled"].includes(currentStatus)) {
          throw new UserInputError(
            "This lesson cannot be rescheduled in its current status.",
          );
        }

        const paymentStatus = String(slot.paymentStatus || "").toLowerCase();
        if (["requires_action", "payment_failed"].includes(paymentStatus)) {
          throw new UserInputError(
            "This lesson is awaiting payment and cannot be rescheduled until payment is resolved.",
          );
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const oldSlotDate = new Date(slot.date);
        oldSlotDate.setHours(0, 0, 0, 0);
        if (oldSlotDate < today) {
          throw new UserInputError(
            "Reschedule is only allowed before the lesson date passes.",
          );
        }

        const newSlotStartMs = getSlotStartTimestampUtc(newDate, newStartTime);
        if (!Number.isFinite(newSlotStartMs)) {
          throw new UserInputError("Invalid new slot time.");
        }
        const newSlotDate = new Date(newDate);
        newSlotDate.setHours(0, 0, 0, 0);
        if (newSlotDate < today) {
          throw new UserInputError("New slot date cannot be in the past.");
        }

        const sameSlot =
          slot.date === newDate &&
          slot.startTime === newStartTime &&
          slot.endTime === newEndTime;
        if (sameSlot) {
          throw new UserInputError(
            "Please choose a different slot to reschedule.",
          );
        }

        const conflictingBooking = await StudentBooking.findOne({
          _id: { $ne: booking._id },
          studentId: booking.studentId._id,
          status: { $ne: "cancelled" },
          slots: {
            $elemMatch: {
              date: newDate,
              booked: true,
              status: { $nin: ["cancelled", "refund"] },
              startTime: { $lt: newEndTime },
              endTime: { $gt: newStartTime },
            },
          },
        }).session(session);

        if (conflictingBooking) {
          throw new UserInputError(
            "You already have another booking at this time.",
          );
        }

        const teacherId = booking.instructorId._id;

        let oldDayAvailability = await teacherAvailabilityModel
          .findOne({
            teacherId,
            date: new Date(slot.date),
          })
          .session(session);
        const sameDayMove = String(slot.date) === String(newDate);
        const claimedNewDayAvailability = await teacherAvailabilityModel
          .findOneAndUpdate(
            {
              teacherId,
              date: new Date(newDate),
              availableSlots: {
                $elemMatch: {
                  date: newDate,
                  startTime: newStartTime,
                  endTime: newEndTime,
                  booked: false,
                },
              },
            },
            {
              $set: {
                "availableSlots.$.booked": true,
                "availableSlots.$.status": "booked",
              },
            },
            { new: true, session },
          );

        if (!claimedNewDayAvailability) {
          throw new UserInputError(
            "The selected slot is no longer available. Please choose another.",
          );
        }
        const newDayAvailability = claimedNewDayAvailability;
        if (sameDayMove) oldDayAvailability = newDayAvailability;
        const targetAvailableSlot = (newDayAvailability.availableSlots || []).find(
          (s) =>
            s.date === newDate &&
            s.startTime === newStartTime &&
            s.endTime === newEndTime,
        );

        if (oldDayAvailability) {
          oldDayAvailability.slots = (oldDayAvailability.slots || []).filter(
            (s) => String(s.id) !== String(slotId),
          );

          const existingAvailable = (oldDayAvailability.availableSlots || []).find(
            (s) =>
              s.date === slot.date &&
              s.startTime === slot.startTime &&
              s.endTime === slot.endTime,
          );
          if (existingAvailable) {
            existingAvailable.booked = false;
            existingAvailable.status = "available";
          } else {
            oldDayAvailability.availableSlots.push({
              id: new mongoose.Types.ObjectId().toString(),
              date: slot.date,
              startTime: slot.startTime,
              endTime: slot.endTime,
              booked: false,
              status: "available",
            });
          }

          const oldHasAvailable = oldDayAvailability.availableSlots.some(
            (s) => s.booked === false,
          );
          oldDayAvailability.status = oldHasAvailable ? "available" : "booked";
          if (!sameDayMove) {
            await oldDayAvailability.save({ session });
          }
        }

        targetAvailableSlot.booked = true;
        targetAvailableSlot.status = "booked";

        const alreadyInBooked = (newDayAvailability.slots || []).find(
          (s) => String(s.id) === String(slotId),
        );
        if (!alreadyInBooked) {
          newDayAvailability.slots.push({
            id: String(slotId),
            bookingId: String(booking._id),
            date: newDate,
            startTime: newStartTime,
            endTime: newEndTime,
            booked: true,
            status: "booked",
          });
        } else {
          alreadyInBooked.date = newDate;
          alreadyInBooked.startTime = newStartTime;
          alreadyInBooked.endTime = newEndTime;
          alreadyInBooked.booked = true;
          alreadyInBooked.status = "booked";
        }

        const newHasAvailable = newDayAvailability.availableSlots.some(
          (s) => s.booked === false,
        );
        newDayAvailability.status = newHasAvailable ? "available" : "booked";
        await newDayAvailability.save({ session });

        slot.date = newDate;
        slot.startTime = newStartTime;
        slot.endTime = newEndTime;
        slot.status = "booked";
        slot.booked = true;
        slot.cancellationDate = undefined;
        slot.cancelledBy = undefined;

        booking.updatedAt = new Date();
        await booking.save({ session });

        // These are intent records only; delivery happens after commit in the
        // worker. Keep both reschedule notifications in the same transaction.
        if ((isOwner || isAdmin) && booking?.instructorId?.email) {
          const actorRole = isAdmin ? "admin" : "student";
          await sendBookingEmail(
            [
              {
                email: booking.instructorId.email,
                role: "instructor",
                name: `${booking.instructorId.firstName || ""} ${booking.instructorId.lastName || ""}`.trim(),
              },
            ],
            {
              id: booking._id,
              status: booking.status,
              slots: [
                {
                  ...slot.toObject(),
                  previousDate: previousSlotSnapshot.date,
                  previousStartTime: previousSlotSnapshot.startTime,
                  previousEndTime: previousSlotSnapshot.endTime,
                  rescheduledBy: actorRole,
                },
              ],
              student: booking.studentId,
              instructor: booking.instructorId,
            },
            "booking_rescheduled",
            { session },
          );
        }
        await notifyBookingParties(
          booking,
          "booking_status_updated",
          process.env.ADMIN_EMAIL,
          { session },
        );

        await session.commitTransaction();
        await invalidateAvailability(teacherId);

        return booking;
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }
    },
  },
};

module.exports = studentBookingResolver;
