import { X } from "lucide-react";
import { Feedback } from "../../../types/StudentDashboard";

// Modal component for feedback details
export const FeedbackModal: React.FC<{
  feedback: Feedback;
  isOpen: boolean;
  onClose: () => void;
}> = ({ feedback, isOpen, onClose }) => {
  if (!isOpen) return null;

  const formatDate = (date: string | number) => {
    const parsedDate = new Date(Number(date));
    return parsedDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">
              Lesson Feedback
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Lesson ID
                </label>
                <p className="text-gray-900">{feedback.lessonId}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Instructor Email
                </label>
                <p className="text-gray-900">{feedback.instructorEmail}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Hours Remaining
                </label>
                <p className="text-gray-900">{feedback.hoursRemaining} hours</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Date
                </label>
                <p className="text-gray-900">
                  {formatDate(feedback.createdAt)}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Feedback Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {feedback.feedbackTags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Feedback Message
              </label>
              <div className="bg-gray-50 rounded-lg p-4">
                <div
                  className="text-gray-900 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: feedback.message }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
