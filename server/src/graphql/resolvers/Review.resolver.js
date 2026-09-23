const { default: mongoose } = require("mongoose");
const { Review } = require("../../models/Reviews");
const StudentBooking = require("../../models/studentBooking.model");
const { Student } = require("../../models/User");
const {
  requireBookingParticipantOrAdmin,
  requireRole,
  requireStudentDataAccess,
  identityId,
} = require("../../utils/authorization");
const { invalidateInstructorPublic } = require("../../services/cacheInvalidation");
const { recordBookingEvent } = require("../../services/bookingEventService");
const reviewResolver = {
  Query: {
    getAllStudentBookingSlots: async (_, __, { user }) => {
      requireRole(user, "Student");

      // Find all bookings for the instructor with booked slots
      const allBookings = await StudentBooking.find({
        studentId: user?.id,
        status: { $in: ["confirmed", "semi_cancelled", "completed", "refund"] },
        "slots.booked": true, // Only get bookings with booked slots
      })
        .populate("instructorId", "_id firstName lastName profileImage")
        .populate("studentId", "_id firstName lastName");

      const allSlots = [];
      let lessonCounter = 1;

      for (const booking of allBookings) {
        const bookedSlots = booking.slots.filter(
          (slot) =>
            slot.booked &&
            slot.status !== "cancelled" &&
            slot.status !== "refund",
        );

        for (const slot of bookedSlots) {
          const slotEndDateTime = new Date(`${slot.date}T${slot.endTime}:00`);
          const isCompleted = slot.status === "completed";

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
            slotId: slot._id,
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
        (a, b) => new Date(b.dateOfBooking) - new Date(a.dateOfBooking),
      );

      return allSlots;
    },
    getInstructorReviews: async (_, { instructorId }) => {
      const id = mongoose.Types.ObjectId.isValid(instructorId)
        ? new mongoose.Types.ObjectId(instructorId)
        : instructorId; // keep string if not valid ObjectId

      const reviews = await Review.find({ instructorId: id })
        .populate("studentId", "_id firstName lastName profileImage")
        .populate("instructorId", "_id firstName lastName profileImage")
        .sort({ createdAt: -1 });

      console.log(
        `Fetched ${reviews.length} reviews for instructor ${instructorId}`,
      );
      return reviews;
    },
    getAllReviews: async (_, __, { user }) => {
      requireRole(user, "Admin");
      return Review.find({})
        .populate("studentId", "_id firstName lastName profileImage")
        .populate("instructorId", "_id firstName lastName profileImage")
        .sort({ createdAt: -1 });
    },
    getStudentHoursProgress: async (_, { studentId }, { user }) => {
      try {
        await requireStudentDataAccess(user, studentId);
        const student = await Student.findById(studentId);
        if (!student) throw new Error("Student not found");

        const allBookings = await StudentBooking.find({
          studentId,
          status: { $in: ["confirmed", "semi_cancelled", "completed"] },
        }).populate("instructorId", "_id firstName lastName");

        const now = new Date();

        // Active slot = booked, not cancelled, not refund (same logic as elsewhere)
        const isActiveSlot = (slot) =>
          slot.booked &&
          slot.status !== "cancelled" &&
          slot.status !== "refund";
        const isSlotCompletedFn = (slot) => slot.status === "completed";

        let totalBookedSlots = 0;
        let completedSlots = 0;
        let pendingSlots = 0;
        let totalBookings = allBookings.length;
        let completedBookings = 0;
        let pendingBookings = 0;

        for (const booking of allBookings) {
          let bookingHasCompleted = false;
          let allSlotsCompleted = true;

          for (const slot of booking.slots) {
            if (!isActiveSlot(slot)) continue;

            totalBookedSlots++;
            const isSlotCompleted = isSlotCompletedFn(slot);

            if (isSlotCompleted) {
              completedSlots++;
              bookingHasCompleted = true;
            } else {
              pendingSlots++;
              allSlotsCompleted = false;
            }
          }

          if (bookingHasCompleted && allSlotsCompleted) {
            completedBookings++;
          } else {
            pendingBookings++;
          }
        }
        const totalRequiredHours = totalBookedSlots;

        // ✅ Parse student lesson hours safely
        const lessonHoursLeft = student.lessonHoursLeft
          ? parseFloat(student.lessonHoursLeft)
          : 0;

        const safeLessonHoursLeft = isNaN(lessonHoursLeft)
          ? 0
          : lessonHoursLeft;

        // ✅ Determine remaining hours
        // Use manual override if exists, else compute dynamically
        let remainingHours =
          safeLessonHoursLeft > 0
            ? safeLessonHoursLeft
            : Math.max(totalRequiredHours - completedSlots, 0);

        // ✅ Always keep result non-negative
        if (remainingHours < 0) remainingHours = Math.abs(remainingHours);

        // Completed hours = active slots explicitly marked completed
        let completedHours = 0;
        for (const booking of allBookings) {
          for (const slot of booking.slots) {
            if (isActiveSlot(slot) && isSlotCompletedFn(slot)) completedHours++;
          }
        }

        // ✅ Ensure completed hours don't exceed total
        // if (completedHours > totalRequiredHours) {
        //   completedHours = totalRequiredHours;
        // }

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
    getStudentReviews: async (_, { studentId }, { user }) => {
      await requireStudentDataAccess(user, studentId);
      const reviews = await Review.find({ studentId })
        .populate("studentId", "_id firstName lastName profileImage")
        .populate("instructorId", "_id firstName lastName profileImage")
        .sort({ createdAt: -1 });

      return reviews;
    },

    // Get specific review by lesson and slot
    getReviewByLessonSlot: async (_, { lessonId, slotId }, { user }) => {
      const booking = await StudentBooking.findById(lessonId).select(
        "studentId instructorId",
      );
      if (!booking) throw new Error("Associated booking not found");
      requireBookingParticipantOrAdmin(user, booking);
      const review = await Review.findOne({ lessonId, slotId })
        .populate("studentId", "_id firstName lastName profileImage")
        .populate("instructorId", "_id firstName lastName profileImage");

      return review;
    },
  },
  Mutation: {
    // Create a new review
    createReview: async (_, args, context) => {
      requireRole(context.user, "Student");

      const input = args.input;
      const rating = Number(input.reviewRating);
      const description = typeof input.reviewDescription === "string"
        ? input.reviewDescription.trim()
        : "";
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        throw new Error("Review rating must be between 1 and 5");
      }
      if (!description) {
        throw new Error("Review text cannot be empty");
      }
      if (identityId(context.user) !== String(input.studentId)) {
        throw new Error("Unauthorized: You can only review your own lessons");
      }

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

      if (lesson.studentId.toString() !== identityId(context.user)) {
        throw new Error("Unauthorized: You can only review your own lessons");
      }
      if (lesson.instructorId.toString() !== String(input.instructorId)) {
        throw new Error("Unauthorized: Review instructor does not match the lesson");
      }

      // Check if the slot exists and is booked
      const slotIndex = lesson.slots.findIndex(
        (s) => String(s._id || s.id) === String(input.slotId),
      );
      if (slotIndex === -1 || !lesson.slots[slotIndex].booked) {
        throw new Error("Slot not found or not booked");
      }

      // ✅ Time check
      const slot = lesson.slots[slotIndex];
      if (slot.status !== "completed") {
        throw new Error("Reviews are available only after the lesson is marked completed");
      }
      const slotEndDateTime = new Date(`${slot.date}T${slot.endTime}:00`);
      if (slotEndDateTime > new Date()) {
        throw new Error("Cannot review a lesson that is not yet completed");
      }

      // ✅ Create review
      const newReview = new Review({
        ...input,
        reviewRating: rating,
        reviewDescription: description,
        reviewStatus: "completed",
      });
      try {
        await newReview.save();
      } catch (error) {
        if (error?.code === 11000) {
          throw new Error("Review already exists for this lesson and slot");
        }
        throw error;
      }

      // ✅ Mark slot as reviewed
      lesson.slots[slotIndex].review = true;
      await lesson.save();
      await invalidateInstructorPublic(input.instructorId);
      await recordBookingEvent({
        booking: lesson,
        eventType: "review_submitted",
        actorId: context.user.id,
        actorRole: "Student",
        slotId: input.slotId,
        metadata: { rating: input.reviewRating },
      });

      // ✅ Populate review
      const populatedReview = await Review.findById(newReview._id)
        .populate("studentId", "_id firstName lastName profileImage")
        .populate("instructorId", "_id firstName lastName profileImage");

      return populatedReview;
    },

    // Update an existing review
    updateReview: async (_, { reviewId, input }, { user }) => {
      requireRole(user, "Student");

      const review = await Review.findById(reviewId);
      if (!review) {
        throw new Error("Review not found");
      }

      // Check if the user is the owner of the review
      if (review.studentId.toString() !== identityId(user)) {
        throw new Error("Unauthorized: You can only update your own reviews");
      }

      if (input.reviewRating !== undefined && (input.reviewRating < 1 || input.reviewRating > 5)) {
        throw new Error("Review rating must be between 1 and 5");
      }
      if (input.reviewDescription !== undefined && !input.reviewDescription.trim()) {
        throw new Error("Review text cannot be empty");
      }

      const booking = await StudentBooking.findById(review.lessonId);
      const slot = booking?.slots?.find(
        (item) => String(item._id || item.id) === String(review.slotId),
      );
      if (!booking || !slot || slot.status !== "completed") {
        throw new Error("Reviews can only be updated for completed lessons");
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
      await invalidateInstructorPublic(review.instructorId);

      // Return populated review
      const populatedReview = await Review.findById(reviewId)
        .populate("studentId", "_id firstName lastName profileImage")
        .populate("instructorId", "_id firstName lastName profileImage");

      return populatedReview;
    },

    // Delete a review
    deleteReview: async (_, { reviewId }, { user }) => {
      requireRole(user, "Student");

      // Fetch the review
      const review = await Review.findById(reviewId);
      if (!review) {
        throw new Error("Review not found");
      }

      // Check if the user owns the review
      if (review.studentId.toString() !== identityId(user)) {
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
      await invalidateInstructorPublic(review.instructorId);

      return {
        success: true,
        message: "Review deleted successfully and slot updated",
      };
    },
  },
};
module.exports = reviewResolver;
