export const LoadingSpinner = ({ className = "" }) => (
  <div
    className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${className}`}
  ></div>
);

// Student Header Component
export const StudentHeader = ({ studentInfo, lessonStats, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
          </div>
          <div className="text-right">
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2 w-32"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
          </div>
        </div>
      </div>
    );
  }

  const totalHours = Math.floor(lessonStats.totalLessonDurationInMinutes / 60);

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <img
            src={studentInfo.profileImage || "/api/placeholder/80/80"}
            alt={`${studentInfo.firstName} ${studentInfo.lastName}`}
            className="w-20 h-20 rounded-full object-cover"
          />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {studentInfo.firstName} {studentInfo.lastName}
            </h2>
            <p className="text-gray-600">{studentInfo.location}</p>
            <div className="flex space-x-2 mt-3">
              <button className="bg-teal-500 text-white px-4 py-2 rounded-md text-sm hover:bg-teal-600 transition-colors">
                Message
              </button>
              <button className="bg-teal-500 text-white px-4 py-2 rounded-md text-sm hover:bg-teal-600 transition-colors">
                Feedback
              </button>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">
            Total Lessons: {lessonStats.totalLessons}
          </p>
          <p className="text-sm text-gray-600">Lesson Hours: {totalHours}hrs</p>
        </div>
      </div>
    </div>
  );
};
