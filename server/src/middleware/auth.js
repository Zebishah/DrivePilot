const jwt = require("jsonwebtoken");
const { User } = require("../models/User");

const authMiddleware = async (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return { user: null };
  }

  try {
    const token = authHeader.split(" ")[1];
    if (!token || token === "undefined" || token === "null") {
      return { user: null };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const account = await User.findById(decoded.id);
    if (!account || (account.authVersion || 0) !== (decoded.authVersion || 0)) return { user: null };
    return {
      user: {
        id: account.id,
        email: account.email,
        role: account.role,
        isDemo: Boolean(account.isDemo),
      },
    };
  } catch (err) {
    // Treat bad/expired tokens as logged out. Throwing here blocks public
    // mutations like SignIn when the browser still has an old cookie.
    return { user: null };
  }
};

module.exports = authMiddleware;
