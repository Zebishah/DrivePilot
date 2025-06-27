import React, { useEffect } from "react";
import { useQuery } from "@apollo/client";
import { GET_COMPLETED_STUDENT_BOOKINGS } from "../../../graphql/mutations/studentBooking";
import { StudentBooking } from "../../../types/Bookings";
import { Link } from "react-router-dom";

const StudentFeedback: React.FC = () => {
  const { data, loading, error, refetch } = useQuery(
    GET_COMPLETED_STUDENT_BOOKINGS,
    {
      fetchPolicy: "cache-and-network",
    }
  );

  // Update current time every minute for real-time checking
  useEffect(() => {
    const timer = setInterval(() => {
      // Refetch data when time updates
    }, 60000);

    return () => clearInterval(timer);
  }, [refetch]);
  useEffect(() => {
    // Refetch data when the component mounts
    refetch();
  }, [refetch]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-white">
        <div className="animate-pulse">
          <div className="bg-gray-100 rounded-lg p-8 mb-8">
            <div className="h-6 bg-gray-300 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/6"></div>
                  </div>
                  <div className="h-8 bg-gray-300 rounded w-24"></div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-100 rounded-lg p-6">
            <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
            <div className="h-32 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-white">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">
            Error loading completed lessons: {error.message}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const completedBookings: StudentBooking[] =
    data?.getCompletedStudentBookings || [];

  return (
    <div className=" mx-auto p-2 bg-white space-y-8">
      {/* Give Feedback Table */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Give Feedback
        </h2>

        {completedBookings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">
              No completed lessons available for feedback yet.
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Lessons will appear here automatically once they are completed.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-600">
                    Student Name
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">
                    Lesson Number
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">
                    Amount
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">
                    Status
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">
                    Feedback
                  </th>
                </tr>
              </thead>
              <tbody>
                {completedBookings.map((booking) => (
                  <tr key={booking._id} className="border-b border-gray-100">
                    <td className="py-4 px-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-300 flex items-center justify-center">
                          {booking.studentId?.profileImage ? (
                            <img
                              src={booking.studentId.profileImage}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-gray-600 font-medium text-sm">
                              {booking.studentId.firstName.charAt(0)}
                              {booking.studentId.lastName.charAt(0)}
                            </span>
                          )}
                        </div>

                        <span className="font-medium text-gray-800">
                          {booking.studentId.firstName}{" "}
                          {booking.studentId.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-gray-600">
                      Lesson {booking._id.charAt(booking._id.length - 1)}
                    </td>
                    <td className="py-4 px-2 text-gray-600">
                      ${booking.totalAmount}
                    </td>
                    <td className="py-4 px-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
      ${
        booking.feedBackStatus === "completed"
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800"
      }`}
                      >
                        {booking.feedBackStatus}
                      </span>
                    </td>

                    <td className="py-4 px-2">
                      <Link
                        to={`/teacher-dashboard/feedbackForm/${booking._id}/${booking.studentId._id}`}
                        className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors text-sm font-medium"
                      >
                        {booking.feedBackStatus === "pending"
                          ? "Give Feedback"
                          : "View Feedback"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Feedback From Students Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Feedback From Students
        </h2>

        {/* Coming Soon Alert */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Coming Soon!</strong> Student feedback functionality is
                currently under development and will be available soon.
              </p>
            </div>
          </div>
        </div>

        {/* Sample Card (Static for now) */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0"></div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-800">Tom Watson</h3>
                  <p className="text-sm text-gray-500">Student</p>
                </div>
                <span className="text-sm text-gray-400">Coming Soon</span>
              </div>
              <div className="flex items-center mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 ${i < 3 ? "text-yellow-400" : "text-gray-300"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-600 text-sm">
                Student feedback and reviews will be displayed here once the
                feature is implemented.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentFeedback;
