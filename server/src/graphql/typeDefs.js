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
    success: Boolean!
    token: String
    user: User!
  }
  type verifiedAuthPayload {
    success: Boolean!
    token: String!
    user: User!
  }
  type resendOtpPayload {
    success: Boolean!
    message: String!
    email: String!
  }
  type Coordinates {
    type: String!
    coordinates: [Float!]!
  }

  input CoordinatesInput {
    type: String!
    coordinates: [Float!]!
  }
  type Document {
    _id: ID
    documentType: String!
    documentUrl: String!
    status: String
  }
  interface User {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    role: UserRole
    isProfileComplete: Boolean!
    isUserVerified: Boolean
    profileImage: String
    adminLevel: String
    isUserAuthenticated: Boolean
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
    adminLevel: String
    createdAt: String!
    updatedAt: String!
    homeAddress: String
    location: String
    profileImage: String
    zipCode: String
    documentType: String # Keep for backward compatibility
    documentUrl: String # Keep for backward compatibility
    documents: [Document!] # Add this for multiple documents
    paymentInfo: PaymentInfo
    isUserVerified: Boolean
    isUserAuthenticated: Boolean
  }
  input StudentProfileInput {
    homeAddress: String!
    location: String!
    zipCode: String!
    documents: [DocumentInput!]! # Required array
  }

  type Instructor implements User {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    role: UserRole!
    isProfileComplete: Boolean!
    authProvider: AuthProvider!
    adminLevel: String
    createdAt: String!
    updatedAt: String!
    address: String
    location: String
    zipCode: String
    profileImage: String
    description: String
    experience: String
    phone: String
    documents: [Document!]
    coordinates: Coordinates
    carName: String
    transmissionType: String
    gender: String
    isUserVerified: Boolean
    isUserAuthenticated: Boolean
  }
  type Admin implements User {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    role: UserRole!
    isProfileComplete: Boolean!
    profileImage: String
    authProvider: AuthProvider!
    createdAt: String!
    isUserVerified: Boolean
    isUserAuthenticated: Boolean
    updatedAt: String!
    adminLevel: String! # Either "super" or "regular"
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
    profileImage: String
    address: String
    zipCode: String
    documents: [Document!]
    dateOfBirth: String
    languagePreference: [String] # Changed from String to [String]
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
    profileImage: String
    adminLevel: String
    isUserVerified: Boolean
    isUserAuthenticated: Boolean
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
  input userVerifyInput {
    email: String!
    otp: String!
    type: String!
  }
  input resendOtpInput {
    email: String!
    type: String!
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
    coordinates: CoordinatesInput
    carName: String
    transmissionType: String
    gender: String
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
    profileImage: String
    dateOfBirth: String
    languagePreference: [String] # Changed from String to [String]
  }

  input DocumentInput {
    status: String!
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
  type StudentProfile {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    phone: String
    profileImage: String
    location: String
    description: String
    homeAddress: String
    zipCode: String
    fatherName: String
    dateOfBirth: String
    documents: [Document!]
    languagePreference: [String] # Changed from String to [String]
  }
  input UpdateStudentProfileInput {
    firstName: String
    lastName: String
    homeAddress: String
    location: String
    zipCode: String
    description: String
    fatherName: String
    phone: String
    documents: [DocumentInput!]
    documentUrl: String
    profileImage: String
    dateOfBirth: String
    languagePreference: [String] # Changed from String to [String]
  }
  input UpdateInstructorDocumentsInput {
    instructorId: ID!
    documents: [DocumentInput!]!
  }

  input DocumentInput {
    documentType: String!
    documentUrl: String!
  }

  type InstructorDocumentsResponse {
    _id: ID!
    documents: [InstructorDocument!]!
  }

  type InstructorDocument {
    _id: ID!
    documentType: String!
    documentUrl: String!
    status: String!
  }

  type Query {
    allInstructors: [Instructor!]!
    getInstructorDocuments(instructorId: ID!): InstructorDocumentsResponse!
  }
  type Mutation {
    signUp(input: SignUpInput!): AuthPayload!
    verifyUser(input: userVerifyInput!): verifiedAuthPayload!
    resendOtp(input: resendOtpInput!): resendOtpPayload!
    selectRole(role: UserRole!): AuthPayload!

    setupStudentProfile(input: StudentProfileInput!): Student!
    setupInstructorProfile(input: InstructorProfileInput!): Instructor!
    updateTeacherProfile(
      input: UpdateInstructorProfileInput!
    ): InstructorProfile!
    updateStudentProfile(input: UpdateStudentProfileInput!): StudentProfile!
    signIn(email: String!, password: String!): AuthPayload!
    generateUploadUrl(
      userId: String!
      role: String!
      fileName: String!
      fileType: String!
    ): FileUploadResponse!
    updateInstructorDocuments(
      input: UpdateInstructorDocumentsInput!
    ): InstructorDocumentsResponse!

    updateDocumentStatus(documentId: ID!, status: String!): InstructorDocument!
    forgotPassword(email: String!): PasswordResetResponse!
    resetPassword(token: String!, newPassword: String!): PasswordResetResponse!
    changePassword(
      currentPassword: String!
      newPassword: String!
    ): PasswordResetResponse!
  }
`;

module.exports = typeDefs;
