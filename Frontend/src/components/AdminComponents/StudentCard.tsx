import React from "react";
import { Eye, MoreVertical } from "lucide-react";
import { StudentDetail } from "../../types/Student";

interface StudentCardProps {
  student: StudentDetail;
  isSelected: boolean;
  showCheckbox: boolean;
  onSelect: (studentId: string) => void;
  onViewDetails: (student: StudentDetail) => void;
  onClick: (student: StudentDetail) => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  isSelected,
  showCheckbox,
  onSelect,
  onViewDetails,
  onClick,
}) => {
  const fullName = `${student.firstName} ${student.lastName}`;
  const progressPercentage =
    student.remainingHours > 0 ? (student.remainingHours / 100) * 100 : 0;

  const handleCardClick = (e: React.MouseEvent) => {
    if (showCheckbox) {
      e.preventDefault();
      e.stopPropagation();
      onSelect(String(student.id)); // Ensure string conversion
    } else {
      onClick(student);
    }
  };

  const handleViewDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails(student);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelect(String(student.id)); // Ensure string conversion
  };

  // Debug log
  console.log(
    `Student ${student.id} - isSelected: ${isSelected}, showCheckbox: ${showCheckbox}`,
  );

  return (
    <div
      className={`relative rounded-lg shadow-sm border p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected
          ? "ring-2 ring-[#5FC2D3] border-[#5FC2D3] bg-[#5FC2D3]"
          : "bg-white border-gray-200 hover:border-gray-300"
      }`}
      onClick={handleCardClick}
    >
      {/* Checkbox - Fixed positioning */}
      {showCheckbox && (
        <div className="absolute top-3 left-3 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()} // Prevent event bubbling
            className="w-4 h-4 text-[#5FC2D3] bg-gray-100 border-gray-300 rounded focus:ring-[#5FC2D3] focus:ring-2"
          />
        </div>
      )}

      {/* Header with Profile - Add left margin when checkbox is shown */}
      <div
        className={`flex items-start justify-between mb-4 ${showCheckbox ? "ml-6" : ""}`}
      >
        <div className="flex items-center space-x-3">
          <img
            src={student.profileImage || "/images/Portrait_Placeholder.png"}
            alt={fullName}
            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
          />
          <div>
            <h3
              className={`text-sm font-semibold ${isSelected ? "text-white" : "text-gray-900"}`}
            >
              {fullName}
            </h3>
            <p
              className={`text-xs ${isSelected ? "text-gray-100" : "text-gray-500"}`}
            >
              {(student?.location ?? "") ||
              (student?.address ?? "")?.length > 25
                ? (((student?.location ?? "") || student?.address) ?? "").slice(
                    0,
                    25,
                  ) + "..."
                : student?.location || student.address}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleViewDetailsClick}
            className={`p-1.5 rounded-full transition-colors ${
              isSelected
                ? "text-white hover:text-gray-200 hover:bg-[#4BB3C4]"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            className={`p-1.5 rounded-full transition-colors ${
              isSelected
                ? "text-white hover:text-gray-200 hover:bg-[#4BB3C4]"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            }`}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lesson Information */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className={isSelected ? "text-white" : "text-gray-600"}>
            Last Lesson:
          </span>
          <span
            className={`font-medium ${isSelected ? "text-gray-100" : "text-gray-900"}`}
          >
            {student.lastLesson
              ? new Date(student.lastLesson).toLocaleDateString()
              : "No lessons yet"}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full flex flex-col justify-between h-[10vh]">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span
                className={`text-xs ${isSelected ? "text-gray-100" : "text-gray-500"}`}
              >
                Remaining Hour
              </span>
              <span
                className={`text-xs ${isSelected ? "text-gray-100" : "text-gray-500"}`}
              >
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <div
              className={`w-full rounded-full h-2 ${isSelected ? "bg-[#4BB3C4]" : "bg-gray-200"}`}
            >
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  isSelected ? "bg-white" : "bg-[#5DC3D2]"
                }`}
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span
              className={`text-xs ${isSelected ? "text-white" : "text-gray-600"}`}
            >
              Total Lessons:
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isSelected
                  ? "bg-white text-[#5FC2D3]"
                  : "bg-blue-100 text-[#31bdd3]"
              }`}
            >
              {student.totalLessons} lessons
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
