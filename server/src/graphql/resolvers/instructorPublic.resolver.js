// src/graphql/resolvers/instructor.resolver.js
const { default: mongoose } = require("mongoose");
const teacherTariffModel = require("../../models/teacherTariff.model");
const User = require("../../models/User");

const { calculateDistance } = require("../../utils/geoUtils");
const teacherAvailabilityModel = require("../../models/teacherAvailability.model");

const instructorResolver = {
  Query: {
    getNearbyInstructors: async (_, { filter = {}, offset = 0 }) => {
      try {
        // Build the base query
        let query = {
          role: "Instructor",
          isProfileComplete: true,
          coordinates: { $exists: true },
        };

        // Apply text filters
        if (filter.city)
          query.location = { $regex: new RegExp(filter.city, "i") };
        if (filter.transmission) query.transmissionType = filter.transmission;
        if (filter.gender?.length) query.gender = { $in: filter.gender };
        if (filter.minRating) query.rating = { $gte: filter.minRating };

        // Price filter
        if (filter.priceMin !== undefined && filter.priceMax !== undefined) {
          const tariffs = await teacherTariffModel.find({
            lessonFee: { $gte: filter.priceMin, $lte: filter.priceMax },
          });
          const instructorIds = tariffs.map((t) => t.teacherId);
          query._id = { $in: instructorIds };
        }

        // Date availability filter
        let instructorIdsWithAvailability = [];
        if (filter.availableDates?.length) {
          const dateRanges = filter.availableDates.map((dateStr) => {
            const date = new Date(dateStr);
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            return { $gte: start, $lte: end };
          });

          const availabilityResults = await teacherAvailabilityModel
            .find({
              $or: dateRanges.map((range) => ({ date: range })),
            })
            .distinct("teacherId");

          instructorIdsWithAvailability = availabilityResults.map((id) =>
            id.toString()
          );

          if (instructorIdsWithAvailability.length) {
            query._id = query._id
              ? {
                  $in: instructorIdsWithAvailability.filter((id) =>
                    query._id.$in.includes(id)
                  ),
                }
              : { $in: instructorIdsWithAvailability };
          } else {
            return {
              instructors: [],
              totalCount: 0,
              hasMore: false,
            };
          }
        }

        let instructors = [];
        let totalCount = 0;

        // FIXED: Geographic query logic
        if (filter.coordinates && filter.areaRadius && filter.areaRadius > 0) {
          // Convert miles to meters (if using miles) or keep in meters
          const maxDistanceInMeters = filter.areaRadius * 1609.34; // Convert miles to meters

          // Ensure coordinates are in [longitude, latitude] format
          const [longitude, latitude] = filter.coordinates;

          // Create the geoNear aggregation stage
          const geoNearStage = {
            $geoNear: {
              near: {
                type: "Point",
                coordinates: [longitude, latitude], // Ensure correct format
              },
              distanceField: "distance",
              maxDistance: maxDistanceInMeters,
              spherical: true,
              query: query,
            },
          };

          try {
            // Execute the geographic query
            const [results, countResult] = await Promise.all([
              User.Instructor.aggregate([
                geoNearStage,
                { $skip: offset },
                // Add limit if needed: { $limit: limit }
              ]),
              User.Instructor.aggregate([
                geoNearStage,
                { $count: "totalCount" },
              ]),
            ]);

            instructors = results;
            totalCount = countResult[0]?.totalCount || 0;
          } catch (geoError) {
            console.error("Geographic query failed:", geoError);
            // Fallback to non-geographic query
            instructors = await User.Instructor.find(query).skip(offset);
            totalCount = await User.Instructor.countDocuments(query);
          }
        } else {
          // Non-geographic query (when no coordinates or areaRadius provided)

          instructors = await User.Instructor.find(query).skip(offset);
          totalCount = await User.Instructor.countDocuments(query);
        }

        // Get tariffs and availability for the found instructors
        const instructorIds = instructors.map((i) => i._id);

        // Build availability query
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
          instructors: instructors.map((instructor) => {
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
              imageUrl: instructor.imageUrl,
              coordinates: instructor.coordinates,
              gender: instructor.gender,
              transmissionType: instructor.transmissionType,
              distance: instructor.distance, // This will be added by $geoNear
              details: {
                degree: instructor.experience,
                car: instructor.carName,
                type: instructor.transmissionType,
                rate: tariffMap.has(instructorId)
                  ? `$${tariffMap.get(instructorId).lessonFee}/hr`
                  : "Not specified",
              },
              availability: availabilityMap.get(instructorId) || [],
            };
          }),
          totalCount,
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

        console.log("formatted ", JSON.stringify(formattedAvailability));
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
