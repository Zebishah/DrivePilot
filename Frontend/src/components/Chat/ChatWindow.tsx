import React, {
  useRef,
  useState,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import { useMutation, useLazyQuery, useSubscription } from "@apollo/client";
import {
  GET_MESSAGES,
  SEND_MESSAGE,
  NEW_MESSAGE_SUBSCRIPTION,
} from "../../graphql/Queries/Chat";
import { BsEmojiSmile } from "react-icons/bs";
import { IoSend } from "react-icons/io5";
import MessageItem from "./MessageItem";
import { useDispatch, useSelector } from "react-redux";
import { addMessage, setMessages } from "../../store/slices/chatSlice";
import { RootState } from "../../store";
import { MessageType, UserType } from "../../types/chatTypes";
import { useAuth } from "../../context/AuthContext";
import { Spin, Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";
import EmojiPicker from "emoji-picker-react";
import { getSocket } from "../../utils/socket";
import { debounce } from "lodash";
import { createSelector } from "reselect";
import { shallowEqual } from "react-redux";

interface ChatWindowProps {
  conversation: { _id: string; participants: UserType[] } | null;
}

// Memoized selector
const selectMessages = createSelector(
  [
    (state: RootState, conversationId: string | undefined) =>
      conversationId
        ? state.chat.messagesByConversation[conversationId] || []
        : [],
  ],
  (messages) => messages
);

const ChatWindow: React.FC<ChatWindowProps> = ({ conversation }) => {
  const [newMessage, setNewMessage] = useState("");
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messageEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerWrapperRef = useRef<HTMLDivElement>(null);

  const dispatch = useDispatch();
  const { user } = useAuth();
  const userId = String(user?._id || user?.id);

  // Memoized selector with shallowEqual
  const messages = useSelector(
    (state: RootState) => selectMessages(state, conversation?._id),
    shallowEqual
  );

  // Define hooks unconditionally
  const otherParticipant: UserType | null = useMemo(() => {
    return (
      conversation?.participants?.find(
        (p) => String(p._id) !== String(userId)
      ) || null
    );
  }, [conversation, userId]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  }, []);

  // Emit typing event to conversation room
  const emitTyping = useCallback(
    debounce((conversationId: string | undefined) => {
      if (conversationId) {
        const socket = getSocket();
        socket?.emit("typing", { conversationId, from: userId });
      }
    }, 200),
    [userId]
  );

  // Load initial messages
  const [loadMessages] = useLazyQuery(GET_MESSAGES, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (conversation?._id) {
        dispatch(
          setMessages({
            conversationId: conversation._id,
            messages:
              data.getMessages?.map((msg: any) => ({
                ...msg,
                conversationId: msg.conversationId || conversation._id,
              })) || [],
          })
        );
      }
      setMessagesLoading(false);
      scrollToBottom();
    },
    onError: (error) => {
      console.error("Error loading messages:", error.message);
      setMessagesLoading(false);
    },
  });

  // Send message mutation
  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE, {
    onError: (err) => console.error("Send error:", err.message),
    onCompleted: (data) => {
      const msg: MessageType = {
        ...data.sendMessage,
        conversationId: data.sendMessage.conversationId || conversation?._id,
      };
      if (conversation?._id) {
        dispatch(
          addMessage({
            conversationId: conversation._id,
            message: msg,
          })
        );
      }
      getSocket()?.emit("send_message", msg);
      scrollToBottom();
    },
  });

  // Subscribe to new messages
  useSubscription(NEW_MESSAGE_SUBSCRIPTION, {
    variables: {
      user1Id: userId,
      user2Id: otherParticipant?._id ? String(otherParticipant._id) : "",
    },
    skip: !conversation?._id || !otherParticipant?._id,
    onSubscriptionData: ({ subscriptionData }) => {
      if (subscriptionData?.data?.messageSent) {
        const msg: MessageType = {
          ...subscriptionData.data.messageSent,
          conversationId:
            subscriptionData.data.messageSent.conversationId ||
            conversation?._id,
        };
        if (conversation?._id) {
          dispatch(
            addMessage({
              conversationId: conversation._id,
              message: msg,
            })
          );
          scrollToBottom();
        }
      }
    },
    onError: (error) => {
      console.error("Subscription error:", error.message);
    },
  });

  // Socket setup for typing events and live message updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !conversation?._id || !otherParticipant?._id) {
      console.log("Socket or conversation not ready:", {
        socket: !!socket,
        conversationId: conversation?._id,
        otherParticipantId: otherParticipant?._id,
      });
      return;
    }

    const handleTyping = ({
      from,
      conversationId,
    }: {
      from: string;
      conversationId: string;
    }) => {
      if (
        String(from) === String(otherParticipant._id) &&
        String(conversationId) === String(conversation._id)
      ) {
        setIsOtherTyping(true);
        setTimeout(() => {
          setIsOtherTyping(false);
        }, 2000);
      }
    };

    const handleReceiveMessage = (msg: any) => {
      if (!msg?.conversationId || !conversation?._id) return;
      if (String(msg.conversationId) !== String(conversation._id)) return;

      const normalized: MessageType = {
        ...msg,
        conversationId: msg.conversationId || conversation._id,
      };

      dispatch(
        addMessage({
          conversationId: conversation._id,
          message: normalized,
        })
      );
      scrollToBottom();
    };

    const joinRoom = () => {
      socket.emit(
        "joinConversation",
        conversation._id,
        (ack: { success: boolean; room: string }) => {
          if (!ack.success) {
            console.error("Failed to join room:", conversation._id);
          }
        }
      );
    };

    joinRoom();
    socket.on("typing", handleTyping);
    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.emit("leaveConversation", conversation._id);
      socket.off("typing", handleTyping);
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [conversation?._id, otherParticipant?._id, dispatch, scrollToBottom]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversation?._id || !otherParticipant?._id) return;
    setMessagesLoading(true);
    loadMessages({
      variables: { user1Id: userId, user2Id: String(otherParticipant._id) },
    });
  }, [conversation?._id, userId, otherParticipant?._id, loadMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle emoji picker click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPickerWrapperRef.current &&
        !emojiPickerWrapperRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Early return after all hooks
  if (!conversation || !conversation._id || !userId) {
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

  const getRoleModel = (role: string | undefined | null) => {
    const roleMap: Record<string, string> = {
      student: "Student",
      instructor: "Instructor",
    };
    return role ? roleMap[role.toLowerCase()] ?? null : null;
  };

  const getModelByOpposite = (role: string | undefined | null) => {
    if (!role) return null;
    const lower = role.toLowerCase();
    return lower === "student"
      ? "Instructor"
      : lower === "instructor"
      ? "Student"
      : null;
  };

  const handleSendMessage = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed || !otherParticipant._id) {
      return;
    }

    const senderModel = getRoleModel(user?.role);
    const receiverModel = getModelByOpposite(user?.role);
    if (!senderModel || !receiverModel) {
      console.error("Invalid sender or receiver model:", {
        senderModel,
        receiverModel,
      });
      return;
    }

    setNewMessage("");
    try {
      await sendMessage({
        variables: {
          senderId: userId,
          receiverId: String(otherParticipant._id),
          content: trimmed,
          senderModel,
          receiverModel,
        },
      });
    } catch (e) {
      console.error("Error sending message:", e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getParticipantName = (p: UserType) => {
    return `${p.firstName || "Unknown"} ${p.lastName || ""}`.trim();
  };

  const getParticipantAvatar = (p: UserType) => {
    if (p.profileImage?.trim()) {
      return p.profileImage;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      `${p.firstName || "User"} ${p.lastName || ""}`
    )}`;
  };

  const onEmojiClick = (emojiData: any) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-md rounded-2xl overflow-hidden ml-4 mt-3">
      <div className="flex items-center gap-3 px-5 py-4 border-b bg-[#f9fafb]">
        <Avatar
          src={getParticipantAvatar(otherParticipant)}
          size={48}
          icon={!otherParticipant.profileImage?.trim() && <UserOutlined />}
          className="border"
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
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-[#f1f5f9]">
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
              isOwnMessage={String(msg.sender._id) === String(userId)}
            />
          ))
        )}
        <div ref={messageEndRef} />
      </div>
      <div className="flex items-center gap-3 px-4 py-4 border-t bg-white relative">
        <div className="relative flex-1">
          <input
            className="w-full bg-gray-100 border border-gray-300 text-sm px-5 py-2 rounded-full pr-20 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              emitTyping(conversation._id);
            }}
            onKeyDown={handleKeyDown}
          />
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
          </div>
        </div>
        <button
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || sending}
          className="bg-defaultColor p-3 rounded-full text-white hover:bg-blue-600 transition disabled:opacity-50"
        >
          <IoSend className="text-lg" />
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
