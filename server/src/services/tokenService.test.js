const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

process.env.JWT_SECRET ||= "drive-pilot-password-reset-test-secret-32-characters";
const { generateResetToken, resetTokenHash, encryptResetToken, decryptResetToken, createAuthToken } = require("./tokenService");
const jwt = require("jsonwebtoken");

test("reset tokens are unpredictable, hashed, encrypted at rest, and recoverable for outbox delivery", () => {
  const first = generateResetToken();
  const second = generateResetToken();
  assert.notEqual(first.resetToken, second.resetToken);
  assert.match(first.resetToken, /^[a-f0-9]{64}$/);
  assert.equal(resetTokenHash(first.resetToken), crypto.createHash("sha256").update(first.resetToken).digest("hex"));
  const encrypted = encryptResetToken(first.resetToken);
  assert.match(encrypted, /^enc1:/);
  assert.equal(encrypted.includes(first.resetToken), false);
  assert.equal(decryptResetToken(encrypted), first.resetToken);
  assert.equal(decryptResetToken(first.resetToken), first.resetToken);
  assert.ok(first.resetTokenExpiry > Date.now());
  assert.ok(first.resetTokenExpiry <= Date.now() + 30 * 60_000);
});

test("reset tokens cannot be decrypted with a tampered authentication tag", () => {
  const encrypted = encryptResetToken(generateResetToken().resetToken);
  const parts = encrypted.split(":");
  parts[2] = Buffer.alloc(16).toString("base64url");
  assert.throws(() => decryptResetToken(parts.join(":")));
});

test("authentication JWTs include a revocable account version", () => {
  const token = createAuthToken({ id: "user", email: "test@example.com", role: "Student", authVersion: 2 });
  assert.equal(jwt.verify(token, process.env.JWT_SECRET).authVersion, 2);
});
