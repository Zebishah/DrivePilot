export interface UserType {
  _id: string;
  name: string;
  role: "student" | "instructor"; // strictly typed
  email?: string;
}

export interface MessageType {
  _id: string;
  content: string;
  sender: UserType;
  conversationId: string;
  createdAt?: string;
}
