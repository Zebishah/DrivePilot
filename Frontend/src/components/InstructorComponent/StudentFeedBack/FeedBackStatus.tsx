interface FeedbackStatusProps {
  status: string;
  className?: string;
}

export const FeedbackStatus: React.FC<FeedbackStatusProps> = ({
  status,
  className = "",
}) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      status === "completed"
        ? "bg-green-100 text-green-800"
        : "bg-red-100 text-red-800"
    } ${className}`}
  >
    {status}
  </span>
);
