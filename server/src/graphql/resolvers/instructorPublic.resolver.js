// src/graphql/resolvers/instructor.resolver.js
const { default: mongoose } = require("mongoose");
const teacherTariffModel = require("../../models/teacherTariff.model");
const User = require("../../models/User");
const { isInstructorPaymentReady } = require("../utils/instructorPaymentReady");

const { calculateDistance } = require("../../utils/geoUtils");
const teacherAvailabilityModel = require("../../models/teacherAvailability.model");
const { Review } = require("../../models/Reviews");
const studentBookingModel = require("../../models/studentBooking.model");
const dayjs = require("dayjs");
const { getSlotEndTimestampUtc } = require("../../utils/slotTimezone");
const { requireInstructorOwnership } = require("../../utils/authorization");
const { cache } = require("../../services/cacheService");
const cacheKeys = require("../../services/cacheKeys");

const toPublicInstructor = (instructor, extras = {}) => {
  if (!instructor) return null;

  const id = instructor._id?.toString?.() || instructor.id?.toString?.();
  return {
    id,
    _id: id,
    firstName: instructor.firstName,
    lastName: instructor.lastName,
    location: instructor.location || null,
    description: instructor.description || null,
    averageRating: instructor.averageRating ?? null,
    totalReviews: instructor.totalReviews ?? null,
    reviewsCount: instructor.reviewsCount ?? 0,
    experience: instructor.experience || null,
    verificationStatus: instructor.verificationStatus || null,
    rating: instructor.rating ?? null,
    profileImage: instructor.profileImage || null,
    languagePreference: instructor.languagePreference || [],
    coordinates: instructor.coordinates || null,
    details: instructor.details || null,
    carName: instructor.carName || null,
    transmissionType: instructor.transmissionType || null,
    gender: instructor.gender || null,
    availability: instructor.availability || null,
    isPaymentReady: extras.isPaymentReady ?? instructor.isPaymentReady ?? false,
  };
};

