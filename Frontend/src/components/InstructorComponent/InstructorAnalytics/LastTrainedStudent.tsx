import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { UserNew } from "../../../types/InstructorAnalytics";

interface LastTrainedStudentProps {
  student: UserNew | null;
  totalLessons?: number;
  joiningDate?: string;
  satisfaction?: number;
  completionDate?: string;
}

export const LastTrainedStudent: React.FC<LastTrainedStudentProps> = ({
  student,
  totalLessons = 10,
  joiningDate,
  satisfaction = 100,
  completionDate,
}) => {
  if (!student) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Last Trained Student
          </h3>
          <button className="bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors">
            View
          </button>
        </div>
        <div className="text-center py-8 text-gray-500">
          No student data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm ">
      <div className="flex items-center justify-between mb-6 ">
        <h3 className="text-lg font-semibold text-gray-900">
          Last Trained Student
        </h3>
        <button className="bg-[#5EC2D2] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#5EC2D2] transition-colors">
          View
        </button>
      </div>

      <div className="flex items-center space-x-4 mb-6 ">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
          {student.profileImage ? (
            <img
              src={student.profileImage}
              alt={`${student.firstName} ${student.lastName}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-xl">
              {student.firstName?.charAt(0)}
              {student.lastName?.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-gray-900">
            {student.firstName} {student.lastName}
          </h4>
          <p className="text-gray-600 text-sm">Houston, UK</p>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronRight size={20} className="text-gray-400" />
        </button>
      </div>

      <div className="space-y-5 ">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            Total Lessons: {totalLessons}
          </span>
          <span className="text-sm text-green-600 flex items-center opacity-0">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            {satisfaction}% Student Satisfaction
          </span>
        </div>
        <div className="flex justify-between items-center">
          {joiningDate && (
            <div className="text-sm text-gray-600">
              Joining Date: {new Date(joiningDate).toLocaleDateString()}
            </div>
          )}

          {completionDate && (
            <div className="text-sm text-gray-600">
              Completion Date: {new Date(completionDate).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Pagination dots */}
      <div className="flex justify-center space-x-2 mt-8 ">
        {[0, 1, 2, 3, 4].map((dot) => (
          <button
            key={dot}
            className={`w-2 h-2 rounded-full ${
              dot === 0 ? "bg-gray-400" : "bg-gray-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
};
