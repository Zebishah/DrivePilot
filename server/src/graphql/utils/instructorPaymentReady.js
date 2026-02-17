/**
 * Helper: Returns true when an instructor is fully ready to receive paid bookings.
 * Rule: profile complete, Stripe onboarding verified and Stripe capabilities active.
 *
 * This is kept in a separate module so it can be reused across resolvers
 * without polluting the root GraphQL resolver map.
 */
const isInstructorPaymentReady = (instructor) => {
  if (!instructor) return false;
  return (
    instructor.isProfileComplete === true &&
    instructor.isActive === true &&
    instructor.onboardingStatus === "verified"
  );
};

module.exports = {
  isInstructorPaymentReady,
};
