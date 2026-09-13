const express = require("express");
const passport = require("../config/passport");
const jwt = require("jsonwebtoken");

const router = express.Router();
const frontendBase = (
  process.env.FRONTEND_URL ||
  process.env.Frontend_URL ||
  "http://localhost:5173"
).replace(/\/$/, "");

router.get(
  "/auth/google",
  passport.oauthProviders.google
    ? passport.authenticate("google", { scope: ["profile", "email"] })
    : (_req, res) =>
        res.status(404).json({ error: "Google OAuth is not configured" }),
);
router.get(
  "/auth/google/callback",
  passport.oauthProviders.google
    ? passport.authenticate("google", { session: false })
    : (_req, res) =>
        res.status(404).json({ error: "Google OAuth is not configured" }),
  (req, res) => {
    // if (req?.user.authProvider !== "google") {
    //   return res.redirect(
    //     `${process.env.Frontend_URL}/auth/signin?error=${encodeURIComponent(
    //       "Email already registered with a different method."
    //     )}`
    //   );
    // }

    const token = jwt.sign(
      {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        isProfileComplete: req.user.isProfileComplete,
        role: req.user.role,
        isUserVerified: req.user.isUserVerified,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    // Ensure proper formatting of the frontend URL
    res
      .status(307)
      .redirect(
        `${frontendBase}/auth/auth-success?token=${encodeURIComponent(token)}`,
      );
  },
);

router.get(
  "/auth/facebook",
  passport.oauthProviders.facebook
    ? passport.authenticate("facebook", { scope: ["email"] })
    : (_req, res) =>
        res.status(404).json({ error: "Facebook OAuth is not configured" }),
);

router.get(
  "/auth/facebook/callback",
  passport.oauthProviders.facebook
    ? passport.authenticate("facebook", { session: false })
    : (_req, res) =>
        res.status(404).json({ error: "Facebook OAuth is not configured" }),
  (req, res) => {
    const token = jwt.sign(
      {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        isProfileComplete: req.user.isProfileComplete,
        role: req.user.role,
        isUserVerified: req.user.isUserVerified,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    // Ensure proper formatting of the frontend URL
    res
      .status(307)
      .redirect(
        `${frontendBase}/auth/auth-success?token=${encodeURIComponent(token)}`,
      );
  },
);

module.exports = router;
