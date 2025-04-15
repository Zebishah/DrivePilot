const { studentBookingSchema } = require('../../schemas/studentBooking.schema');
const StudentBooking = require('../../models/studentBooking.model');
const { AuthenticationError, UserInputError } = require('apollo-server-express');
const { validateUser } = require('../../utils/auth');

const studentBookingResolver = {
  Query: {
    getStudentBookings: async (_, __, { user }) => {
      validateUser(user);
      return await StudentBooking.find({ studentId: user.id })
        .populate('instructorId', '_id firstName lastName email description')
        .sort({ createdAt: -1 });
    },
    
    getInstructorBookings: async (_, __, { user }) => {
      validateUser(user);
      return await StudentBooking.find({ instructorId: user.id })
        .populate('studentId', '_id firstName lastName email description')
        .sort({ createdAt: -1 });
    }
  },

  Mutation: {
    createBooking: async (_, { input }, { user }) => {
      validateUser(user);
      try {
      
        const validatedInput = studentBookingSchema.parse({
          ...input,
          studentId: user.id,
        });
            
        const booking = new StudentBooking(validatedInput);
        await booking.save();
      
        await booking.populate('instructorId', '_id firstName lastName email description');
      
        return booking;
      } catch (error) {
        console.error('Booking creation error:', error);
        if (error.errors) {
          throw new UserInputError('Invalid input', { errors: error.errors });
        }
        throw error;
      }
    },

    updateBookingStatus: async (_, { bookingId, status }, { user }) => {
      validateUser(user);
      const booking = await StudentBooking.findById(bookingId);
      if (!booking) {
        throw new UserInputError('Booking not found');
      }
      if (booking.instructorId.toString() !== user.id.toString()) {
        throw new AuthenticationError('Not authorized to update this booking');
      }
      booking.status = status;
      await booking.save();
      return booking;
    },

    cancelBooking: async (_, { bookingId }, { user }) => {
      validateUser(user);
      const booking = await StudentBooking.findById(bookingId);
      if (!booking) {
        throw new UserInputError('Booking not found');
      }
      if (
        booking.studentId.toString() !== user.id.toString() &&
        booking.instructorId.toString() !== user.id.toString()
      ) {
        throw new AuthenticationError('Not authorized to cancel this booking');
      }
      booking.status = 'cancelled';
      await booking.save();
      return booking;
    }
  }
};

module.exports = studentBookingResolver;