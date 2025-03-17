const { mergeTypeDefs } = require("@graphql-tools/merge");

const userTypeDefs = require("../graphql/typeDefs");
const SignupLinkTypedef = require("../graphql/SignupLink/SignupLinkTypeDef");

const typeDefs = mergeTypeDefs([userTypeDefs, SignupLinkTypedef]);
// export default typeDefs;
module.exports = typeDefs;
