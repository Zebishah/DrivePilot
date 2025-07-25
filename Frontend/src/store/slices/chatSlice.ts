import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MessageType } from "../../types/chatTypes";

export interface Conversation {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    profileImage?: string;
    role?: string;
  };
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
      // Clear messages when switching conversations
      state.messages = [];
    },
    setMessages: (state, action: PayloadAction<MessageType[]>) => {
      state.messages = action.payload;
    },
    addMessage: (state, action: PayloadAction<MessageType>) => {
      // Check if message already exists to prevent duplicates
      const messageExists = state.messages.some(
        (msg) => msg._id === action.payload._id
      );

      if (!messageExists) {
        state.messages.push(action.payload);
        // Sort messages by createdAt to maintain chronological order
        state.messages.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }
    },
    clearMessages: (state) => {
      state.messages = [];
    },
  },
});

export const {
  setConversations,
  selectConversation,
  setMessages,
  addMessage,
  clearMessages,
} = chatSlice.actions;

export default chatSlice.reducer;
