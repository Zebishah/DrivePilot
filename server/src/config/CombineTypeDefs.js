const { mergeTypeDefs } = require("@graphql-tools/merge");

const userTypeDefs = require("../graphql/typeDefs");
const SignupLinkTypedef = require("../graphql/SignupLink/SignupLinkTypedef");

const typeDefs = mergeTypeDefs([userTypeDefs, SignupLinkTypedef]);
module.exports = typeDefs;
