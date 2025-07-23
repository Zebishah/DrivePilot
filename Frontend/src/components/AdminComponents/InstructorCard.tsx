import React from "react";
import { Star, GraduationCap, Car, Settings, Eye } from "lucide-react";
import { Instructor } from "../../types/Instructor";

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
  const rating = instructor.reviewRating; // Mock rating
  console.log("instructor", instructor);
  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".action-button")) return;

    if (showCheckbox) {
      e.preventDefault();
      onSelect(instructor.id);
    } else {
      onClick(instructor);
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails(instructor);
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border p-4 transition-shadow duration-200 cursor-pointer relative hover:shadow-md hover:border-gray-300 ${
        isSelected
          ? "ring-2 ring-[#5DC3D2] border-[#5DC3D2]"
          : "border-gray-200"
      }`}
      onClick={handleCardClick}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <img
            src={instructor.profileImage || "/images/Portrait_Placeholder.png"}
            alt={fullName}
            className="w-12 h-12 rounded-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {fullName}
              </h3>
              <p className="text-xs text-gray-500 truncate">
                {instructor.location || "Location not specified"}
              </p>
            </div>

            <button
              onClick={handleViewDetails}
              className="action-button p-1 mt-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center mt-1">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < Math.floor(rating)
                      ? "text-yellow-400 fill-current"
                      : "text-gray-300"
                  }`}
                />
              ))}
              <span className="text-xs text-gray-600 ml-1">{rating || 0}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center text-xs text-gray-600">
          <GraduationCap className="w-3 h-3 mr-2 text-gray-400" />
          <span>{instructor.studentCount || "No"} Students</span>
        </div>

        <div className="flex items-center text-xs text-gray-600">
          <Car className="w-3 h-3 mr-2 text-gray-400" />
          <span>{instructor.carName || "Car not specified"}</span>
        </div>
        <div className="w-full flex justify-between">
          <div className="flex items-center text-xs text-gray-600">
            <Settings className="w-3 h-3 mr-2 text-gray-400" />
            <span>{instructor.transmissionType || "Manual"} Car</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">
            {instructor.lessonPrice || "No"} CHF Price
          </span>
        </div>
      </div>

      {/* <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
        {instructor.isUserVerified && (
          <div className="w-2 h-2 bg-green-500 rounded-full" />
        )}
      </div> */}
    </div>
  );
};
