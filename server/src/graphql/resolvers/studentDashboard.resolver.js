const LessonFeedBack = require("../../models/LessonFeedBack");
const { Review } = require("../../models/Reviews");
const studentBookingModel = require("../../models/studentBooking.model");
const StudentBooking = require("../../models/studentBooking.model");
const teacherAvailabilityModel = require("../../models/teacherAvailability.model");
const { Student } = require("../../models/User");
const { validateUser } = require("../../utils/auth");
const { Feedback } = require("./LessonFeedBack.resolver");
const studentDashboardResolver = {
  Query: {
    getStudentDashboardStats: async (_, { studentId }) => {
      const [bookings, student] = await Promise.all([
        studentBookingModel.find({ studentId }),
        Student.findById(studentId),
      ]);

      let totalLessons = 0;
      let bookedLessons = 0;
      let cancelled = 0;
      let semiCancelled = 0;
      let currentBookings = 0;
      const instructorSet = new Set();

      for (const booking of bookings) {
        for (const slot of booking.slots) {
          totalLessons++; // Count all slots

          if (slot.booked) bookedLessons++;

          if (slot.status === "cancelled") cancelled++;

          if (slot.status === "semi_cancelled") semiCancelled++;

          if (slot.booked && slot.status === "booked") currentBookings++; // ✅ Fixed
        }

        instructorSet.add(booking.instructorId.toString());
      }

      return {
        totalLessons,
        bookedLessons,
        cancelledLessons: cancelled,
        semiCancelledLessons: semiCancelled,
        currentBookings, // ✅ Accurate now
        totalInstructors: instructorSet.size,
        remainingHours: student?.lessonHoursLeft || 0,
      };
    },

    getStudentLesson: async (_, { studentId }) => {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      const bookings = await StudentBooking.find({
        studentId,
        "slots.booked": true,
      })
        .populate("instructorId", "firstName lastName")
        .lean();

      const allLessons = [];

      for (const booking of bookings) {
        for (const slot of booking.slots) {
          if (!slot.booked) continue;

          const slotDate = new Date(slot.date);
          const isThisWeek = slotDate >= startOfWeek && slotDate < endOfWeek;
          const slotEnd = new Date(`${slot.date}T${slot.endTime}:00`);
          const isCompleted = slotEnd <= now;

          allLessons.push({
            lessonId: booking._id,
            instructorId: booking.instructorId._id,
            instructorName: `${booking.instructorId.firstName} ${booking.instructorId.lastName}`,
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            slotStatus: slot.status,
            isCompleted,
            isReviewed: slot.review === true,
            isThisWeek,
          });
        }
      }

      return allLessons;
    },
    getStudentFeedbacks: async (_, { studentId }) => {
      const feedbacks = await LessonFeedBack.find({ studentId }).lean();
      return feedbacks;
    },
  },
  Mutation: {
    // Create a new review
  },
};
module.exports = studentDashboardResolver;
