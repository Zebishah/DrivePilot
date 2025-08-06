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
  createdAt?: string;
  updatedAt?: string;
  lastMessage?: {
    content: string;
    createdAt: string;
    sender: {
      _id: string;
      firstName?: string;
      lastName?: string;
      name?: string;
      email?: string;
      profileImage?: string;
      role?: string;
    };
  };
}

interface ChatState {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  messagesByConversation: { [conversationId: string]: MessageType[] };
}

const initialState: ChatState = {
  conversations: [],
  selectedConversation: null,
  messagesByConversation: {},
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || new Date()).getTime() -
          new Date(a.updatedAt || a.createdAt || new Date()).getTime()
      );
    },
    addConversation: (state, action: PayloadAction<Conversation>) => {
      const exists = state.conversations.some(
        (conv) => conv._id === action.payload._id
      );
      if (!exists) {
        state.conversations.push(action.payload);
        state.conversations.sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt || new Date()).getTime() -
            new Date(a.updatedAt || a.createdAt || new Date()).getTime()
        );
      }
    },
    selectConversation: (state, action: PayloadAction<Conversation>) => {
      state.selectedConversation = action.payload;
    },
    setMessages: (
      state,
      action: PayloadAction<{ conversationId: string; messages: MessageType[] }>
    ) => {
      const { conversationId, messages } = action.payload;
      console.log(
        "Setting messages for conversation:",
        conversationId,
        messages
      );
      state.messagesByConversation = {
        ...state.messagesByConversation,
        [conversationId]: [...messages].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ),
      };
    },
    addMessage: (
      state,
      action: PayloadAction<{ conversationId: string; message: MessageType }>
    ) => {
      const { conversationId, message } = action.payload;
      const messages = state.messagesByConversation[conversationId] || [];
      const exists = messages.some((m) => m._id === message._id);
      if (!exists) {
        console.log("Adding message to Redux:", message);
        state.messagesByConversation = {
          ...state.messagesByConversation,
          [conversationId]: [...messages, message].sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          ),
        };
        state.conversations = state.conversations
          .map((conv) =>
            conv._id === conversationId
              ? {
                  ...conv,
                  updatedAt: message.createdAt,
                  lastMessage: {
                    content: message.content,
                    createdAt: message.createdAt,
                    sender: message.sender,
                  },
                }
              : conv
          )
          .sort(
            (a, b) =>
              new Date(b.updatedAt || b.createdAt || new Date()).getTime() -
              new Date(a.updatedAt || a.createdAt || new Date()).getTime()
          );
      } else {
        console.log("Message already exists in Redux:", message._id);
      }
    },
    clearMessages: (state, action: PayloadAction<string>) => {
      state.messagesByConversation = {
        ...state.messagesByConversation,
        [action.payload]: [],
      };
    },
  },
});

export const {
  setConversations,
  addConversation,
  selectConversation,
  setMessages,
  addMessage,
  clearMessages,
} = chatSlice.actions;

export default chatSlice.reducer;
