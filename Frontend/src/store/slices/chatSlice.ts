import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Message {
  _id: string;
  sender: {
    _id: string;
    name: string;
    role: string;
  };
  content: string;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
}

interface ChatState {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  messages: Message[];
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
      state.messages = []; // Clear messages when switching
    },
    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages = action.payload;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
  },
});

export const { setConversations, selectConversation, setMessages, addMessage } =
  chatSlice.actions;

export default chatSlice.reducer;
