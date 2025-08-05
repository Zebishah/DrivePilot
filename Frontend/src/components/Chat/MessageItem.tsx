import React, { memo, useState } from "react";
import { MessageType } from "../../types/chatTypes";
import { Avatar } from "antd";
import dayjs from "dayjs";

interface Props {
  message: MessageType;
  isOwnMessage: boolean;
}

const MessageItem: React.FC<Props> = ({ message, isOwnMessage }) => {
  const [showFullTimestamp, setShowFullTimestamp] = useState(false);
  const senderName =
    message.sender?.name ||
    (message.sender?.firstName && message.sender?.lastName
      ? `${message.sender.firstName} ${message.sender.lastName}`
      : "Unknown");
  const displayName = isOwnMessage ? "You" : senderName;
  const formattedTime = message.createdAt
    ? dayjs(message.createdAt).format(
        showFullTimestamp ? "MMM D, YYYY · h:mm A" : "h:mm A"
      )
    : "Unknown";

  return (
    <div
      className={`flex mb-4 px-4 ${isOwnMessage ? "justify-end" : "justify-start"}`}
    >
      {!isOwnMessage && (
        <Avatar
          size={32}
          src={message.sender?.profileImage || "/default-avatar.png"}
          className="mr-2 mt-2"
        />
      )}
      <div
        className={`flex flex-col max-w-[75%] ${isOwnMessage ? "items-end" : "items-start"}`}
      >
        <div
          onClick={() => setShowFullTimestamp((prev) => !prev)}
          className={`p-3 rounded-xl text-sm shadow-md whitespace-pre-line break-words cursor-pointer transition duration-200 ${
            isOwnMessage
              ? "bg-[#13173F] text-white rounded-br-none"
              : "bg-[#D9F6F1] text-gray-800 rounded-bl-none"
          }`}
        >
          {message.content || "No content"}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {/* <span className="text-xs text-gray-400">{displayName}</span> */}
          <span className="text-xs text-gray-400">{formattedTime}</span>
        </div>
      </div>
    </div>
  );
};

export default memo(MessageItem);