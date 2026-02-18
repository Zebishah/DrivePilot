const { mergeTypeDefs } = require("@graphql-tools/merge");

const userTypeDefs = require("../graphql/typeDefs");
const SignupLinkTypedef = require("../graphql/SignupLink/SignupLinkTypedef");
const tariffTypeDefs = require("../schemas/tariff.schema");
const availabilityTypeDefs = require("../graphql/typeDefs/availability");
const instructorTypeDefs = require("../graphql/typeDefs/instructorPublic.typeDefs");
const studentTypeDefs = require("../graphql/typeDefs/student.typeDefs");
const studentBookingTypeDefs = require("../graphql/typeDefs/studentBooking.typeDefs");
const contactDetailType = require("../graphql/typeDefs/AdminContactTypes");
const faqTypeDefs = require("../graphql/typeDefs/Faq'sTypes");
const LessonFeedbackTypeDefs = require("../graphql/typeDefs/LessonFeedbackTypes");
const reviewTypeDefs = require("../graphql/typeDefs/ReviewTypes");
const studentDashboardTypeDefs = require("../graphql/typeDefs/studentDashboard");
const chatTypeDefs = require("../graphql/typeDefs/chat.typeDefs");
const VisitorTypeDefs = require("../graphql/typeDefs/VisitorsTypes");
const AdminAnalyticsTypeDefs = require("../graphql/typeDefs/AdminOverallAnalyticsTypes");
const AdminBookingTypeDefs = require("../graphql/typeDefs/AdminBookingType");
const TransactionTypeDefs = require("../graphql/typeDefs/transaction.typeDefs");
const typeDefs = mergeTypeDefs([
  userTypeDefs,
  SignupLinkTypedef,
  tariffTypeDefs,
  availabilityTypeDefs,
  instructorTypeDefs,
  studentTypeDefs,
  studentBookingTypeDefs,
  contactDetailType,
  faqTypeDefs,
  LessonFeedbackTypeDefs,
  reviewTypeDefs,
  studentDashboardTypeDefs,
  chatTypeDefs,
  VisitorTypeDefs,
  AdminAnalyticsTypeDefs,
  AdminBookingTypeDefs,
  TransactionTypeDefs,
]);

module.exports = typeDefs;
