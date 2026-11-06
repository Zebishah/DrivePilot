export interface SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  agreeToTerms: boolean;
}

export interface AuthPayload {
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isProfileComplete: boolean;
    isUserVerified: boolean;
    isUserAuthenticated: boolean;
    profileImage?: string;
    adminLevel?: string;
    isDemo?: boolean;
    token: string;
  };
}
export interface TempAuthPayload {
  success: boolean;
  token: string;
  tempUserData: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isUserVerified: boolean;
    adminLevel?: string;
    isUserAuthenticated: boolean;
    isProfileComplete: boolean;
    token: string;
  };
}

export enum UserRole {
  Student = "Student",
  Instructor = "Instructor",
  Admin = "Admin",
  UserBase = "UserBase",
}
