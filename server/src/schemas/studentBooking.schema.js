const { z } = require("zod");
const { Types } = require("mongoose");

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (value) => Types.ObjectId.isValid(value);

const slotSchema = z.object({
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  status: z.enum(["available", "booked", "cancelled"]).default("available"),
});

const paymentMethodSchema = z.object({
  type: z.enum(["card", "cash"]),
  cardNumber: z.string().optional(),
  paymentMethodId: z.string().optional(),
  cardLast4: z.string().optional(),
  cardBrand: z.string().optional(),
});

const studentBookingSchema = z.object({
  studentId: z.string().refine(isValidObjectId, {
    message: "Invalid student ID format",
  }),
  instructorId: z.string().refine(isValidObjectId, {
    message: "Invalid instructor ID format",
  }),
  slots: z.array(slotSchema).min(1, {
    message: "At least one slot must be selected",
  }),
  totalAmount: z.number().positive({
    message: "Total amount must be greater than 0",
  }),
  finalAmount: z.number().positive({
    message: "Total amount must be greater than 0",
  }),
  paymentMethod: paymentMethodSchema,
  status: z
    .enum(["pending", "confirmed", "cancelled", "completed"])
    .default("pending"),
});

module.exports = {
  studentBookingSchema,
};
