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
          // Create date ranges for each requested date
          const dateRanges = filter.availableDates.map((dateStr) => {
            const date = new Date(dateStr);
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            return { $gte: start, $lte: end };
          });

          // Find instructors with availability on ANY of the requested dates
          const availabilityResults = await teacherAvailabilityModel
            .find({
              $or: dateRanges.map((range) => ({ date: range })),
            })
            .distinct("teacherId");

          instructorIdsWithAvailability = availabilityResults.map((id) =>
            id.toString()
          );

          // Add to our query
          if (instructorIdsWithAvailability.length) {
            query._id = query._id
              ? {
                  $in: instructorIdsWithAvailability.filter((id) =>
                    query._id.$in.includes(id)
                  ),
                }
              : { $in: instructorIdsWithAvailability };
          } else {
            // If no instructors available on these dates, return empty
            return {
              instructors: [],
              totalCount: 0,
              hasMore: false,
            };
          }
        }

        let instructors = [];
        let totalCount = 0;

        if (filter.coordinates && filter.areaRadius) {
          // Geo query logic
          const maxDistance = filter.areaRadius * 1609.34;
          const geoNearStage = {
            $geoNear: {
              near: { type: "Point", coordinates: filter.coordinates },
              distanceField: "distance",
              maxDistance: maxDistance,
              spherical: true,
              query: query,
            },
          };

          const [results, countResult] = await Promise.all([
            User.Instructor.aggregate([geoNearStage]),
            User.Instructor.aggregate([geoNearStage, { $count: "totalCount" }]),
          ]);

          instructors = results;
          totalCount = countResult[0]?.totalCount || 0;
        } else {
          // Non-geo query
          instructors = await User.Instructor.find(query);

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

        return {
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
              details: {
                degree: instructor.experience,
                car: instructor.carName,
                type: instructor.transmissionType,
                rate: tariffMap.has(instructorId)
                  ? `$${tariffMap.get(instructorId).lessonFee}/hr`
                  : "Not specified",
              },
              // Add availability slots for the requested dates
              availability: availabilityMap.get(instructorId) || [],
            };
          }),
          totalCount,
          // hasMore: offset + limit < totalCount,
        };
      } catch (error) {
        throw new Error("Failed to fetch instructors");
      }
    },
    getInstructorPublicProfile: async (_, { id }) => {
      try {
        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error("Invalid instructor ID");
        }

        // Get instructor basic info
        const instructor = await User.Instructor.findById(id)
          .select("-password -resetToken -resetTokenExpiry -providerId -__v")
          .lean();

        if (!instructor) {
          throw new Error("Instructor not found");
        }

        // Get tariff details in parallel with availability
        const [tariff, availability] = await Promise.all([
          teacherTariffModel.findOne({ teacherId: id }),
          teacherAvailabilityModel
            .find({ teacherId: id })
            .sort({ date: 1, startTime: 1 })
            .lean(),
        ]);
        return {
          instructor: {
            ...instructor,
            _id: instructor._id.toString(),
            coordinates: instructor.coordinates || null,
          },
          tariff,
          availability: availability.map((slot) => ({
            ...slot,
            _id: slot._id.toString(),
            date: slot.date.toISOString().split("T")[0], // Format as YYYY-MM-DD
          })),
        };
      } catch (error) {
        throw new Error("Failed to fetch instructor profile");
      }
    },
  },
};

module.exports = instructorResolver;
