import { MapPin, MoveRight } from "lucide-react";
import { LessonStats, Student } from "../../../types/Student";
import { Link } from "react-router-dom";

interface StudentCardProps {
  student: Student;
  totalBookings: number;
  lessonStats: LessonStats;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  totalBookings,
}) => {
  const getAvatarSrc = () => {
    if (student.profileImage) {
      return student.profileImage;
    }
    return `https://ui-avatars.com/api/?name=${student.firstName}+${student.lastName}&background=e2e8f0&color=475569&size=64`;
  };

  const getLocationDisplay = () => {
    if (student.location) {
      const parts = student.location.split(",");
      return parts.length > 1
        ? `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`
        : student.location;
    }
    return student.homeAddress
      ? student.homeAddress.split(",").slice(-2).join(", ")
      : "Location not provided";
  };
  return (
    <div className="dsp-student-card bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
            <img
              src={getAvatarSrc()}
              alt={`${student.firstName} ${student.lastName}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${student.firstName}+${student.lastName}&background=e2e8f0&color=475569&size=64`;
              }}
            />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {student.firstName} {student.lastName}
            </h3>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <MapPin className="w-3 h-3 mr-1" />
              {getLocationDisplay()}
            </div>
          </div>
        </div>
        <Link
          to={`/teacher-dashboard/studentProgress/${student._id}`}
          className="p-2 bg-gray-200 rounded-full border-1 border-gray-400"
        >
          <MoveRight />
        </Link>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">
            Completed Lessons: {totalBookings}
          </span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Remaining Hour:</span>
          <span className="text-gray-900 font-medium">
            {student.lessonHoursLeft}
          </span>
        </div>
        <div className=" bg-gray-200 rounded-full h-2">
          <div
            className="dsp-student-card__progress h-2 rounded-full transition-all duration-300"
            style={{
              width: `${student.lessonHoursLeft || 0}%`,
            }}
          />
        </div>
      </div>

      {student.isUserVerified && (
        <div className="mt-3">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Verified
          </span>
        </div>
      )}
    </div>
  );
};
