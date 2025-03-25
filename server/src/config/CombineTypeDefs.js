const { mergeTypeDefs } = require("@graphql-tools/merge");

const userTypeDefs = require("../graphql/typeDefs");
const SignupLinkTypedef = require("../graphql/SignupLink/SignupLinkTypedef");
const tariffTypeDefs = require("../schemas/tariff.schema");
const availabilityTypeDefs = require("../graphql/typeDefs/availability");
const instructorTypeDefs = require("../graphql/typeDefs/instructorPublic.typeDefs");

const typeDefs = mergeTypeDefs([
  userTypeDefs,
  SignupLinkTypedef,
  tariffTypeDefs,
  availabilityTypeDefs,
  instructorTypeDefs,
]);
module.exports = typeDefs;
