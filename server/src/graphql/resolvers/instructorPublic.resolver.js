// src/graphql/resolvers/instructor.resolver.js
const { default: mongoose } = require("mongoose");
const teacherTariffModel = require("../../models/teacherTariff.model");
const User = require("../../models/User");

const { calculateDistance } = require("../../utils/geoUtils");
const teacherAvailabilityModel = require("../../models/teacherAvailability.model");

const instructorResolver = {
  Query: {
    getNearbyInstructors: async (_, { filter = {}, limit = 5, offset = 0 }) => {
      try {
        // Build the base query
        let query = {
          role: "Instructor",
          isProfileComplete: true,
          coordinates: { $exists: true },
        };

        // Apply text filters
        if (filter.city) {
          query.location = { $regex: new RegExp(filter.city, "i") };
        }

        // Transmission type filter
        if (filter.transmission) {
          query.transmissionType = filter.transmission;
        }

        // Gender filter (handles multiple selections)
        if (filter.gender?.length) {
          console.log("filter", filter?.gender);
          query.gender = { $in: filter.gender };
        }

        // Rating filter
        if (filter.minRating) {
          query.rating = { $gte: filter.minRating };
        }

        // Price filter
        if (filter.priceMin !== undefined && filter.priceMax !== undefined) {
          const tariffs = await teacherTariffModel.find({
            lessonFee: { $gte: filter.priceMin, $lte: filter.priceMax },
          });
          const instructorIds = tariffs.map((t) => t.teacherId);
          query._id = { $in: instructorIds };
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
            User.Instructor.aggregate([
              geoNearStage,
              { $skip: offset },
              { $limit: limit },
            ]),
            User.Instructor.aggregate([geoNearStage, { $count: "totalCount" }]),
          ]);

          instructors = results;
          totalCount = countResult[0]?.totalCount || 0;
        } else {
          // Non-geo query
          instructors = await User.Instructor.find(query)
            .skip(offset)
            .limit(limit);
          totalCount = await User.Instructor.countDocuments(query);
        }

        // Get tariffs for price display
        const instructorIds = instructors.map((i) => i._id);
        const tariffs = await teacherTariffModel.find({
          teacherId: { $in: instructorIds },
        });
        const tariffMap = new Map(
          tariffs.map((t) => [t.teacherId.toString(), t])
        );

        return {
          instructors: instructors.map((instructor) => {
            const tariff = tariffMap.get(instructor._id.toString());
            return {
              _id: instructor._id.toString(),
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
                rate: tariff ? `$${tariff.lessonFee}/hr` : "Not specified",
              },
            };
          }),
          totalCount,
          hasMore: offset + limit < totalCount,
        };
      } catch (error) {
        console.error("Error fetching nearby instructors:", error);
        throw new Error("Failed to fetch instructors");
      }
    },
    getInstructorPublicProfile: async (_, { id }) => {
      try {
        console.log("id", id);
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
        console.error("Error fetching instructor profile:", error);
        throw new Error("Failed to fetch instructor profile");
      }
    },
  },
};

module.exports = instructorResolver;
