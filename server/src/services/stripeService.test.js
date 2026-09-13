const test = require("node:test");
const assert = require("node:assert/strict");

process.env.STRIPE_SECRET_KEY ||= "sk_test_accounts_v2_service_test";

const {
  buildV2ConnectedAccountParams,
  createConnectedAccount,
  createAccountLink,
  setManualPayoutSchedule,
  retrieveAccount,
  accountToStripeSnapshot,
  shouldCreateConnectedAccount,
} = require("./stripeService");

test("builds an Accounts v2 recipient Express configuration", () => {
  const params = buildV2ConnectedAccountParams("Instructor@Example.com");

  assert.equal(params.contact_email, "instructor@example.com");
  assert.equal(params.dashboard, "express");
  assert.equal(params.identity.country, "ch");
  assert.equal(
    params.configuration.recipient.capabilities.stripe_balance.stripe_transfers.requested,
    true,
  );
  assert.deepEqual(params.defaults.responsibilities, {
    fees_collector: "application",
    losses_collector: "application",
  });
  assert.deepEqual(params.include, [
    "configuration.recipient",
    "identity",
    "requirements",
  ]);
});

test("creates new connected accounts through Accounts v2 with idempotency", async () => {
  const calls = [];
  const fakeStripe = {
    v2: {
      core: {
        accounts: {
          create: async (params, options) => {
            calls.push({ params, options });
            return { id: "acct_v2_test", object: "v2.core.account" };
          },
        },
      },
    },
    accounts: {
      create: async () => {
        throw new Error("v1 account creation must not be used for new accounts");
      },
    },
  };

  const account = await createConnectedAccount("teacher@example.com", {
    accountVersion: "v2",
    idempotencyKey: "connect-account:instructor-1",
    stripeClient: fakeStripe,
  });

  assert.equal(account.id, "acct_v2_test");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.idempotencyKey, "connect-account:instructor-1");
});

test("keeps explicit v1 account creation available for legacy compatibility", async () => {
  const calls = [];
  const fakeStripe = {
    accounts: {
      create: async (params) => {
        calls.push(params);
        return { id: "acct_v1_test", object: "account" };
      },
    },
  };

  const account = await createConnectedAccount("teacher@example.com", {
    accountVersion: "v1",
    stripeClient: fakeStripe,
  });

  assert.equal(account.id, "acct_v1_test");
  assert.equal(calls[0].type, "express");
});

test("does not recreate an instructor that already has a legacy account", () => {
  assert.equal(shouldCreateConnectedAccount({ stripeAccount: {} }), true);
  assert.equal(
    shouldCreateConnectedAccount({
      stripeAccount: { accountId: "acct_existing_v1" },
    }),
    false,
  );
});

test("uses v2 Account Links and Balance Settings for a v2 account", async () => {
  const calls = [];
  const fakeStripe = {
    v2: {
      core: {
        accountLinks: {
          create: async (params) => {
            calls.push(["link", params]);
            return { url: "https://connect.stripe.test/v2-link" };
          },
        },
      },
    },
    balanceSettings: {
      update: async (params, options) => {
        calls.push(["balance", params, options]);
        return { object: "balance_settings" };
      },
    },
  };

  const link = await createAccountLink("acct_v2_test", {
    accountVersion: "v2",
    stripeClient: fakeStripe,
  });
  await setManualPayoutSchedule("acct_v2_test", {
    accountVersion: "v2",
    stripeClient: fakeStripe,
  });

  assert.equal(link.url, "https://connect.stripe.test/v2-link");
  assert.equal(calls[0][1].use_case.account_onboarding.configurations[0], "recipient");
  assert.equal(calls[1][1].payments.payouts.schedule.interval, "manual");
  assert.equal(calls[1][2].stripeAccount, "acct_v2_test");
});

test("retrieves v2 account state with includable lifecycle fields", async () => {
  const calls = [];
  const fakeStripe = {
    v2: {
      core: {
        accounts: {
          retrieve: async (accountId, params) => {
            calls.push([accountId, params]);
            return { id: accountId, object: "v2.core.account" };
          },
        },
      },
    },
  };

  await retrieveAccount("acct_v2_test", {
    accountVersion: "v2",
    stripeClient: fakeStripe,
  });

  assert.equal(calls[0][0], "acct_v2_test");
  assert.deepEqual(calls[0][1].include, [
    "configuration.recipient",
    "identity",
    "requirements",
  ]);
});

test("normalizes v2 recipient capability and requirements state", () => {
  const result = accountToStripeSnapshot({
    id: "acct_v2_test",
    object: "v2.core.account",
    identity: { country: "ch" },
    configuration: {
      recipient: {
        capabilities: {
          stripe_balance: {
            stripe_transfers: { status: "active" },
            payouts: { status: "active" },
          },
        },
      },
    },
    requirements: {
      entries: [
        {
          description: "A future requirement",
          minimum_deadline: { status: "eventually_due" },
          reference: { path: "identity.individual.phone" },
        },
      ],
    },
  });

  assert.equal(result.accountVersion, "v2");
  assert.equal(result.isActive, true);
  assert.equal(result.onboardingStatus, "verified");
  assert.equal(result.recipientTransfersStatus, "active");
  assert.equal(result.recipientPayoutsStatus, "active");
  assert.equal(
    result.stripeAccountUpdate["stripeAccount.requirements.eventuallyDue"][0],
    "identity.individual.phone",
  );
  assert.equal(
    result.stripeAccountUpdate["stripeAccount.chargesEnabled"],
    undefined,
  );
});
