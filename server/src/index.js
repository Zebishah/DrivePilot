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
const {
  runAbandonedCheckoutReminderJob,
} = require("./jobs/abandonedCheckoutReminderJob");
const { runLessonEndReminderJob } = require("./jobs/lessonEndReminderJob");
const { runT48PaymentReminderJob } = require("./jobs/t48PaymentReminderJob");

// ✅ Connect to MongoDB
connectDB();

// CRON_RUNS=yes → start all background jobs on this instance.
// CRON_RUNS=no  (or unset) → no crons at all. Use this on live while testing locally.
const CRON_RUNS = ["yes", "true", "1"].includes(
  String(process.env.CRON_RUNS || "")
    .trim()
    .toLowerCase(),
);

function scheduleJob(name, run, intervalMs) {
  const tick = () =>
    run().catch((err) => console.error(`[${name}] Error:`, err));
  setInterval(tick, intervalMs);
  tick();
}

if (CRON_RUNS) {
  console.log("[Jobs] CRON_RUNS=yes — starting background jobs.");
  // Instructor payout every 3 min; for production use 6 * 60 * 60 * 1000 (6 hours)
  scheduleJob("PayoutJob", runInstructorPayoutJob, 3 * 60 * 1000);
  // T-48 charge: 1 min for testing; adjust for production as needed
  scheduleJob("T48ChargeJob", runT48ChargeJob, 1 * 60 * 1000);
  // T-48 follow-up reminders: 12h + 18h nudges and 24h auto-cancel
  scheduleJob(
    "T48PaymentReminderJob",
    runT48PaymentReminderJob,
    10 * 60 * 1000,
  );
  // Abandoned Stripe checkout cleanup: run daily
  scheduleJob(
    "PendingBookingCleanupJob",
    runPendingBookingCleanupJob,
    24 * 60 * 60 * 1000,
  );
  // Abandoned checkout reminder: single reminder per pending booking
  scheduleJob(
    "AbandonedCheckoutReminderJob",
    runAbandonedCheckoutReminderJob,
    10 * 60 * 1000,
  );
  // Lesson-end reminder: emails instructor to confirm lesson status
  scheduleJob("LessonEndReminder", runLessonEndReminderJob, 2 * 60 * 1000);
} else {
  console.log(
    '[Jobs] CRON_RUNS is not "yes" — background jobs are disabled on this instance.',
  );
}

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
