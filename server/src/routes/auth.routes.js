const express = require("express");
const passport = require("../config/passport");
const jwt = require("jsonwebtoken");

const router = express.Router();

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const token = jwt.sign(
      {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        isProfileComplete: req.user.isProfileComplete,
        role: req.user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Ensure proper formatting of the frontend URL
    const frontendURL = process.env.Frontend_URL;
    res
      .status(307)
      .redirect(
        `${frontendURL}/auth/auth-success?token=${encodeURIComponent(token)}`
      );
  }
);

router.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

router.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", { session: false }),
  (req, res) => {
    console.log("auth at callback", req.user);
    const token = jwt.sign(
      {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        isProfileComplete: req.user.isProfileComplete,
        role: req.user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Ensure proper formatting of the frontend URL
    const frontendURL = process.env.Frontend_URL;
    // Use an absolute URL (res.redirect automatically appends relative paths if not formatted correctly)
    res
      .status(307)
      .redirect(
        `${frontendURL}/auth/auth-success?token=${encodeURIComponent(token)}`
      );
  }
);

module.exports = router;
