const test = require("node:test");
const assert = require("node:assert/strict");

const PASSPORT_MODULE = require.resolve("./passport");
const AUTH_ROUTES_MODULE = require.resolve("../routes/auth.routes");

function productionEnvironment(overrides = {}) {
  return {
    NODE_ENV: "production",
    MONGODB_URI: "mongodb://example.invalid/dsp",
    FRONTEND_URL: "https://frontend.example.invalid",
    SLOT_TIMEZONE: "Europe/Zurich",
    STRIPE_SECRET_KEY: "sk_test_startup_probe",
    EMAIL_ENABLED: "false",
    AI_ENABLED: "false",
    ...overrides,
  };
}

function loadAuthStack(env) {
  const previousEnvironment = new Map(
    Object.keys(env).map((name) => [name, process.env[name]]),
  );
  for (const [name, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }

  const passport = require("passport");
  delete passport._strategies.google;
  delete passport._strategies.facebook;
  delete require.cache[PASSPORT_MODULE];
  delete require.cache[AUTH_ROUTES_MODULE];

  const loadedPassport = require("./passport");
  const authRoutes = require("../routes/auth.routes");

  return {
    passport: loadedPassport,
    authRoutes,
    restore() {
      delete passport._strategies.google;
      delete passport._strategies.facebook;
      delete require.cache[PASSPORT_MODULE];
      delete require.cache[AUTH_ROUTES_MODULE];
      for (const [name, value] of previousEnvironment) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    },
  };
}

function assertDisabledRouteReturnsNotFound(authRoutes, routePath) {
  const layer = authRoutes.stack.find(
    (entry) => entry.route?.path === routePath,
  );
  assert.ok(layer, `missing route ${routePath}`);
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
  layer.route.stack[0].handle({}, response);
  assert.equal(response.statusCode, 404);
}

test("OAuth-disabled worker startup does not construct optional strategies", () => {
  const stack = loadAuthStack({
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    FACEBOOK_APP_ID: "",
    FACEBOOK_APP_SECRET: "",
  });

  try {
    const { validateEnvironment } = require("./envValidation");
    const result = validateEnvironment({
      env: productionEnvironment({
        RUN_API: "false",
        RUN_WORKER: "true",
        GOOGLE_CLIENT_ID: "",
        GOOGLE_CLIENT_SECRET: "",
        FACEBOOK_APP_ID: "",
        FACEBOOK_APP_SECRET: "",
      }),
    });
    assert.equal(result.runWorker, true);
    assert.deepEqual(stack.passport.oauthProviders, {
      google: false,
      facebook: false,
    });
    assert.equal(stack.passport._strategies.google, undefined);
    assert.equal(stack.passport._strategies.facebook, undefined);
    assertDisabledRouteReturnsNotFound(stack.authRoutes, "/auth/google");
    assertDisabledRouteReturnsNotFound(
      stack.authRoutes,
      "/auth/google/callback",
    );
    assertDisabledRouteReturnsNotFound(stack.authRoutes, "/auth/facebook");
    assertDisabledRouteReturnsNotFound(
      stack.authRoutes,
      "/auth/facebook/callback",
    );
  } finally {
    stack.restore();
  }
});

test("Google remains registered while Facebook is absent in API production", () => {
  const stack = loadAuthStack({
    GOOGLE_CLIENT_ID: "configured-google-client-id",
    GOOGLE_CLIENT_SECRET: "configured-google-client-secret",
    FACEBOOK_APP_ID: "",
    FACEBOOK_APP_SECRET: "",
  });

  try {
    const { validateEnvironment } = require("./envValidation");
    assert.doesNotThrow(() =>
      validateEnvironment({
        env: productionEnvironment({
          RUN_API: "true",
          RUN_WORKER: "false",
          JWT_SECRET: "startup-probe-jwt-secret-32-characters",
          STRIPE_WEBHOOK_SECRET: "whsec_startup_probe",
          AWS_ACCESS_KEY_ID: "startup-probe-access-key",
          AWS_SECRET_ACCESS_KEY: "startup-probe-secret-key",
          AWS_REGION: "eu-central-1",
          BUCKET_NAME: "startup-probe-bucket",
          GOOGLE_CLIENT_ID: "configured-google-client-id",
          GOOGLE_CLIENT_SECRET: "configured-google-client-secret",
          FACEBOOK_APP_ID: "",
          FACEBOOK_APP_SECRET: "",
        }),
      }),
    );
    assert.deepEqual(stack.passport.oauthProviders, {
      google: true,
      facebook: false,
    });
    assert.ok(stack.passport._strategies.google);
    assert.equal(stack.passport._strategies.facebook, undefined);
    assertDisabledRouteReturnsNotFound(stack.authRoutes, "/auth/facebook");
    assertDisabledRouteReturnsNotFound(
      stack.authRoutes,
      "/auth/facebook/callback",
    );
  } finally {
    stack.restore();
  }
});
