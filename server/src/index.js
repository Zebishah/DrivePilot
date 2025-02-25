require("dotenv").config();
const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const passport = require("./config/passport");
const typeDefs = require("./graphql/typeDefs");
const resolvers = require("./graphql/resolvers");
const authMiddleware = require("./middleware/auth");
const connectDB = require("./config/database");
const authRoutes = require("./routes/auth.routes");
const app = express();

// Passport middleware
app.use(passport.initialize());

connectDB();

// Apollo Server setup
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = await authMiddleware(req);
    return {
      user: auth.user,
    };
  },
});

app.use(authRoutes);

async function startServer() {
  await server.start();
  server.applyMiddleware({ app });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(
      `🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`
    );
  });
}

startServer();
