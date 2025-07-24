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
const { WebSocketServer } = require("ws");
const { useServer } = require("graphql-ws/lib/use/ws");

// Connect to MongoDB
connectDB();

const app = express();
const httpServer = http.createServer(app);

// CORS
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
        console.log("Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(passport.initialize());
app.use(authRoutes);

// GraphQL schema
const schema = makeExecutableSchema({ typeDefs, resolvers });

// GraphQL WebSocket server
const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/graphql",
});

useServer(
  {
    schema,
    onConnect: async (ctx) => {
      console.log("✅ WebSocket connected");
    },
    onDisconnect(ctx, code, reason) {
      console.log("❌ WebSocket disconnected", {
        code,
        reason: reason.toString(),
      });
    },
    onError: (ctx, msg, err) => {
      console.error("🚨 WS error:", msg, err);
    },
  },
  wsServer
);

// Apollo Server (HTTP only)
async function startApolloServer() {
  const server = new ApolloServer({
    schema,
    context: async ({ req }) => {
      const auth = await authMiddleware(req);
      return {
        user: auth.user,
      };
    },
  });

  await server.start();
  server.applyMiddleware({ app, path: "/graphql" });

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 HTTP: http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`📡 WS: ws://localhost:${PORT}${server.graphqlPath}`);
  });
}

startApolloServer();
