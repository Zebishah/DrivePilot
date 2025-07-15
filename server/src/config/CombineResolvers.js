const { mergeResolvers } = require("@graphql-tools/merge");

const userResolvers = require("../graphql/resolvers");
const SignupLinkResolver = require("../graphql/SignupLink/SignupLinkResolver");
const tariffResolvers = require("../graphql/resolvers/tariff.resolver");
const availabilityResolvers = require("../graphql/resolvers/availability.resolver");
const instructorResolver = require("../graphql/resolvers/instructorPublic.resolver");
const studentResolver = require("../graphql/resolvers/student.resolver");
const studentBookingResolver = require("../graphql/resolvers/studentBooking.resolver");
const contactDetailResolvers = require("../graphql/resolvers/ContactDetail.resolver");
const FaqsResolver = require("../graphql/resolvers/Faqs.resolver");
const feedbackResolvers = require("../graphql/resolvers/LessonFeedBack.resolver");
const reviewResolver = require("../graphql/resolvers/Review.resolver");
const studentDashboardResolver = require("../graphql/resolvers/studentDashboard.resolver");
const resolvers = mergeResolvers([
  userResolvers,
  SignupLinkResolver,
  tariffResolvers,
  availabilityResolvers,
  instructorResolver,
  studentResolver,
  studentBookingResolver,
  contactDetailResolvers,
  FaqsResolver,
  feedbackResolvers,
  reviewResolver,
  studentDashboardResolver,
]);

module.exports = resolvers;
