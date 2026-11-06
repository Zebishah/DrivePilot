export interface UserType {
  _id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImage?: string;
  role?: string;
}

export interface MessageType {
  _id: string;
  content: string;
  conversationId: string;
  createdAt: string | undefined;
  sender: UserType;
  receiver: UserType;
}

export interface ConversationType {
  _id: string;
  participants?: UserType[];
  user: UserType;
  createdAt?: string;
  updatedAt?: string;
  lastMessage?: {
    content: string;
    createdAt: string;
    sender: UserType;
  };
}
