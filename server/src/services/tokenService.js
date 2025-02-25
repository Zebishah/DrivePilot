// services/tokenService.js

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { User } = require("../models/User");

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
  const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

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
  return await User.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: Date.now() }, // Token must not be expired
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
    resetTokenExpiry: null,
  });
};

module.exports = {
  createAuthToken,
  generateResetToken,
  verifyResetToken,
  clearResetToken,
};
