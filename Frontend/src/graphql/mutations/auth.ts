import { gql } from "@apollo/client";

export const SIGN_UP_MUTATION = gql`
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) {
      token
      user {
        id
        email
        firstName
        lastName
      }
    }
  }
`;

export const SELECT_ROLE_MUTATION = gql`
  mutation SelectRole($role: UserRole!) {
    selectRole(role: $role) {
      token
      user {
        id
        email
        firstName
        lastName
        role
      }
    }
  }
`;

export const SETUP_STUDENT_PROFILE = gql`
  mutation SetupStudentProfile($input: StudentProfileInput!) {
    setupStudentProfile(input: $input) {
      id
      firstName
      lastName
      email
      role
      isProfileComplete
      homeAddress
      location
      zipCode
      documentType
      documentUrl
    }
  }
`;

export const SIGN_IN = gql`
  mutation SignIn($email: String!, $password: String!) {
    signIn(email: $email, password: $password) {
      token
      user {
        id
        email
        firstName
        lastName
        role
        isProfileComplete
      }
    }
  }
`;

export const SETUP_INSTRUCTOR_PROFILE = gql`
  mutation SetupInstructorProfile($input: InstructorProfileInput!) {
    setupInstructorProfile(input: $input) {
      id
      firstName
      lastName
      email
      role
      isProfileComplete
      address
      location
      zipCode
      description
      experience
      documents {
        documentType
        documentUrl
      }
      phone
    }
  }
`;

export const GENERATE_UPLOAD_URL = gql`
  mutation GenerateUploadUrl(
    $userId: String!
    $role: String!
    $fileName: String!
    $fileType: String!
  ) {
    generateUploadUrl(
      userId: $userId
      role: $role
      fileName: $fileName
      fileType: $fileType
    ) {
      uploadUrl
      fileUrl
    }
  }
`;

export const FORGOT_PASSWORD = gql`
  mutation ForgotPassword($email: String!) {
    forgotPassword(email: $email) {
      success
      message
    }
  }
`;

export const RESET_PASSWORD = gql`
  mutation ResetPassword($token: String!, $newPassword: String!) {
    resetPassword(token: $token, newPassword: $newPassword) {
      success
      message
      token
    }
  }
`;

export const CHANGE_PASSWORD = gql`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(
      currentPassword: $currentPassword
      newPassword: $newPassword
    ) {
      success
      message
    }
  }
`;

export const CREATE_SIGNUP_LINK = gql`
  mutation CreateSignUpLink(
    $firstName: String!
    $lastName: String!
    $email: String!
  ) {
    createSignUpLink(
      firstName: $firstName
      lastName: $lastName
      email: $email
    ) {
      id
      signupLink
      email
      firstName
      lastName
      token
      signupDate
      pending
    }
  }
`;

export const DELETE_SIGNUP_LINK = gql`
  mutation DeleteSignUpLink($id: ID!) {
    deleteSignUpLink(id: $id) {
      success
      message
    }
  }
`;

export const GET_ALL_SIGNUP_LINKS = gql`
  query GetAllSignupLinks {
    getAllSignupLinks {
      id
      firstName
      lastName
      email
      token
      signupDate
      pending
      signupLink
    }
  }
`;

export const GET_SIGNUP_TOKEN_DETAILS = gql`
  query GetSignupTokenDetails($token: String!) {
    getSignupTokenDetails(token: $token) {
      email
      firstName
      lastName
      token
      signupDate
      pending
      error
      id
    }
  }
`;

export const UPDATE_SIGNUP_LINK_STATUS = gql`
  mutation UpdateSignupLinkStatus($id: ID!, $pending: Boolean!) {
    updateSignupLinkStatus(id: $id, pending: $pending) {
      id
      pending
    }
  }
`;
