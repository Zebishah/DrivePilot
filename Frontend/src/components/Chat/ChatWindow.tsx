import React, { useEffect, useState, useRef } from "react";
import axiosInstance from "../../api/axiosInstance";
import MessageItem from "./MessageItem";
import { BsEmojiSmile } from "react-icons/bs";
import { CiLocationOn } from "react-icons/ci";
import { IoSend } from "react-icons/io5";

interface ChatUser {
  _id: string;
  name: string;
  avatar?: string;
}

interface Message {
  _id: string;
  sender: string;
  content: string;
  timestamp: string;
}

interface ChatWindowProps {
  conversation: ChatUser | null;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversation }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const typingSimulationTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (conversation && conversation._id) {
      fetchMessages(conversation._id);
    }
  }, [conversation]);

  async function fetchMessages(conversationId: string) {
    try {
      const res = await axiosInstance.get(
        `/chat/conversation/${conversationId}`
      );
      setMessages(res.data || []);
      scrollToBottom();
    } catch (e) {
      console.error("Error fetching messages:", e);
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !conversation) return;

    try {
      const res = await axiosInstance.post(`/chat/send`, {
        receiverId: conversation._id, // ✅ Fix: use correct ID field
        content: newMessage,
      });
      setMessages((prev) => [...prev, res.data]);
      setNewMessage("");
      scrollToBottom();
    } catch (e) {
      console.error("Error sending message:", e);
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  const simulateIncomingTyping = () => {
    setIsOtherTyping(true);
    if (typingSimulationTimeout.current) {
      clearTimeout(typingSimulationTimeout.current);
    }
    typingSimulationTimeout.current = setTimeout(() => {
      setIsOtherTyping(false);
    }, 1000);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (user?._id !== conversation?._id) {
      simulateIncomingTyping();
    }
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
        {messages.length === 0 ? (
          <p className="text-center text-gray-400">No messages yet</p>
        ) : (
          messages.map((msg) => (
            <MessageItem
              key={msg._id}
              text={msg.content}
              time={new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              sentByMe={msg.sender === user?._id}
            />
          ))
        )}
        <div ref={messageEndRef} />
      </div>

      {/* Message Input */}
      <div className="flex items-center gap-3 px-4 py-4 border-t bg-white relative">
        <div className="relative flex-1">
          <input
            className="w-full bg-gray-100 border border-gray-300 text-sm px-4 py-2 rounded-full pr-16 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex gap-2 text-gray-500">
            <BsEmojiSmile className="text-xl cursor-pointer" />
            <CiLocationOn className="text-xl cursor-pointer" />
          </div>
        </div>
        <button
          onClick={handleSendMessage}
          className="bg-green-500 p-3 rounded-full text-white hover:bg-green-600 transition"
        >
          <IoSend className="text-lg" />
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
