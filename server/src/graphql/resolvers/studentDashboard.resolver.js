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
      let upcomingLessonHours = 0; // hours of booked, not-yet-completed slots
      const instructorSet = new Set();
      const now = new Date();

      for (const booking of bookings) {
        for (const slot of booking.slots) {
          const active =
            slot.booked &&
            slot.status !== "cancelled" &&
            slot.status !== "refund";
          const slotEnd = new Date(`${slot.date}T${slot.endTime}:00`);
          const isCompleted = slot.status === "completed" || slotEnd <= now;

          if (slot.status !== "cancelled") totalLessons++;

          if (slot.booked) bookedLessons++;

          if (slot.status === "cancelled") cancelled++;

          if (slot.status === "semi_cancelled") semiCancelled++;

          // Current/upcoming = active and not yet completed
          if (active && !isCompleted) {
            currentBookings++;
            const durationMinutes =
              (slotEnd - new Date(`${slot.date}T${slot.startTime}:00`)) /
              (1000 * 60);
            upcomingLessonHours += durationMinutes / 60;
          }
        }

        instructorSet.add(booking.instructorId.toString());
      }

      // Remaining hours is a manual pedagogical estimate set by the instructor.
      // Do NOT auto-calculate from upcoming lessons; just surface the stored value.
      const lessonHoursLeft = student?.lessonHoursLeft;
      const remainingHours =
        lessonHoursLeft != null && String(lessonHoursLeft).trim() !== ""
          ? String(lessonHoursLeft)
          : "0";

      return {
        totalLessons,
        bookedLessons,
        cancelledLessons: cancelled,
        semiCancelledLessons: semiCancelled,
        currentBookings,
        totalInstructors: instructorSet.size,
        remainingHours,
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
          if (
            !slot.booked ||
            slot.status === "cancelled" ||
            slot.status === "refund"
          )
            continue;

          const slotDate = new Date(slot.date);
          const isThisWeek = slotDate >= startOfWeek && slotDate < endOfWeek;
          const slotEnd = new Date(`${slot.date}T${slot.endTime}:00`);
          const isCompleted = slot.status === "completed" || slotEnd <= now;

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
