import { Link } from "react-router-dom";

interface FeedbackButtonProps {
  bookingId: string;
  feedbackStatus: string;
  className?: string;
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({
  bookingId,
  feedbackStatus,
  className = "",
}) => (
  <Link
    to={`/teacher-dashboard/feedbackForm/${bookingId}`}
    className={`px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors text-sm font-medium ${className}`}
  >
    {feedbackStatus === "pending" ? "Give Feedback" : "View Feedback"}
  </Link>
);
