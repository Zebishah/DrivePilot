import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { useAuth } from "../../../context/AuthContext";
import { GET_STUDENT_FEEDBACKS_LIST } from "../../../graphql/Queries/LessonFeedback";

type StudentFeedbackItem = {
  _id: string;
  lessonId: string;
  instructorId: string;
  instructorEmail: string;
  instructorName?: string;
  instructorProfileImage?: string;
  feedbackTags: string[];
  hoursRemaining: string;
  message: string;
  createdAt: string;
};

const FeedBackAndRating: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.id || "";

  const { data, loading, error } = useQuery(GET_STUDENT_FEEDBACKS_LIST, {
    variables: { studentId },
    skip: !studentId,
    fetchPolicy: "network-only",
  });

  const feedbacks: StudentFeedbackItem[] = data?.getStudentFeedbacks || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading feedbacks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Failed to load feedbacks. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">
            Feedback from Instructors
          </h2>
          <button
            type="button"
            onClick={() => navigate("/student-dashboard/chat")}
            className="inline-flex items-center px-4 py-2 text-sm font-medium bg-[#4DD0E1] text-white rounded-md hover:bg-[#3285af] transition-colors"
          >
            Send Message
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Lesson Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Instructor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Areas of Improvement
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Skills worked on
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {feedbacks.map((feedback, idx) => (
                <tr key={feedback._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">
                    Lesson {idx + 1}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {feedback.instructorName || "Instructor"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {new Date(Number(feedback.createdAt)).toLocaleDateString(
                      "en-GB",
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-[240px] truncate">
                    {feedback.message?.replace(/<[^>]+>/g, "").slice(0, 80)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-[240px] truncate">
                    {feedback.feedbackTags?.join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        navigate("/student-dashboard/feedback-details", {
                          state: { feedback, lessonNumber: idx + 1 },
                        })
                      }
                      className="inline-flex items-center px-4 py-1.5 text-sm text-white bg-[#4DD0E1] rounded-md hover:bg-[#3285af] transition-colors"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {feedbacks.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No feedback available yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedBackAndRating;
