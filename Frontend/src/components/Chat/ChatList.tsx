import React, { useState, useMemo, useEffect } from "react";
import { Avatar, Input, Spin } from "antd";
import { UserOutlined, SearchOutlined } from "@ant-design/icons";
import type { Conversation } from "../../store/slices/chatSlice";
import { useAuth } from "../../context/AuthContext";

interface ChatListProps {
  conversations: Conversation[];
  onSelect: (user: Conversation) => void;
  selectedUserId?: string;
}

const ChatList: React.FC<ChatListProps> = ({
  conversations = [],
  onSelect,
  selectedUserId,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { user: currentUser } = useAuth();

  const filteredConversations = useMemo(() => {
    if (!currentUser) return [];

    const others = conversations.filter((conv) => conv._id !== currentUser._id);

    const uniqueMap = new Map();
    others.forEach((conv) => {
      if (!uniqueMap.has(conv._id)) {
        uniqueMap.set(conv._id, conv);
      }
    });

    return Array.from(uniqueMap.values()).filter((conv) =>
      conv.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [conversations, currentUser, searchTerm]);

  useEffect(() => {
    const seen = new Set();
    conversations.forEach((conv) => {
      if (seen.has(conv._id)) {
        console.warn("Duplicate _id found in conversations:", conv._id);
      }
      seen.add(conv._id);
    });
  }, [conversations]);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spin tip="Loading user..." size="large" />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white overflow-y-auto">
      <div className="p-4">
        <Input
          placeholder="Search contact..."
          prefix={<SearchOutlined className="text-gray-400" />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="rounded-lg py-2"
          size="large"
        />
      </div>

      {filteredConversations.length === 0 ? (
        <div className="text-center text-gray-500 py-10 text-sm">
          No contacts found.
        </div>
      ) : (
        filteredConversations.map((conv) => {
          const isSelected = selectedUserId === conv._id;
          return (
            <div
              key={conv._id}
              onClick={() => onSelect(conv)}
              className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-all duration-200 
                ${isSelected ? "bg-blue-100" : "hover:bg-gray-100"}`}
            >
              <Avatar
                src={conv.avatar || ""}
                size={52}
                icon={!conv.avatar && <UserOutlined />}
              >
                {!conv.avatar && conv.name?.charAt(0)}
              </Avatar>
              <div className="flex flex-col max-w-[200px]">
                <span className="font-semibold text-gray-800 text-base">
                  {conv.name}
                </span>
                {conv.lastMessage && (
                  <span className="text-sm text-gray-500 truncate max-w-full">
                    {conv.lastMessage}
                  </span>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default ChatList;
