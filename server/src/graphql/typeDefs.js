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
    createdAt: String
    reSubmitted: String
  }
  type DocumentStudent {
    documentType: String!
    documentUrl: String!
    status: String!
    createdAt: String
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
    verificationStatus: String
    phone: String
    documents: [Document!]
    coordinates: Coordinates
    carName: String
    transmissionType: String
    gender: String
    isUserVerified: Boolean
    isUserAuthenticated: Boolean
  }
  type InstructorWithDetails implements User {
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
    verificationStatus: String
    lessonPrice: Float
    studentCount: Int
    reviewsCount: Int
    reviewRating: Float
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

  type StripeAccountSnapshot {
    accountId: String
    chargesEnabled: Boolean!
    payoutsEnabled: Boolean!
    detailsSubmitted: Boolean!
    lastSyncedAt: String
  }
  type StripeFinancialStatusSnapshot {
    hasDisputes: Boolean!
    payoutsBlocked: Boolean!
    currentlyDueRequirements: Boolean!
    lastWebhookSync: String
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
    reviewRating: Float
    reviewsCount: Int
    onboardingStatus: String
    isActive: Boolean
    stripeAccount: StripeAccountSnapshot
    stripeFinancialStatus: StripeFinancialStatusSnapshot
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
    createdAt: String
    reSubmitted: String
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
    status: String!
    documentType: String!
    documentUrl: String!
    createdAt: String
    reSubmitted: String
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
    createdAt: String
    reSubmitted: String
  }

  type StudentWithLessonStats {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    phone: String
    profileImage: String
    location: String
    address: String
    zipCode: String
    createdAt: String
    updatedAt: String
    dateOfBirth: String
    isUserVerified: Boolean
    languagePreference: [String]
    documents: [DocumentStudent]
    totalLessons: Int
    bookedLessons: Int
    cancelledLessons: Int
    remainingHours: String
    lastLesson: String
  }
  type DeleteStudentsResponse {
    success: Boolean!
    message: String!
  }
  type DeleteInstructorsResponse {
    success: Boolean!
    message: String!
  }
  type CreateStripeAccountPayload {
    success: Boolean!
    message: String
    onboardingUrl: String
    onboardingStatus: String
  }
  type VerifyStripeOnboardingPayload {
    success: Boolean!
    message: String
    onboardingStatus: String
    chargesEnabled: Boolean
    payoutsEnabled: Boolean
  }
  type RegenerateStripeLinkPayload {
    success: Boolean!
    message: String
    onboardingUrl: String
  }
  type StripeExpressDashboardPayload {
    url: String!
  }
  type SetPayoutSchedulePayload {
    success: Boolean!
    message: String
  }
  enum DocumentStatus {
    pending
    accepted
    rejected
  }
  type Query {
    allInstructors: [Instructor!]!
    allInstructorsWithDetails: [InstructorWithDetails!]
    getInstructorDocuments(instructorId: ID!): InstructorDocumentsResponse!
    allStudentsWithLessonStats: [StudentWithLessonStats!]
    getStripeExpressDashboardUrl: StripeExpressDashboardPayload!
  }
  type Mutation {
    signUp(input: SignUpInput!): AuthPayload!
    updateInstructorVerificationStatus(id: ID!, status: String!): Instructor!

    verifyUser(input: userVerifyInput!): verifiedAuthPayload!
    resendOtp(input: resendOtpInput!): resendOtpPayload!
    selectRole(role: UserRole!): AuthPayload!

    setupStudentProfile(input: StudentProfileInput!): Student!
    setupInstructorProfile(input: InstructorProfileInput!): Instructor!
    updateTeacherProfile(
      input: UpdateInstructorProfileInput!
    ): InstructorProfile!
    deleteStudents(studentIds: [ID!]!): DeleteStudentsResponse!
    deleteInstructors(instructorIds: [ID!]!): DeleteInstructorsResponse!
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
    updateDocumentStatusStudent(
      studentId: ID!
      documentType: String!
      status: DocumentStatus!
    ): Student
    forgotPassword(email: String!): PasswordResetResponse!
    resetPassword(token: String!, newPassword: String!): PasswordResetResponse!
    changePassword(
      currentPassword: String!
      newPassword: String!
    ): PasswordResetResponse!
    createStripeAccount: CreateStripeAccountPayload!
    verifyStripeOnboarding: VerifyStripeOnboardingPayload!
    regenerateStripeLink: RegenerateStripeLinkPayload!
    setInstructorPayoutToManual(instructorId: ID!): SetPayoutSchedulePayload!
  }
`;

module.exports = typeDefs;
