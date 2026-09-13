/**
 * Helper: Returns true when an instructor is fully ready to receive paid bookings.
 * Rule: profile complete, Stripe onboarding verified and Stripe capabilities active.
 *
 * This is kept in a separate module so it can be reused across resolvers
 * without polluting the root GraphQL resolver map.
 */
const isInstructorPaymentReady = (instructor) => {
  if (!instructor) return false;
  const stripeAccount = instructor.stripeAccount || {};
  const stripeReady =
    stripeAccount.accountVersion === "v2"
      ? stripeAccount.recipientTransfersStatus === "active" &&
        stripeAccount.recipientPayoutsStatus === "active"
      : instructor.onboardingStatus === "verified" && instructor.isActive === true;
  return (
    instructor.isProfileComplete === true &&
    instructor.isActive === true &&
    instructor.onboardingStatus === "verified" &&
    stripeReady
  );
};

module.exports = {
  isInstructorPaymentReady,
};
