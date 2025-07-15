import React from "react";
import { StudentHoursProgress } from "../../../types/ReviewTypes";

interface StudentHoursProgressCardProps {
  hoursProgress: StudentHoursProgress;
}

const CircularProgress: React.FC<{
  value: number;
  max: number;
  color: string;
  label: string;
  sublabel: string;
  displayValue?: number;
}> = ({ value, max, color, label, sublabel, displayValue }) => {
  const percentage = value;
  const circumference = 2 * Math.PI * 60; // Increased radius from 45 to 60
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-w-36 mb-4">
        {" "}
        {/* Increased from w-24 h-24 to w-36 h-w-36 */}
        <svg className="w-36 h-w-36 transform -rotate-90" viewBox="0 0 140 140">
          {" "}
          {/* Increased viewBox from 100x100 to 140x140 */}
          <circle
            cx="70" /* Adjusted center from 50 to 70 */
            cy="70" /* Adjusted center from 50 to 70 */
            r="60" /* Increased radius from 45 to 60 */
            stroke="#e5e7eb"
            strokeWidth="12" /* Increased stroke width from 8 to 12 */
            fill="none"
          />
          <circle
            cx="70" /* Adjusted center from 50 to 70 */
            cy="70" /* Adjusted center from 50 to 70 */
            r="60" /* Increased radius from 45 to 60 */
            stroke={color}
            strokeWidth="12" /* Increased stroke width from 8 to 12 */
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-800">
            {" "}
            {/* Increased text size from text-lg to text-2xl */}
            {displayValue || value}
          </span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-base font-medium text-gray-800">{label}</div>{" "}
        {/* Increased from text-sm to text-base */}
        <div className="text-sm text-gray-500">{sublabel}</div>{" "}
        {/* Increased from text-xs to text-sm */}
      </div>
    </div>
  );
};

const StudentHoursProgressCard: React.FC<StudentHoursProgressCardProps> = ({
  hoursProgress,
}) => {
  const { completedHours, remainingHours, totalRequiredHours } = hoursProgress;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mx-auto h-[100%]">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-semibold text-gray-800">Lesson Progress</h3>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        </div>
      </div>

      <div className="flex flex-col items-center ">
        {" "}
        {/* Increased spacing from space-y-8 to space-y-10 */}
        {/* Top single circle - Completed Hours */}
        <div className="flex justify-center">
          <CircularProgress
            value={completedHours}
            max={totalRequiredHours}
            color="#ef4444"
            label="Completed"
            sublabel="Hours"
          />
        </div>
        {/* Bottom two circles side-by-side */}
        <div className="flex justify-center items-center space-x-32">
          {" "}
          {/* Reduced spacing from space-x-48 to space-x-32 to accommodate larger circles */}
          <CircularProgress
            value={totalRequiredHours}
            max={totalRequiredHours}
            color="#f59e0b"
            label="Total Required"
            sublabel="Hours"
          />
          <CircularProgress
            value={remainingHours}
            max={totalRequiredHours}
            color="#06b6d4"
            label="Remaining"
            sublabel="Hours"
          />
        </div>
      </div>
    </div>
  );
};

export default StudentHoursProgressCard;
