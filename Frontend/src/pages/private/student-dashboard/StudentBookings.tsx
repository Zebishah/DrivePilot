import React from "react";
import { useQuery } from "@apollo/client";
import { GET_STUDENT_LESSON_HISTORY } from "../../../graphql/mutations/profile";
import { useAuth } from "../../../context/AuthContext";

interface LessonHistoryItem {
  lessonBooked: string;
  bookingDate: string;
  payment: number;
  status: string;
  endDate: string;
  startTime: string;
  FinalPrice: number;
  endTime: string;
  instructorName: string;
  slotStatus: string;
  bookingStatus: string;
  instructorId: string | null;
  slotId: string;
  bookingId: string;
}

const LessonBookingHistory: React.FC = () => {
  const { user } = useAuth();
  const studentId = user?.id || "";

  const { loading, error, data } = useQuery(GET_STUDENT_LESSON_HISTORY, {
    variables: { studentId },
    skip: !studentId, // Skip query if studentId is missing
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      console.log(
        "📥 GET_STUDENT_LESSON_HISTORY response:",
        data?.getStudentLessonHistory
      );
    },
    onError: (err) => {
      console.error("❌ GET_STUDENT_LESSON_HISTORY error:", {
        message: err.message,
        studentId,
        user,
      });
    },
  });

  if (!studentId) {
    return (
      <div className="p-6 text-center rounded-lg bg-gray-50 border border-gray-200">
        <p className="text-gray-600">Please log in to view lesson history.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mb-3" />
        <p className="text-gray-500">Loading lesson history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full mb-8 bg-white rounded-lg shadow-sm overflow-hidden p-8 text-center">
        <div className="max-w-sm mx-auto py-6 px-4 rounded-lg bg-gray-50 border border-gray-200">
          <p className="text-gray-600 mb-1">We couldn’t load lesson history right now.</p>
          <p className="text-sm text-gray-500">Please try again later.</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "text-green-500";
      case "completed":
        return "text-blue-400";
      case "cancelled":
        return "text-red-500";
      case "semi_cancelled":
        return "text-yellow-500";
      case "booked":
        return "text-green-500";
      case "available":
        return "text-gray-500";
      case "pending":
        return "text-orange-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className="w-full mb-8 bg-white rounded-lg shadow-sm overflow-hidden">
      {/* <h2 className="p-5 m-0 text-lg font-semibold border-b border-gray-100">
        Lesson booking history
      </h2>
      <div className="w-full">
        <div className="flex bg-gray-50 border-b border-gray-100 font-medium">
          <div className="flex-1 p-4">Lesson Booked</div>
          <div className="flex-1 p-4">Booking Date</div>
          <div className="flex-1 p-4">Instructor</div>
          <div className="flex-1 p-4">Time Slot</div>
          <div className="flex-1 p-4">Lesson Price (CHF)</div>
          <div className="flex-1 p-4">Final Price (CHF)</div>
          <div className="flex-1 p-4">Status</div>
          <div className="flex-1 p-4">End Date</div>
        </div>

        {data?.getStudentLessonHistory?.length > 0 ? (
          data.getStudentLessonHistory.map(
            (lesson: LessonHistoryItem, index: number) => (
              <div
                key={`${lesson.bookingId}-${lesson.slotId}`}
                className="flex border-b border-gray-100 hover:bg-gray-50"
              >
                <div className="flex-1 p-4 flex items-center">
                  {lesson.lessonBooked}
                </div>
                <div className="flex-1 p-4 flex items-center">
                  {lesson.bookingDate}
                </div>
                <div className="flex-1 p-4 flex items-center">
                  {lesson.instructorName}
                </div>
                <div className="flex-1 p-4 flex items-center">
                  {lesson.startTime} - {lesson.endTime}
                </div>
                <div className="flex-1 p-4 flex items-center">
                  {lesson.payment.toFixed(2)} CHF
                </div>
                <div className="flex-1 p-4 flex items-center">
                  {lesson.FinalPrice.toFixed(2)} CHF
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
          )
        ) : (
          <div className="flex flex-col justify-center items-center p-10 bg-gray-50 rounded-lg border border-gray-100">
            <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center mb-3">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">No lesson history yet</p>
            <p className="text-sm text-gray-500 mt-1">Your booking history will appear here.</p>
          </div>
        )}
      </div> */}
    </div>
  );
};

export default LessonBookingHistory;
