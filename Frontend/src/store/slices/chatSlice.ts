import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MessageType, UserType } from "../../types/chatTypes"; // Adjust the path

export type UserRole = "Student" | "Instructor" | "UserBase";

export interface Conversation {
  _id: string;
  user: UserType;
  lastMessage?: string;
}

interface ChatState {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  messages: MessageType[];
}

const initialState: ChatState = {
  conversations: [],
  selectedConversation: null,
  messages: [],
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
    },
    selectConversation: (state, action: PayloadAction<Conversation>) => {
      state.selectedConversation = action.payload;
      state.messages = [];
    },
    setMessages: (state, action: PayloadAction<MessageType[]>) => {
      state.messages = action.payload;
    },
    addMessage: (state, action: PayloadAction<MessageType>) => {
      state.messages.push(action.payload);
    },
  },
});

export const { setConversations, selectConversation, setMessages, addMessage } =
  chatSlice.actions;

export default chatSlice.reducer;
