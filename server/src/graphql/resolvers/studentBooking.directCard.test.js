const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

test("createBooking completes the direct-card path with commission settings in scope", async () => {
  let paymentIntentArgs;
  const savedBookings = [];

  class FakeStudentBooking {
    constructor(payload) {
      Object.assign(this, payload);
      this._id = "booking-1";
      this.save = async () => {
        savedBookings.push(this);
        return this;
      };
    }

    static find() {
      return [];
    }

    static findById() {
      const booking = savedBookings[0];
      return {
        populate() {
          return this;
        },
        then(resolve, reject) {
          return Promise.resolve(booking).then(resolve, reject);
        },
      };
    }
  }

  const fakeInstructor = {
    _id: "instructor-1",
    firstName: "Test",
    lastName: "Instructor",
    stripeAccount: { accountId: "acct_test" },
  };
  const fakeAdmin = {
    platformCommission: { defaultRate: 20, defaultType: "percentage" },
  };
  const fakeUserModels = {
    User: {},
    Instructor: {
      findById: () => ({ lean: async () => fakeInstructor }),
    },
    Admin: {
      findOne: () => ({ lean: async () => fakeAdmin }),
    },
  };
  const fakeStripeService = {
    getCommissionSplit: (amount) => ({
      dspCommission: amount * 0.2,
      instructorAmount: amount * 0.8,
    }),
    createPaymentIntentForBooking: async (args) => {
      paymentIntentArgs = args;
      return {
        paymentIntentId: "pi_test_direct_card",
        status: "succeeded",
      };
    },
    getTransferIdFromPaymentIntent: async () => "tr_test",
    getChargeIdFromPaymentIntent: async () => "ch_test",
    DEFAULT_CURRENCY: "chf",
    CENTIMES_PER_UNIT: 100,
    FRONTEND_BASE: "http://localhost:5173",
  };

  const originalLoad = Module._load;
  Module._load = function mockedLoad(request, parent, isMain) {
    if (request.endsWith("/models/studentBooking.model")) {
      return FakeStudentBooking;
    }
    if (request.endsWith("/models/User")) return fakeUserModels;
    if (request.endsWith("/models/teacherAvailability.model")) {
      return { findOne: async () => null };
    }
    if (request.endsWith("/models/teacherTariff.model")) return {};
    if (request.endsWith("/utils/SendOtpEmail")) {
      return { notifyBookingParties: async () => {}, sendBookingEmail: async () => {} };
    }
    if (request.endsWith("/socket")) return { getIOInstance: () => null };
    if (request.endsWith("/services/transactionService")) {
      return { createTransaction: async () => ({}) };
    }
    if (request.endsWith("/utils/instructorPaymentReady")) {
      return { isInstructorPaymentReady: () => true };
    }
    if (request.endsWith("/services/finalizePaidCheckoutBooking")) return {};
    if (request.endsWith("/services/stripeService")) return fakeStripeService;
    if (request.endsWith("/schemas/studentBooking.schema")) {
      return { studentBookingSchema: { parse: (input) => input } };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const resolver = require("./studentBooking.resolver");
    const result = await resolver.Mutation.createBooking(
      null,
      {
        input: {
          studentId: "client-supplied-id-is-overridden",
          instructorId: "instructor-1",
          totalAmount: 100,
          finalAmount: 100,
          paymentMethod: { type: "card", paymentMethodId: "pm_test" },
          slots: [
            { date: "2030-01-01", startTime: "09:00", endTime: "10:00" },
            { date: "2030-01-02", startTime: "09:00", endTime: "10:00" },
          ],
        },
      },
      { user: { id: "student-1", role: "Student" } },
    );

    assert.equal(result.booking.stripePaymentIntentId, "pi_test_direct_card");
    assert.equal(result.booking.studentId, "student-1");
    assert.equal(result.booking.slots[0].dspCommission, 10);
    assert.equal(result.booking.slots[0].instructorAmount, 40);
    assert.equal(result.booking.slots[1].dspCommission, 10);
    assert.equal(result.booking.slots[1].instructorAmount, 40);
    assert.equal(paymentIntentArgs.metadata.studentId, "student-1");
    assert.equal(paymentIntentArgs.metadata.instructorId, "instructor-1");
    assert.match(paymentIntentArgs.metadata.paymentCorrelationId, /^[a-f0-9]{24}$/);
  } finally {
    Module._load = originalLoad;
  }
});
