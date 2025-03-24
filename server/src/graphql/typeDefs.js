const { gql } = require("apollo-server-express");

const typeDefs = gql`
  enum UserRole {
    Student
    Instructor
    Admin
    UserBase
  }

  enum AuthProvider {
    local
    google
    facebook
  }

  type FileUploadResponse {
    uploadUrl: String!
    fileUrl: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  interface User {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    role: UserRole
    isProfileComplete: Boolean!
    authProvider: AuthProvider!
    createdAt: String!
    updatedAt: String!
  }

  type Student implements User {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    role: UserRole!
    isProfileComplete: Boolean!
    authProvider: AuthProvider!
    createdAt: String!
    updatedAt: String!
    homeAddress: String
    location: String
    zipCode: String
    documentType: String
    documentUrl: String
    paymentInfo: PaymentInfo
  }

  type Instructor implements User {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    role: UserRole!
    isProfileComplete: Boolean!
    authProvider: AuthProvider!
    createdAt: String!
    updatedAt: String!
    address: String
    location: String
    zipCode: String
    description: String
    experience: String
    phone: String
    documents: [Document!]
  }
  type Admin implements User {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    role: UserRole!
    isProfileComplete: Boolean!
    authProvider: AuthProvider!
    createdAt: String!
    updatedAt: String!
    adminLevel: String! # Either "super" or "regular"
  }
  type Document {
    documentType: String!
    documentUrl: String!
  }
  type InstructorProfile {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    phone: String
    location: String
    experience: String
    description: String
    address: String
    zipCode: String
    documents: [Document!]
    fatherName: String
    dateOfBirth: String
    languagePreference: String
  }
  type UserBase implements User {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    role: UserRole
    isProfileComplete: Boolean!
    authProvider: AuthProvider!
    createdAt: String!
    updatedAt: String!
  }

  type PaymentInfo {
    isPaid: Boolean!
    paymentDate: String
  }

  input SignUpInput {
    firstName: String!
    lastName: String!
    email: String!
    password: String!
    agreeToTerms: Boolean!
  }

  input StudentProfileInput {
    homeAddress: String!
    location: String!
    zipCode: String!
    documentType: String!
    documentUrl: String
  }

  input InstructorProfileInput {
    firstName: String!
    lastName: String!
    address: String!
    location: String!
    zipCode: String!
    description: String
    experience: String
    documents: [DocumentInput!]!
    phone: String
    documentUrl: String
  }

  input UpdateInstructorProfileInput {
    firstName: String
    lastName: String
    address: String
    location: String
    zipCode: String
    description: String
    experience: String
    documents: [DocumentInput!]
    phone: String
    documentUrl: String
    fatherName: String
    dateOfBirth: String
    languagePreference: String
  }

  input DocumentInput {
    documentType: String!
    documentUrl: String!
  }
  type Query {
    me: User
    teacherProfile: InstructorProfile
  }

  type PasswordResetResponse {
    success: Boolean!
    message: String!
    token: String
  }

  type Mutation {
    signUp(input: SignUpInput!): AuthPayload!
    selectRole(role: UserRole!): AuthPayload!
    setupStudentProfile(input: StudentProfileInput!): Student!
    setupInstructorProfile(input: InstructorProfileInput!): Instructor!
    updateTeacherProfile(input: UpdateInstructorProfileInput!): InstructorProfile!
    signIn(email: String!, password: String!): AuthPayload!
    generateUploadUrl(
      userId: String!
      role: String!
      fileName: String!
      fileType: String!
    ): FileUploadResponse!

    forgotPassword(email: String!): PasswordResetResponse!
    resetPassword(token: String!, newPassword: String!): PasswordResetResponse!
    changePassword(
      currentPassword: String!
      newPassword: String!
    ): PasswordResetResponse!
  }
`;

module.exports = typeDefs;
