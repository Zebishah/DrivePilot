const passport = require("passport");
const { User } = require("../models/User");

function hasProviderCredentials(clientId, clientSecret) {
  return Boolean(
    String(clientId || "").trim() && String(clientSecret || "").trim(),
  );
}

const googleOAuthEnabled = hasProviderCredentials(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
);
const facebookOAuthEnabled = hasProviderCredentials(
  process.env.FACEBOOK_APP_ID,
  process.env.FACEBOOK_APP_SECRET,
);

if (googleOAuthEnabled) {
  const GoogleStrategy = require("passport-google-oauth20").Strategy;
  passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({
          email: profile.emails[0].value,
        });

        if (!user) {
          user = await User.create({
            email: profile.emails[0].value,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            authProvider: "google",
            providerId: profile.id,
            password: "GOOGLE_AUTH",
            isUserVerified: true, // Automatically verify user
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
    ),
  );
}

if (facebookOAuthEnabled) {
  const FacebookStrategy = require("passport-facebook").Strategy;
  passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "/auth/facebook/callback",
      profileFields: ["id", "emails", "name"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({
          email: profile.emails[0].value,
        });

        if (!user) {
          user = await User.create({
            email: profile.emails[0].value,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            authProvider: "facebook",
            providerId: profile.id,
            password: "FACEBOOK_AUTH",
            isUserVerified: true, // Automatically verify user
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
    ),
  );
}

passport.oauthProviders = {
  google: googleOAuthEnabled,
  facebook: facebookOAuthEnabled,
};

module.exports = passport;
