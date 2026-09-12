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
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
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
const stripeWebhookRoutes = require("./routes/stripeWebhook.routes");
const {
  setStripeWebhookEventHandler,
  runStripeWebhookProcessorJob,
} = require("./services/stripeWebhookProcessor");
const { runFinancialReconciliation } = require("./services/financialReconciliationService");
const JOB_CONFIG = require("./config/jobConfig");
const { createJobScheduler } = require("./services/jobScheduler");
const mongoose = require("mongoose");
const { requestCorrelationMiddleware } = require("./middleware/requestCorrelation");
const { logger } = require("./utils/logger");

setStripeWebhookEventHandler(stripeWebhookRoutes.processStripeWebhookEvent);

const dbReady = connectDB();
let schedulerController = null;
let apiInitialized = false;
let shuttingDown = false;
let apolloServer = null;

function workerJobs() {
  return [
    {
      name: "StripeWebhookProcessor",
      run: (context) => runStripeWebhookProcessorJob({ batchSize: context.batchSize }),
      intervalMs: JOB_CONFIG.webhookProcessorIntervalMs,
      jobContext: { batchSize: JOB_CONFIG.defaultBatchSize },
    },
    {
      name: "FinancialReconciliation",
      run: (context) => runFinancialReconciliation({ batchSize: context.batchSize }),
      intervalMs: JOB_CONFIG.reconciliationIntervalMs,
      jobContext: { batchSize: JOB_CONFIG.defaultBatchSize },
    },
    { name: "PayoutJob", run: runInstructorPayoutJob, intervalMs: JOB_CONFIG.payoutIntervalMs },
    { name: "T48ChargeJob", run: runT48ChargeJob, intervalMs: JOB_CONFIG.t48IntervalMs },
    { name: "T48PaymentReminderJob", run: runT48PaymentReminderJob, intervalMs: JOB_CONFIG.t48ReminderIntervalMs },
    { name: "PendingBookingCleanupJob", run: runPendingBookingCleanupJob, intervalMs: JOB_CONFIG.pendingCleanupIntervalMs },
    { name: "AbandonedCheckoutReminderJob", run: runAbandonedCheckoutReminderJob, intervalMs: JOB_CONFIG.abandonedReminderIntervalMs },
    { name: "LessonEndReminder", run: runLessonEndReminderJob, intervalMs: JOB_CONFIG.lessonEndReminderIntervalMs },
  ];
}

// ✅ Initialize Express app and HTTP server
const app = express();
const httpServer = http.createServer(app);

// Render terminates TLS in front of the app; trust its single proxy hop so
// rate limiting uses the originating client IP rather than the shared proxy.
app.set("trust proxy", 1);
app.use(helmet());
app.use(requestCorrelationMiddleware);

// ✅ CORS configuration
const configuredFrontendUrl = (
  process.env.FRONTEND_URL || process.env.Frontend_URL || ""
).replace(/\/$/, "");
const allowedOrigins = [
  configuredFrontendUrl,
  ...(process.env.NODE_ENV === "production" ? [] : ["http://localhost:5173"]),
].filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      // Requests without an Origin are not browser cross-origin requests.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn("cors_request_blocked", { origin });
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// Stripe webhook needs raw body for signature verification (mount before any JSON body parser)
if (JOB_CONFIG.runApi) {
  app.use(
    "/webhooks/stripe",
    express.raw({ type: "application/json" }),
    stripeWebhookRoutes,
  );
  app.get("/health", (_req, res) => res.status(200).json({ ok: true }));
  app.get("/ready", (_req, res) => {
    const ready = mongoose.connection.readyState === 1 && apiInitialized;
    return res.status(ready ? 200 : 503).json({ ready });
  });
}

// ✅ Init middleware and routes
app.use(passport.initialize());
app.use(authRoutes);

const rateLimitedGraphQLOperations = new Set([
  "SignIn",
  "SignUp",
  "ForgotPassword",
  "ResetPassword",
  "VerifyUserOtp",
  "ResendOtp",
  "SendContactEmail",
]);
const sensitiveGraphQLFieldPattern = /\b(signIn|signUp|forgotPassword|resetPassword|verifyUser|resendOtp|sendContactEmail)\s*\(/i;
const sensitiveGraphQLRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => {
    const requests = Array.isArray(req.body) ? req.body : [req.body];
    return !requests.some((body) =>
      rateLimitedGraphQLOperations.has(body?.operationName) ||
      sensitiveGraphQLFieldPattern.test(body?.query || ""),
    );
  },
});

// Apollo parses GraphQL requests after middleware is mounted. Parse the small
// GraphQL envelope here so sensitive operations can be rate limited by name.
app.use("/graphql", express.json({ limit: "1mb" }), sensitiveGraphQLRateLimit);

// ✅ Create GraphQL schema
const schema = JOB_CONFIG.runApi
  ? makeExecutableSchema({ typeDefs, resolvers })
  : null;

// ✅ Initialize Socket.IO server (real-time chat)
if (JOB_CONFIG.runApi) {
  const io = initSocket(httpServer, allowedOrigins);
  setIOInstance(io);
}

// ✅ Setup Apollo Server (GraphQL API)
async function startApolloServer() {
  if (!JOB_CONFIG.runApi) return;
  apolloServer = new ApolloServer({
    schema,
    context: async ({ req }) => {
      const auth = await authMiddleware(req);
      // No need to pass io here anymore
      return {
        user: auth.user,
        req,
        requestId: req.requestId,
        correlationId: req.correlationId,
      };
    },
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app, path: "/graphql" });
  apiInitialized = true;

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    logger.info("api_started", { port: PORT, graphqlPath: apolloServer.graphqlPath });
    logger.info("socket_io_initialized");
  });
}

async function startApplication() {
  await dbReady;
  logger.info("process_mode", { api: JOB_CONFIG.runApi, worker: JOB_CONFIG.runWorker });
  if (JOB_CONFIG.runWorker) {
    schedulerController = createJobScheduler({
      jobs: workerJobs(),
      leaseMs: JOB_CONFIG.leaseMs,
      heartbeatMs: JOB_CONFIG.heartbeatMs,
      shutdownTimeoutMs: JOB_CONFIG.shutdownTimeoutMs,
      maxRetryDelayMs: JOB_CONFIG.maxRetryDelayMs,
    });
    schedulerController.start();
    logger.info("worker_scheduler_initialized");
  }
  await startApolloServer();
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("process_shutdown_started", { signal });
  if (schedulerController) await schedulerController.stop();
  if (apolloServer) await apolloServer.stop();
  if (JOB_CONFIG.runApi) {
    await new Promise((resolve) => {
      if (!httpServer.listening) return resolve();
      httpServer.close(() => resolve());
    });
  }
  await mongoose.disconnect();
}

process.once("SIGTERM", () => shutdown("SIGTERM").then(() => process.exit(0)));
process.once("SIGINT", () => shutdown("SIGINT").then(() => process.exit(0)));

startApplication().catch((error) => {
  logger.error("startup_failed", { error, errorCategory: require("./utils/logger").classifyError(error) });
  process.exitCode = 1;
});
