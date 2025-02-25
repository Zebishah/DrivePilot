export interface SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  agreeToTerms: boolean;
}

export interface AuthPayload {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export enum UserRole {
  Student = "Student",
  Instructor = "Instructor",
  Admin = "Admin",
  UserBase = "UserBase",
}
