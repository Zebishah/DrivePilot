require("dotenv").config();
const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const passport = require("./config/passport");
const typeDefs = require("./config/CombineTypeDefs");
const resolvers = require("./config/CombineResolvers");
const authMiddleware = require("./middleware/auth");
const connectDB = require("./config/database");
const authRoutes = require("./routes/auth.routes");
const cors = require("cors");
const http = require("http");
const { initSocket, setIOInstance } = require("./socket");

// ✅ Connect to MongoDB
connectDB();

// ✅ Initialize Express app and HTTP server
const app = express();
const httpServer = http.createServer(app);

// ✅ CORS configuration
const allowedOrigins = [
  "https://dsp-client.onrender.com",
  "https://dsp-server.onrender.com",
  "http://localhost:5173",
  "https://studio.apollographql.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// ✅ Init middleware and routes
app.use(passport.initialize());
app.use(authRoutes);

// ✅ Create GraphQL schema
const schema = makeExecutableSchema({ typeDefs, resolvers });

// ✅ Initialize Socket.IO server (real-time chat)
const io = initSocket(httpServer, allowedOrigins);

// ✅ Store io instance globally for use in resolvers
setIOInstance(io);

// ✅ Setup Apollo Server (GraphQL API)
async function startApolloServer() {
  const server = new ApolloServer({
    schema,
    context: async ({ req }) => {
      const auth = await authMiddleware(req);
      // No need to pass io here anymore
      return { user: auth.user, req };
    },
  });

  await server.start();
  server.applyMiddleware({ app, path: "/graphql" });

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 HTTP: http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`📡 Socket.IO active on same server`);
  });
}

startApolloServer();
