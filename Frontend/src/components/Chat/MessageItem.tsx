import React from "react";
import { MessageType } from "../../types/chatTypes";
import { Avatar } from "antd";

interface Props {
  message: MessageType;
  isOwnMessage: boolean;
}

const MessageItem: React.FC<Props> = ({ message, isOwnMessage }) => {
  const { content, sender } = message;

  return (
    <div
      className={`flex items-end space-x-2 mb-2 ${
        isOwnMessage ? "justify-end" : "justify-start"
      }`}
    >
      {!isOwnMessage && (
        <Avatar size="small" src={sender.profileImage}>
          {sender.name?.[0]}
        </Avatar>
      )}

      <div
        className={`relative p-3 rounded-lg max-w-sm shadow-md ${
          isOwnMessage
            ? "bg-blue-500 text-white rounded-br-none"
            : "bg-gray-200 text-gray-900 rounded-bl-none"
        }`}
      >
        <p className="text-sm">{content}</p>

        {/* Optional: Tail style */}
        <div
          className={`absolute bottom-0 w-2 h-2 ${
            isOwnMessage
              ? "right-0 bg-blue-500 clip-triangle-right"
              : "left-0 bg-gray-200 clip-triangle-left"
          }`}
        />
      </div>
    </div>
  );
};

export default MessageItem;
