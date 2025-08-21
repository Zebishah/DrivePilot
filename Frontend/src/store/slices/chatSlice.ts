import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MessageType } from "../../types/chatTypes";
import dayjs from "dayjs";

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
  unreadMessages: boolean;
}

const initialState: ChatState = {
  conversations: [],
  selectedConversation: null,
  messagesByConversation: {},
  unreadMessages: localStorage.getItem("unreadMessages") === "true",
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload.sort((a, b) => {
        const aDate =
          a.lastMessage?.createdAt && dayjs(a.lastMessage.createdAt).isValid()
            ? a.lastMessage.createdAt
            : a.updatedAt && dayjs(a.updatedAt).isValid()
            ? a.updatedAt
            : a.createdAt && dayjs(a.createdAt).isValid()
            ? a.createdAt
            : new Date().toISOString();
        const bDate =
          b.lastMessage?.createdAt && dayjs(b.lastMessage.createdAt).isValid()
            ? b.lastMessage.createdAt
            : b.updatedAt && dayjs(b.updatedAt).isValid()
            ? b.updatedAt
            : b.createdAt && dayjs(b.createdAt).isValid()
            ? b.createdAt
            : new Date().toISOString();
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
      console.log(
        "📦 Set conversations in Redux:",
        state.conversations.map((c) => ({
          _id: c._id,
          name: c.user.name,
          lastMessageCreatedAt: c.lastMessage?.createdAt,
          updatedAt: c.updatedAt,
          createdAt: c.createdAt,
        }))
      );
    },
    addConversation: (state, action: PayloadAction<Conversation>) => {
      const exists = state.conversations.some(
        (conv) => conv._id === action.payload._id
      );
      if (!exists) {
        state.conversations.push(action.payload);
        state.conversations.sort((a, b) => {
          const aDate =
            a.lastMessage?.createdAt && dayjs(a.lastMessage.createdAt).isValid()
              ? a.lastMessage.createdAt
              : a.updatedAt && dayjs(a.updatedAt).isValid()
              ? a.updatedAt
              : a.createdAt && dayjs(a.createdAt).isValid()
              ? a.createdAt
              : new Date().toISOString();
          const bDate =
            b.lastMessage?.createdAt && dayjs(b.lastMessage.createdAt).isValid()
              ? b.lastMessage.createdAt
              : b.updatedAt && dayjs(b.updatedAt).isValid()
              ? b.updatedAt
              : b.createdAt && dayjs(b.createdAt).isValid()
              ? b.createdAt
              : new Date().toISOString();
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });
        console.log("📦 Added conversation to Redux:", action.payload._id, {
          lastMessageCreatedAt: action.payload.lastMessage?.createdAt,
          updatedAt: action.payload.updatedAt,
          createdAt: action.payload.createdAt,
        });
      }
    },
    selectConversation: (state, action: PayloadAction<Conversation>) => {
      state.selectedConversation = action.payload;
      console.log("📌 Selected conversation in Redux:", action.payload._id);
    },
    setMessages: (
      state,
      action: PayloadAction<{ conversationId: string; messages: MessageType[] }>
    ) => {
      const { conversationId, messages } = action.payload;
      console.log(
        "📬 Setting messages for conversation:",
        conversationId,
        messages.length
      );
      state.messagesByConversation = {
        ...state.messagesByConversation,
        [conversationId]: [...messages].sort(
          (a, b) =>
            new Date(a.createdAt || new Date()).getTime() -
            new Date(b.createdAt || new Date()).getTime()
        ),
      };
    },
    addMessage: (
      state,
      action: PayloadAction<{ conversationId: string; message: MessageType }>
    ) => {
      const { conversationId, message } = action.payload;
      const validatedMessage: MessageType = {
        ...message,
        createdAt:
          message.createdAt && dayjs(message.createdAt).isValid()
            ? message.createdAt
            : new Date().toISOString(),
      };
      if (!message.createdAt) {
        console.warn(
          `⚠️ Missing createdAt for message: ${message._id || "unknown"}`,
          message
        );
      } else if (!dayjs(message.createdAt).isValid()) {
        console.warn(
          `⚠️ Invalid createdAt for message: ${message._id || "unknown"}`,
          message.createdAt
        );
      }
      const messages = state.messagesByConversation[conversationId] || [];
      const exists = messages.some((m) => m._id === validatedMessage._id);
      if (!exists) {
        console.log("📬 Adding message to Redux:", {
          conversationId,
          messageId: validatedMessage._id,
          createdAt: validatedMessage.createdAt,
          content: validatedMessage.content,
        });
        state.messagesByConversation = {
          ...state.messagesByConversation,
          [conversationId]: [...messages, validatedMessage].sort(
            (a, b) =>
              new Date(a.createdAt || new Date()).getTime() -
              new Date(b.createdAt || new Date()).getTime()
          ),
        };
        state.conversations = state.conversations
          .map((conv) =>
            conv._id === conversationId
              ? {
                  ...conv,
                  updatedAt: validatedMessage.createdAt,
                  lastMessage: {
                    content: validatedMessage.content,
                    createdAt: validatedMessage.createdAt,
                    sender: validatedMessage.sender,
                  },
                }
              : conv
          )
          .sort((a, b) => {
            const aDate =
              a.lastMessage?.createdAt &&
              dayjs(a.lastMessage.createdAt).isValid()
                ? a.lastMessage.createdAt
                : a.updatedAt && dayjs(a.updatedAt).isValid()
                ? a.updatedAt
                : a.createdAt && dayjs(a.createdAt).isValid()
                ? a.createdAt
                : new Date().toISOString();
            const bDate =
              b.lastMessage?.createdAt &&
              dayjs(b.lastMessage.createdAt).isValid()
                ? b.lastMessage.createdAt
                : b.updatedAt && dayjs(b.updatedAt).isValid()
                ? b.updatedAt
                : b.createdAt && dayjs(b.createdAt).isValid()
                ? b.createdAt
                : new Date().toISOString();
            return new Date(bDate).getTime() - new Date(aDate).getTime();
          });
        console.log(
          "📦 Updated conversations after adding message:",
          state.conversations.map((c) => ({
            _id: c._id,
            name: c.user.name,
            lastMessageCreatedAt: c.lastMessage?.createdAt,
            updatedAt: c.updatedAt,
            createdAt: c.createdAt,
          }))
        );
      } else {
        console.log(
          "ℹ️ Message already exists in Redux:",
          validatedMessage._id
        );
      }
    },
    clearMessages: (state, action: PayloadAction<string>) => {
      state.messagesByConversation = {
        ...state.messagesByConversation,
        [action.payload]: [],
      };
      console.log("🧹 Cleared messages for conversation:", action.payload);
    },
    setHasUnreadMessages: (state) => {
      state.unreadMessages = true;
      localStorage.setItem("unreadMessages", "true");
      console.log("🔔 Set unread messages to true");
    },
    clearUnreadMessages: (state) => {
      state.unreadMessages = false;
      localStorage.setItem("unreadMessages", "false");
      console.log("🔔 Cleared unread messages");
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
  setHasUnreadMessages,
  clearUnreadMessages,
} = chatSlice.actions;

export default chatSlice.reducer;
