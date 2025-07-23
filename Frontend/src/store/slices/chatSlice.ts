import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MessageType } from "../../types/chatTypes"; // adjust path as needed

export interface Conversation {
  _id: string;
  name: string;
  avatar?: string;
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
      state.messages = []; // Clear messages when switching
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
