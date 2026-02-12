import React from "react";

import {
  StudentBookingSlot,
  StudentHoursProgress,
} from "../../../types/ReviewTypes";
import { Tooltip } from "@mui/material";

interface StudentHoursProgressCardProps {
  hoursProgress: StudentHoursProgress;
  bookingSlots: StudentBookingSlot[];
}

const CircularProgress: React.FC<{
  value: number;
  max?: number;
  color: string;
  label: string;
  sublabel: string;
  displayValue?: number;
  tooltip: string;
}> = ({ value, color, label, sublabel, displayValue, tooltip }) => {
  const percentage = value;
  const circumference = 2 * Math.PI * 60;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Tooltip title={tooltip} arrow placement="top">
      <div className="flex flex-col items-center cursor-help">
        <div className="relative w-36 h-w-36 mb-4">
          <svg
            className="w-36 h-w-36 transform -rotate-90"
            viewBox="0 0 140 140"
          >
            <circle
              cx="70"
              cy="70"
              r="60"
              stroke="#e5e7eb"
              strokeWidth="12"
              fill="none"
            />
            <circle
              cx="70"
              cy="70"
              r="60"
              stroke={color}
              strokeWidth="12"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-800">
              {displayValue || value}
            </span>
          </div>
        </div>
        <div className="text-center">
          <div className="text-base font-medium text-gray-800">{label}</div>
          <div className="text-sm text-gray-500">{sublabel}</div>
        </div>
      </div>
    </Tooltip>
  );
};

const StudentHoursProgressCard: React.FC<StudentHoursProgressCardProps> = ({
  hoursProgress,
  bookingSlots,
}) => {
  const { completedHours, remainingHours, totalRequiredHours } = hoursProgress;

  // Time since last completed lesson: use only slots that are completed (backend isCompleted = status completed OR slot end passed)
  function daysSinceLastCompletedLesson(slots: StudentBookingSlot[]) {
    if (!slots || slots.length === 0) return null;

    const completedSlots = slots.filter((s) => s.isCompleted);
    if (completedSlots.length === 0) return null;

    const pastDates = completedSlots
      .map((s) => s.slotDetails?.date)
      .filter((date): date is string => !!date)
      .sort()
      .reverse();

    const lastLessonDateStr = pastDates[0];
    const [year, month, day] = lastLessonDateStr.split("-").map(Number);
    const lastLessonDate = new Date(year, month - 1, day);
    const lastLessonMidnight = new Date(
      lastLessonDate.getFullYear(),
      lastLessonDate.getMonth(),
      lastLessonDate.getDate(),
    );

    const today = new Date();
    const todayMidnight = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const diffTime = todayMidnight.getTime() - lastLessonMidnight.getTime();
    let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) diffDays = 0;

    return {
      lastLessonDate: lastLessonDateStr,
      daysSinceLastLesson: diffDays,
    };
  }

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

      <div className="flex flex-col items-center">
        {/* Completed Hours */}
        <div className="flex justify-center">
          <CircularProgress
            value={completedHours}
            max={totalRequiredHours}
            color="#ef4444"
            label="Completed"
            sublabel="Hours"
            tooltip="This is how many lessons you've already completed with an instructor. On average in Switzerland, students take around 30 lessons to be ready — but don’t stress! Everyone learns at their own pace 😉"
          />
        </div>

        {/* Remaining & Time Since Last Lesson */}
        <div className="flex justify-center items-center space-x-32">
          <CircularProgress
            value={
              ((daysSinceLastCompletedLesson(bookingSlots)
                ?.daysSinceLastLesson ?? 0) /
                30) *
              100
            }
            max={100}
            color="#f59e0b"
            label="Time Since Last"
            sublabel="Lesson (Days)"
            displayValue={
              daysSinceLastCompletedLesson(bookingSlots)?.daysSinceLastLesson ??
              0
            }
            tooltip="Time elapsed since your Last driving lesson on the platform."
          />

          <CircularProgress
            value={remainingHours}
            max={totalRequiredHours}
            color="#06b6d4"
            label="Remaining"
            sublabel="Hours"
            tooltip="Estimated number of hours remaining before you are ready to take the driving exam. This is based on the opinion of your most recent instructor."
          />
        </div>
      </div>
    </div>
  );
};

export default StudentHoursProgressCard;
