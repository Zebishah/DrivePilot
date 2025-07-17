const { Review } = require("../../models/Reviews");
const StudentBooking = require("../../models/studentBooking.model");
const { Student } = require("../../models/User");
const { validateUser } = require("../../utils/auth");
const reviewResolver = {
  Query: {
    getAllStudentBookingSlots: async (_, __, { user }) => {
      validateUser(user);

      const now = new Date();

      // Find all bookings for the instructor with booked slots
      const allBookings = await StudentBooking.find({
        studentId: user?.id,
        status: { $in: ["confirmed", "semi_cancelled"] },
        "slots.booked": true, // Only get bookings with booked slots
      })
        .populate("instructorId", "_id firstName lastName profileImage")
        .populate("studentId", "_id firstName lastName");

      // Get all reviews for this instructor
      const reviews = await Review.find({
        instructorId: user?.id,
      });

      const allSlots = [];
      let lessonCounter = 1;

      for (const booking of allBookings) {
        const bookedSlots = booking.slots.filter(
          (slot) => slot.booked === true
        );

        for (const slot of bookedSlots) {
          const slotEndDateTime = new Date(`${slot.date}T${slot.endTime}:00`);
          const isCompleted = slotEndDateTime <= now;

          const isReviewed = slot.review === true;

          allSlots.push({
            lessonNumber: `Lesson${lessonCounter}`,
            lessonId: booking._id,
            instructorName: `${booking.instructorId.firstName} ${booking.instructorId.lastName}`,
            instructorId: booking.instructorId._id,
            profileImage: booking.instructorId.profileImage,
            studentId: booking.studentId._id,
            dateOfBooking: slot.date,
            slotStatus: slot.status,
            isCompleted,
            isReviewed,
            slotId: slot.id,
            slotDetails: {
              date: slot.date,
              startTime: slot.startTime,
              endTime: slot.endTime,
              status: slot.status,
            },
          });

          lessonCounter++;
        }
      }

      // Sort by date (most recent first)
      allSlots.sort(
        (a, b) => new Date(b.dateOfBooking) - new Date(a.dateOfBooking)
      );

      return allSlots;
    },
    getInstructorReviews: async (_, { instructorId }) => {
      const reviews = await Review.find({ instructorId })
        .populate("studentId", "_id firstName lastName profileImage")
        .populate("instructorId", "_id firstName lastName profileImage")
        .sort({ createdAt: -1 });

      return reviews;
    },
    getStudentHoursProgress: async (_, { studentId }) => {
      try {
        console.log("Fetching student information...", studentId);

        const student = await Student.findById(studentId);
        if (!student) throw new Error("Student not found");

        const allBookings = await StudentBooking.find({
          studentId,
          status: { $in: ["confirmed", "semi_cancelled", "completed"] },
        }).populate("instructorId", "_id firstName lastName");

        const now = new Date();

        let totalBookedSlots = 0;
        let completedSlots = 0;
        let pendingSlots = 0;
        let totalBookings = allBookings.length;
        let completedBookings = 0;
        let pendingBookings = 0;

        for (const booking of allBookings) {
          let bookingBookedSlots = 0;
          let bookingCompletedSlots = 0;
          let bookingHasCompleted = false;
          let allSlotsCompleted = true;

          for (const slot of booking.slots) {
            if (slot.booked) {
              totalBookedSlots++;
              bookingBookedSlots++;

              const slotEndDateTime = new Date(
                `${slot.date}T${slot.endTime}:00`
              );
              const isSlotCompleted = slotEndDateTime <= now;

              if (isSlotCompleted) {
                completedSlots++;
                bookingCompletedSlots++;
                bookingHasCompleted = true;
              } else {
                pendingSlots++;
                allSlotsCompleted = false;
              }
            }
          }

          if (bookingHasCompleted && allSlotsCompleted) {
            completedBookings++;
          } else {
            pendingBookings++;
          }
        }

        const totalRequiredHours = totalBookedSlots; // Each slot = 1 hour

        const lessonHoursLeft = student.lessonHoursLeft
          ? parseFloat(student.lessonHoursLeft)
          : null;

        const remainingHours =
          lessonHoursLeft !== null
            ? lessonHoursLeft
            : Math.max(0, totalRequiredHours - completedHours);
        const completedHours = remainingHours - totalRequiredHours;
        return {
          totalRequiredHours,
          completedHours,
          remainingHours,
          studentInfo: {
            _id: student._id,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            profileImage: student.profileImage || "",
            lessonHoursLeft: student.lessonHoursLeft || "0",
          },
          bookingsBreakdown: {
            totalBookings,
            completedBookings,
            pendingBookings,
            totalBookedSlots,
            completedSlots,
            pendingSlots,
          },
        };
      } catch (error) {
        console.error("Error in getStudentHoursProgress:", error);
        throw new Error("Failed to fetch student hours progress");
      }
    },

    // Get all reviews by a specific student
    getStudentReviews: async (_, { studentId }) => {
      const reviews = await Review.find({ studentId })
        .populate("studentId", "_id firstName lastName profileImage")
        .populate("instructorId", "_id firstName lastName profileImage")
        .sort({ createdAt: -1 });

      return reviews;
    },

    // Get specific review by lesson and slot
    getReviewByLessonSlot: async (_, { lessonId, slotId }) => {
      const review = await Review.findOne({ lessonId, slotId })
        .populate("studentId", "_id firstName lastName profileImage")
        .populate("instructorId", "_id firstName lastName profileImage");

      return review;
    },
  },
  Mutation: {
    // Create a new review
    createReview: async (_, args, context) => {
      validateUser(context.user);

      const input = args.input;

      // Check if review already exists for this lesson and slot
      const existingReview = await Review.findOne({
        lessonId: input.lessonId,
        slotId: input.slotId,
        studentId: input.studentId,
      });

      if (existingReview) {
        throw new Error("Review already exists for this lesson and slot");
      }

      // Validate that the lesson exists and belongs to the student
      const lesson = await StudentBooking.findById(input.lessonId);
      if (!lesson) {
        throw new Error("Lesson not found");
      }

      if (lesson.studentId.toString() !== input.studentId) {
        throw new Error("Unauthorized: You can only review your own lessons");
      }

      // Check if the slot exists and is booked
      const slotIndex = lesson.slots.findIndex((s) => s.id === input.slotId);
      if (slotIndex === -1 || !lesson.slots[slotIndex].booked) {
        throw new Error("Slot not found or not booked");
      }

      // ✅ Time check
      const slot = lesson.slots[slotIndex];
      const slotEndDateTime = new Date(`${slot.date}T${slot.endTime}:00`);
      if (slotEndDateTime > new Date()) {
        throw new Error("Cannot review a lesson that is not yet completed");
      }

      // ✅ Create review
      const newReview = new Review({
        ...input,
        reviewStatus: "completed",
      });
      await newReview.save();

      // ✅ Mark slot as reviewed
      lesson.slots[slotIndex].review = true;
      await lesson.save();

      // ✅ Populate review
      const populatedReview = await Review.findById(newReview._id)
        .populate("studentId", "_id firstName lastName profileImage")
        .populate("instructorId", "_id firstName lastName profileImage");

      return populatedReview;
    },

    // Update an existing review
    updateReview: async (_, { reviewId, input }, { user }) => {
      validateUser(user);

      const review = await Review.findById(reviewId);
      if (!review) {
        throw new Error("Review not found");
      }

      // Check if the user is the owner of the review
      if (review.studentId.toString() !== user.id) {
        throw new Error("Unauthorized: You can only update your own reviews");
      }

      // Update the review
      if (input.reviewRating !== undefined) {
        review.reviewRating = input.reviewRating;
      }
      if (input.reviewDescription !== undefined) {
        review.reviewDescription = input.reviewDescription;
      }

      review.updatedAt = new Date();
      await review.save();

      // Return populated review
      const populatedReview = await Review.findById(reviewId)
        .populate("studentId", "_id firstName lastName profileImage")
        .populate("instructorId", "_id firstName lastName profileImage");

      return populatedReview;
    },

    // Delete a review
    deleteReview: async (_, { reviewId }, { user }) => {
      validateUser(user);

      // Fetch the review
      const review = await Review.findById(reviewId);
      if (!review) {
        throw new Error("Review not found");
      }

      // Check if the user owns the review
      if (review.studentId.toString() !== user.id) {
        throw new Error("Unauthorized: You can only delete your own reviews");
      }

      // Step 1: Update the corresponding slot in StudentBooking
      const { lessonId, slotId } = review;

      const booking = await StudentBooking.findById(lessonId);
      if (!booking) {
        throw new Error("Associated booking not found");
      }

      const slotIndex = booking.slots.findIndex((s) => s.id === slotId);
      if (slotIndex === -1) {
        throw new Error("Associated slot not found in booking");
      }

      // Reset review field on that slot
      booking.slots[slotIndex].review = false;
      await booking.save();

      // Step 2: Delete the review
      await Review.findByIdAndDelete(reviewId);

      return {
        success: true,
        message: "Review deleted successfully and slot updated",
      };
    },
  },
};
module.exports = reviewResolver;
