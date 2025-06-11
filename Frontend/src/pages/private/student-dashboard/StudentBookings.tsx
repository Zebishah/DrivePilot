import React from "react";
import { FeedbackTable } from "../../../components/InstructorComponent/FeedBackTable";
import { ComingSoonSection } from "../../../components/InstructorComponent/ComingSoonSection";
import { ErrorMessage } from "../../../components/InstructorComponent/ErrorMessage";
import { LoadingSpinner } from "../../../components/InstructorComponent/LoadingSpinner";
import { useCompletedBookings } from "../../../hooks/UseCompleteBookings";
interface LessonBookingHistoryProps {
  studentId: string;
}
const LessonBookingHistory: React.FC<LessonBookingHistoryProps> = () => {
  const { completedBookings, loading, error, refetch } = useCompletedBookings();

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-white">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-white">
        <ErrorMessage message={error.message} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="mx-auto p-6 bg-white space-y-8">
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Give Feedback
        </h2>
        <FeedbackTable bookings={completedBookings} />
      </div>
      <ComingSoonSection />
    </div>
  );
};

export default LessonBookingHistory;
