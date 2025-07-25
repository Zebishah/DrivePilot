export type UserRole = "student" | "instructor";

export interface BaseUserType {
  _id: string;
  name: string;
  email?: string;
  role: UserRole;
  profileImage?: string;
}

export interface StudentUserType extends BaseUserType {
  role: "student";
}

export interface InstructorUserType extends BaseUserType {
  role: "instructor";
}

export type UserType = StudentUserType | InstructorUserType;

export interface MessageType {
  _id: string;
  content: string;
  sender: UserType;
  conversationId: string;
  createdAt?: string;
}

// This is what ChatList expects
export interface Conversation {
  _id: string;
  user: UserType;
}

export interface ConversationType {
  _id: string;
  user: {
    name: string;
    email?: string;
    profileImage?: string;
  };
  createdAt: string;
  updatedAt?: string;
}
