import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useSubscription } from "@apollo/client";
import { useDispatch, useSelector } from "react-redux";
import { GET_MESSAGES } from "../../graphql/Queries/Chat";
import { SEND_MESSAGE } from "../../graphql/mutations/Chat";
import { NEW_MESSAGE_SUBSCRIPTION } from "../../graphql/subscriptions/Chat";
import { BsEmojiSmile } from "react-icons/bs";
import { CiLocationOn } from "react-icons/ci";
import { IoSend } from "react-icons/io5";
import MessageItem from "./MessageItem";
import { addMessage, setMessages } from "../../store/slices/chatSlice";
import { RootState } from "../../store";

interface ChatUser {
  _id: string;
  name: string;
  avatar?: string;
}

interface ChatWindowProps {
  conversation: ChatUser | null;
}

const getUserFromStorage = () => {
  try {
    const u = sessionStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
};

const ChatWindow: React.FC<ChatWindowProps> = ({ conversation }) => {
  const [newMessage, setNewMessage] = useState("");
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dispatch = useDispatch();
  const messages = useSelector((state: RootState) => state.chat.messages);
  const user = getUserFromStorage();

  const { loading } = useQuery(GET_MESSAGES, {
    variables: { conversationId: conversation?._id },
    skip: !conversation?._id,
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      dispatch(setMessages(data?.getMessages || []));
      scrollToBottom();
    },
    onError: (error) => {
      console.error("❌ Error loading messages:", error.message);
    },
  });

  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE, {
    onCompleted: (res) => {
      const msg = res?.data?.sendMessage;
      if (msg) {
        dispatch(addMessage(msg));
        scrollToBottom();
      }
    },
    onError: (error) => {
      console.error("❌ Send message failed:", error.message);
    },
  });

  useSubscription(NEW_MESSAGE_SUBSCRIPTION, {
    variables: { conversationId: conversation?._id },
    skip: !conversation?._id,
    onData: ({ data }) => {
      const newMsg = data?.data?.messageSent;
      if (!newMsg || newMsg.sender._id === user?._id) return;
      dispatch(addMessage(newMsg));
      simulateTyping();
      scrollToBottom();
    },
  });

  const handleSendMessage = async () => {
    const trimmed = newMessage.trim();

    console.log("✉️ handleSendMessage triggered");
    console.log("🧍 User:", user);
    console.log("💬 Message:", trimmed);
    console.log("🗨️ Conversation ID:", conversation?._id);

    if (!trimmed || !conversation?._id || !user?._id) {
      console.warn("⚠️ Missing data. Cannot send message.");
      return;
    }

    try {
      const res = await sendMessage({
        variables: {
          conversationId: conversation._id,
          senderId: user._id,
          content: trimmed,
        },
      });

      console.log("✅ Message sent response:", res?.data?.sendMessage);

      setNewMessage("");
    } catch (err) {
      console.error("❌ Send error:", err);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    simulateTyping();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newMessage.trim()) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const simulateTyping = () => {
    setIsOtherTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 1000);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 ml-4">
        Select someone to start chatting
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white shadow-md rounded-2xl overflow-hidden ml-4 mt-3">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b bg-[#f9fafb]">
        <img
          src={conversation.avatar || "/default-avatar.png"}
          alt={conversation.name}
          className="w-12 h-12 rounded-full object-cover border"
        />
        <div>
          <h4 className="text-[17px] font-semibold text-gray-800">
            {conversation.name}
          </h4>
          {isOtherTyping && (
            <p className="text-xs text-gray-500 animate-pulse">Typing...</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-[#f1f5f9]">
        {loading ? (
          <p className="text-center text-gray-400">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-400">No messages yet</p>
        ) : (
          messages.map((msg) => (
            <MessageItem
              key={msg._id}
              text={msg.content}
              time={new Date(msg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              sentByMe={msg.sender._id === user._id}
            />
          ))
        )}
        <div ref={messageEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-3 px-4 py-4 border-t bg-white relative">
        <div className="relative flex-1">
          <input
            className="w-full bg-gray-100 border border-gray-300 text-sm px-4 py-2 rounded-full pr-16 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
          />
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex gap-2 text-gray-500">
            <BsEmojiSmile className="text-xl cursor-pointer" />
            <CiLocationOn className="text-xl cursor-pointer" />
          </div>
        </div>
        <button
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || sending}
          className="bg-green-500 p-3 rounded-full text-white hover:bg-green-600 transition disabled:opacity-50"
        >
          <IoSend className="text-lg" />
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
