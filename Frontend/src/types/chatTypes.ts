export type UserRole = "student" | "instructor" | "admin";

export interface BaseUserType {
  _id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  role: UserRole;
  profileImage?: string;
}

export interface MessageType {
  _id: string;
  content: string;
  sender: BaseUserType;
  receiver: BaseUserType;
  conversationId: string;
  createdAt: string;
}
