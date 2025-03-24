const z = require("zod");

const signUpSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string(),
  // .min(8, "Password must be at least 8 characters")
  // .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  // .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  // .regex(/[0-9]/, "Password must contain at least one number"),

  agreeToTerms: z.boolean().refine((value) => value === true, {
    message: "You must agree to the Terms of Use and Privacy Policy",
  }),
});

const studentProfileSchema = z.object({
  homeAddress: z.string().min(1, "Home address is required"),
  location: z.string().min(1, "Location is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  documentType: z.string().min(1, "Document type is required"),
  documentUrl: z.string().optional(),
});

const instructorProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  address: z.string().min(1, "Address is required"),
  location: z.string().min(1, "Location is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  description: z.string().optional(),
  experience: z.string().optional(),
  documentType: z.string().optional(),
  documentUrl: z.string().optional(),
});

const updateInstructorProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  address: z.string().min(1, "Address is required").optional(),
  location: z.string().min(1, "Location is required").optional(),
  zipCode: z.string().min(1, "ZIP code is required").optional(),
  description: z.string().optional(),
  experience: z.string().optional(),
  documents: z.array(z.object({
    documentType: z.string(),
    documentUrl: z.string()
  })).optional(),
  phone: z.string().optional(),
  fatherName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  languagePreference: z.string().optional()
}).refine((data) => {
  // If any field is provided, it must be valid
  return Object.keys(data).length > 0;
}, {
  message: "At least one field must be provided for update",
  path: ["input"]
});

const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

module.exports = {
  signUpSchema,
  studentProfileSchema,
  instructorProfileSchema,
  updateInstructorProfileSchema,
  resetPasswordSchema,
};
