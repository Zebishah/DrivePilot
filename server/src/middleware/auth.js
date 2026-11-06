const jwt = require("jsonwebtoken");

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
    return {
      user: {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        isDemo: Boolean(decoded.isDemo),
      },
    };
  } catch (err) {
    // Treat bad/expired tokens as logged out. Throwing here blocks public
    // mutations like SignIn when the browser still has an old cookie.
    return { user: null };
  }
};

module.exports = authMiddleware;
