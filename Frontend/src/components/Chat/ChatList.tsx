import React, { useState, useMemo } from "react";
import { Avatar, Input } from "antd";
import {
  UserOutlined,
  SearchOutlined,
  MessageOutlined,
  TeamOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";
import { ConversationType } from "../../types/chatTypes";
import { useAuth } from "../../context/AuthContext";

dayjs.extend(isToday);
dayjs.extend(isYesterday);

interface ChatListProps {
  conversations: ConversationType[];
  currentUserId: string;
  selectedUserId?: string;
  onSelect: (conversation: ConversationType) => void;
}

const ChatList: React.FC<ChatListProps> = ({
  conversations,
  currentUserId,
  selectedUserId,
  onSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"chats" | "community" | "calls">(
    "chats"
  );
  const { user } = useAuth();

  const isInstructor = user?.role?.toLowerCase() === "instructor";

  const filteredConversations = useMemo(() => {
    return conversations
      .filter((conv) =>
        conv.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime()
      );
  }, [conversations, searchTerm]);

  const groupedConversations = useMemo(() => {
    const groups: { [key: string]: ConversationType[] } = {};

    filteredConversations.forEach((conv) => {
      const date = dayjs(conv.updatedAt || conv.createdAt || new Date());

      let group = date.format("DD MMM YYYY");
      if (date.isToday()) group = "Today";
      else if (date.isYesterday()) group = "Yesterday";

      if (!groups[group]) groups[group] = [];
      groups[group].push(conv);
    });

    return groups;
  }, [filteredConversations]);
  console.log("groupedConversations", filteredConversations);
  return (
    <div className="w-full h-full bg-white flex flex-col overflow-hidden">
      {/* Search Input */}
      <div className="p-4">
        <Input
          placeholder="Search contact..."
          prefix={<SearchOutlined className="text-gray-400" />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="rounded-full py-2"
          size="large"
        />
      </div>

      {/* Tabs for  */}
      {isInstructor && (
        <div className="px-4 pb-3">
          <div className="flex gap-2">
            <button
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-sm font-medium transition-all
        ${
          activeTab === "chats"
            ? "bg-gray-100 text-blue-600 rounded-full"
            : "text-gray-600 hover:bg-gray-100 rounded-lg"
        }`}
              onClick={() => setActiveTab("chats")}
            >
              <MessageOutlined style={{ fontSize: 25 }} />
              Chats
            </button>
            {/* <button
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-sm font-medium transition-all
        ${
          activeTab === "community"
            ? "bg-gray-100 text-blue-600 rounded-full"
            : "text-gray-600 hover:bg-gray-100 rounded-lg"
        }`}
              onClick={() => setActiveTab("community")}
            >
              <TeamOutlined style={{ fontSize: 25 }} />
              Community
            </button>
            <button
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-sm font-medium transition-all
        ${
          activeTab === "calls"
            ? "bg-gray-100 text-blue-600 rounded-full"
            : "text-gray-600 hover:bg-gray-100 rounded-lg"
        }`}
              onClick={() => setActiveTab("calls")}
            >
              <PhoneOutlined style={{ fontSize: 25 }} />
              Calls
            </button> */}
          </div>
        </div>
      )}

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {activeTab === "chats" ? (
          filteredConversations.length === 0 ? (
            <div className="text-center text-gray-500 py-10 text-sm">
              No contacts found.
            </div>
          ) : (
            Object.entries(groupedConversations).map(([dateGroup, convs]) => (
              <div key={dateGroup}>
                <div className="px-4 py-2 text-xs text-gray-500 font-semibold uppercase">
                  {dateGroup}
                </div>
                {convs.map((conv) => {
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
                        src={
                          profileImage?.trim()
                            ? profileImage
                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                name ?? "User"
                              )}`
                        }
                        size={52}
                        icon={!profileImage?.trim() && <UserOutlined />}
                      />

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
                })}
              </div>
            ))
          )
        ) : (
          <div className="text-center text-gray-400 text-sm py-10">
            {activeTab === "community"
              ? "Community tab is under construction."
              : "Call history will appear here soon."}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
