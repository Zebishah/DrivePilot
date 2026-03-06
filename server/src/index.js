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
const { runInstructorPayoutJob } = require("./jobs/payoutJob");
const { runT48ChargeJob } = require("./jobs/t48ChargeJob");
const {
  runPendingBookingCleanupJob,
} = require("./jobs/pendingBookingCleanupJob");

// ✅ Connect to MongoDB
connectDB();

// Run instructor payout job: 1 min for testing; for production use 6 * 60 * 60 * 1000 (6 hours)
const PAYOUT_JOB_INTERVAL_MS = 1 * 60 * 1000;
setInterval(() => {
  runInstructorPayoutJob().catch((err) =>
    console.error("[PayoutJob] Error:", err),
  );
}, PAYOUT_JOB_INTERVAL_MS);
runInstructorPayoutJob().catch((err) =>
  console.error("[PayoutJob] Initial run error:", err),
);

// Run T-48 charge job: 5 min for testing; adjust for production as needed
const T48_JOB_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  runT48ChargeJob().catch((err) => console.error("[T48ChargeJob] Error:", err));
}, T48_JOB_INTERVAL_MS);
runT48ChargeJob().catch((err) =>
  console.error("[T48ChargeJob] Initial run error:", err),
);

// Abandoned Stripe checkout cleanup: every 30 min
const PENDING_CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
setInterval(() => {
  runPendingBookingCleanupJob().catch((err) =>
    console.error("[PendingBookingCleanupJob] Error:", err),
  );
}, PENDING_CLEANUP_INTERVAL_MS);
runPendingBookingCleanupJob().catch((err) =>
  console.error("[PendingBookingCleanupJob] Initial run error:", err),
);

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
// Add frontend URL(s) from env if provided
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
if (process.env.Frontend_URL) {
  allowedOrigins.push(process.env.Frontend_URL);
}
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. same-origin, Postman) or literal "null" (some browsers in dev/redirects)
      if (!origin || origin === "null" || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// Stripe webhook needs raw body for signature verification (mount before any JSON body parser)
const stripeWebhookRoutes = require("./routes/stripeWebhook.routes");
app.use(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhookRoutes,
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
