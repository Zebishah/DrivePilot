import React from "react";
import { Link } from "react-router-dom";
import { LessonStats, StudentInfo } from "../../../types/Student";

interface StudentInfoCardProps {
  studentInfo: StudentInfo;
  lessonStats: LessonStats;
  formatDuration: (minutes: number) => string;
}

export const StudentInfoCard: React.FC<StudentInfoCardProps> = ({
  studentInfo,
  lessonStats,
  formatDuration,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-200">
            {studentInfo.profileImage ? (
              <img
                src={studentInfo.profileImage}
                alt={`${studentInfo.firstName} ${studentInfo.lastName}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg
                  className="w-10 h-10"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {studentInfo.firstName} {studentInfo.lastName}
              </h2>
              <p className="text-gray-600 mt-2">{studentInfo.location}</p>
            </div>
            <div className="flex space-x-3">
              <button className="px-4 py-2 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors">
                Message
              </button>
              <Link
                to={"/teacher-dashboard/feedback"}
                className="px-4 py-2 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors"
              >
                Feedback
              </Link>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex gap-3 items-center mb-1">
            <div className="text-sm text-gray-500">Total Lessons :</div>
            <div className="text-lg font-semibold text-gray-900">
              {lessonStats.totalLessons} Lessons
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <div className="text-sm text-gray-500 ">Lesson Hours :</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatDuration(lessonStats.totalLessonDurationInMinutes)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
