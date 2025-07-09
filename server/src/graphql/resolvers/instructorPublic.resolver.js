// src/graphql/resolvers/instructor.resolver.js
const { default: mongoose } = require("mongoose");
const teacherTariffModel = require("../../models/teacherTariff.model");
const User = require("../../models/User");

const { calculateDistance } = require("../../utils/geoUtils");
const teacherAvailabilityModel = require("../../models/teacherAvailability.model");

const instructorResolver = {
  Query: {
    getNearbyInstructors: async (
      _,
      { filter = {}, offset = 0, limit = 10 }
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

          const [results, count] = await Promise.all([
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
            availabilityResults.map((id) => id.toString())
          );

          // Filter instructors based on availability
          const filteredInstructors = instructors.filter((instructor) =>
            availableInstructorIds.has(instructor._id.toString())
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
          availabilityQuery.date = {
            $in: filter.availableDates.map((d) => new Date(d)),
          };
        }

        const [tariffs, availability] = await Promise.all([
          teacherTariffModel.find({ teacherId: { $in: instructorIds } }),
          teacherAvailabilityModel.find(availabilityQuery),
        ]);

        const tariffMap = new Map(
          tariffs.map((t) => [t.teacherId.toString(), t])
        );
        const availabilityMap = availability.reduce((map, slot) => {
          if (!map.has(slot.teacherId.toString())) {
            map.set(slot.teacherId.toString(), []);
          }
          map.get(slot.teacherId.toString()).push(slot);
          return map;
        }, new Map());

        const result = {
          instructors: paginatedInstructors.map((instructor) => {
            const instructorId = instructor._id.toString();
            return {
              _id: instructorId,
              firstName: instructor.firstName,
              lastName: instructor.lastName,
              email: instructor.email,
              location: instructor.location,
              address: instructor.address,
              description: instructor.description,
              experience: instructor.experience,
              phone: instructor.phone,
              rating: instructor.rating,
              profileImage: instructor.profileImage || "",
              coordinates: instructor.coordinates,
              gender: instructor.gender,
              transmissionType: instructor.transmissionType,
              distance: instructor.distance,
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
        const formattedAvailability = availability.map((slot) => {
          const resultSlots = [];

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

            const subSlotStart = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
            const subSlotEnd = `${nextHour.toString().padStart(2, "0")}:${nextMinute.toString().padStart(2, "0")}`;

            const matchingSlot = slot.slots?.find(
              (s) => s.startTime === subSlotStart && s.endTime === subSlotEnd
            );

            resultSlots.push({
              id: `${slot._id.toString()}_${subSlotStart}_${subSlotEnd}`,
              startTime: subSlotStart,
              endTime: subSlotEnd,
              booked: matchingSlot?.booked ?? false,
              date: slot.date.toISOString().split("T")[0],
              originalSlotId: slot._id.toString(),
            });
          }

          return {
            ...slot,
            _id: slot._id.toString(),
            date: slot.date.toISOString().split("T")[0],
            hourlySlots: resultSlots,
          };
        });

        return {
          instructor: {
            ...instructor,
            _id: instructor._id.toString(),
            coordinates: instructor.coordinates || null,
          },
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
