const jwt = require("jsonwebtoken");
const { AuthenticationError } = require("apollo-server-express");

const authMiddleware = async (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return { user: null };
  }

  try {
    const token = authHeader.split(" ")[1];
    if (!token) {
      return { user: null };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { user: decoded };
  } catch (err) {
    throw new AuthenticationError("Invalid/Expired token");
  }
};

module.exports = authMiddleware;
