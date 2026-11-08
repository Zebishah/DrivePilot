require("dotenv").config();
const { validateEnvironment } = require("./config/envValidation");

validateEnvironment();

const connectDB = require("./config/database");
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
const { runOutboxEmailJob } = require("./services/outboxEmailWorker");
const stripeWebhookRoutes = require("./routes/stripeWebhook.routes");
const {
  setStripeWebhookEventHandler,
  runStripeWebhookProcessorJob,
} = require("./services/stripeWebhookProcessor");
const { runFinancialReconciliation } = require("./services/financialReconciliationService");
const JOB_CONFIG = require("./config/jobConfig");
const { createJobScheduler } = require("./services/jobScheduler");
const { selectWorkerJobs } = require("./services/selectWorkerJobs");
const mongoose = require("mongoose");
const { logger } = require("./utils/logger");
const { closeRedis, connectRedis, redisStatus } = require("./services/redisClient");

setStripeWebhookEventHandler(stripeWebhookRoutes.processStripeWebhookEvent);

const dbReady = connectDB();
let schedulerController = null;
let apiInitialized = false;
let shuttingDown = false;
let apolloServer = null;
let httpServer = null;
let closeSocket = null;
let startApolloServer = async () => {};

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
    { name: "OutboxEmail", run: (context) => runOutboxEmailJob({ ...context, batchSize: JOB_CONFIG.outboxEmailBatchSize, leaseMs: JOB_CONFIG.outboxEmailLeaseMs }), intervalMs: JOB_CONFIG.outboxEmailIntervalMs },
  ];
}

function initializeApi() {
  const express = require("express");
  const http = require("http");
  const { ApolloServer } = require("apollo-server-express");
  const { makeExecutableSchema } = require("@graphql-tools/schema");
  const passport = require("./config/passport");
  const typeDefs = require("./config/CombineTypeDefs");
  const resolvers = require("./config/CombineResolvers");
  const authMiddleware = require("./middleware/auth");
  const authRoutes = require("./routes/auth.routes");
  const cors = require("cors");
  const helmet = require("helmet");
  const { rateLimit } = require("express-rate-limit");
  const { initSocket, setIOInstance, closeSocket: closeApiSocket } = require("./socket");
  const { requestCorrelationMiddleware } = require("./middleware/requestCorrelation");
  const { createRequestLoaders } = require("./graphql/requestLoaders");
  const assistantRoutes = require("./modules/assistant/assistant.routes");

  app = express();
  httpServer = http.createServer(app);
  closeSocket = closeApiSocket;

  // Render terminates TLS in front of the app; trust its single proxy hop so
  // rate limiting uses the originating client IP rather than the shared proxy.
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(requestCorrelationMiddleware);

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

  // Stripe webhook needs raw body for signature verification and must be
  // mounted before any JSON body parser.
  app.use(
    "/webhooks/stripe/connect",
    JOB_CONFIG.connectWebhookEnabled
      ? express.raw({ type: "application/json" })
      : (_req, _res, next) => next(),
    JOB_CONFIG.connectWebhookEnabled
      ? stripeWebhookRoutes.connectWebhookRouter
      : (_req, res) => res.status(404).send("Stripe Connect webhook not enabled"),
  );
  app.use(
    "/webhooks/stripe",
    express.raw({ type: "application/json" }),
    stripeWebhookRoutes,
  );
  // Public, dependency-free liveness response for browsers and uptime monitors.
  // Express also serves HEAD / through this handler without a response body.
  app.get("/", (_req, res) => {
    res.set("Cache-Control", "no-store");
    return res.status(200).json({
      success: true,
      status: "ok",
      message: "Drive Pilot API is running.",
    });
  });
  app.get("/health", (_req, res) => res.status(200).json({ ok: true }));
  app.get("/ready", (_req, res) => {
    const ready = mongoose.connection.readyState === 1 && apiInitialized;
    return res.status(ready ? 200 : 503).json({ ready });
  });

  app.use(passport.initialize());
  app.use(authRoutes);
  app.use(assistantRoutes);

  const rateLimitedGraphQLOperations = new Set([
    "SignIn",
    "LoginDemo",
    "SignUp",
    "ForgotPassword",
    "ResetPassword",
    "VerifyUserOtp",
    "ResendOtp",
    "SendContactEmail",
  ]);
  const sensitiveGraphQLFieldPattern = /\b(signIn|loginDemo|signUp|forgotPassword|resetPassword|verifyUser|resendOtp|sendContactEmail)\s*\(/i;
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
  app.use("/graphql", express.json({ limit: "1mb" }), sensitiveGraphQLRateLimit);

  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const io = initSocket(httpServer, allowedOrigins);
  setIOInstance(io);

  startApolloServer = async function startApiServer() {
    apolloServer = new ApolloServer({
      schema,
      context: async ({ req }) => {
        const auth = await authMiddleware(req);
        return {
          user: auth.user,
          req,
          requestId: req.requestId,
          correlationId: req.correlationId,
          loaders: createRequestLoaders(),
        };
      },
    });

    await apolloServer.start();
    apolloServer.applyMiddleware({ app, path: "/graphql" });
    apiInitialized = true;

    const PORT = process.env.PORT || 4000;
    httpServer.listen(PORT, "0.0.0.0", () => {
      logger.info("api_started", { port: PORT, graphqlPath: apolloServer.graphqlPath });
      logger.info("socket_io_initialized");
    });
  };
}

let app = null;
if (JOB_CONFIG.runApi) initializeApi();

async function startApplication() {
  await dbReady;
  // Redis is an optional read cache. In worker mode with CACHE_ENABLED=false,
  // do not even attempt to establish a connection.
  if (redisStatus().configured) connectRedis();
  logger.info("process_mode", { api: JOB_CONFIG.runApi, worker: JOB_CONFIG.runWorker, emailWorker: JOB_CONFIG.runEmailWorker });
  if (JOB_CONFIG.runWorker || JOB_CONFIG.runEmailWorker) {
    const jobs = selectWorkerJobs(workerJobs(), JOB_CONFIG);
    schedulerController = createJobScheduler({
      jobs,
      leaseMs: JOB_CONFIG.leaseMs,
      heartbeatMs: JOB_CONFIG.heartbeatMs,
      shutdownTimeoutMs: JOB_CONFIG.shutdownTimeoutMs,
      maxRetryDelayMs: JOB_CONFIG.maxRetryDelayMs,
    });
    schedulerController.start();
    logger.info("worker_scheduler_initialized", { jobNames: jobs.map((job) => job.name) });
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
    await closeSocket();
    await new Promise((resolve) => {
      if (!httpServer.listening) return resolve();
      httpServer.close(() => resolve());
    });
  }
  await mongoose.disconnect();
  await closeRedis();
}

process.once("SIGTERM", () => shutdown("SIGTERM").then(() => process.exit(0)));
process.once("SIGINT", () => shutdown("SIGINT").then(() => process.exit(0)));

startApplication().catch((error) => {
  logger.error("startup_failed", { error, errorCategory: require("./utils/logger").classifyError(error) });
  process.exitCode = 1;
});
