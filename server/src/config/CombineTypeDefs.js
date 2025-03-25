const { mergeTypeDefs } = require("@graphql-tools/merge");

const userTypeDefs = require("../graphql/typeDefs");
const SignupLinkTypedef = require("../graphql/SignupLink/SignupLinkTypedef");
const tariffTypeDefs = require("../schemas/tariff.schema");
const availabilityTypeDefs = require("../graphql/typeDefs/availability");

const typeDefs = mergeTypeDefs([userTypeDefs, SignupLinkTypedef, tariffTypeDefs, availabilityTypeDefs]);
module.exports = typeDefs;
