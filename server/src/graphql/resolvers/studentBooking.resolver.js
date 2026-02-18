const { studentBookingSchema } = require("../../schemas/studentBooking.schema");
const StudentBooking = require("../../models/studentBooking.model");

// Payout delay after lesson completed: 1 min for testing; for production use 3 * 24 * 60 * 60 * 1000 (3 days)
const PAYOUT_DELAY_MS = 1 * 60 * 1000;
const {
  AuthenticationError,
  UserInputError,
} = require("apollo-server-express");
const { validateUser } = require("../../utils/auth");
const teacherAvailabilityModel = require("../../models/teacherAvailability.model");
const { default: mongoose } = require("mongoose");
const { User, Instructor } = require("../../models/User");
const checkAllSlotsBooked = require("../../utils/CheckAllSlotsBooked");
const studentBookingModel = require("../../models/studentBooking.model");
const { notifyBookingParties } = require("../../utils/SendOtpEmail");
const teacherTariffModel = require("../../models/teacherTariff.model");
const { getIOInstance } = require("../../socket");
const { createTransaction } = require("../../services/transactionService");
const { isInstructorPaymentReady } = require("../utils/instructorPaymentReady");
const {
  getCommissionSplit,
  createPaymentIntentForBooking,
  createCheckoutSessionForBooking,
  retrieveCheckoutSession,
  createRefund,
  getTransferIdFromPaymentIntent,
  createTransferReversal,
  DEFAULT_CURRENCY,
  CENTIMES_PER_UNIT,
} = require("../../services/stripeService");
const studentBookingResolver = {
  Query: {
    // getStudentBookings: async (_, __, { user }) => {
    //   validateUser(user);
    //   const bookings = await StudentBooking.find({ studentId: user.id })
    //     .populate("instructorId", "_id firstName lastName email description")
    //     .sort({ createdAt: -1 });

    //   return bookings;
    // },

    getStudentBookings: async (_, __, { user }) => {
      validateUser(user);

      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0); // start of today

      // Get all bookings for this student
      const allBookings = await StudentBooking.find({ studentId: user.id })
        .populate(
          "instructorId",
          "_id firstName lastName email description profileImage",
        )
        .sort({ createdAt: -1 });

      const filteredBookings = [];

      for (const booking of allBookings) {
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
        if (!user || user.role !== "Admin") {
          throw new Error("Unauthorized");
        }

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
      validateUser(user);

      const now = new Date();

      const allBookings = await StudentBooking.find({
        instructorId: user?.id,
        status: { $in: ["confirmed", "semi_cancelled", "completed"] },
      })
        .populate("instructorId", "_id firstName lastName email profileImage")
        .populate("studentId", "_id firstName lastName email profileImage");

      const completedLessons = [];

      for (const booking of allBookings) {
        if (!booking.slots?.length) continue;

        // ✅ gather all slots that are completed (time passed or instructor marked completed), and were booked (exclude cancelled/refund)
        const completedSlots = booking.slots.filter((slot) => {
          if (
            !slot.booked ||
            slot.status === "cancelled" ||
            slot.status === "refund"
          )
            return false;
          const slotEndDateTime = new Date(`${slot.date}T${slot.endTime}:00`);
          return slot.status === "completed" || slotEndDateTime <= now;
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
      validateUser(user);
      return await StudentBooking.find({ instructorId: user.id })
        .populate("studentId", "_id firstName lastName email description")
        .sort({ createdAt: -1 });
    },
    getStudentDashboardDetails: async (_, { studentId }, { user }) => {
      validateUser(user);

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

      let totalLessonCount = 0;
      let totalDurationMinutes = 0;
      const graphMap = new Map();

      const completedBookings = [];
      const uncompletedBookings = [];

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

        // Active slots: booked, not cancelled, not refund
        const activeSlots = booking.slots.filter(
          (slot) =>
            slot.booked &&
            slot.status !== "cancelled" &&
            slot.status !== "refund",
        );

        // Completed slot = status === "completed" OR slot end time has passed
        const completedSlots = activeSlots.filter((slot) => {
          const slotEnd = new Date(`${slot.date}T${slot.endTime}:00`);
          return slot.status === "completed" || slotEnd <= now;
        });
        const inProgressSlots = activeSlots.filter((slot) => {
          const slotEnd = new Date(`${slot.date}T${slot.endTime}:00`);
          return slot.status !== "completed" && slotEnd > now;
        });

        // Stats and graph: count only active slots
        for (const slot of activeSlots) {
          totalLessonCount += 1;
          const start = new Date(`${slot.date}T${slot.startTime}:00`);
          const end = new Date(`${slot.date}T${slot.endTime}:00`);
          const duration = (end - start) / (1000 * 60);
          totalDurationMinutes += duration;
          const count = graphMap.get(slot.date) || 0;
          graphMap.set(slot.date, count + 1);
        }

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
      };
    },
  },

  Mutation: {
    createBooking: async (_, { input }, { user }) => {
      validateUser(user);
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
        const numSlots = validatedInput.slots.length;
        const finalAmount = Number(validatedInput.finalAmount);
        const perSlotAmount = numSlots > 0 ? finalAmount / numSlots : 0;

        if (isCardPayment) {
          const instructorAccountId = instructor.stripeAccount?.accountId;
          if (!instructorAccountId) {
            throw new UserInputError(
              "Instructor payment account is not set up. Please try another instructor.",
            );
          }
          const { dspCommission, instructorAmount } = getCommissionSplit(
            finalAmount,
            instructor,
          );
          const amountCentimes = Math.round(finalAmount * CENTIMES_PER_UNIT);
          const instructorShareCentimes = Math.round(
            Number(instructorAmount) * CENTIMES_PER_UNIT,
          );
          const paymentResult = await createPaymentIntentForBooking({
            amountCentimes,
            paymentMethodId: validatedInput.paymentMethod.paymentMethodId,
            metadata: {
              studentId: String(user.id),
              instructorId: String(instructorId),
            },
            confirm: true,
            transferData: {
              destinationAccountId: instructorAccountId,
              amountCentimes: instructorShareCentimes,
            },
          });
          if (paymentResult.requiresAction) {
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
        }

        const enrichedSlots = validatedInput.slots.map((slot) => {
          const base = {
            ...slot,
            booked: true,
            status: "booked",
            review: false,
          };
          if (isCardPayment && stripePaymentIntentId) {
            const { dspCommission: slotDsp, instructorAmount: slotInstructor } =
              getCommissionSplit(perSlotAmount, instructor);
            base.paymentStatus = "paid";
            base.chargeAmount = perSlotAmount;
            base.dspCommission = slotDsp;
            base.instructorAmount = slotInstructor;
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
        };
        if (stripePaymentIntentId) {
          bookingPayload.stripePaymentIntentId = stripePaymentIntentId;
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

        // Log transactions for initial payment (student, instructor, platform) if card payment succeeded
        if (isCardPayment && stripePaymentIntentId) {
          const occurredAt = new Date();
          // Student payment
          await createTransaction({
            type: "payment",
            role: "student",
            direction: "debit",
            amount: finalAmount,
            currency: DEFAULT_CURRENCY.toUpperCase(),
            status: "succeeded",
            bookingId: booking._id,
            studentId: user.id,
            stripePaymentIntentId: stripePaymentIntentId,
            description: `${numSlots} lesson(s) with instructor ${instructor.firstName} ${instructor.lastName}`,
            occurredAt,
          });
          // Platform gross receipt
          await createTransaction({
            type: "payment",
            role: "platform",
            direction: "credit",
            amount: finalAmount,
            currency: DEFAULT_CURRENCY.toUpperCase(),
            status: "succeeded",
            bookingId: booking._id,
            stripePaymentIntentId: stripePaymentIntentId,
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
                currency: DEFAULT_CURRENCY.toUpperCase(),
                status: "succeeded",
                bookingId: booking._id,
                instructorId: instructor._id,
                studentId: user.id,
                stripePaymentIntentId: stripePaymentIntentId,
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
                bookingId: booking._id,
                studentId: user.id,
                description: "Platform commission for booked slot",
                occurredAt,
              });
            }
          }
        }

        // 3. Update availability and push booked sub-slots
        // Group slots by date and availability block
        const slotsByAvailability = {};

        for (const slot of enrichedSlots) {
          const availability = await teacherAvailabilityModel.findOne({
            teacherId: instructorId,
            date: new Date(slot.date),
          });

          if (!availability) continue;

          const availabilityKey = `${availability._id}`;
          if (!slotsByAvailability[availabilityKey]) {
            slotsByAvailability[availabilityKey] = {
              availability,
              slotsToAdd: [],
            };
          }

          slotsByAvailability[availabilityKey].slotsToAdd.push(slot);
        }

        // Process each availability block
        await Promise.all(
          Object.values(slotsByAvailability).map(
            async ({ availability, slotsToAdd }) => {
              let hasChanges = false;

              for (const slot of slotsToAdd) {
                // Check if slot already exists in `slots` (booked list)
                const savedSlot = booking.slots.find(
                  (s) =>
                    s.date === slot.date &&
                    s.startTime === slot.startTime &&
                    s.endTime === slot.endTime,
                );

                if (!savedSlot) continue;

                // Mark slot as booked in booked list
                availability.slots.push({
                  id: savedSlot._id.toString(),
                  bookingId: booking._id.toString(),
                  date: slot.date,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  booked: true,
                  status: "booked",
                });

                // Find and update in availableSlots (mark as booked)
                const availableSlot = availability.availableSlots.find(
                  (s) =>
                    s.date === slot.date &&
                    s.startTime === slot.startTime &&
                    s.endTime === slot.endTime,
                );

                if (availableSlot) {
                  availableSlot.booked = true;
                  availableSlot.status = "booked";
                }

                hasChanges = true;
              }

              if (hasChanges) {
                // If all availableSlots are booked, mark day as booked
                const allBooked =
                  availability.availableSlots.length > 0 &&
                  availability.availableSlots.every((s) => s.booked === true);

                if (allBooked) {
                  availability.status = "booked";
                } else {
                  availability.status = "available";
                }

                await availability.save();
              }
            },
          ),
        );
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
        console.error("Booking creation error:", error);
        if (error.errors) {
          throw new UserInputError("Invalid input", { errors: error.errors });
        }
        throw error;
      }
    },

    createBookingCheckoutSession: async (_, { input }, { user }) => {
      validateUser(user);
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
        const perSlotAmount = numSlots > 0 ? finalAmount / numSlots : 0;
        const { dspCommission, instructorAmount } = getCommissionSplit(
          finalAmount,
          instructor,
        );
        const amountCentimes = Math.round(finalAmount * CENTIMES_PER_UNIT);
        const instructorShareCentimes = Math.round(
          Number(instructorAmount) * CENTIMES_PER_UNIT,
        );

        const enrichedSlots = validatedInput.slots.map((slot) => ({
          ...slot,
          booked: true,
          status: "booked",
          review: false,
          paymentStatus: "pending_payment",
          payoutStatus: "not_applicable",
        }));

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
              `You already have a booking with this instructor on ${newSlot.date} between ${newSlot.startTime} and ${newSlot.endTime}`,
            );
          }
        }

        const bookingPayload = {
          ...validatedInput,
          slots: enrichedSlots,
          status: "pending",
        };
        const booking = new StudentBooking(bookingPayload);
        await booking.save();

        const slotsByAvailability = {};
        for (const slot of enrichedSlots) {
          const availability = await teacherAvailabilityModel.findOne({
            teacherId: instructorId,
            date: new Date(slot.date),
          });
          if (!availability) continue;
          const availabilityKey = `${availability._id}`;
          if (!slotsByAvailability[availabilityKey]) {
            slotsByAvailability[availabilityKey] = {
              availability,
              slotsToAdd: [],
            };
          }
          slotsByAvailability[availabilityKey].slotsToAdd.push(slot);
        }
        await Promise.all(
          Object.values(slotsByAvailability).map(
            async ({ availability, slotsToAdd }) => {
              let hasChanges = false;
              for (const slot of slotsToAdd) {
                const savedSlot = booking.slots.find(
                  (s) =>
                    s.date === slot.date &&
                    s.startTime === slot.startTime &&
                    s.endTime === slot.endTime,
                );
                if (!savedSlot) continue;
                availability.slots.push({
                  id: savedSlot._id.toString(),
                  bookingId: booking._id.toString(),
                  date: slot.date,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  booked: true,
                  status: "booked",
                });
                const availableSlot = availability.availableSlots.find(
                  (s) =>
                    s.date === slot.date &&
                    s.startTime === slot.startTime &&
                    s.endTime === slot.endTime,
                );
                if (availableSlot) {
                  availableSlot.booked = true;
                  availableSlot.status = "booked";
                  hasChanges = true;
                }
              }
              if (hasChanges) {
                const allBooked =
                  availability.availableSlots.length > 0 &&
                  availability.availableSlots.every((s) => s.booked === true);
                availability.status = allBooked ? "booked" : "available";
                await availability.save();
              }
            },
          ),
        );

        const { url } = await createCheckoutSessionForBooking({
          amountCentimes,
          transferAmountCentimes: instructorShareCentimes,
          destinationAccountId: instructorAccountId,
          metadata: {
            bookingId: String(booking._id),
            studentId: String(user.id),
            instructorId: String(instructorId),
          },
          successPath: "/student-dashboard/booking-details",
          cancelPath: "/student-dashboard/booking-details",
          description: `${numSlots} lesson(s) — CHF ${finalAmount.toFixed(2)}`,
        });
        return { url, bookingId: booking._id };
      } catch (error) {
        console.error("createBookingCheckoutSession error:", error);
        if (error.errors) {
          throw new UserInputError("Invalid input", { errors: error.errors });
        }
        throw error;
      }
    },

    completeBookingFromCheckout: async (_, { sessionId }, { user }) => {
      validateUser(user);
      const session = await retrieveCheckoutSession(sessionId);
      if (!session || session.payment_status !== "paid") {
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
      const booking = await StudentBooking.findById(bookingId);
      if (!booking) {
        throw new UserInputError("Booking not found.");
      }
      if (String(booking.studentId) !== String(user.id)) {
        throw new UserInputError("This booking does not belong to you.");
      }
      if (booking.status !== "pending") {
        return booking;
      }
      const instructor = await Instructor.findById(booking.instructorId).lean();
      if (!instructor) {
        throw new UserInputError("Instructor not found.");
      }
      const finalAmount = Number(booking.finalAmount);
      const numSlots = booking.slots.length;
      const perSlotAmount = numSlots > 0 ? finalAmount / numSlots : 0;
      booking.status = "confirmed";
      const piId =
        typeof paymentIntent === "object" && paymentIntent?.id
          ? paymentIntent.id
          : session.payment_intent;
      booking.stripePaymentIntentId = piId;
      for (const slot of booking.slots) {
        const { dspCommission: slotDsp, instructorAmount: slotInstructor } =
          getCommissionSplit(perSlotAmount, instructor);
        slot.paymentStatus = "paid";
        slot.chargeAmount = perSlotAmount;
        slot.dspCommission = slotDsp;
        slot.instructorAmount = slotInstructor;
        slot.payoutStatus = "not_applicable";
      }
      await booking.save();
      // Log transactions for checkout-based payment
      const occurredAt = new Date();
      await createTransaction({
        type: "payment",
        role: "student",
        direction: "debit",
        amount: finalAmount,
        currency: DEFAULT_CURRENCY.toUpperCase(),
        status: "succeeded",
        bookingId: booking._id,
        studentId: user.id,
        stripePaymentIntentId: piId,
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
        bookingId: booking._id,
        stripePaymentIntentId: piId,
        description: "Platform gross receipt for booking",
        occurredAt,
      });
      for (const slot of booking.slots) {
        if (slot.instructorAmount != null) {
          await createTransaction({
            type: "payment",
            role: "instructor",
            direction: "credit",
            amount: slot.instructorAmount,
            currency: DEFAULT_CURRENCY.toUpperCase(),
            status: "succeeded",
            bookingId: booking._id,
            instructorId: instructor._id,
            studentId: user.id,
            stripePaymentIntentId: piId,
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
            bookingId: booking._id,
            studentId: user.id,
            description: "Platform commission for booked slot",
            occurredAt,
          });
        }
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
        console.error("Failed to send booking creation emails:", emailError);
      }
      const io = getIOInstance();
      if (io && io.notifyNewBooking) {
        io.notifyNewBooking(JSON.parse(JSON.stringify(savedBooking)));
      }
      return savedBooking;
    },

    completeBookingAfterPayment: async (
      _,
      { paymentIntentId, input },
      { user },
    ) => {
      validateUser(user);
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
      const perSlotAmount = numSlots > 0 ? finalAmount / numSlots : 0;
      const enrichedSlots = validatedInput.slots.map((slot) => {
        const { dspCommission, instructorAmount } = getCommissionSplit(
          perSlotAmount,
          instructor,
        );
        return {
          ...slot,
          booked: true,
          status: "booked",
          review: false,
          paymentStatus: "paid",
          chargeAmount: perSlotAmount,
          dspCommission,
          instructorAmount,
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
      const slotsByAvailability = {};
      for (const slot of booking.slots) {
        const availability = await teacherAvailabilityModel.findOne({
          teacherId: instructorId,
          date: new Date(slot.date),
        });
        if (!availability) continue;
        const key = availability._id.toString();
        if (!slotsByAvailability[key])
          slotsByAvailability[key] = { availability, slotsToAdd: [] };
        slotsByAvailability[key].slotsToAdd.push(slot);
      }
      await Promise.all(
        Object.values(slotsByAvailability).map(
          async ({ availability, slotsToAdd }) => {
            let hasChanges = false;
            for (const slot of slotsToAdd) {
              availability.slots = availability.slots || [];
              availability.slots.push({
                id: slot._id.toString(),
                bookingId: booking._id.toString(),
                date: slot.date,
                startTime: slot.startTime,
                endTime: slot.endTime,
                booked: true,
                status: "booked",
              });
              const availableSlot = (availability.availableSlots || []).find(
                (s) =>
                  s.date === slot.date &&
                  s.startTime === slot.startTime &&
                  s.endTime === slot.endTime,
              );
              if (availableSlot) {
                availableSlot.booked = true;
                availableSlot.status = "booked";
              }
              hasChanges = true;
            }
            if (hasChanges) {
              availability.status = (availability.availableSlots || []).every(
                (s) => s.booked,
              )
                ? "booked"
                : "available";
              await availability.save();
            }
          },
        ),
      );
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

    updateSlotStatus: async (_, { input }) => {
      try {
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

        // Find the slot index
        const slotIndex = booking.slots.findIndex(
          (slot) => slot._id.toString() === slotId,
        );

        if (slotIndex === -1) {
          throw new Error("Slot not found in this booking");
        }

        // Block marking as completed before the slot end time (skip in development for testing payout)
        if (status === "completed" && process.env.NODE_ENV === "production") {
          const slot = booking.slots[slotIndex];
          const slotEnd = new Date(`${slot.date}T${slot.endTime}:00`);
          const now = new Date();
          if (slotEnd > now) {
            throw new Error(
              "Cannot mark this slot as completed before its end time.",
            );
          }
        }

        // Store old status for comparison
        const oldStatus = booking.slots[slotIndex].status;

        // Update the specific slot
        booking.slots[slotIndex].status = status;

        // Set booked flag based on status
        booking.slots[slotIndex].booked =
          status === "booked" || status === "completed";

        // Set cancellation date if cancelling
        if (status === "cancelled" && oldStatus !== "cancelled") {
          booking.slots[slotIndex].cancellationDate = new Date().toISOString();
        }

        // When marking completed: set completion and payout-eligible (see PAYOUT_DELAY_MS) for paid slots
        if (status === "completed") {
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
        if (!user || user.role !== "Admin") {
          throw new Error("Unauthorized");
        }

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
      validateUser(user);

      const booking = await StudentBooking.findById(bookingId)
        .populate("instructorId", "_id firstName lastName email phone")
        .populate("studentId", "_id firstName lastName email phone");

      if (!booking) {
        throw new UserInputError("Booking not found");
      }

      if (booking.instructorId._id.toString() !== user.id.toString()) {
        throw new AuthenticationError("Not authorized to update this booking");
      }

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
      validateUser(user);

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // 1. Find the booking with populated data
        const booking = await StudentBooking.findById(bookingId)
          .populate("instructorId", "_id firstName lastName email phone")
          .populate("studentId", "_id firstName lastName email phone")
          .session(session);

        if (!booking) throw new UserInputError("Booking not found");

        const uid = user.id.toString();
        if (
          booking.studentId._id.toString() !== uid &&
          booking.instructorId._id.toString() !== uid
        ) {
          throw new AuthenticationError(
            "Not authorized to cancel this booking",
          );
        }

        // 2. Find the specific slot in the booking
        const slot = booking.slots.id(slotId);
        if (!slot) throw new UserInputError("Slot not found");

        if (slot.status === "cancelled") {
          throw new UserInputError("Slot is already cancelled");
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

        await session.commitTransaction();
        // 7. Send email notifications
        try {
          await notifyBookingParties(booking, "booking_cancelled");
          console.log("Booking cancellation emails sent successfully");
        } catch (emailError) {
          console.error(
            "Failed to send booking cancellation emails:",
            emailError,
          );
        }

        return booking;
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }
    },

    requestRefund: async (_, { bookingId, slotId }, { user }) => {
      validateUser(user);

      const booking = await StudentBooking.findById(bookingId)
        .populate("instructorId", "_id firstName lastName email phone")
        .populate("studentId", "_id firstName lastName email phone");

      if (!booking) throw new UserInputError("Booking not found");
      if (booking.studentId._id.toString() !== user.id.toString()) {
        throw new AuthenticationError(
          "Only the student of this booking can request a refund.",
        );
      }

      const slot = booking.slots.id(slotId);
      if (!slot) throw new UserInputError("Slot not found");

      if (slot.status !== "cancelled") {
        throw new UserInputError(
          "Refund can only be requested for a cancelled slot.",
        );
      }
      if (slot.paymentStatus !== "paid") {
        throw new UserInputError(
          "This slot was not paid via card; no refund applies.",
        );
      }
      // If we've already created a manual payout for this slot (from the instructor's Stripe
      // balance to their bank), block refunds here. At that point the instructor has been
      // paid out, and reversing both payout and transfer becomes complex.
      if (slot.payoutId) {
        throw new UserInputError(
          "Refund is not available because the instructor has already been paid out for this lesson.",
        );
      }
      // Block any duplicate or repeat refund: slot must not already be refunded.
      if (slot.refundedAt) {
        throw new UserInputError("This slot has already been refunded.");
      }
      if (slot.status === "refund") {
        throw new UserInputError("This lesson has already been refunded.");
      }
      if (slot.paymentStatus === "refunded") {
        throw new UserInputError(
          "A refund has already been processed for this lesson.",
        );
      }

      if (!booking.stripePaymentIntentId || slot.chargeAmount == null) {
        throw new UserInputError("Payment information missing for refund.");
      }

      const amountCentimes = Math.round(
        Number(slot.chargeAmount) * CENTIMES_PER_UNIT,
      );

      // Destination charge: reverse the instructor's share first so the 20%/80% split is correctly reversed.
      // (Stripe does not auto-reverse the transfer on refund; we must do it explicitly.)
      const transferId = await getTransferIdFromPaymentIntent(
        booking.stripePaymentIntentId,
      );
      if (
        transferId &&
        slot.instructorAmount != null &&
        slot.instructorAmount > 0
      ) {
        const instructorShareCentimes = Math.round(
          Number(slot.instructorAmount) * CENTIMES_PER_UNIT,
        );
        await createTransferReversal({
          transferId,
          amountCentimes: instructorShareCentimes,
          metadata: {
            bookingId: String(booking._id),
            slotId: String(slotId),
            reason: "refund_requested_by_customer",
          },
        });
      }

      const { refundId } = await createRefund({
        paymentIntentId: booking.stripePaymentIntentId,
        amountCentimes,
        reason: "requested_by_customer",
      });

      slot.status = "refund";
      slot.paymentStatus = "refunded";
      slot.refundAmount = slot.chargeAmount;
      slot.refundedAt = new Date();
      booking.updatedAt = new Date();
      await booking.save();
      const occurredAt = new Date();
      // Student refund
      await createTransaction({
        type: "refund",
        role: "student",
        direction: "credit",
        amount: slot.chargeAmount,
        currency: DEFAULT_CURRENCY.toUpperCase(),
        status: "succeeded",
        bookingId: booking._id,
        slotId,
        studentId: user.id,
        stripePaymentIntentId: booking.stripePaymentIntentId,
        stripeRefundId: refundId,
        description: "Refund for cancelled lesson slot",
        occurredAt,
      });
      // Instructor share reversal (if we reversed a transfer)
      if (
        transferId &&
        slot.instructorAmount != null &&
        slot.instructorAmount > 0
      ) {
        await createTransaction({
          type: "transfer_reversal",
          role: "instructor",
          direction: "debit",
          amount: slot.instructorAmount,
          currency: DEFAULT_CURRENCY.toUpperCase(),
          status: "succeeded",
          bookingId: booking._id,
          slotId,
          instructorId: booking.instructorId._id,
          stripePaymentIntentId: booking.stripePaymentIntentId,
          description: "Reversal of instructor share due to refund",
          occurredAt,
        });
      }
      // Platform commission reversal (20% we kept is effectively refunded)
      if (slot.dspCommission != null && slot.dspCommission > 0) {
        await createTransaction({
          type: "transfer_reversal",
          role: "platform",
          direction: "debit",
          amount: slot.dspCommission,
          currency: DEFAULT_CURRENCY.toUpperCase(),
          status: "succeeded",
          bookingId: booking._id,
          slotId,
          stripePaymentIntentId: booking.stripePaymentIntentId,
          stripeRefundId: refundId,
          description: "Platform commission reversed due to refund",
          occurredAt,
        });
      }

      // Sync refund status to instructor availability
      const availability = await teacherAvailabilityModel.findOne({
        teacherId: booking.instructorId._id,
        date: new Date(slot.date),
      });
      if (availability) {
        const matchSlot = (s) =>
          s.date === slot.date &&
          s.startTime === slot.startTime &&
          s.endTime === slot.endTime;
        const bookedEntry = availability.slots.find(
          (s) => s.id === slotId || matchSlot(s),
        );
        if (bookedEntry) bookedEntry.status = "refund";
        const availableSlot = availability.availableSlots.find(matchSlot);
        if (availableSlot) availableSlot.status = "refund";
        await availability.save();
      }

      return booking;
    },
  },
};

module.exports = studentBookingResolver;