const instructorResolver = {
  Query: {
    getNearbyInstructors: async (_, args = {}) => {
      const { filter = {}, offset = 0, limit = 10, __skipCache } = args;
      if (!__skipCache) {
        return cache.getOrSet({
          category: "instructor_search",
          key: cacheKeys.instructorSearch({ filter, offset, limit }),
          ttlSeconds: 30,
          loader: () =>
            instructorResolver.Query.getNearbyInstructors(_, {
              ...args,
              __skipCache: true,
            }),
        });
      }
      try {
        const safeOffset = Math.max(Number(offset) || 0, 0);
        const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
        // Build the base query: only instructors with complete profile and Stripe verified (active)
        let baseQuery = {
          role: "Instructor",
          isProfileComplete: true,
          isActive: true,
          coordinates: { $exists: true },
        };

        // Apply non-geographic filters (NOT including availability dates)
        if (filter.transmission)
          baseQuery.transmissionType = filter.transmission;
        if (filter.gender?.length) baseQuery.gender = { $in: filter.gender };
        if (filter.minRating) baseQuery.rating = { $gte: filter.minRating };

        // Handle price filtering ONLY (not availability dates)
        let priceFilteredInstructorIds = null;
        if (filter.priceMin !== undefined || filter.priceMax !== undefined) {
          let priceQuery = {};

          // Build price query
          if (filter.priceMin !== undefined && filter.priceMax !== undefined) {
            priceQuery.lessonFee = {
              $gte: filter.priceMin,
              $lte: filter.priceMax,
            };
          } else if (filter.priceMin !== undefined) {
            priceQuery.lessonFee = { $gte: filter.priceMin };
          } else if (filter.priceMax !== undefined) {
            priceQuery.lessonFee = { $lte: filter.priceMax };
          }

          priceFilteredInstructorIds = await teacherTariffModel
            .find(priceQuery)
            .distinct("teacherId");

          if (priceFilteredInstructorIds.length === 0) {
            return {
              instructors: [],
              totalCount: 0,
              hasMore: false,
            };
          }

          // Add price filter to base query
          baseQuery._id = { $in: priceFilteredInstructorIds };
        }

        // Apply availability before pagination so sparse results do not force
        // the server to load and slice the entire instructor collection.
        if (filter.availableDates?.length) {
          const dateRanges = filter.availableDates.map((dateStr) => {
            const date = new Date(dateStr);
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            return { date: { $gte: start, $lte: end } };
          });
          const availableInstructorIds = await teacherAvailabilityModel
            .find({ $or: dateRanges })
            .distinct("teacherId");
          const availableIds = new Set(
            availableInstructorIds.map((id) => id.toString()),
          );
          const candidateIds = priceFilteredInstructorIds
            ? priceFilteredInstructorIds.filter((id) =>
                availableIds.has(id.toString()),
              )
            : availableInstructorIds;
          baseQuery._id = { $in: candidateIds };
        } else if (priceFilteredInstructorIds) {
          baseQuery._id = { $in: priceFilteredInstructorIds };
        }

        let instructors = [];
        let totalCount = 0;

        // Execute geographic or non-geographic query first
        if (filter.coordinates && filter.areaRadius && filter.areaRadius > 0) {
          // Convert miles to meters
          const maxDistanceInMeters = filter.areaRadius * 1609.34;

          // Ensure coordinates are in [longitude, latitude] format
          const [longitude, latitude] = filter.coordinates;

          // Validate coordinates
          if (
            longitude < -180 ||
            longitude > 180 ||
            latitude < -90 ||
            latitude > 90
          ) {
            throw new Error("Invalid coordinates provided");
          }

          // Create the aggregation pipeline (without availability filtering)
          const pipeline = [
            {
              $geoNear: {
                near: {
                  type: "Point",
                  coordinates: [longitude, latitude],
                },
                distanceField: "distance",
                maxDistance: maxDistanceInMeters,
                spherical: true,
                query: baseQuery,
                distanceMultiplier: 0.000621371,
              },
            },
          ];

          // Count pipeline (without skip/limit)
          const countPipeline = [...pipeline, { $count: "totalCount" }];
          const paginatedPipeline = [
            ...pipeline,
            { $skip: safeOffset },
            { $limit: safeLimit },
          ];

          try {
            const [results, countResult] = await Promise.all([
              User.Instructor.aggregate(paginatedPipeline),
              User.Instructor.aggregate(countPipeline),
            ]);

            instructors = results;
            totalCount = countResult[0]?.totalCount || 0;
          } catch (geoError) {
            console.error("Geographic query failed:", geoError);
            throw new Error(`Geographic search failed: ${geoError.message}`);
          }
        } else {
          // Non-geographic query

          const [results, count] = await Promise.all([
            User.Instructor.find(baseQuery)
              .sort({ createdAt: -1, _id: 1 })
              .skip(safeOffset)
              .limit(safeLimit)
              .lean(),
            User.Instructor.countDocuments(baseQuery),
          ]);

          instructors = results;
          totalCount = count;
        }

        const paginatedInstructors = instructors;

        // Get tariffs and availability for the found instructors
        const instructorIds = paginatedInstructors.map((i) => i._id);

        // Build availability query for additional data
        const availabilityQuery = { teacherId: { $in: instructorIds } };

        if (filter.availableDates?.length) {
          const dateObjects = filter.availableDates.map((d) => new Date(d));
          availabilityQuery.date = { $in: dateObjects };
        }

        const [tariffs, availabilityDocs] = await Promise.all([
          teacherTariffModel
            .find({ teacherId: { $in: instructorIds } })
            .lean(),
          teacherAvailabilityModel.find(availabilityQuery).lean(),
        ]);

        // 🆕 Transform availabilityDocs into a more usable map
        const availabilityMap = new Map();

        availabilityDocs.forEach((doc) => {
          const teacherId = doc.teacherId.toString();
          const slots = (doc.availableSlots || []).map((slot) => ({
            id: slot.id,
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            booked: slot.booked,
            status: slot.status,
          }));

          if (!availabilityMap.has(teacherId)) {
            availabilityMap.set(teacherId, []);
          }
          availabilityMap.get(teacherId).push({
            id: doc._id.toString(),
            date: doc.date.toISOString(),
            status: doc.status,
            availableSlots: slots,
          });
        });

        const tariffMap = new Map(
          tariffs.map((t) => [t.teacherId.toString(), t]),
        );

        const reviewsAggregation = await Review.aggregate([
          { $match: { instructorId: { $in: instructorIds } } },
          {
            $group: {
              _id: "$instructorId",
              totalReviews: { $sum: 1 },
              averageRating: { $avg: "$reviewRating" },
            },
          },
        ]);

        const reviewsMap = new Map(
          reviewsAggregation.map((review) => [
            review._id.toString(),
            {
              totalReviews: review.totalReviews,
              averageRating: Math.round(review.averageRating * 10) / 10,
            },
          ]),
        );

        const result = {
          instructors: paginatedInstructors.map((instructor) => {
            const instructorId = instructor._id.toString();
            const reviewData = reviewsMap.get(instructorId) || {
              totalReviews: 0,
              averageRating: 0,
            };

            const isPaymentReadyFlag = isInstructorPaymentReady(instructor);

            return {
              id: instructorId,
              _id: instructorId,
              firstName: instructor.firstName,
              lastName: instructor.lastName,
              location: instructor.location,
              description: instructor.description,
              experience: instructor.experience,
              verificationStatus: instructor.verificationStatus || "",
              rating: instructor.rating,
              profileImage: instructor.profileImage || "",
              coordinates: instructor.coordinates,
              gender: instructor.gender,
              transmissionType: instructor.transmissionType,
              distance: instructor.distance,
              totalReviews: reviewData.averageRating,
              reviewsCount: reviewData.totalReviews,
              isPaymentReady: isPaymentReadyFlag,
              details: {
                degree: instructor.experience,
                car: instructor.carName,
                type: instructor.transmissionType,
                rate: tariffMap.has(instructorId)
                  ? tariffMap.get(instructorId).lessonFee
                  : "Not specified",
                lessonDiscount: tariffMap.has(instructorId)
                  ? tariffMap.get(instructorId).lessonDiscount
                  : 0,
                discountStartDate: tariffMap.has(instructorId)
                  ? tariffMap.get(instructorId).discountStartDate
                  : "",
                discountEndDate: tariffMap.has(instructorId)
                  ? tariffMap.get(instructorId).discountEndDate
                  : "",
              },
              availability: availabilityMap.get(instructorId) || [],
            };
          }),
          totalCount,
          hasMore: totalCount > safeOffset + safeLimit,
        };

        return result;
      } catch (error) {
        console.error("Error in getNearbyInstructors:", error);
        throw new Error(`Failed to fetch instructors: ${error.message}`);
      }
    },

    getInstructorAnalytics: async (_, { instructorId }, { user }) => {
      requireInstructorOwnership(user, instructorId);
      const bookings = await studentBookingModel
        .find({ instructorId })
        .populate("studentId")
        .populate("instructorId"); // important

      if (!bookings.length) {
        return {
          totalStudents: 0,
          activeBookings: 0,
          totalEarnings: 0,
          lastBooking: null,
          recentBookings: [],
          averageLessonsPerStudent: 0,
          cancellationRate: 0,
          attendanceRate: 0,
          instructor: await User.Instructor.findById(instructorId),
        };
      }

      const uniqueStudents = new Set(
        bookings.map((b) => b.studentId?._id?.toString()),
      );

      const totalStudents = uniqueStudents.size;
      // Helper: active slot = booked, not cancelled, not refund
      const isActiveSlot = (s) =>
        s.booked && s.status !== "cancelled" && s.status !== "refund";
      const isCancelledOrRefund = (s) =>
        String(s.status).toLowerCase() === "cancelled" ||
        String(s.status).toLowerCase() === "refund";
      // Earning-eligible lessons: explicitly marked completed or missed.
      // Date passed alone must never count as completed/earned.
      const isEarningEligibleSlot = (s) =>
        !isCancelledOrRefund(s) &&
        (String(s.status).toLowerCase() === "completed" ||
          String(s.status).toLowerCase() === "missed");
      // Strict completed lessons (explicitly validated by instructor only)
      const isValidatedCompletedSlot = (s) =>
        isActiveSlot(s) && s.status === "completed";
      // Missed lessons explicitly marked by instructor
      const isValidatedMissedSlot = (s) =>
        isActiveSlot(s) && s.status === "missed";
      // Upcoming/active booking = active slot not yet completed
      const now = new Date();
      const isUpcomingSlot = (s) => {
        if (!isActiveSlot(s)) return false;
        const slotEndMs = getSlotEndTimestampUtc(
          s.date,
          s.endTime || "23:59:59",
        );
        return (
          String(s.status || "").toLowerCase() !== "completed" &&
          String(s.status || "").toLowerCase() !== "missed" &&
          Number.isFinite(slotEndMs) &&
          slotEndMs > now.getTime()
        );
      };

      // Active bookings = upcoming slots (not yet completed)
      const activeBookings = bookings.reduce((count, booking) => {
        return count + booking.slots.filter(isUpcomingSlot).length;
      }, 0);

      // Total earnings (net, after DSP commission): sum instructorAmount for
      // lessons explicitly marked completed or missed.
      // Fallbacks (legacy):
      // - if chargeAmount + dspCommission exist: use (chargeAmount - dspCommission)
      // - otherwise fall back to gross per-slot (best-effort)
      const totalEarnings = bookings.reduce((sum, booking) => {
        const completedInBooking = booking.slots.filter(isEarningEligibleSlot).length;
        if (completedInBooking === 0) return sum;
        const perSlotGross = (booking.finalAmount || 0) / completedInBooking;
        return (
          sum +
          booking.slots
            .filter(isEarningEligibleSlot)
            .reduce((slotSum, slot) => {
              const hasInstructorAmount =
                slot.instructorAmount != null && slot.instructorAmount >= 0;
              const hasCommissionSplit =
                slot.chargeAmount != null &&
                slot.dspCommission != null &&
                !isNaN(Number(slot.chargeAmount)) &&
                !isNaN(Number(slot.dspCommission));
              const net = hasInstructorAmount
                ? Number(slot.instructorAmount)
                : hasCommissionSplit
                  ? Number(slot.chargeAmount) - Number(slot.dspCommission)
                  : perSlotGross;
              return slotSum + net;
            }, 0)
        );
      }, 0);

      // Last booking = most recent explicitly completed lesson (by slot end date/time)
      const completedSlotsWithBooking = bookings.flatMap((b) =>
        b.slots.filter(isValidatedCompletedSlot).map((s) => ({
          ...(s.toObject?.() || s),
          slotId: s._id,
          booking: b,
        })),
      );

      // Strict "attended lesson" for Last attendance date (slot-level):
      // - evaluate each slot independently (not whole booking)
      // - slot must be active (not cancelled/refund)
      // - slot must be marked completed by instructor
      const isStrictAttendedSlot = (s) => {
        if (!isActiveSlot(s)) return false;
        return s.status === "completed";
      };
      const strictAttendedSlotsWithBooking = bookings.flatMap((b) =>
        b.slots.filter(isStrictAttendedSlot).map((s) => ({
          ...(s.toObject?.() || s),
          slotId: s._id,
          booking: b,
        })),
      );
      const lastAttendanceByStudent = new Map();
      for (const item of strictAttendedSlotsWithBooking) {
        const sid = item.booking.studentId?._id?.toString();
        if (!sid) continue;
        const itemTime = new Date(`${item.date}T${item.endTime}:00`).getTime();
        const existing = lastAttendanceByStudent.get(sid);
        const existingTime = existing
          ? new Date(`${existing.date}T${existing.endTime}:00`).getTime()
          : -Infinity;
        if (!existing || itemTime > existingTime) {
          lastAttendanceByStudent.set(sid, item);
        }
      }

      // Recent bookings (carousel): one entry per student, using their most recent ACTIVE slot
      // (upcoming or past), excluding cancelled/refund. Sorted by slot end date/time desc, max 10.
      const activeSlotsWithBooking = bookings.flatMap((b) =>
        b.slots.filter(isActiveSlot).map((s) => ({
          ...(s.toObject?.() || s),
          slotId: s._id,
          booking: b,
        })),
      );

      const byStudentId = new Map();
      for (const item of activeSlotsWithBooking) {
        const sid = item.booking.studentId?._id?.toString();
        if (!sid) continue;
        const existing = byStudentId.get(sid);
        const itemTime = new Date(`${item.date}T${item.endTime}:00`).getTime();
        if (
          !existing ||
          new Date(`${existing.date}T${existing.endTime}:00`).getTime() <
            itemTime
        ) {
          byStudentId.set(sid, item);
        }
      }
      const sortedByRecent = [...byStudentId.values()].sort(
        (a, b) =>
          new Date(`${b.date}T${b.endTime}:00`).getTime() -
          new Date(`${a.date}T${a.endTime}:00`).getTime(),
      );
      const MAX_RECENT = 10;
      const recentSlots = sortedByRecent.slice(0, MAX_RECENT);
      const lastLessonDate =
        completedSlotsWithBooking.length > 0
          ? completedSlotsWithBooking
              .slice()
              .sort(
                (a, b) =>
                  new Date(`${b.date}T${b.endTime}:00`).getTime() -
                  new Date(`${a.date}T${a.endTime}:00`).getTime(),
              )[0].date
          : null;

      const buildBookingFromSlot = (lastSlot) => {
        const lastStudent = lastSlot.booking.studentId;
        const studentIdStr = lastStudent?._id?.toString();
        const studentLastAttendance = studentIdStr
          ? lastAttendanceByStudent.get(studentIdStr)
          : null;
        const studentTotalLessons = bookings.reduce((sum, b) => {
          if (b.studentId?._id?.toString() !== lastStudent?._id?.toString())
            return sum;
          return sum + b.slots.filter(isActiveSlot).length;
        }, 0);
        return {
          _id: lastSlot.booking._id,
          studentId: lastStudent,
          instructorId: lastSlot.booking.instructorId,
          slots: [lastSlot],
          totalAmount: lastSlot.booking.totalAmount,
          finalAmount: lastSlot.booking.finalAmount,
          status: lastSlot.booking.status,
          createdAt: lastSlot.booking.createdAt,
          updatedAt: lastSlot.booking.updatedAt,
          studentTotalLessons,
          studentLocation: lastStudent?.location || null,
          studentJoiningDate: lastStudent?.createdAt
            ? new Date(lastStudent.createdAt).toISOString()
            : null,
          lastAttendanceDate: studentLastAttendance
            ? new Date(
                `${studentLastAttendance.date}T${studentLastAttendance.endTime}:00`,
              ).toISOString()
            : null,
        };
      };

      const recentBookings = recentSlots.map(buildBookingFromSlot);
      const lastBooking = completedSlotsWithBooking.length
        ? buildBookingFromSlot(
            completedSlotsWithBooking
              .slice()
              .sort(
                (a, b) =>
                  new Date(`${b.date}T${b.endTime}:00`).getTime() -
                  new Date(`${a.date}T${a.endTime}:00`).getTime(),
              )[0],
          )
        : recentBookings[0] || null;

      // Average lessons per student must use only completed lessons
      // and only students who have at least one completed lesson.
      const completedLessonsForAverage = bookings.reduce(
        (sum, b) => sum + b.slots.filter(isValidatedCompletedSlot).length,
        0,
      );
      const studentsWithCompletedLessons = new Set(
        bookings
          .filter((b) => b.slots.some(isValidatedCompletedSlot))
          .map((b) => b.studentId?._id?.toString()),
      );
      const completedStudentsCount = studentsWithCompletedLessons.size;
      const averageLessonsPerStudent = completedStudentsCount
        ? completedLessonsForAverage / completedStudentsCount
        : 0;

      // Attendance/Cancellation formulas (business definition):
      // Attendance Rate (%) = attended lessons / total lessons booked
      // Cancellation Rate (%) = cancelled lessons / total lessons booked
      // Keep denominator aligned with Booking Management tabs:
      // upcoming/abandoned/history(no-status) => booked|confirmed
      // plus completed/missed/cancelled/refund
      const isDashboardCountedSlot = (s) =>
        [
          "booked",
          "confirmed",
          "completed",
          "missed",
          "cancelled",
          "refund",
        ].includes(String(s.status).toLowerCase());

      const totalBookedLessons = bookings.reduce(
        (sum, b) =>
          sum +
          b.slots.filter(
            (s) => isDashboardCountedSlot(s),
          ).length,
        0,
      );

      const attendedLessons = bookings.reduce(
        (sum, b) => sum + b.slots.filter(isValidatedCompletedSlot).length,
        0,
      );

      // Cancellation numerator must match Booking Management "Cancelled" bucket:
      // include both cancelled and refund statuses.
      const cancelledLessons = bookings.reduce(
        (sum, b) =>
          sum +
          b.slots.filter((s) =>
            ["cancelled", "refund"].includes(
              String(s.status || "").toLowerCase(),
            ),
          ).length,
        0,
      );

      const attendanceRate = totalBookedLessons
        ? (attendedLessons / totalBookedLessons) * 100
        : 0;

      const cancellationRate = totalBookedLessons
        ? (cancelledLessons / totalBookedLessons) * 100
        : 0;

      const totalLessonsGiven = completedLessonsForAverage;

      return {
        totalStudents,
        activeBookings,
        totalEarnings,
        lastBooking,
        recentBookings,
        averageLessonsPerStudent,
        totalLessonsGiven,
        cancellationRate,
        attendanceRate,
        lastLessonDate,
        instructor: await User.Instructor.findById(instructorId),
      };
    },
    getInstructorPublicProfile: async (_, { id, __skipCache }) => {
      if (!__skipCache) {
        return cache.getOrSet({
          category: "instructor_profile",
          key: cacheKeys.instructorProfile(id),
          ttlSeconds: 300,
          loader: () =>
            instructorResolver.Query.getInstructorPublicProfile(_, {
              id,
              __skipCache: true,
            }),
        });
      }
      try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error("Invalid instructor ID");
        }

        const instructor = await User.Instructor.findById(id)
          .select("-password -resetToken -resetTokenExpiry -providerId -__v")
          .lean();

        if (!instructor) {
          throw new Error("Instructor not found");
        }

        const [tariff, availability] = await Promise.all([
          teacherTariffModel.findOne({ teacherId: id }).lean(),
          teacherAvailabilityModel
            .find({ teacherId: id, status: "available" })
            .sort({ date: 1, startTime: 1 })
            .lean(),
        ]);

        // Build hourly slot chunks with accurate booking status
        const formattedAvailability = availability.map((slotDoc) => {
          // Each slotDoc = one day's availability
          const daySlots = slotDoc.availableSlots || [];

          const resultSlots = [];

          daySlots.forEach((slot) => {
            // Parse start/end times
            if (!slot.startTime || !slot.endTime) return; // ✅ safeguard

            const [startHour, startMinute] = slot.startTime
              .split(":")
              .map(Number);
            const [endHour, endMinute] = slot.endTime.split(":").map(Number);

            const startInMinutes = startHour * 60 + startMinute;
            const endInMinutes = endHour * 60 + endMinute;

            for (
              let time = startInMinutes;
              time + 60 <= endInMinutes;
              time += 60
            ) {
              const hour = Math.floor(time / 60);
              const minute = time % 60;
              const nextHour = Math.floor((time + 60) / 60);
              const nextMinute = (time + 60) % 60;

              const subSlotStart = `${hour.toString().padStart(2, "0")}:${minute
                .toString()
                .padStart(2, "0")}`;
              const subSlotEnd = `${nextHour.toString().padStart(2, "0")}:${nextMinute
                .toString()
                .padStart(2, "0")}`;

              resultSlots.push({
                id: `${slotDoc._id.toString()}_${subSlotStart}_${subSlotEnd}`,
                startTime: subSlotStart,
                endTime: subSlotEnd,
                booked: slot.booked ?? false,
                date: slotDoc.date.toISOString().split("T")[0],
                originalSlotId: slotDoc._id.toString(),
              });
            }
          });

          return {
            id: slotDoc._id.toString(),
            date: slotDoc.date.toISOString().split("T")[0],
            status: slotDoc.status,
            availableSlots: daySlots,
            hourlySlots: resultSlots,
          };
        });

        const reviewStats = await Review.aggregate([
          {
            $match: {
              instructorId: new mongoose.Types.ObjectId(id), // Convert id to ObjectId
            },
          },
          {
            $group: {
              _id: null,
              totalReviews: { $sum: 1 },
              averageRating: { $avg: "$reviewRating" },
            },
          },
        ]);

        const { totalReviews, averageRating } = reviewStats[0] || {
          totalReviews: 0,
          averageRating: 0,
        };

        const isPaymentReadyFlag = isInstructorPaymentReady(instructor);

        return {
          instructor: {
            ...toPublicInstructor(instructor, {
              isPaymentReady: isPaymentReadyFlag,
            }),
          },
          averageRating: Math.round(averageRating * 10) / 10,
          reviewsCount: totalReviews,
          tariff,
          availability: formattedAvailability,
        };
      } catch (error) {
        console.error("Error fetching instructor profile:", error);
        throw new Error("Failed to fetch instructor profile");
      }
    },
  },
};

module.exports = instructorResolver;
