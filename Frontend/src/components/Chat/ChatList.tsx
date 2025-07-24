// components/Chat/ChatList.tsx

import React, { useState, useMemo } from "react";
import { Avatar, Input } from "antd";
import { UserOutlined, SearchOutlined } from "@ant-design/icons";
import { ConversationType } from "../../types/chatTypes";

interface ChatListProps {
  conversations: ConversationType[];
  currentUserId: string;
  selectedUserId?: string;
  onSelect: (conversation: ConversationType) => void;
}

const ChatList: React.FC<ChatListProps> = ({
  conversations,
  selectedUserId,
  onSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) =>
      conv.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [conversations, searchTerm]);

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
          const { name, email, profileImage } = conv.user;

          return (
            <div
              key={conv._id}
              onClick={() => onSelect(conv)}
              className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-all duration-200 
                ${isSelected ? "bg-blue-100" : "hover:bg-gray-100"}`}
            >
              <Avatar
                src={profileImage || ""}
                size={52}
                icon={!profileImage && <UserOutlined />}
              >
                {!profileImage && name?.charAt(0)}
              </Avatar>
              <div className="flex flex-col max-w-[200px]">
                <span className="font-semibold text-gray-800 text-base">
                  {name}
                </span>
                {email && (
                  <span className="text-gray-500 text-xs truncate">
                    {email}
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
