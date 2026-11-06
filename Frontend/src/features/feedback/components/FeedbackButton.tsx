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
    className={`dsp-dashboard-button dsp-dashboard-button--primary ${className}`}
  >
    {feedbackStatus === "pending" ? "Give Feedback" : "View Feedback"}
  </Link>
);
