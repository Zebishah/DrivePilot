import { StudentHoursProgress } from "../../../types/ReviewTypes";
import {
  CircularProgress,
  mockStudentData,
  WeeklyLineChart,
} from "./CircularProgress";
interface StudentHoursProgressCardProps {
  hoursProgress: StudentHoursProgress;
}
const StudentProgressDashboard: React.FC<StudentHoursProgressCardProps> = ({
  hoursProgress,
}) => {
  const {
    studentInfo,
    weeklyProgress,
    completedHours,
    remainingHours,
    totalRequiredHours,
  } = hoursProgress;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Section - Weekly Progress Chart */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
            <div className="flex items-center mb-6">
              <img
                src={studentInfo.profileImage}
                alt={`${studentInfo.firstName} ${studentInfo.lastName}`}
                className="w-16 h-16 rounded-full object-cover mr-4"
              />
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {studentInfo.firstName} {studentInfo.lastName}
                </h2>
                <p className="text-gray-600">{studentInfo.location}</p>
                <p className="text-sm text-gray-500">{studentInfo.lesson}</p>
              </div>
            </div>
          </div>

          <WeeklyLineChart data={weeklyProgress} />
        </div>

        {/* Right Section - Lesson Progress */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-sm w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">
                Lesson Progress
              </h3>
            </div>

            <div className="space-y-8">
              {/* Total Required Hours */}
              <div className="text-center">
                <CircularProgress
                  value={totalRequiredHours}
                  maxValue={totalRequiredHours}
                  color="#f59e0b"
                  size={120}
                  strokeWidth={10}
                />
                <div className="mt-3">
                  <p className="text-sm text-gray-600">Total Required</p>
                  <p className="text-sm text-gray-600">Hours</p>
                </div>
              </div>

              {/* Completed Hours */}
              <div className="text-center">
                <CircularProgress
                  value={completedHours}
                  maxValue={totalRequiredHours}
                  color="#ef4444"
                  size={120}
                  strokeWidth={10}
                />
                <div className="mt-3">
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-sm text-gray-600">Hours</p>
                </div>
              </div>

              {/* Remaining Hours */}
              <div className="text-center">
                <CircularProgress
                  value={remainingHours}
                  maxValue={totalRequiredHours}
                  color="#06b6d4"
                  size={120}
                  strokeWidth={10}
                />
                <div className="mt-3">
                  <p className="text-sm text-gray-600">Remaining</p>
                  <p className="text-sm text-gray-600">Hours</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProgressDashboard;
