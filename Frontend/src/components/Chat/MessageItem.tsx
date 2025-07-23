interface MessageItemProps {
  text: string;
  time: string;
  sentByMe: boolean;
}

const MessageItem = ({ text, time, sentByMe }: MessageItemProps) => {
  return (
    <div className={`flex ${sentByMe ? "justify-end" : "justify-start"} px-4`}>
      <div
        className={`relative max-w-[70%] px-4 py-2 rounded-xl shadow-sm text-sm break-words
          ${sentByMe ? "bg-[#1A1A40] text-white" : "bg-[#CFF2F9] text-gray-900"}
        `}
      >
        <p className="whitespace-pre-wrap">{text}</p>
        <span
          className={`absolute text-[10px] text-gray-400 mt-1 ${
            sentByMe ? "right-2" : "left-2"
          } bottom-[-18px]`}
        >
          {time}
        </span>
      </div>
    </div>
  );
};

export default MessageItem;
