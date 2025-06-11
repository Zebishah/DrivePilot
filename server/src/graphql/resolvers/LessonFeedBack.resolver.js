// feedbackResolvers.js
const { default: mongoose } = require("mongoose");
const Feedback = require("../../models/LessonFeedBack"); // Make sure this path is correct
const { User } = require("../../models/User");
const StudentBooking = require("../../models/studentBooking.model");
const feedbackResolvers = {
  Query: {
    getFeedbackByLessonId: async (_, { lessonId }, { user }) => {
      try {
        // Optional: Add authentication check
        if (!user) {
          throw new Error("Authentication required");
        }

        const feedback = await Feedback.findOne({
          lessonId,
          instructorId: user.id || user._id,
        });

        return feedback; // This can be null if no feedback exists
      } catch (error) {
        console.error("Error fetching feedback:", error);
        throw error;
      }
    },

    getAllFeedbacks: async (_, __, { user }) => {
      try {
        // Optional: Add authentication and authorization checks
        if (!user) {
          throw new Error("Authentication required");
        }

        // If user is instructor, show only their feedbacks
        // If user is admin/student, show all feedbacks (adjust as needed)
        const filter =
          user.role === "instructor"
            ? { instructorId: user.id || user._id }
            : {};

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
        // Authentication check
        if (!user) {
          throw new Error("Authentication required");
        }

        // Verify the user is authorized to create feedback for this lesson
        if (user.id !== input.instructorId && user._id !== input.instructorId) {
          throw new Error(
            "Unauthorized: You can only create feedback for yourself"
          );
        }

        // Validate required fields
        if (!input.lessonId || !input.instructorId || !input.instructorEmail) {
          throw new Error(
            "Missing required fields: lessonId, instructorId, or instructorEmail"
          );
        }

        if (!input.feedbackTags || input.feedbackTags.length === 0) {
          throw new Error("At least one feedback tag is required");
        }

        if (!input.title || !input.message) {
          throw new Error("Title and message are required");
        }

        // Check if feedback already exists for this lesson and instructor
        const existingFeedback = await Feedback.findOne({
          lessonId: input.lessonId,
          instructorId: input.instructorId,
        });

        if (existingFeedback) {
          // Update existing feedback instead of creating new one
          existingFeedback.feedbackTags = input.feedbackTags;
          existingFeedback.title = input.title;
          existingFeedback.message = input.message;
          existingFeedback.updatedAt = new Date();

          const updatedFeedback = await existingFeedback.save();

          // Ensure we return the complete object
          return {
            _id: updatedFeedback._id,
            lessonId: updatedFeedback.lessonId,
            instructorId: updatedFeedback.instructorId,
            instructorEmail: updatedFeedback.instructorEmail,
            feedbackTags: updatedFeedback.feedbackTags,
            title: updatedFeedback.title,
            message: updatedFeedback.message,
            createdAt: updatedFeedback.createdAt.toISOString(),
          };
        }

        // Create new feedback
        const feedback = new Feedback({
          lessonId: input.lessonId,
          instructorId: input.instructorId,
          instructorEmail: input.instructorEmail,
          feedbackTags: input.feedbackTags,
          title: input.title,
          message: input.message,
        });

        const savedFeedback = await feedback.save();

        const lessonObjectId = new mongoose.Types.ObjectId(input.lessonId);

        const updatedBooking = await StudentBooking.findOneAndUpdate(
          { _id: lessonObjectId },
          { $set: { feedBackStatus: "completed" } },
          { new: true }
        );

        await updatedBooking.save();

        // Ensure we return the complete object
        return {
          _id: savedFeedback._id,
          lessonId: savedFeedback.lessonId,
          instructorId: savedFeedback.instructorId,
          instructorEmail: savedFeedback.instructorEmail,
          feedbackTags: savedFeedback.feedbackTags,
          title: savedFeedback.title,
          message: savedFeedback.message,
          createdAt: savedFeedback.createdAt.toISOString(),
        };
      } catch (error) {
        console.error("Error creating/updating feedback:", error);
        // Re-throw the error with more context
        throw new Error(`Failed to create/update feedback: ${error.message}`);
      }
    },
    updateFeedback: async (_, { input }, { user }) => {
      try {
        if (!user) {
          throw new Error("Authentication required");
        }

        const feedback = await Feedback.findById(input.feedbackId);
        if (!feedback) {
          throw new Error("Feedback not found");
        }

        // Ensure the user is the original instructor
        if (
          user.id !== feedback.instructorId?.toString() &&
          user._id !== feedback.instructorId?.toString()
        ) {
          throw new Error(
            "Unauthorized: You can only update your own feedback"
          );
        }

        // Update the feedback
        feedback.feedbackTags = input.feedbackTags;
        feedback.title = input.title;
        feedback.message = input.message;
        feedback.updatedAt = new Date();

        const updatedFeedback = await feedback.save();

        return {
          _id: updatedFeedback._id,
          lessonId: updatedFeedback.lessonId,
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
        if (!user) {
          throw new Error("Authentication required");
        }

        const feedback = await Feedback.findById(feedbackId);
        if (!feedback) {
          throw new Error("Feedback not found");
        }

        // Ensure the user is the original instructor
        if (
          user.id !== feedback.instructorId?.toString() &&
          user._id !== feedback.instructorId?.toString()
        ) {
          throw new Error(
            "Unauthorized: You can only delete your own feedback"
          );
        }

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
