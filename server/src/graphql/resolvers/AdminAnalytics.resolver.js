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

      // Total registrations (split): Users created in the date range
      const [studentRegistrations, instructorRegistrations] = await Promise.all(
        [
          User.countDocuments({
            role: "Student",
            createdAt: { $gte: fromDateObj, $lte: toDateObj },
          }),
          User.countDocuments({
            role: "Instructor",
            createdAt: { $gte: fromDateObj, $lte: toDateObj },
          }),
        ],
      );
      const totalRegistrations = studentRegistrations + instructorRegistrations;

      // Total lessons booked: active slots in range (booked, not cancelled/refund)
      const bookedLessonsAgg = await studentBookingModel.aggregate([
        { $match: matchInstructor },
        { $unwind: "$slots" },
        {
          $match: {
            "slots.date": { $gte: fromStr, $lte: toStr },
            "slots.booked": true,
            "slots.status": { $nin: ["cancelled", "refund"] },
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

      // Attended lessons: active slots in range where status === "completed" OR slot end time has passed
      const nowDate = now.toDate();
      const attendedLessonsAgg = await studentBookingModel.aggregate([
        { $match: matchInstructor },
        { $unwind: "$slots" },
        {
          $addFields: {
            slotEndDateTime: {
              $dateFromString: {
                dateString: {
                  $concat: ["$slots.date", "T", "$slots.endTime"],
                },
              },
            },
          },
        },
        {
          $match: {
            "slots.date": { $gte: fromStr, $lte: toStr },
            "slots.booked": true,
            "slots.status": { $nin: ["cancelled", "refund"] },
            $or: [
              { "slots.status": "completed" },
              { slotEndDateTime: { $lte: nowDate } },
            ],
          },
        },
        { $count: "count" },
      ]);

      const attendedLessons = attendedLessonsAgg[0]?.count || 0;

      // Upcoming lessons: booked, not cancelled/refund, and slot end time is in the future
      const upcomingLessonsAgg = await studentBookingModel.aggregate([
        { $match: matchInstructor },
        { $unwind: "$slots" },
        {
          $addFields: {
            slotEndDateTime: {
              $dateFromString: {
                dateString: {
                  $concat: ["$slots.date", "T", "$slots.endTime"],
                },
              },
            },
          },
        },
        {
          $match: {
            "slots.date": { $gte: fromStr, $lte: toStr },
            "slots.booked": true,
            "slots.status": { $nin: ["cancelled", "refund"] },
            slotEndDateTime: { $gt: nowDate },
          },
        },
        { $count: "count" },
      ]);
      const upcomingLessonsBooked = upcomingLessonsAgg[0]?.count || 0;
      const completedLessonsBooked = attendedLessons;

      // Average reserved hours per student:
      // Sum of all booked lesson durations (in hours) divided by number of students
      // who have at least one booked, non-cancelled/refund lesson in the range.
      const reservedHoursAgg = await studentBookingModel.aggregate([
        { $match: matchInstructor },
        { $unwind: "$slots" },
        {
          $match: {
            "slots.date": { $gte: fromStr, $lte: toStr },
            "slots.booked": true,
            "slots.status": { $nin: ["cancelled", "refund"] },
          },
        },
        {
          $addFields: {
            slotStartDateTime: {
              $dateFromString: {
                dateString: {
                  $concat: ["$slots.date", "T", "$slots.startTime"],
                },
              },
            },
            slotEndDateTime: {
              $dateFromString: {
                dateString: {
                  $concat: ["$slots.date", "T", "$slots.endTime"],
                },
              },
            },
          },
        },
        {
          $addFields: {
            durationMinutes: {
              $divide: [
                { $subtract: ["$slotEndDateTime", "$slotStartDateTime"] },
                1000 * 60,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalMinutes: { $sum: "$durationMinutes" },
            studentIds: { $addToSet: "$studentId" },
          },
        },
      ]);

      const reservedStats = reservedHoursAgg[0];
      const totalReservedMinutes = reservedStats?.totalMinutes || 0;
      const studentsWithBookings = Array.isArray(reservedStats?.studentIds)
        ? reservedStats.studentIds.length
        : 0;
      const averageReservedHoursPerStudent =
        studentsWithBookings > 0
          ? totalReservedMinutes / 60 / studentsWithBookings
          : 0;

      // Attendance rate
      let attendanceRate = 0;

      if (totalLessonsBooked > 0) {
        attendanceRate = (attendedLessons / totalLessonsBooked) * 100;
        attendanceRate = Math.min(attendanceRate, 100); // cap at 100%
      }

      const overallStats = {
        totalRegistrations,
        studentRegistrations,
        instructorRegistrations,
        totalLessonsBooked,
        upcomingLessonsBooked,
        completedLessonsBooked,
        reviewsGiven,
        lessonAttendance: attendedLessons,
        attendanceRate: Math.round(attendanceRate), // Round to 1 decimal place
        averageReservedHoursPerStudent,
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

      // Lesson-date keyed slots (used by revenue/bookings/earnings graphs)
      const slots = allBookings.flatMap((b) => {
        const activeSlotsInBooking = b.slots.filter(
          (s) => s.booked && s.status !== "cancelled" && s.status !== "refund",
        );
        const numActive = activeSlotsInBooking.length;
        const pricePerSlot =
          numActive > 0 ? (b.finalAmount || 0) / numActive : 0;

        return b.slots
          .filter((s) => {
            const slotDate = dayjs(s.date);
            const slotDateStr = slotDate.format("YYYY-MM-DD");
            return (
              slotDateStr >= fromStr &&
              slotDateStr <= toStr &&
              s.booked &&
              s.status !== "cancelled" &&
              s.status !== "refund" &&
              // Only paid interactions count for admin graphs
              s.paymentStatus === "paid"
            );
          })
          .map((s) => ({
            ...s,
            studentId: b.studentId,
            instructorId: b.instructorId,
            slotDate: dayjs(s.date),
            slotEnd: dayjs(`${s.date}T${s.endTime}`),
            pricePerSlot,
            instructorAmount:
              s.instructorAmount != null
                ? Number(s.instructorAmount)
                : s.chargeAmount != null && s.dspCommission != null
                  ? Number(s.chargeAmount) - Number(s.dspCommission)
                  : pricePerSlot, // legacy fallback (gross)
          }));
      });

      // Payment-date keyed slots (used ONLY for Active Users students line)
      // A student becomes "active" on the day they actually paid/was charged.
      const paidSlotsByPaymentDate = allBookings.flatMap((b) =>
        (b.slots ?? [])
          .filter(
            (s) =>
              s.booked &&
              s.status !== "cancelled" &&
              s.status !== "refund" &&
              s.paymentStatus === "paid",
          )
          .map((s) => {
            // Prefer slot-level chargedAt; fall back to booking createdAt if missing.
            const chargedAt =
              (s.chargedAt ? new Date(s.chargedAt) : null) ||
              (b.createdAt ? new Date(b.createdAt) : null);
            const paymentDate = chargedAt ? dayjs(chargedAt) : dayjs(s.date);
            return {
              ...s,
              studentId: b.studentId,
              bookingCreatedAt: b.createdAt,
              paymentDate,
            };
          })
          .filter((s) => {
            // Keep only payments that happened within the selected time window
            const paymentDateStr = s.paymentDate.format("YYYY-MM-DD");
            return paymentDateStr >= fromStr && paymentDateStr <= toStr;
          }),
      );

      const allUsers = await User.find({
        role: { $in: ["Student", "Instructor"] }, // ✅ Only Students & Instructors
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

        // Active Users:
        // - Students: payment/charge date bucket (paid ≥ 1 lesson)
        // - Instructors: delivered lesson date bucket (delivered ≥ 1 paid lesson)
        const paidStudentBucketSlots = paidSlotsByPaymentDate.filter((s) => {
          return (
            (s.paymentDate.isAfter(bucketStart) ||
              s.paymentDate.isSame(bucketStart, "day")) &&
            (s.paymentDate.isBefore(bucketEnd) ||
              s.paymentDate.isSame(bucketEnd, "day"))
          );
        });

        // Other graphs keep using lesson date buckets
        const bucketSlots = slots.filter((s) => {
          return (
            (s.slotDate.isAfter(bucketStart) ||
              s.slotDate.isSame(bucketStart, "day")) &&
            (s.slotDate.isBefore(bucketEnd) ||
              s.slotDate.isSame(bucketEnd, "day"))
          );
        });

        // Delivered lessons (paid) = completed by status OR slot end has passed
        const deliveredBucketSlots = bucketSlots.filter(
          (s) =>
            s.status === "completed" || (s.slotEnd && !s.slotEnd.isAfter(now)),
        );

        // Students = paid for at least one lesson in the bucket (by payment date)
        const studentsSet = new Set(
          paidStudentBucketSlots.map((s) => s.studentId?._id.toString()),
        );
        // Instructors = delivered at least one paid lesson in the bucket
        const instructorsSet = new Set(
          deliveredBucketSlots.map((s) => s.instructorId?._id.toString()),
        );
        activeUsers.push({
          time: current.format(timeFormat),
          students: studentsSet.size,
          instructors: instructorsSet.size,
        });

        // Average Bookings per Instructor:
        // total paid lessons booked / number of active instructors (delivered >=1 paid lesson)
        const numBookings = bucketSlots.length;
        const numInstructors = instructorsSet.size;

        const averageBookings =
          numInstructors > 0 ? numBookings / numInstructors : 0;
        bookingsPerInstructor.push({
          time: current.format(timeFormat),
          averageBookings,
        });

        // Revenue & Earnings: use net instructor earnings (after DSP commission)
        const totalRevenueNet = deliveredBucketSlots.reduce(
          (sum, s) => sum + (s.instructorAmount || 0),
          0,
        );
        totalEarnings.push({
          time: current.format(timeFormat),
          totalEarnings: totalRevenueNet,
        });
        const averageRevenue =
          numInstructors > 0 ? totalRevenueNet / numInstructors : 0;
        averageRevenuePerInstructor.push({
          time: current.format(timeFormat),
          averageRevenue,
        });

        // Conversion Rates
        const bucketRegistrations = allUsers.filter(
          (u) => u.createdAt >= bucketStartDate && u.createdAt <= bucketEndDate,
        ).length;
        const bucketVisitors = allVisitors.filter(
          (v) =>
            v.firstVisit >= bucketStartDate && v.firstVisit <= bucketEndDate,
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
