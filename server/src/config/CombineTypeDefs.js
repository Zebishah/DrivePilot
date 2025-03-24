const { mergeTypeDefs } = require("@graphql-tools/merge");

const userTypeDefs = require("../graphql/typeDefs");
const SignupLinkTypedef = require("../graphql/SignupLink/SignupLinkTypedef");
const tariffTypeDefs = require("../schemas/tariff.schema");

const typeDefs = mergeTypeDefs([userTypeDefs, SignupLinkTypedef, tariffTypeDefs]);
module.exports = typeDefs;
