require("dotenv").config();
const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const passport = require("./config/passport");
const typeDefs = require("./config/CombineTypeDefs");
const resolvers = require("./config/CombineResolvers");
const authMiddleware = require("./middleware/auth");
const connectDB = require("./config/database");
const authRoutes = require("./routes/auth.routes");
const app = express();
const cors = require("cors");
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

const allowedOrigins = [
  "https://dsp-client.onrender.com",
  "https://dsp-server.onrender.com",
  "http://localhost:5173",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      // !origin allows requests without an origin header.

      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

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
