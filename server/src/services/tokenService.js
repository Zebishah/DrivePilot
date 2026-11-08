// services/tokenService.js

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { User } = require("../models/User");

function resetTokenHash(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function resetTokenKey() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters for password reset encryption");
  }
  return crypto.createHash("sha256").update("drive-pilot:reset-token:v1:").update(process.env.JWT_SECRET).digest();
}

function encryptResetToken(raw) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", resetTokenKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(raw, "utf8"), cipher.final()]);
  return ["enc1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(":");
}

function decryptResetToken(value) {
  if (/^[a-f0-9]{64}$/.test(value || "")) return value; // legacy, already-issued links
  const parts = String(value || "").split(":");
  if (parts.length !== 4 || parts[0] !== "enc1") throw new Error("Invalid reset-token envelope");
  const decipher = crypto.createDecipheriv("aes-256-gcm", resetTokenKey(), Buffer.from(parts[1], "base64url"));
  decipher.setAuthTag(Buffer.from(parts[2], "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(parts[3], "base64url")), decipher.final()]).toString("utf8");
}

/**
 * Generate a JWT for authentication
 * @param {Object} user - User object
 * @returns {string} - JWT token
 */
const createAuthToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      authVersion: user.authVersion || 0,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

/**
 * Generate a reset token for password recovery
 * @returns {Object} - Reset token and expiry
 */
const generateResetToken = () => {
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = Date.now() + 30 * 60 * 1000; // 30 minutes

  return {
    resetToken,
    resetTokenExpiry,
  };
};

/**
 * Verify a password reset token
 * @param {string} token - The reset token to verify
 * @returns {Promise<Object|null>} - User object if token is valid, null otherwise
 */
const verifyResetToken = async (token) => {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return null;
  return User.findOne({
    $or: [{ resetTokenHash: resetTokenHash(token) }, { resetToken: token }],
    resetTokenExpiry: { $gt: new Date() },
  });
};

/**
 * Clear reset token after use
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
const clearResetToken = async (userId) => {
  await User.findByIdAndUpdate(userId, {
    resetToken: null,
    resetTokenHash: null,
    resetTokenExpiry: null,
    resetTokenSentAt: null,
  });
};

module.exports = {
  createAuthToken,
  generateResetToken,
  verifyResetToken,
  clearResetToken,
  resetTokenHash,
  encryptResetToken,
  decryptResetToken,
};
