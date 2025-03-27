const TeacherAvailability = require("../../models/teacherAvailability.model");
const { startOfMonth, endOfMonth } = require("date-fns");

const resolvers = {
  Query: {
    teacherAvailability: async (_, { month }, { user }) => {
      if (!user) throw new Error("Not authenticated");

      try {
        const monthDate = new Date(month);
        const startDate = startOfMonth(monthDate);
        const endDate = endOfMonth(monthDate);

        const slots = await TeacherAvailability.find({
          teacherId: user.id,
        }).sort({ date: -1 });

        return slots.map((slot) => ({
          id: slot.id,
          date: slot.date.toISOString(),
          startTime: slot.startTime,
          endTime: slot.endTime,
        }));
      } catch (error) {
        throw new Error("Error fetching availability slots");
      }
    },
  },

  Mutation: {
    addAvailabilitySlot: async (_, { input }, { user }) => {
      if (!user) throw new Error("Not authenticated");

      try {
        const slot = await TeacherAvailability.create({
          teacherId: user.id,
          date: new Date(input.date),
          startTime: input.startTime,
          endTime: input.endTime,
        });

        return {
          id: slot._id,
          date: slot.date.toISOString(),
          startTime: slot.startTime,
          endTime: slot.endTime,
        };
      } catch (error) {
        throw new Error("Error adding availability slot");
      }
    },

    deleteAvailabilitySlot: async (_, { id }, { user }) => {
      if (!user) throw new Error("Not authenticated");

      try {
        const result = await TeacherAvailability.deleteOne({
          _id: id,
          teacherId: user.id,
        });

        return result.deletedCount > 0;
      } catch (error) {
        throw new Error("Error deleting availability slot");
      }
    },
  },
};

module.exports = resolvers;
