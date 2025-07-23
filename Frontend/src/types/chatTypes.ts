export interface UserType {
  _id: string;
  name: string;
  role: 'student' | 'instructor';
  email?: string;
}

export interface ConversationType {
  _id: string;
  participants: UserType[];
}

export interface MessageType {
  _id: string;
  content: string;
  sender: UserType;
  conversationId: string;
  createdAt?: string;
}
