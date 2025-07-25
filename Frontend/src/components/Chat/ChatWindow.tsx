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
import { BsMic } from "react-icons/bs";
import MessageItem from "./MessageItem";
import { useDispatch, useSelector } from "react-redux";
import { addMessage, setMessages } from "../../store/slices/chatSlice";
import { RootState } from "../../store";
import { MessageType, UserType } from "../../types/chatTypes";
import { useAuth } from "../../context/AuthContext";
import { Spin } from "antd";
import EmojiPicker from "emoji-picker-react";

interface ChatWindowProps {
  conversation: {
    _id: string;
    participants: UserType[];
  } | null;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversation }) => {
  const [newMessage, setNewMessage] = useState("");
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messageEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolledRef = useRef(false);

  const dispatch = useDispatch();
  const messages = useSelector((state: RootState) => state.chat.messages);
  const { user } = useAuth();
  const userId = user?.id;
  const emojiPickerWrapperRef = useRef<HTMLDivElement>(null);

  const otherParticipant = useMemo(() => {
    return conversation?.participants.find((p) => p._id !== userId) || null;
  }, [conversation, userId]);

  const scrollToBottom = () => {
    if (!messageContainerRef.current) return;

    const container = messageContainerRef.current;
    const shouldAutoScroll =
      container.scrollTop + container.clientHeight >=
      container.scrollHeight - 200;

    if (!hasAutoScrolledRef.current || shouldAutoScroll) {
      requestAnimationFrame(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
        hasAutoScrolledRef.current = true;
      });
    }
  };

  const simulateTyping = () => {
    setIsOtherTyping(true);
    setTimeout(() => setIsOtherTyping(false), 1000);
  };

  const [loadMessages] = useLazyQuery(GET_MESSAGES, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      dispatch(setMessages(data.getMessages || []));
      setMessagesLoading(false);
      setTimeout(() => {
        scrollToBottom();
      }, 300);
    },
    onError: (error) => {
      setMessagesLoading(false);
      console.error("Error loading messages:", error.message);
    },
  });

  useEffect(() => {
    hasAutoScrolledRef.current = false;
    if (!conversation?._id || !otherParticipant?._id || !userId) return;

    setMessagesLoading(true);
    loadMessages({
      variables: {
        user1Id: userId,
        user2Id: otherParticipant._id,
      },
    });

    // Optional polling
    const interval = setInterval(() => {
      loadMessages({
        variables: {
          user1Id: userId,
          user2Id: otherParticipant._id,
        },
      });
    }, 300);

    return () => clearInterval(interval);
  }, [conversation?._id, otherParticipant?._id, userId, loadMessages]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPickerWrapperRef.current &&
        !emojiPickerWrapperRef.current.contains(e.target as Node)
      ) {
        setTimeout(() => {
          setShowEmojiPicker(false);
        }, 0);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE, {
    onCompleted: (res) => {
      const msg: MessageType = res?.sendMessage;
      if (msg && msg.sender._id === userId) {
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
      user1Id: userId,
      user2Id: otherParticipant?._id,
    },
    skip: !userId || !otherParticipant?._id,
    onSubscriptionData: ({ subscriptionData }) => {
      const newMsg = subscriptionData.data?.messageSent;
      if (newMsg) {
        dispatch(addMessage(newMsg));
        if (newMsg.sender._id !== userId) simulateTyping();
        scrollToBottom();
      }
    },
    onError: (error) => {
      console.error("❗ Subscription error:", error.message);
    },
  });

  const handleSendMessage = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed || !conversation?._id || !userId || !otherParticipant?._id)
      return;

    try {
      await sendMessage({
        variables: {
          senderId: userId,
          receiverId: otherParticipant._id,
          content: trimmed,
          conversationId: conversation._id,
        },
      });
      setNewMessage("");
    } catch (error) {
      console.error("Send failed:", error);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getParticipantName = (p: UserType) =>
    p.name || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();

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

  const onEmojiClick = (emojiData: any) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-md rounded-2xl overflow-hidden ml-4 mt-3">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b bg-[#f9fafb]">
        <img
          src={
            otherParticipant.profileImage?.trim()
              ? otherParticipant.profileImage
              : "/default-avatar.png"
          }
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
      <div
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-[#f1f5f9]"
      >
        {messagesLoading ? (
          <div className="flex justify-center py-10">
            <Spin size="large" />
          </div>
        ) : messages.length === 0 ? (
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
          {/* Mic icon inside input - left side */}
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-defaultColor">
            <BsMic className="text-xl cursor-pointer" />
          </div>

          <input
            className="w-full bg-gray-100 border border-gray-300 text-sm px-10 py-2 rounded-full pr-20 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
          />

          {/* Emoji and Location - right side inside input */}
          <div
            ref={emojiPickerWrapperRef}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 flex gap-2 text-defaultColor"
          >
            <BsEmojiSmile
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-xl cursor-pointer"
            />
            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 z-50">
                <EmojiPicker onEmojiClick={onEmojiClick} />
              </div>
            )}
            <CiLocationOn className="text-xl cursor-pointer" />
          </div>
        </div>

        {/* Send Button */}
        <button
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || sending}
          className="text-defaultColor p-3 rounded-full text-white hover:bg-blue-600 transition disabled:opacity-50"
        >
          <IoSend className="text-lg" />
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
