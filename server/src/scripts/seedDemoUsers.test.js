const test = require("node:test");
const assert = require("node:assert/strict");

const { seedDemoUsers, validateSeedEnvironment } = require("./seedDemoUsers");

const env = {
  MONGODB_URI: "mongodb://seed-test.invalid/dsp",
  DEMO_ADMIN_EMAIL: "admin.demo@dsp-marketplace.com",
  DEMO_ADMIN_PASSWORD: "DspAdmin#2026",
  DEMO_INSTRUCTOR_EMAIL: "instructor.demo@dsp-marketplace.com",
  DEMO_INSTRUCTOR_PASSWORD: "DspInstructor#2026",
  DEMO_STUDENT_EMAIL: "student.demo@dsp-marketplace.com",
  DEMO_STUDENT_PASSWORD: "DspStudent#2026",
};

function createFakeModels(initialRecords = []) {
  const records = new Map(initialRecords.map((record) => [record.email, { ...record }]));
  const createCalls = [];
  const User = {
    findOne: async ({ email }) => records.get(email) || null,
  };
  const models = { User };
  for (const role of ["Admin", "Instructor", "Student"]) {
    models[role] = {
      create: async (record) => {
        if (records.has(record.email)) {
          const error = new Error("duplicate email");
          error.code = 11000;
          throw error;
        }
        const stored = { ...record, role };
        records.set(record.email, stored);
        createCalls.push(stored);
        return stored;
      },
    };
  }
  return { models, records, createCalls };
}

function fakeMongoose() {
  const calls = [];
  return {
    calls,
    connect: async (uri) => calls.push(["connect", uri]),
    disconnect: async () => calls.push(["disconnect"]),
  };
}

test("seed creates the three missing demo users with hashed passwords", async () => {
  const fakeModels = createFakeModels();
  const fakeConnection = fakeMongoose();
  const results = await seedDemoUsers({
    env,
    models: fakeModels.models,
    mongooseClient: fakeConnection,
    hashPassword: async (password, rounds) => `hashed:${password}:${rounds}`,
  });

  assert.deepEqual(results.map((result) => result.created), [true, true, true]);
  assert.equal(fakeModels.createCalls.length, 3);
  assert.equal(fakeModels.records.get(env.DEMO_ADMIN_EMAIL).password, "hashed:DspAdmin#2026:12");
  assert.equal(fakeModels.records.get(env.DEMO_INSTRUCTOR_EMAIL).role, "Instructor");
  assert.equal(fakeModels.records.get(env.DEMO_INSTRUCTOR_EMAIL).verificationStatus, "verified");
  assert.equal(fakeModels.records.get(env.DEMO_INSTRUCTOR_EMAIL).isActive, false);
  assert.equal(fakeModels.records.get(env.DEMO_INSTRUCTOR_EMAIL).stripeAccount, undefined);
  assert.equal(fakeModels.records.get(env.DEMO_STUDENT_EMAIL).role, "Student");
  assert.deepEqual(fakeConnection.calls, [["connect", env.MONGODB_URI], ["disconnect"]]);
});

test("rerunning the seed is idempotent and does not rehash existing demo users", async () => {
  const fakeModels = createFakeModels();
  const fakeConnection = fakeMongoose();
  let hashCalls = 0;
  const options = {
    env,
    models: fakeModels.models,
    mongooseClient: fakeConnection,
    hashPassword: async (password) => {
      hashCalls += 1;
      return `hashed:${password}`;
    },
  };

  await seedDemoUsers(options);
  const secondRun = await seedDemoUsers(options);

  assert.deepEqual(secondRun.map((result) => result.created), [false, false, false]);
  assert.equal(fakeModels.createCalls.length, 3);
  assert.equal(hashCalls, 3);
});

test("existing unrelated users are never modified", async () => {
  const unrelated = {
    email: "real.user@example.com",
    role: "Student",
    password: "real-password-hash",
    firstName: "Real",
    lastName: "User",
  };
  const fakeModels = createFakeModels([unrelated]);
  const before = { ...fakeModels.records.get(unrelated.email) };

  await seedDemoUsers({
    env,
    models: fakeModels.models,
    mongooseClient: fakeMongoose(),
    hashPassword: async (password) => `hashed:${password}`,
  });

  assert.deepEqual(fakeModels.records.get(unrelated.email), before);
});

test("missing demo configuration fails before connecting", () => {
  assert.throws(
    () => validateSeedEnvironment({ ...env, DEMO_STUDENT_PASSWORD: "" }),
    /Missing required demo seed environment variable: DEMO_STUDENT_PASSWORD/,
  );
});
