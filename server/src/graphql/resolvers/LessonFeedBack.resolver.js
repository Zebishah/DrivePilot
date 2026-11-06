// feedbackResolvers.js
const { default: mongoose } = require("mongoose");
const Feedback = require("../../models/LessonFeedBack"); // Make sure this path is correct
const { User, Student, Instructor } = require("../../models/User");
const StudentBooking = require("../../models/studentBooking.model");
const {
  requireAuthenticatedUser,
  requireRole,
  requireBookingParticipantOrAdmin,
  identityId,
} = require("../../utils/authorization");
const feedbackResolvers = {
  Query: {
    getFeedbackByLessonId: async (_, { lessonId }, { user }) => {
      try {
        requireAuthenticatedUser(user);
        const feedback = await Feedback.findOne({ lessonId });
        if (!feedback) return null;

        const booking = await StudentBooking.findById(feedback.bookingId).select(
          "studentId instructorId",
        );
        if (!booking) throw new Error("Associated booking not found");
        requireBookingParticipantOrAdmin(user, booking);

        return feedback; // This can be null if no feedback exists
      } catch (error) {
        console.error("Error fetching feedback:", error);
        throw error;
      }
    },

    getAllFeedbacks: async (_, __, { user }) => {
      try {
        requireAuthenticatedUser(user);
        const filter =
          user.role === "Admin"
            ? {}
            : user.role === "Instructor"
              ? { instructorId: identityId(user) }
              : user.role === "Student"
                ? { studentId: identityId(user) }
                : null;
        if (!filter) throw new Error("Not authorized");

        const feedbacks = await Feedback.find(filter).sort({ createdAt: -1 });

        return feedbacks || []; // Ensure we return an array
      } catch (error) {
        console.error("Error fetching all feedbacks:", error);
        throw error;
      }
    },
  },

  Mutation: {
    createFeedback: async (_, { input }, { user }) => {
      try {
        requireRole(user, "Instructor");

        if (identityId(user) !== String(input.instructorId)) {
          throw new Error(
            "Unauthorized: You can only create feedback for yourself"
          );
        }

        if (!input.lessonId || !input.instructorId || !input.instructorEmail) {
          throw new Error(
            "Missing required fields: lessonId, instructorId, or instructorEmail"
          );
        }

        if (!input.feedbackTags || input.feedbackTags.length === 0) {
          throw new Error("At least one feedback tag is required");
        }

        if (!input.hoursRemaining || !input.message) {
          throw new Error("Title and message are required");
        }
        // Get the booking to retrieve studentId
        const lessonObjectId = new mongoose.Types.ObjectId(input.bookingId);
        const booking = await StudentBooking.findById(lessonObjectId);
        if (!booking) throw new Error("Booking not found");
        const instructor = await Instructor.findById(
          input.instructorId || user.id
        );
        if (!instructor) throw new Error("Instructor not found");

        const studentId = booking.studentId;

        // Update lessonHoursLeft on student
        if (studentId) {
          await Student.findByIdAndUpdate(studentId, {
            $set: { lessonHoursLeft: input.hoursRemaining },
          });
        }

        // Upsert on the database uniqueness key. This preserves the existing
        // create-or-update behavior while avoiding a read-before-create race.
        const savedFeedback = await Feedback.findOneAndUpdate(
          {
            lessonId: input.lessonId,
            bookingId: input.bookingId,
            instructorId: input.instructorId,
          },
          {
            $set: {
              instructorEmail: input.instructorEmail,
              feedbackTags: input.feedbackTags,
              hoursRemaining: input.hoursRemaining,
              message: input.message,
              studentId,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              lessonId: input.lessonId,
              bookingId: input.bookingId,
              instructorId: input.instructorId,
            },
          },
          { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
        );
        await StudentBooking.updateOne(
          { _id: input.bookingId, "slots._id": input.lessonId },
          { $set: { "slots.$.feedBackStatus": "completed" } }
        );

        return {
          _id: savedFeedback._id,
          lessonId: savedFeedback.lessonId,
          bookingId: savedFeedback.bookingId,
          instructorId: savedFeedback.instructorId,
          instructorEmail: savedFeedback.instructorEmail,
          feedbackTags: savedFeedback.feedbackTags,
          hoursRemaining: savedFeedback.hoursRemaining,
          message: savedFeedback.message,
          createdAt: savedFeedback.createdAt.toISOString(),
        };
      } catch (error) {
        console.error("Error creating/updating feedback:", error);
        throw new Error(`Failed to create/update feedback: ${error.message}`);
      }
    },

    updateFeedback: async (_, { input }, { user }) => {
      try {
        requireRole(user, "Instructor");

        const feedback = await Feedback.findById(input.feedbackId);
        if (!feedback) throw new Error("Feedback not found");

        if (
          identityId(user) !== feedback.instructorId?.toString()
        ) {
          throw new Error(
            "Unauthorized: You can only update your own feedback"
          );
        }

        // Update student hours left if studentId is in feedback
        if (feedback.studentId) {
          await Student.findByIdAndUpdate(feedback.studentId, {
            $set: { lessonHoursLeft: input.hoursRemaining },
          });
        }

        feedback.feedbackTags = input.feedbackTags;
        feedback.title = input.title;
        feedback.message = input.message;
        feedback.hoursRemaining = input.hoursRemaining;
        feedback.updatedAt = new Date();

        const updatedFeedback = await feedback.save();

        return {
          _id: updatedFeedback._id,
          lessonId: updatedFeedback.lessonId,
          bookingId: updatedFeedback.bookingId,
          hoursRemaining: updatedFeedback.hoursRemaining,
          instructorId: updatedFeedback.instructorId,
          instructorEmail: updatedFeedback.instructorEmail,
          feedbackTags: updatedFeedback.feedbackTags,
          title: updatedFeedback.title,
          message: updatedFeedback.message,
          createdAt: updatedFeedback.createdAt.toISOString(),
        };
      } catch (error) {
        console.error("Error updating feedback:", error);
        throw new Error(`Failed to update feedback: ${error.message}`);
      }
    },

    deleteFeedback: async (_, { feedbackId }, { user }) => {
      try {
        requireRole(user, "Instructor");

        const feedback = await Feedback.findById(feedbackId);
        if (!feedback) {
          throw new Error("Feedback not found");
        }

        // Ensure the user is the original instructor
        if (
          identityId(user) !== feedback.instructorId?.toString()
        ) {
          throw new Error(
            "Unauthorized: You can only delete your own feedback"
          );
        }
        await StudentBooking.updateOne(
          { _id: feedback.bookingId, "slots._id": feedback.lessonId },
          { $set: { "slots.$.feedBackStatus": "pending" } }
        );

        await Feedback.findByIdAndDelete(feedbackId);
        return true;
      } catch (error) {
        console.error("Error deleting feedback:", error);
        throw new Error(`Failed to delete feedback: ${error.message}`);
      }
    },
  },

  // Type resolvers to ensure proper formatting
  Feedback: {
    _id: (feedback) => feedback._id.toString(),
    lessonId: (feedback) => feedback.lessonId.toString(),
    instructorId: (feedback) => feedback.instructorId.toString(),
  },
};

module.exports = feedbackResolvers;
