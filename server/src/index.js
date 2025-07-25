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

// ✅ Setup WebSocket Server (GraphQL Subscriptions)
const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/graphql",
});

useServer(
  {
    schema,
    on: {
      connect: async (ctx) => {
        console.log("✅ WebSocket connected", ctx.connectionParams);
      },
      disconnect: (ctx, code, reason) => {
        console.log("❌ WebSocket disconnected", {
          code,
          reason: reason.toString(),
        });
      },
      error: (ctx, msg, err) => {
        console.error("🚨 WebSocket error:", { message: msg, error: err });
      },
    },
  },
  wsServer
);
// ✅ Setup Apollo Server (HTTP)
async function startApolloServer() {
  const server = new ApolloServer({
    schema,
    context: async ({ req }) => {
      // For HTTP requests only — WS doesn't use this
      const auth = await authMiddleware(req);
      return { user: auth.user };
    },
    plugins: [
      {
        async serverWillStart() {
          return {
            async drainServer() {
              console.log("🧼 Draining HTTP + WS...");
              await wsServer.close();
            },
          };
        },
      },
    ],
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
