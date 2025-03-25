const { mergeResolvers } = require("@graphql-tools/merge");

const userResolvers = require("../graphql/resolvers");
const SignupLinkResolver = require("../graphql/SignupLink/SignupLinkResolver");
const tariffResolvers = require("../graphql/resolvers/tariff.resolver");
const availabilityResolvers = require("../graphql/resolvers/availability.resolver");

const resolvers = mergeResolvers([userResolvers, SignupLinkResolver, tariffResolvers, availabilityResolvers]);

module.exports = resolvers;
