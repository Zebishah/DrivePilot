const { mergeResolvers } = require("@graphql-tools/merge");

const UserResolvers = require("../graphql/resolvers");
const SignupLinkResolver = require("../graphql/SignupLink/SignupLinkResolver");

const resolvers = mergeResolvers([UserResolvers, SignupLinkResolver]);

module.exports = resolvers;
