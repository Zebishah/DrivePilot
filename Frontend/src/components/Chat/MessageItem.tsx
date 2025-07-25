import React, { useState } from "react";
import { MessageType } from "../../types/chatTypes";
import { Avatar } from "antd";
import dayjs from "dayjs";

interface Props {
  message: MessageType;
  isOwnMessage: boolean;
}

const MessageItem: React.FC<Props> = ({ message, isOwnMessage }) => {
  const [showFullTimestamp, setShowFullTimestamp] = useState(false);
  const { content, sender, createdAt } = message;

  return (
    <div
      className={`flex mb-4 px-4 ${
        isOwnMessage ? "justify-end" : "justify-start"
      }`}
    >
      {!isOwnMessage && (
        <Avatar size={32} src={sender.profileImage} className="mr-2" />
      )}

      <div
        className={`flex flex-col max-w-[75%] ${
          isOwnMessage ? "items-end" : "items-start"
        }`}
      >
        <div
          onClick={() => setShowFullTimestamp((prev) => !prev)}
          className={`p-3 rounded-xl text-sm shadow-md whitespace-pre-line break-words cursor-pointer transition duration-200 ${
            isOwnMessage
              ? "bg-[#13173F] text-white rounded-br-none"
              : "bg-[#D9F6F1] text-gray-800 rounded-bl-none"
          }`}
        >
          {content}
        </div>

        <span className="text-xs text-gray-400 mt-1">
          {showFullTimestamp
            ? dayjs(createdAt).format("MMM D, YYYY · h:mm A")
            : dayjs(createdAt).format("h:mm A")}
        </span>
      </div>
    </div>
  );
};

export default MessageItem;
