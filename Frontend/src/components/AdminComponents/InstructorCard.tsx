import React from "react";
import { Star, GraduationCap, Car, Settings, Eye } from "lucide-react";
import { Instructor } from "../../types/Instructor";
import { StarRating } from "../StudentComponents/ReviewTab/RatingComponent";

interface InstructorCardProps {
  instructor: Instructor;
  isSelected: boolean;
  showCheckbox: boolean;
  onSelect: (id: string) => void;
  onViewDetails: (instructor: Instructor) => void;
  onClick: (instructor: Instructor) => void;
}

export const InstructorCard: React.FC<InstructorCardProps> = ({
  instructor,
  isSelected,
  showCheckbox,
  onSelect,
  onViewDetails,
  onClick,
}) => {
  const fullName = `${instructor.firstName} ${instructor.lastName}`;
  const rating = instructor.reviewRating;

  const handleCardClick = (e: React.MouseEvent) => {
    if (showCheckbox) {
      e.preventDefault();
      e.stopPropagation();
      onSelect(String(instructor.id));
    } else {
      onClick(instructor);
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails(instructor);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelect(String(instructor.id));
  };

  return (
    <div
      className={`relative rounded-lg shadow-sm border p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected
          ? "ring-2 ring-[#5FC2D3] border-[#5FC2D3] bg-[#5FC2D3]"
          : "bg-white border-gray-200 hover:border-gray-300"
      }`}
      onClick={handleCardClick}
    >
      {/* Checkbox */}
      {showCheckbox && (
        <div className="absolute top-3 left-3 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 text-[#5FC2D3] bg-gray-100 border-gray-300 rounded focus:ring-[#5FC2D3] focus:ring-2"
          />
        </div>
      )}

      <div
        className={`flex items-start space-x-3 ${showCheckbox ? "ml-6" : ""}`}
      >
        <img
          src={instructor.profileImage || "/images/Portrait_Placeholder.png"}
          alt={fullName}
          className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3
                className={`text-sm font-semibold ${
                  isSelected ? "text-white" : "text-gray-900"
                }`}
              >
                {fullName}
              </h3>
              <p
                className={`text-xs truncate ${
                  isSelected ? "text-gray-100" : "text-gray-500"
                }`}
              >
                {instructor.location || "Location not specified"}
              </p>
            </div>

            <button
              onClick={handleViewDetails}
              className={`p-1.5 rounded-full transition-colors ${
                isSelected
                  ? "text-white hover:text-gray-200 hover:bg-[#4BB3C4]"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              }`}
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center mt-1">
            <div className="flex items-center">
              <StarRating rating={rating} count={instructor.reviewsCount} />
            </div>
          </div>
        </div>
      </div>

      <div className={`mt-4 space-y-2 ${showCheckbox ? "ml-6" : ""}`}>
        <div
          className={`flex items-center text-xs ${
            isSelected ? "text-white" : "text-gray-600"
          }`}
        >
          <GraduationCap className="w-3 h-3 mr-2 text-inherit" />
          <span>{instructor.studentCount || "No"} Students</span>
        </div>

        <div
          className={`flex items-center text-xs ${
            isSelected ? "text-white" : "text-gray-600"
          }`}
        >
          <Car className="w-3 h-3 mr-2 text-inherit" />
          <span>{instructor.carName || "Car not specified"}</span>
        </div>

        <div className="w-full flex justify-between">
          <div
            className={`flex items-center text-xs ${
              isSelected ? "text-white" : "text-gray-600"
            }`}
          >
            <Settings className="w-3 h-3 mr-2 text-inherit" />
            <span>{instructor.transmissionType || "Manual"} Car</span>
          </div>

          <span
            className={`text-sm font-semibold ${
              isSelected ? "text-white" : "text-gray-900"
            }`}
          >
            {instructor.lessonPrice || "No"} CHF
          </span>
        </div>
      </div>
    </div>
  );
};
