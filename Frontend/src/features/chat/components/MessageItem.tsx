import React, { memo, useState } from "react";
import { MessageType } from "../../../types/chatTypes";
import { Avatar } from "antd";
import dayjs from "dayjs";

interface Props {
  message: MessageType;
  isOwnMessage: boolean;
}

const MessageItem: React.FC<Props> = ({ message, isOwnMessage }) => {
  const [showFullTimestamp, setShowFullTimestamp] = useState(false);

  // Handle message.createdAt
  const rawCreatedAt = message.createdAt;
  let createdAt: dayjs.Dayjs;

  // Try parsing as ISO string or Unix timestamp
  if (typeof rawCreatedAt === "string" && rawCreatedAt) {
    createdAt = dayjs(rawCreatedAt);
    if (!createdAt.isValid()) {
      // Try parsing as Unix timestamp (milliseconds)
      const numericCreatedAt = parseInt(rawCreatedAt, 10);
      if (!isNaN(numericCreatedAt)) {
        createdAt = dayjs(numericCreatedAt);
      }
    }
  } else if (typeof rawCreatedAt === "number") {
    createdAt = dayjs(rawCreatedAt);
  }

  // Fallback to Date.now() for invalid or missing timestamps
  if (!createdAt || !createdAt.isValid()) {
    console.warn(
      `Invalid or missing createdAt for message: ${message._id || "unknown"}`,
      rawCreatedAt
    );
    createdAt = dayjs(Date.now());
  }

  // Reject suspiciously old dates (before 2020, adjust as needed)
  if (createdAt.isValid() && createdAt.isBefore("2020-01-01")) {
    console.warn(
      `Suspiciously old createdAt for message: ${message._id || "unknown"}`,
      rawCreatedAt,
      `Parsed as: ${createdAt.toISOString()}`
    );
    createdAt = dayjs(Date.now());
  }

  const now = dayjs();
  const isToday = now.isSame(createdAt, "day");
  const isYesterday = now.subtract(1, "day").isSame(createdAt, "day");

  const formattedTime = showFullTimestamp
    ? createdAt.format("MMM D, YYYY · h:mm A")
    : isToday
    ? createdAt.format("h:mm A")
    : isYesterday
    ? "Yesterday"
    : createdAt.format("MMM D, YYYY");

  // Sender Info
  const senderName =
    message.sender?.name ||
    (message.sender?.firstName && message.sender?.lastName
      ? `${message.sender.firstName} ${message.sender.lastName}`
      : "Unknown");

  const getInitials = (name: string): string => {
    if (!name) return "U";
    const names = name.trim().split(" ");
    const firstInitial = names[0]?.[0]?.toUpperCase() || "U";
    const secondInitial = names[1]?.[0]?.toUpperCase() || "";
    return firstInitial + secondInitial;
  };

  const profileImage = message.sender?.profileImage?.trim();
  const avatarFallback = getInitials(senderName);

  return (
    <div
      className={`flex mb-4 px-4 ${
        isOwnMessage ? "justify-end" : "justify-start"
      }`}
    >
      {!isOwnMessage && (
        <Avatar
          size={32}
          src={
            profileImage
              ? profileImage
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  senderName
                )}`
          }
          className="mr-2 mt-2"
        >
          {!profileImage && avatarFallback}
        </Avatar>
      )}

      <div
        className={`flex flex-col max-w-[75%] ${
          isOwnMessage ? "items-end" : "items-start"
        }`}
      >
        <div
          onClick={() => setShowFullTimestamp((prev) => !prev)}
          className={`dsp-message-bubble p-3 rounded-xl text-sm shadow-md whitespace-pre-line break-words cursor-pointer transition duration-200 ${
            isOwnMessage
              ? "bg-[#13173F] text-white rounded-br-none"
              : "bg-[#D9F6F1] text-gray-800 rounded-bl-none"
          }`}
        >
          {message.content || "No content"}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">{formattedTime}</span>
        </div>
      </div>
    </div>
  );
};

export default memo(MessageItem);
