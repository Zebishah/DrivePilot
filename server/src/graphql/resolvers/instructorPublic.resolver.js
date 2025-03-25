// src/graphql/resolvers/instructor.resolver.js
const User = require("../../models/User");

const { calculateDistance } = require("../../utils/geoUtils");

const instructorResolver = {
  Query: {
    getNearbyInstructors: async (_, { filter = {}, limit = 5, offset = 0 }) => {
      try {
        // Build the query
        let query = {};
        query = { role: "Instructor", isProfileComplete: true };

        // Filter by city if provided
        if (filter.city) {
          query.location = { $regex: new RegExp(filter.city, "i") };
        }

        // Filter by price range
        if (filter.priceMin !== undefined && filter.priceMax !== undefined) {
          query["details.rate"] = {
            $gte: `$${filter.priceMin}`,
            $lte: `$${filter.priceMax}`,
          };
        }

        // Filter by transmission type
        if (filter.transmission) {
          query["details.type"] = filter.transmission;
        }

        // Filter by minimum rating
        if (filter.minRating) {
          query.rating = { $gte: filter.minRating };
        }

        // Proximity search
        let nearbyInstructors = [];
        let totalCount = 0;

        // if (filter.coordinates && filter.areaRadius) {
        //   // Find instructors within the specified radius
        //   nearbyInstructors = await User.Instructor.aggregate([
        //     {
        //       $geoNear: {
        //         near: {
        //           type: "Point",
        //           coordinates: filter.coordinates,
        //         },
        //         distanceField: "distance",
        //         maxDistance: filter.areaRadius * 1609.34, // Convert miles to meters
        //         spherical: true,
        //       },
        //     },
        //     { $match: query },
        //     { $skip: offset },
        //     { $limit: limit },
        //   ]);

        //   totalCount = await User.Instructor.countDocuments({
        //     location: {
        //       $near: {
        //         $geometry: {
        //           type: "Point",
        //           coordinates: filter.coordinates,
        //         },
        //         $maxDistance: filter.areaRadius * 1609.34,
        //       },
        //     },
        //     ...query,
        //   });
        // } else {
        // If no coordinates, do a standard query
        nearbyInstructors = await User.Instructor.find(query)
          .skip(offset)
          .limit(limit);

        totalCount = await User.Instructor.countDocuments(query);
        // }

        return {
          instructors: nearbyInstructors.map((instructor) => ({
            id: instructor._id.toString(),
            ...instructor.toObject(),
            details: {
              degree: instructor.experience,
              car: instructor.car || "N/A",
              type: instructor.transmission || "N/A",
              rate: `$${instructor.hourlyRate || 0}/hr`,
            },
          })),
          totalCount,
          hasMore: offset + limit < totalCount,
        };
      } catch (error) {
        console.error("Error fetching nearby instructors:", error);
        throw new Error("Failed to fetch instructors");
      }
    },
  },
};

module.exports = instructorResolver;
