const test = require("node:test");
const assert = require("node:assert/strict");
const { Otp } = require("../models/User");
const { generateOTP } = require("./SendOtpEmail");

test("generateOTP always returns six numeric characters, including leading zeros", () => {
  const originalRandomInt = require("crypto").randomInt;
  require("crypto").randomInt = () => 81305;

  try {
    assert.equal(generateOTP(), "081305");
  } finally {
    require("crypto").randomInt = originalRandomInt;
  }

  for (let index = 0; index < 50; index += 1) {
    assert.match(generateOTP(), /^\d{6}$/);
  }
});

test("OTP persistence uses a string field with six-digit validation", () => {
  const otpPath = Otp.schema.path("otp");
  assert.equal(otpPath.instance, "String");
  assert.ok(otpPath.validators.some((validator) => validator.type === "regexp"));
});
