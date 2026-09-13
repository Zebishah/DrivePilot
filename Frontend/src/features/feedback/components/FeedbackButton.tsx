import { Link } from "react-router-dom";

interface FeedbackButtonProps {
  bookingId: string;
  studentId: string;
  feedbackStatus: string;
  className?: string;
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({
  bookingId,
  studentId,
  feedbackStatus,
  className = "",
}) => (
  <Link
    to={`/teacher-dashboard/feedbackForm/${bookingId}/${studentId}`}
    className={`px-4 py-2 bg-[#5CC2D2] text-white rounded-md hover:bg-[#5CC2D2] transition-colors text-sm font-medium ${className}`}
  >
    {feedbackStatus === "pending" ? "Give Feedback" : "View Feedback"}
  </Link>
);
