// src/graphql/resolvers/instructor.resolver.js
const { default: mongoose } = require("mongoose");
const teacherTariffModel = require("../../models/teacherTariff.model");
const User = require("../../models/User");

const { calculateDistance } = require("../../utils/geoUtils");
const teacherAvailabilityModel = require("../../models/teacherAvailability.model");
const { Review } = require("../../models/Reviews");
const studentBookingModel = require("../../models/studentBooking.model");
const dayjs = require("dayjs");

const instructorResolver = {
  Query: {
    getNearbyInstructors: async (
      _,
      { filter = {}, offset = 0, limit = 10 },
    ) => {
      try {
        // Build the base query (excluding geographic filters AND availability dates)
        let baseQuery = {
          role: "Instructor",
          isProfileComplete: true,
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

          const tariffs = await teacherTariffModel.find(priceQuery);
          priceFilteredInstructorIds = tariffs.map((t) => t.teacherId);

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

          try {
            const [results, countResult] = await Promise.all([
              User.Instructor.aggregate(pipeline),
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

          const [results, count] = await Promise?.all([
            User.Instructor.find(baseQuery),
            User.Instructor.countDocuments(baseQuery),
          ]);

          instructors = results;
          totalCount = count;
        }

        // NOW apply availability date filtering if specified
        if (filter.availableDates?.length) {
          const dateRanges = filter.availableDates.map((dateStr) => {
            const date = new Date(dateStr);
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            return { date: { $gte: start, $lte: end } };
          });

          const availabilityResults = await teacherAvailabilityModel
            .find({ $or: dateRanges })
            .distinct("teacherId");

          // Convert to Set for faster lookup
          const availableInstructorIds = new Set(
            availabilityResults.map((id) => id.toString()),
          );

          // Filter instructors based on availability
          const filteredInstructors = instructors.filter((instructor) =>
            availableInstructorIds.has(instructor._id.toString()),
          );

          // Update counts
          instructors = filteredInstructors;
          totalCount = filteredInstructors.length;
        }

        // Apply pagination AFTER all filtering
        const paginatedInstructors = instructors.slice(offset, offset + limit);

        // Get tariffs and availability for the found instructors
        const instructorIds = paginatedInstructors.map((i) => i._id);

        // Build availability query for additional data
        const availabilityQuery = { teacherId: { $in: instructorIds } };

        if (filter.availableDates?.length) {
          const dateObjects = filter.availableDates.map((d) => new Date(d));
          availabilityQuery.date = { $in: dateObjects };
        }

        const [tariffs, availabilityDocs] = await Promise.all([
          teacherTariffModel.find({ teacherId: { $in: instructorIds } }),
          teacherAvailabilityModel.find(availabilityQuery),
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

            return {
              _id: instructorId,
              firstName: instructor.firstName,
              lastName: instructor.lastName,
              email: instructor.email,
              location: instructor.location,
              address: instructor.address,
              description: instructor.description,
              experience: instructor.experience,
              verificationStatus: instructor.verificationStatus || "",
              phone: instructor.phone,
              rating: instructor.rating,
              profileImage: instructor.profileImage || "",
              coordinates: instructor.coordinates,
              gender: instructor.gender,
              transmissionType: instructor.transmissionType,
              distance: instructor.distance,
              totalReviews: reviewData.averageRating,
              reviewsCount: reviewData.totalReviews,
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
          hasMore: totalCount > offset + limit,
        };

        return result;
      } catch (error) {
        console.error("Error in getNearbyInstructors:", error);
        throw new Error(`Failed to fetch instructors: ${error.message}`);
      }
    },

    getInstructorAnalytics: async (_, { instructorId }) => {
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
      const now = new Date();

      // Helper: active slot = booked, not cancelled, not refund
      const isActiveSlot = (s) =>
        s.booked && s.status !== "cancelled" && s.status !== "refund";
      // Attended = completed by status OR slot end time passed
      const isAttendedSlot = (s) => {
        if (!isActiveSlot(s)) return false;
        const slotEnd = new Date(`${s.date}T${s.endTime}:00`);
        return s.status === "completed" || slotEnd <= now;
      };
      // Upcoming/active booking = active slot not yet completed
      const isUpcomingSlot = (s) => {
        if (!isActiveSlot(s)) return false;
        const slotEnd = new Date(`${s.date}T${s.endTime}:00`);
        return s.status !== "completed" && slotEnd > now;
      };

      // Active bookings = upcoming slots (not yet completed)
      const activeBookings = bookings.reduce((count, booking) => {
        return count + booking.slots.filter(isUpcomingSlot).length;
      }, 0);

      // Total earnings: only from attended slots (completed or time passed); split by slot share per booking
      const totalEarnings = bookings.reduce((sum, booking) => {
        const activeInBooking = booking.slots.filter(isActiveSlot).length;
        if (activeInBooking === 0) return sum;
        const perSlotAmount = (booking.finalAmount || 0) / activeInBooking;
        const attendedInBooking = booking.slots.filter(isAttendedSlot).length;
        return sum + perSlotAmount * attendedInBooking;
      }, 0);

      // Last booking = most recent attended slot (by slot end date/time)
      const allSlotsWithBooking = bookings.flatMap((b) =>
        b.slots.filter(isAttendedSlot).map((s) => ({
          ...(s.toObject?.() || s),
          slotId: s._id,
          booking: b,
        })),
      );
      const lastSlot =
        allSlotsWithBooking.sort(
          (a, b) =>
            new Date(`${b.date}T${b.endTime}:00`).getTime() -
            new Date(`${a.date}T${a.endTime}:00`).getTime(),
        )[0] || null;

      let lastBooking = null;

      if (lastSlot) {
        const lastStudent = lastSlot.booking.studentId;

        // Count attended lessons by this student with this instructor
        const studentTotalLessons = bookings.reduce((sum, b) => {
          if (b.studentId?._id?.toString() !== lastStudent?._id?.toString())
            return sum;
          return sum + b.slots.filter(isActiveSlot).length;
        }, 0);

        lastBooking = {
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
        };
      }

      // Total lessons = active slots only (booked, not cancelled/refund)
      const totalLessons = bookings.reduce(
        (sum, b) => sum + b.slots.filter(isActiveSlot).length,
        0,
      );

      const averageLessonsPerStudent = totalStudents
        ? totalLessons / totalStudents
        : 0;

      const cancelledLessons = bookings.reduce(
        (sum, b) =>
          sum + b.slots.filter((s) => s.status === "cancelled").length,
        0,
      );

      const totalSlotsForCancellation = totalLessons + cancelledLessons;
      const cancellationRate = totalSlotsForCancellation
        ? (cancelledLessons / totalSlotsForCancellation) * 100
        : 0;

      const attendedLessons = bookings.reduce(
        (sum, b) => sum + b.slots.filter(isAttendedSlot).length,
        0,
      );

      const attendanceRate = totalLessons
        ? (attendedLessons / totalLessons) * 100
        : 0;

      return {
        totalStudents,
        activeBookings,
        totalEarnings,
        lastBooking,
        averageLessonsPerStudent,
        cancellationRate,
        attendanceRate,
        instructor: await User.Instructor.findById(instructorId),
      };
    },
    getInstructorPublicProfile: async (_, { id }) => {
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
          teacherTariffModel.findOne({ teacherId: id }),
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

        return {
          instructor: {
            ...instructor,
            id: instructor._id.toString(),
            coordinates: instructor.coordinates || null,
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
