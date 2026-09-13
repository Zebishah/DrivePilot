const test = require("node:test");
const assert = require("node:assert/strict");

process.env.STRIPE_SECRET_KEY ||= "sk_test_webhook_route_probe";

const stripeWebhookRoutes = require("./stripeWebhook.routes");

function handlerFor(router) {
  const layer = router.stack.find((entry) => entry.route?.path === "/");
  assert.ok(layer, "webhook router must expose POST /");
  return layer.route.stack[0].handle;
}

async function invoke(router, { body, signature }) {
  const handler = handlerFor(router);
  return new Promise((resolve, reject) => {
    const response = {
      statusCode: 200,
      payload: undefined,
      status(code) {
        this.statusCode = code;
        return this;
      },
      send(payload) {
        this.payload = payload;
        resolve({ statusCode: this.statusCode, payload });
        return this;
      },
    };
    const request = {
      body,
      headers: { "stripe-signature": signature },
    };
    Promise.resolve(handler(request, response)).catch(reject);
  });
}

function fakeStripeForSecrets(expectedSignatureBySecret) {
  return {
    webhooks: {
      constructEvent(body, signature, secret) {
        assert.ok(Buffer.isBuffer(body), "webhook body must remain raw");
        if (expectedSignatureBySecret[secret] !== signature) {
          throw new Error("Invalid signature");
        }
        return JSON.parse(body.toString("utf8"));
      },
    },
  };
}

test("platform and Connect routes verify their own webhook secrets", async () => {
  const previousPlatformSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const previousConnectSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_platform_test";
  process.env.STRIPE_CONNECT_WEBHOOK_SECRET = "whsec_connect_test";

  const received = [];
  const fakeStripe = fakeStripeForSecrets({
    whsec_platform_test: "sig_platform",
    whsec_connect_test: "sig_connect",
  });
  const createRouter = stripeWebhookRoutes.createStripeWebhookIngressRouter;
  const platformRouter = createRouter({
    secretEnvName: "STRIPE_WEBHOOK_SECRET",
    stripeClient: fakeStripe,
    receiveEvent: async (event) => {
      received.push(event);
      return { duplicate: false };
    },
  });
  const connectRouter = createRouter({
    secretEnvName: "STRIPE_CONNECT_WEBHOOK_SECRET",
    stripeClient: fakeStripe,
    receiveEvent: async (event) => {
      received.push(event);
      return { duplicate: false };
    },
  });
  const event = {
    id: "evt_dual_route_test",
    type: "account.updated",
    account: "acct_connect_test",
    data: { object: { id: "acct_connect_test" } },
  };
  const body = Buffer.from(JSON.stringify(event));

  try {
    const platformResponse = await invoke(platformRouter, {
      body,
      signature: "sig_platform",
    });
    const connectResponse = await invoke(connectRouter, {
      body,
      signature: "sig_connect",
    });
    assert.equal(platformResponse.statusCode, 200);
    assert.equal(connectResponse.statusCode, 200);
    assert.equal(received.length, 2);
    assert.equal(received[0].account, "acct_connect_test");
    assert.equal(received[1].account, "acct_connect_test");
  } finally {
    if (previousPlatformSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previousPlatformSecret;
    if (previousConnectSecret === undefined) delete process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
    else process.env.STRIPE_CONNECT_WEBHOOK_SECRET = previousConnectSecret;
  }
});

test("wrong webhook secret fails before durable receipt", async () => {
  const previousSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  process.env.STRIPE_CONNECT_WEBHOOK_SECRET = "whsec_connect_test";
  let receiptCalls = 0;
  const router = stripeWebhookRoutes.createStripeWebhookIngressRouter({
    secretEnvName: "STRIPE_CONNECT_WEBHOOK_SECRET",
    stripeClient: fakeStripeForSecrets({ whsec_connect_test: "sig_connect" }),
    receiveEvent: async () => {
      receiptCalls += 1;
      return { duplicate: false };
    },
  });

  try {
    const response = await invoke(router, {
      body: Buffer.from('{"id":"evt_wrong_secret"}'),
      signature: "sig_wrong",
    });
    assert.equal(response.statusCode, 400);
    assert.equal(receiptCalls, 0);
  } finally {
    if (previousSecret === undefined) delete process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
    else process.env.STRIPE_CONNECT_WEBHOOK_SECRET = previousSecret;
  }
});

test("the same event ID remains deduplicated while preserving connected account context", async () => {
  const previousSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  process.env.STRIPE_CONNECT_WEBHOOK_SECRET = "whsec_connect_test";
  const records = new Map();
  const router = stripeWebhookRoutes.createStripeWebhookIngressRouter({
    secretEnvName: "STRIPE_CONNECT_WEBHOOK_SECRET",
    stripeClient: fakeStripeForSecrets({ whsec_connect_test: "sig_connect" }),
    receiveEvent: async (event) => {
      const eventId = String(event.id);
      if (records.has(eventId)) return { record: records.get(eventId), duplicate: true };
      const record = { eventId, stripeAccountId: event.account, payload: event };
      records.set(eventId, record);
      return { record, duplicate: false };
    },
  });
  const body = Buffer.from(
    JSON.stringify({
      id: "evt_connect_duplicate",
      type: "payout.paid",
      account: "acct_connect_test",
      data: { object: { id: "po_test" } },
    }),
  );

  try {
    const first = await invoke(router, { body, signature: "sig_connect" });
    const second = await invoke(router, { body, signature: "sig_connect" });
    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 200);
    assert.equal(records.size, 1);
    assert.equal(records.get("evt_connect_duplicate").stripeAccountId, "acct_connect_test");
  } finally {
    if (previousSecret === undefined) delete process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
    else process.env.STRIPE_CONNECT_WEBHOOK_SECRET = previousSecret;
  }
});

test("Accounts v2 thin notifications resolve the related account ID", () => {
  assert.equal(
    stripeWebhookRoutes.getAccountIdFromEvent({
      id: "evt_v2_account_update",
      type: "v2.core.account[requirements].updated",
      object: "v2.core.event",
      related_object: {
        id: "acct_v2_test",
        type: "v2.core.account",
      },
    }),
    "acct_v2_test",
  );
});
