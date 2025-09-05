const mongoose = require("mongoose");
const dayjs = require("dayjs");
const { User, Instructor } = require("../../models/User");
const studentBookingModel = require("../../models/studentBooking.model");
const { Review } = require("../../models/Reviews");
const Visitor = require("../../models/Visitors");

// Resolvers
const adminAnalyticsResolvers = {
  Query: {
    getAdminAnalytics: async (_, { filter }) => {
      const { instructorIds, filterType, fromDate, toDate } = filter || {};

      // Compute date range based on filterType
      let from, to;
      const now = dayjs();
      switch (filterType) {
        case "LAST_WEEK":
          from = now.subtract(1, "week").startOf("week");
          to = now.subtract(1, "week").endOf("week");
          break;
        case "THIS_WEEK":
          from = now.startOf("week");
          to = now.endOf("week");
          break;
        case "LAST_MONTH":
          from = now.subtract(1, "month").startOf("month");
          to = now.subtract(1, "month").endOf("month");
          break;
        case "THIS_MONTH":
          from = now.startOf("month");
          to = now.endOf("month");
          break;
        case "LAST_YEAR":
          from = now.subtract(1, "year").startOf("year");
          to = now.subtract(1, "year").endOf("year");
          break;
        case "THIS_YEAR":
          from = now.startOf("year");
          to = now.endOf("year");
          break;
        case "LAST_6_MONTHS":
          from = now.subtract(6, "month").startOf("day");
          to = now;
          break;
        case "CUSTOM":
          from = dayjs(fromDate);
          to = dayjs(toDate);
          break;
        default:
          from = dayjs("1970-01-01"); // All time
          to = now;
      }

      const fromStr = from.format("YYYY-MM-DD");
      const toStr = to.format("YYYY-MM-DD");
      const fromDateObj = from.toDate();
      const toDateObj = to.toDate();

      const matchInstructor =
        instructorIds && instructorIds.length > 0
          ? {
              instructorId: {
                $in: instructorIds.map((id) => new mongoose.Types.ObjectId(id)),
              },
            }
          : {};

      // Overall Stats

      // Total registrations: Users created in the date range
      const totalRegistrations = await User.countDocuments({
        createdAt: { $gte: fromDateObj, $lte: toDateObj },
      });

      // Total lessons booked: Count of booked slots in range
      const bookedLessonsAgg = await studentBookingModel.aggregate([
        { $match: matchInstructor },
        { $unwind: "$slots" },
        {
          $match: {
            "slots.date": { $gte: fromStr, $lte: toStr },
            "slots.booked": true,
            "slots.status": "booked",
          },
        },
        { $count: "count" },
      ]);
      const totalLessonsBooked = bookedLessonsAgg[0]?.count || 0;
      // Reviews given: Completed reviews in range
      const reviewsGiven = await Review.countDocuments({
        ...matchInstructor,
        reviewStatus: "completed",
        createdAt: { $gte: fromDateObj, $lte: toDateObj },
      });

      // Lesson attendance: Booked slots in range where date < now
      const nowStr = now.format("YYYY-MM-DD");
      const attendedLessonsAgg = await studentBookingModel.aggregate([
        { $match: matchInstructor },
        { $unwind: "$slots" },
        {
          $match: {
            "slots.date": { $lt: nowStr }, // Date has passed (crossed current date)
            "slots.booked": true,
            "slots.status": "booked",
          },
        },
        { $count: "count" },
      ]);
      const attendedLessons = attendedLessonsAgg[0]?.count || 0;
      console.log("stats", attendedLessons, totalLessonsBooked);
      // Attendance rate
      const attendanceRate =
        totalLessonsBooked > 0
          ? (totalLessonsBooked / attendedLessons) * 100
          : 0;

      const overallStats = {
        totalRegistrations,
        totalLessonsBooked,
        reviewsGiven,
        attendedLessons, // Add this to show attended lessons count
        attendanceRate: Math.round(attendanceRate), // Round to 1 decimal place
      };

      // Graph Data

      // Determine grouping unit based on duration
      const durationDays = to.diff(from, "day");
      let groupUnit = "day";
      if (durationDays > 180) {
        groupUnit = "month";
      } else if (durationDays > 30) {
        groupUnit = "week";
      }

      // Fetch all relevant data in memory (assuming dataset not too large)
      const allBookings = await studentBookingModel
        .find(matchInstructor)
        .populate("studentId")
        .populate("instructorId");

      const slots = allBookings.flatMap((b) => {
        const numSlots = b.slots.length;
        const pricePerSlot = numSlots > 0 ? (b.finalAmount || 0) / numSlots : 0;

        return b.slots
          .filter((s) => {
            const slotDate = dayjs(s.date);
            const slotDateStr = slotDate.format("YYYY-MM-DD");
            return (
              slotDateStr >= fromStr &&
              slotDateStr <= toStr &&
              s.booked &&
              s.status === "booked"
            );
          })
          .map((s) => ({
            ...s,
            studentId: b.studentId,
            instructorId: b.instructorId,
            slotDate: dayjs(s.date),
            pricePerSlot,
          }));
      });

      const allUsers = await User.find({
        createdAt: { $gte: fromDateObj, $lte: toDateObj },
      });

      const allVisitors = await Visitor.find({
        firstVisit: { $gte: fromDateObj, $lte: toDateObj },
      });

      // Generate buckets
      let current = from.clone().startOf(groupUnit);

      const activeUsers = [];
      const averageRevenuePerInstructor = [];
      const bookingsPerInstructor = [];
      const totalEarnings = [];
      const conversionRates = [];

      const timeFormat =
        groupUnit === "month"
          ? "MMM YYYY"
          : groupUnit === "week"
            ? "WW YYYY"
            : "YYYY-MM-DD";

      while (current.isBefore(to) || current.isSame(to, groupUnit)) {
        const bucketStart = current.clone();
        const bucketEnd = current.clone().endOf(groupUnit);
        const bucketStartDate = bucketStart.toDate();
        const bucketEndDate = bucketEnd.toDate();

        // Active Users
        const bucketSlots = slots.filter((s) => {
          return (
            (s.slotDate.isAfter(bucketStart) ||
              s.slotDate.isSame(bucketStart, "day")) &&
            (s.slotDate.isBefore(bucketEnd) ||
              s.slotDate.isSame(bucketEnd, "day"))
          );
        });
        const studentsSet = new Set(
          bucketSlots.map((s) => s.studentId?._id.toString())
        );
        const instructorsSet = new Set(
          bucketSlots.map((s) => s.instructorId?._id.toString())
        );
        activeUsers.push({
          time: current.format(timeFormat),
          students: studentsSet.size,
          instructors: instructorsSet.size,
        });

        // Bookings per Instructor
        const numBookings = bucketSlots.length;
        const numInstructors = instructorsSet.size;

        const averageBookings =
          numInstructors > 0 ? numBookings / numInstructors : 0;
        bookingsPerInstructor.push({
          time: current.format(timeFormat),
          averageBookings,
        });

        // Revenue and Earnings (only for delivered/passed slots)
        const deliveredBucketSlots = bucketSlots.filter((s) =>
          s.slotDate.isBefore(now)
        );
        const totalRevenue = deliveredBucketSlots.reduce(
          (sum, s) => sum + s.pricePerSlot,
          0
        );
        totalEarnings.push({
          time: current.format(timeFormat),
          totalEarnings: totalRevenue,
        });
        const averageRevenue =
          numInstructors > 0 ? totalRevenue / numInstructors : 0;
        averageRevenuePerInstructor.push({
          time: current.format(timeFormat),
          averageRevenue,
        });

        // Conversion Rates
        const bucketRegistrations = allUsers.filter(
          (u) => u.createdAt >= bucketStartDate && u.createdAt <= bucketEndDate
        ).length;
        const bucketVisitors = allVisitors.filter(
          (v) =>
            v.firstVisit >= bucketStartDate && v.firstVisit <= bucketEndDate
        ).length;
        const rate =
          bucketVisitors > 0 ? (bucketRegistrations / bucketVisitors) * 100 : 0;
        conversionRates.push({
          time: current.format(timeFormat),
          visitors: bucketVisitors,
          registrations: bucketRegistrations,
          rate,
        });

        current = current.add(1, groupUnit);
      }

      const graphData = {
        activeUsers,
        averageRevenuePerInstructor,
        bookingsPerInstructor,
        totalEarnings,
        conversionRates,
      };

      return { overallStats, graphData };
    },
    getAllInstructors: async () => {
      try {
        // Ensure Instructor model is defined
        if (!Instructor) {
          throw new Error("Instructor model is not properly registered");
        }
        const instructors = await Instructor.find({}, "_id firstName lastName");
        return instructors.map((instructor) => ({
          _id: instructor._id,
          firstName: instructor.firstName,
          lastName: instructor.lastName,
        }));
      } catch (error) {
        console.error("Error fetching instructors:", error);
        throw new Error("Failed to fetch instructors");
      }
    },
  },
};

// Export for use in your server setup
module.exports = adminAnalyticsResolvers;
