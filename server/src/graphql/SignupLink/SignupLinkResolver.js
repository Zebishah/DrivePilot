// const SignupToken = require("../../models/SignupLink");
// const { v4: uuidv4 } = require("uuid");
// const { AuthenticationError } = require("apollo-server-express");

// const SignupLinkResolver = {
//   Query: {
//     getAllSignupLinks: async () => {
//       try {
//         const signupLinks = await SignupToken.find({}).sort({
//           signupDate: -1,
//         });
//         return signupLinks;
//       } catch (error) {
//         console.error("Error fetching signup links:", error);
//         throw new Error("Error fetching signup links.");
//       }
//     },
//     getSignupTokenDetails: async (_, { token }) => {
//       try {
//         const signupToken = await SignupToken.findOne({ token });
//         if (!signupToken) {
//           throw new Error("Invalid or expired token");
//         }
//         if (!signupToken.pending) {
//           throw new Error("This signup link has already been used.");
//         }
//         return {
//           email: signupToken.email,
//           name: signupToken.name,
//           token: signupToken.token,
//           signupDate: signupToken.signupDate,
//           pending: signupToken.pending,
//           id: signupToken.id,
//         };
//       } catch (err) {
//         console.error("Error fetching token data:", err);
//         throw new Error("An error occurred while fetching the token data.");
//       }
//     },
//   },
//   Mutation: {
//     createSignUpLink: async (_, { name, email }) => {
//       const emailInUse = await SignupToken.findOne({ email });
//       if (emailInUse) {
//         throw new Error("This email is already in use.");
//       }

//       const token = uuidv4();
//       const baseUrl = process.env.Frontend_URL || "http://localhost:5137";
//       const signupLink = `${baseUrl}/signup/${token}`;

//       const newSignupToken = new SignupToken({
//         name,
//         email,
//         token,
//         signupDate: new Date().toISOString(),
//         pending: true,
//         signupLink,
//       });

//       await newSignupToken.save();

//       return {
//         id: newSignupToken._id,
//         signupLink,
//         email,
//         token,
//         signupDate: newSignupToken.signupDate,
//         pending: newSignupToken.pending,
//       };
//     },
//     deleteSignUpLink: async (_, { id }, context) => {
//       const deletedLink = await SignupToken.findByIdAndDelete(id);
//       if (!deletedLink) {
//         return {
//           success: false,
//           message: "Signup link not found.",
//         };
//       }
//       return {
//         success: true,
//         message: "Signup link deleted successfully.",
//       };
//     },
//     updateSignupLinkStatus: async (_, { id, pending }) => {
//       try {
//         const updatedLink = await SignupToken.findByIdAndUpdate(
//           id,
//           { pending },
//           { new: true }
//         );

//         if (!updatedLink) {
//           throw new Error("Signup link not found.");
//         }

//         return updatedLink;
//       } catch (error) {
//         console.error("Error updating signup link status:", error);
//         throw new Error(
//           "An error occurred while updating the signup link status."
//         );
//       }
//     },
//   },
// };

// module.exports = SignupLinkResolver;

const SignupToken = require("../../models/SignupLink");
const { v4: uuidv4 } = require("uuid");
const { AuthenticationError } = require("apollo-server-express");

const SignupLinkResolver = {
  Query: {
    getAllSignupLinks: async () => {
      try {
        const signupLinks = await SignupToken.find({}).sort({
          signupDate: -1,
        });
        return signupLinks;
      } catch (error) {
        console.error("Error fetching signup links:", error);
        throw new Error("Error fetching signup links.");
      }
    },
    getSignupTokenDetails: async (_, { token }) => {
      try {
        const signupToken = await SignupToken.findOne({ token });
        if (!signupToken) {
          throw new Error("Invalid or expired token");
        }
        if (!signupToken.pending) {
          throw new Error("This signup link has already been used.");
        }
        return {
          id: signupToken.id,
          email: signupToken.email,
          firstName: signupToken.firstName,
          lastName: signupToken.lastName,
          token: signupToken.token,
          signupDate: signupToken.signupDate,
          pending: signupToken.pending,
        };
      } catch (err) {
        console.error("Error fetching token data:", err);
        throw new Error("An error occurred while fetching the token data.");
      }
    },
  },
  Mutation: {
    createSignUpLink: async (_, { firstName, lastName, email }) => {
      const emailInUse = await SignupToken.findOne({ email });
      if (emailInUse) {
        throw new Error("This email is already in use.");
      }

      const token = uuidv4();
      const baseUrl = process.env.Frontend_URL || "http://localhost:5137";
      const signupLink = `${baseUrl}/signup/${token}`;

      const newSignupToken = new SignupToken({
        firstName,
        lastName,
        email,
        token,
        signupDate: new Date().toISOString(),
        pending: true,
        signupLink,
      });

      await newSignupToken.save();

      return {
        id: newSignupToken._id,
        signupLink,
        email,
        firstName: newSignupToken.firstName,
        lastName: newSignupToken.lastName,
        token,
        signupDate: newSignupToken.signupDate,
        pending: newSignupToken.pending,
      };
    },
    deleteSignUpLink: async (_, { id }, context) => {
      const deletedLink = await SignupToken.findByIdAndDelete(id);
      if (!deletedLink) {
        return {
          success: false,
          message: "Signup link not found.",
        };
      }
      return {
        success: true,
        message: "Signup link deleted successfully.",
      };
    },
    updateSignupLinkStatus: async (_, { id, pending }) => {
      try {
        const updatedLink = await SignupToken.findByIdAndUpdate(
          id,
          { pending },
          { new: true }
        );

        if (!updatedLink) {
          throw new Error("Signup link not found.");
        }

        return updatedLink;
      } catch (error) {
        console.error("Error updating signup link status:", error);
        throw new Error(
          "An error occurred while updating the signup link status."
        );
      }
    },
  },
};

module.exports = SignupLinkResolver;
