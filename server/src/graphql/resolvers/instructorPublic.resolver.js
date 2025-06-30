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
        // Build the base query (excluding geographic filters)
        let baseQuery = {
          role: "Instructor",
          isProfileComplete: true,
          coordinates: { $exists: true },
        };

        // Apply non-geographic filters
        if (filter.transmission)
          baseQuery.transmissionType = filter.transmission;
        if (filter.gender?.length) baseQuery.gender = { $in: filter.gender };
        if (filter.minRating) baseQuery.rating = { $gte: filter.minRating };

        // Handle price filtering
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

          console.log("Price filter query:", priceQuery);

          const tariffs = await teacherTariffModel.find(priceQuery);
          priceFilteredInstructorIds = tariffs.map((t) => t.teacherId); // Keep as ObjectId
          console.log(
            `Found ${tariffs.length} tariffs matching price criteria`
          );

          if (priceFilteredInstructorIds.length === 0) {
            console.log("No instructors found with matching price range");
            return {
              instructors: [],
              totalCount: 0,
              hasMore: false,
            };
          }

          console.log(
            "Price filtered instructor IDs:",
            priceFilteredInstructorIds
          );
        }

        // Handle date availability filtering
        let availabilityFilteredInstructorIds = null;
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

          availabilityFilteredInstructorIds = availabilityResults; // Keep as ObjectIds

          if (availabilityFilteredInstructorIds.length === 0) {
            return {
              instructors: [],
              totalCount: 0,
              hasMore: false,
            };
          }
        }

        // Combine price and availability filters
        let combinedFilteredIds = null;
        if (priceFilteredInstructorIds && availabilityFilteredInstructorIds) {
          // Create a set of string IDs for intersection
          const availabilityIdSet = new Set(
            availabilityFilteredInstructorIds.map((id) => id.toString())
          );

          combinedFilteredIds = priceFilteredInstructorIds.filter((id) =>
            availabilityIdSet.has(id.toString())
          );
        } else if (priceFilteredInstructorIds) {
          combinedFilteredIds = priceFilteredInstructorIds;
        } else if (availabilityFilteredInstructorIds) {
          combinedFilteredIds = availabilityFilteredInstructorIds;
        }

        // Add ID filter to base query if we have filtered IDs
        if (combinedFilteredIds !== null) {
          // Remove the ObjectId conversion since we already have ObjectIds
          baseQuery._id = { $in: combinedFilteredIds };
        }

        let instructors = [];
        let totalCount = 0;

        // FIXED: Geographic query logic
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

          console.log("Geographic search params:", {
            coordinates: [longitude, latitude],
            radius: filter.areaRadius,
            radiusInMeters: maxDistanceInMeters,
          });

          // Create the aggregation pipeline
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
                query: baseQuery, // Use baseQuery instead of query
                distanceMultiplier: 0.000621371, // Convert meters to miles for display
              },
            },
            {
              $skip: offset,
            },
            {
              $limit: limit,
            },
          ];

          // Count pipeline (without skip/limit)
          const countPipeline = [
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
              },
            },
            {
              $count: "totalCount",
            },
          ];

          try {
            console.log(
              "Executing geographic query with pipeline:",
              JSON.stringify(pipeline, null, 2)
            );

            const [results, countResult] = await Promise.all([
              User.Instructor.aggregate(pipeline),
              User.Instructor.aggregate(countPipeline),
            ]);

            instructors = results;
            totalCount = countResult[0]?.totalCount || 0;

            console.log(
              `Geographic query returned ${instructors.length} instructors out of ${totalCount} total`
            );

            // Log the distances for debugging
            instructors.forEach((instructor) => {
              console.log(
                `Instructor ${instructor.firstName} ${instructor.lastName}: ${instructor.distance?.toFixed(2)} miles away`
              );
            });
          } catch (geoError) {
            console.error("Geographic query failed:", geoError);
            throw new Error(`Geographic search failed: ${geoError.message}`);
          }
        } else {
          // Non-geographic query
          console.log("Executing non-geographic query with filter:", baseQuery);

          const [results, count] = await Promise.all([
            User.Instructor.find(baseQuery).skip(offset).limit(limit),
            User.Instructor.countDocuments(baseQuery),
          ]);

          instructors = results;
          totalCount = count;
        }

        // Get tariffs and availability for the found instructors
        const instructorIds = instructors.map((i) => i._id);

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
              distance: instructor.distance, // Distance in miles (if geographic search)
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
          hasMore: totalCount > offset + instructors.length,
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
