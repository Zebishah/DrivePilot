import React, { useState, useMemo } from "react";
import { Avatar, Input } from "antd";
import { SearchOutlined, MessageOutlined } from "@ant-design/icons";
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

  const filteredConversations = useMemo(() => {
    try {
      const sorted = conversations
        .filter((conv) =>
          conv.user?.name?.toLowerCase()?.includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
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
        `📋 Filtered and sorted conversations (activeTab: ${activeTab}):`,
        sorted.map((c) => ({
          _id: c._id,
          name: c.user?.name,
          lastMessageCreatedAt: c.lastMessage?.createdAt,
          updatedAt: c.updatedAt,
          createdAt: c.createdAt,
          sortDate: c.lastMessage?.createdAt || c.updatedAt || c.createdAt,
        }))
      );
      return sorted;
    } catch (error) {
      console.error("❌ Error filtering conversations:", error);
      return [];
    }
  }, [conversations, searchTerm, activeTab]);

  const groupedConversations = useMemo(() => {
    try {
      const groups: { [key: string]: ConversationType[] } = {};
      filteredConversations.forEach((conv) => {
        const rawDate =
          conv.lastMessage?.createdAt &&
          dayjs(conv.lastMessage.createdAt).isValid()
            ? conv.lastMessage.createdAt
            : conv.updatedAt && dayjs(conv.updatedAt).isValid()
            ? conv.updatedAt
            : conv.createdAt && dayjs(conv.createdAt).isValid()
            ? conv.createdAt
            : new Date().toISOString();
        let dateObj = dayjs(rawDate);
        if (!dateObj.isValid()) {
          console.warn(
            `⚠️ Invalid date for conversation ${conv._id}: lastMessage.createdAt=${conv.lastMessage?.createdAt}, updatedAt=${conv.updatedAt}, createdAt=${conv.createdAt}`
          );
          dateObj = dayjs();
        }
        if (dateObj.isBefore("2020-01-01")) {
          console.warn(
            `⚠️ Suspiciously old date for conversation ${
              conv._id
            }: ${dateObj.toISOString()}`
          );
          dateObj = dayjs();
        }

        let group = dateObj.format("DD MMM YYYY");
        if (dateObj.isToday()) group = "Today";
        else if (dateObj.isYesterday()) group = "Yesterday";

        if (!groups[group]) groups[group] = [];
        groups[group].push(conv);
      });
      console.log(`📅 Grouped conversations:`, Object.keys(groups));
      return groups;
    } catch (error) {
      console.error("❌ Error grouping conversations:", error);
      return {};
    }
  }, [filteredConversations]);

  const handleSelect = (conv: ConversationType) => {
    if (conv._id === selectedUserId) {
      console.log(`ℹ️ Conversation ${conv._id} already selected, skipping`);
      return;
    }
    console.log(`✅ Selecting conversation: ${conv._id}`);
    onSelect(conv);
  };

  if (!user) {
    return (
      <div className="p-4 text-center text-gray-500">
        Please login to view chats.
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white flex flex-col overflow-hidden">
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

      {user.role?.toLowerCase() === "instructor" && (
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
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {activeTab === "chats" ? (
          filteredConversations.length === 0 ? (
            <div className="text-center text-gray-500 py-10 text-sm">
              No contacts found.
            </div>
          ) : (
            Object.entries(groupedConversations)
              .sort(([a], [b]) => {
                if (a === "Today") return -1;
                if (b === "Today") return 1;
                if (a === "Yesterday") return -1;
                if (b === "Yesterday") return 1;
                return dayjs(b, "DD MMM YYYY").isAfter(dayjs(a, "DD MMM YYYY"))
                  ? 1
                  : -1;
              })
              .map(([dateGroup, convs]) => (
                <div key={dateGroup}>
                  <div className="px-4 py-2 text-xs text-gray-500 font-semibold uppercase">
                    {dateGroup}
                  </div>
                  {convs.map((conv) => {
                    const isSelected = selectedUserId === conv._id;
                    const { name, email, profileImage } = conv.user || {};
                    const lastMessageContent = conv.lastMessage?.content
                      ? conv.lastMessage.content.length > 30
                        ? conv.lastMessage.content.slice(0, 27) + "..."
                        : conv.lastMessage.content
                      : "No messages yet";

                    const lastMessageCreatedAt = conv.lastMessage?.createdAt;
                    let messageDate = lastMessageCreatedAt
                      ? dayjs(lastMessageCreatedAt)
                      : dayjs();
                    if (lastMessageCreatedAt && !messageDate.isValid()) {
                      console.warn(
                        `⚠️ Invalid lastMessage.createdAt for conversation ${conv._id}: ${lastMessageCreatedAt}`
                      );
                      messageDate = dayjs();
                    }
                    if (messageDate.isBefore("2020-01-01")) {
                      console.warn(
                        `⚠️ Suspiciously old lastMessage.createdAt for conversation ${
                          conv._id
                        }: ${messageDate.toISOString()}`
                      );
                      messageDate = dayjs();
                    }

                    const lastMessageTime = messageDate.format("h:mm A");

                    return (
                      <div
                        key={conv._id}
                        onClick={() => handleSelect(conv)}
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
                          icon={!profileImage?.trim() && <SearchOutlined />}
                        />
                        <div className="flex flex-col flex-1 max-w-[200px]">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-800 text-base">
                              {name || "Unknown"}
                            </span>
                            <span className="text-xs text-gray-500">
                              {lastMessageTime}
                            </span>
                          </div>
                          {email && (
                            <span className="text-gray-500 text-xs truncate">
                              {lastMessageContent}
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
