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
]);

module.exports = typeDefs;
