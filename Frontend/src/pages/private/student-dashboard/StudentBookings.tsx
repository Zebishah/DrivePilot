import { useQuery } from "@apollo/client";
import React from "react";
import { GET_STUDENT_LESSON_HISTORY } from "../../../graphql/mutations/profile";

interface LessonHistoryItem {
  lessonBooked: string;
  bookingDate: string;
  payment: string;
  status: string;
  endDate: string;
}

interface LessonBookingHistoryProps {
  studentId: string;
}
const LessonBookingHistory: React.FC<LessonBookingHistoryProps> = ({
  studentId,
}) => {
  const { loading, error, data } = useQuery(GET_STUDENT_LESSON_HISTORY, {
    variables: { studentId },
  });

  if (loading)
    return <p className="text-center py-4">Loading lesson history...</p>;
  if (error)
    return (
      <p className="text-center py-4 text-red-500">
        Error loading lesson history: {error.message}
      </p>
    );

  // Function to determine the status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "text-green-500";
      case "completed":
        return "text-blue-400";
      case "cancelled":
        return "text-red-500";
      case "semi_cancelled":
        return "text-yellow-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className="w-full mb-8 bg-white rounded-lg shadow-sm overflow-hidden">
      <h2 className="p-5 m-0 text-lg font-semibold border-b border-gray-100">
        Lesson booking history
      </h2>
      <div className="w-full">
        {/* Table Header */}
        <div className="flex bg-gray-50 border-b border-gray-100 font-medium">
          <div className="flex-1 p-4">Lesson Booked</div>
          <div className="flex-1 p-4">Booking Date</div>
          <div className="flex-1 p-4">Payment (CHF)</div>
          <div className="flex-1 p-4">Status</div>
          <div className="flex-1 p-4">End date</div>
        </div>

        {/* Table Body */}
        {data?.getStudentLessonHistory.map(
          (lesson: LessonHistoryItem, index: number) => (
            <div
              key={index}
              className="flex border-b border-gray-100 hover:bg-gray-50"
            >
              <div className="flex-1 p-4 flex items-center">
                {lesson.lessonBooked}
              </div>
              <div className="flex-1 p-4 flex items-center">
                {lesson.bookingDate}
              </div>
              <div className="flex-1 p-4 flex items-center">
                {lesson.payment} CHF
              </div>
              <div
                className={`flex-1 p-4 flex items-center font-medium ${getStatusColor(
                  lesson.status
                )}`}
              >
                {lesson.status}
              </div>
              <div className="flex-1 p-4 flex items-center">
                {lesson.endDate}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default LessonBookingHistory;
