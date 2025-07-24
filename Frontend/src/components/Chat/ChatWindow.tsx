import React, { useRef, useState, useMemo, useEffect } from "react";
import { useMutation, useSubscription, useLazyQuery } from "@apollo/client";
import {
  GET_MESSAGES,
  NEW_MESSAGE_SUBSCRIPTION,
  SEND_MESSAGE,
} from "../../graphql/Queries/Chat";
import { BsEmojiSmile } from "react-icons/bs";
import { CiLocationOn } from "react-icons/ci";
import { IoSend } from "react-icons/io5";
import MessageItem from "./MessageItem";
import { useDispatch, useSelector } from "react-redux";
import { addMessage, setMessages } from "../../store/slices/chatSlice";
import { RootState } from "../../store";
import { MessageType, UserType } from "../../types/chatTypes";
import { useAuth } from "../../context/AuthContext";

interface ChatWindowProps {
  conversation: {
    _id: string;
    participants: UserType[];
  } | null;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversation }) => {
  const [newMessage, setNewMessage] = useState("");
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastConversationId = useRef<string | null>(null);

  const dispatch = useDispatch();
  const messages = useSelector((state: RootState) => state.chat.messages);
  const { user } = useAuth();
  const userId = user?._id || user?.id;

  const otherParticipant = useMemo(() => {
    return conversation?.participants.find((p) => p._id !== userId) || null;
  }, [conversation, userId]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  };

  const simulateTyping = () => {
    setIsOtherTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 1000);
  };

  const [loadMessages] = useLazyQuery(GET_MESSAGES, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      dispatch(setMessages(data.getMessages || []));
      scrollToBottom();
    },
    onError: (error) => {
      console.error("Error loading messages:", error.message);
    },
  });

  useEffect(() => {
    if (
      conversation?._id &&
      otherParticipant?._id &&
      conversation._id !== lastConversationId.current
    ) {
      loadMessages({
        variables: {
          conversationId: conversation._id,
          senderId: userId,
        },
      });
      lastConversationId.current = conversation._id;
    }
  }, [conversation?._id, otherParticipant?._id, loadMessages, userId]);

  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE, {
    onCompleted: (res) => {
      const msg: MessageType = res?.sendMessage;
      if (msg) {
        dispatch(addMessage(msg));
        scrollToBottom();
      }
    },
    onError: (error) => {
      console.error("Send message error:", error.message);
    },
  });

  useSubscription(NEW_MESSAGE_SUBSCRIPTION, {
    variables: {
      conversationId: conversation?._id,
      receiverId: userId,
    },
    skip: !conversation || !userId || !otherParticipant,
    onData: ({ data }) => {
      const newMsg: MessageType = data?.data?.messageSent;
      if (!newMsg) return;

      if (newMsg.sender._id !== userId) {
        dispatch(addMessage(newMsg));
        simulateTyping();
        scrollToBottom();
      }
    },
  });

  const handleSendMessage = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed || !conversation?._id || !userId || !otherParticipant?._id)
      return;

    try {
      await sendMessage({
        variables: {
          conversationId: conversation._id,
          senderId: userId,
          receiverId: otherParticipant._id,
          content: trimmed,
        },
      });

      setNewMessage("");
    } catch (error) {
      console.error("GraphQL sendMessage mutation failed:", error);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    simulateTyping();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!conversation || !userId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 ml-4">
        Select someone to start chatting
      </div>
    );
  }

  if (!otherParticipant) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 ml-4">
        No valid participant found
      </div>
    );
  }

  const getParticipantName = (p: UserType) =>
    p.name || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();

  return (
    <div className="flex flex-col h-full bg-white shadow-md rounded-2xl overflow-hidden ml-4 mt-3">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b bg-[#f9fafb]">
        <img
          src={otherParticipant.profileImage || "/default-avatar.png"}
          alt={getParticipantName(otherParticipant)}
          className="w-12 h-12 rounded-full object-cover border"
        />
        <div>
          <h4 className="text-[17px] font-semibold text-gray-800">
            {getParticipantName(otherParticipant)}
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
              message={msg}
              isOwnMessage={msg.sender._id === userId}
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
