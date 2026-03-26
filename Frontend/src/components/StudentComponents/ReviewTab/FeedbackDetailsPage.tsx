import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BackButton } from "../../InstructorComponent/common/BackButton";

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

const FeedbackDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as
    | { feedback?: StudentFeedbackItem; lessonNumber?: number }
    | undefined;

  const feedback = state?.feedback;
  const lessonNumber = state?.lessonNumber ?? 1;

  if (!feedback) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <p className="text-gray-600">Feedback details not found.</p>
          <button
            type="button"
            onClick={() => navigate("/student-dashboard/Feedback")}
            className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium bg-[#4DD0E1] text-white rounded-md hover:bg-[#3285af] transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto bg-white rounded-lg shadow-sm overflow-hidden">
        <BackButton
          variant="outline"
          showIcon={true}
          to={`/student-dashboard/Feedback`}
        />
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-3xl font-semibold text-gray-900">Course Feedback</h2>
          <button
            type="button"
            onClick={() => navigate("/student-dashboard/chat")}
            className="inline-flex items-center px-5 py-2.5 text-sm font-medium bg-[#4DD0E1] text-white rounded-md hover:bg-[#3285af] transition-colors"
          >
            Send Message
          </button>
        </div>

        <div className="p-8 space-y-8">
          <div>
            <h3 className="text-3 font-semibold text-gray-900">Lesson Number</h3>
            <p className="mt-2 text-xl text-gray-700">Lesson {lessonNumber}</p>
          </div>

          <div>
            <h3 className="text-3 font-semibold text-gray-900">Instructor</h3>
            <div className="mt-2 flex items-center gap-3">
              {feedback.instructorProfileImage ? (
                <img
                  src={feedback.instructorProfileImage}
                  alt={feedback.instructorName || "Instructor"}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200" />
              )}
              <div>
                <p className="text-base text-gray-900">
                  {feedback.instructorName || "Instructor"}
                </p>
                <p className="text-xs text-gray-500">{feedback.instructorEmail}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-3 font-semibold text-gray-900">
              Skills Worked on During the lesson
            </h3>
            <ul className="mt-3 list-disc pl-6 text-gray-700 space-y-1">
              {(feedback.feedbackTags || []).map((tag, idx) => (
                <li key={`${tag}-${idx}`}>{tag}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-3 font-semibold text-gray-900">
              Number of hours remaining
            </h3>
            <p className="mt-2 text-xl text-gray-700">{feedback.hoursRemaining} hrs</p>
          </div>

          <div>
            <h3 className="text-3 font-semibold text-gray-900">
              Areas of Improvement
            </h3>
            <div
              className="mt-3 text-gray-700 leading-relaxed break-words [&_p]:mb-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2 [&_li]:mb-1 [&_strong]:font-semibold [&_em]:italic"
              dangerouslySetInnerHTML={{ __html: feedback.message || "" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackDetailsPage;
