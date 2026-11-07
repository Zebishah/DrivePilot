require("dotenv").config();

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { User, Admin, Instructor, Student } = require("../models/User");

const PASSWORD_ROUNDS = 12;

const DEMO_ENV_VARS = [
  "DEMO_ADMIN_EMAIL",
  "DEMO_ADMIN_PASSWORD",
  "DEMO_INSTRUCTOR_EMAIL",
  "DEMO_INSTRUCTOR_PASSWORD",
  "DEMO_STUDENT_EMAIL",
  "DEMO_STUDENT_PASSWORD",
];

function isPresent(value) {
  return value != null && String(value).trim() !== "";
}

function validateSeedEnvironment(env = process.env) {
  const missing = DEMO_ENV_VARS.filter((name) => !isPresent(env[name]));
  if (missing.length) {
    throw new Error(`Missing required demo seed environment variable: ${missing[0]}`);
  }
  if (!isPresent(env.MONGODB_URI)) {
    throw new Error("Missing required environment variable: MONGODB_URI");
  }
}

function demoUserDefinitions(env = process.env) {
  validateSeedEnvironment(env);

  const common = {
    authProvider: "local",
    isProfileComplete: true,
    isUserVerified: true,
    isUserAuthenticated: true,
    isDemo: true,
  };

  return [
    {
      role: "Admin",
      model: Admin,
      email: String(env.DEMO_ADMIN_EMAIL).trim(),
      password: String(env.DEMO_ADMIN_PASSWORD),
      fields: {
        ...common,
        firstName: "Demo",
        lastName: "Admin",
        adminLevel: "super",
      },
    },
    {
      role: "Instructor",
      model: Instructor,
      email: String(env.DEMO_INSTRUCTOR_EMAIL).trim(),
      password: String(env.DEMO_INSTRUCTOR_PASSWORD),
      fields: {
        ...common,
        firstName: "Demo",
        lastName: "Instructor",
        address: "Demo Street 1",
        location: "Zurich",
        zipCode: "8001",
        description: "Demo instructor profile for a Drive Pilot walkthrough.",
        experience: "Experienced driving instructor (demo profile).",
        phone: "+41 44 000 00 01",
        languagePreference: ["English", "German"],
        verificationStatus: "verified",
        isActive: false,
        onboardingStatus: "not_started",
        coordinates: {
          type: "Point",
          coordinates: [8.5417, 47.3769],
        },
        carName: "Demo vehicle",
        transmissionType: "Automatic",
        gender: "Other",
      },
    },
    {
      role: "Student",
      model: Student,
      email: String(env.DEMO_STUDENT_EMAIL).trim(),
      password: String(env.DEMO_STUDENT_PASSWORD),
      fields: {
        ...common,
        firstName: "Demo",
        lastName: "Student",
        homeAddress: "Demo Street 2",
        location: "Zurich",
        zipCode: "8001",
        description: "Demo student profile for a Drive Pilot walkthrough.",
        experience: "Beginner",
        lessonHoursLeft: "0",
        phone: "+41 44 000 00 02",
        languagePreference: ["English"],
      },
    },
  ];
}

async function ensureDemoUser({ UserModel, definition, hashPassword }) {
  const existing = await UserModel.findOne({ email: definition.email });
  if (existing) {
    if (existing.isDemo !== true && typeof existing.save === "function") {
      existing.isDemo = true;
      await existing.save();
    }
    return { email: definition.email, role: definition.role, created: false };
  }

  const password = await hashPassword(definition.password, PASSWORD_ROUNDS);
  try {
    await definition.model.create({
      ...definition.fields,
      email: definition.email,
      password,
    });
    return { email: definition.email, role: definition.role, created: true };
  } catch (error) {
    // A concurrent seed may win the unique email race. Re-check the base
    // collection and leave whichever account already exists untouched.
    if (error?.code === 11000 && (await UserModel.findOne({ email: definition.email }))) {
      return { email: definition.email, role: definition.role, created: false };
    }
    throw error;
  }
}

async function seedDemoUsers({
  env = process.env,
  mongooseClient = mongoose,
  models = { User, Admin, Instructor, Student },
  hashPassword = bcrypt.hash,
} = {}) {
  const definitions = demoUserDefinitions(env).map((definition) => ({
    ...definition,
    model: models[definition.role],
  }));

  await mongooseClient.connect(env.MONGODB_URI);
  try {
    const results = [];
    for (const definition of definitions) {
      results.push(
        await ensureDemoUser({
          UserModel: models.User,
          definition,
          hashPassword,
        }),
      );
    }
    return results;
  } finally {
    await mongooseClient.disconnect();
  }
}

async function main() {
  const results = await seedDemoUsers();
  for (const result of results) {
    console.log(`${result.created ? "Created" : "Already exists"} ${result.role}: ${result.email}`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Demo user seed failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  DEMO_ENV_VARS,
  PASSWORD_ROUNDS,
  demoUserDefinitions,
  ensureDemoUser,
  seedDemoUsers,
  validateSeedEnvironment,
};
