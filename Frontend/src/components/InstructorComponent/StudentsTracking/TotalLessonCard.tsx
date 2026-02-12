import React from "react";
import { Booking, Slot } from "../../../types/Student";

interface TotalLessonsCardProps {
  completedBookings: Booking[];
  uncompletedBookings: Booking[];
  formatDuration: (minutes: number) => string;
}

export const TotalLessonsCard: React.FC<TotalLessonsCardProps> = ({
  completedBookings,
  uncompletedBookings,
  formatDuration,
}) => {
  // One row per slot (completed + in progress), same as Daily Progress
  const slotRows: { booking: Booking; slot: Slot; isCompleted: boolean }[] = [];
  for (const b of completedBookings) {
    for (const slot of b.slots || []) {
      slotRows.push({ booking: b, slot, isCompleted: true });
    }
  }
  for (const b of uncompletedBookings) {
    for (const slot of b.slots || []) {
      slotRows.push({ booking: b, slot, isCompleted: false });
    }
  }
  // Sort by date then start time
  slotRows.sort((a, b) => {
    const d = `${a.slot.date}T${a.slot.startTime}`.localeCompare(`${b.slot.date}T${b.slot.startTime}`);
    return d !== 0 ? d : 0;
  });

  const slotMinutes = (slot: Slot) => {
    const start = new Date(`${slot.date}T${slot.startTime}:00`);
    const end = new Date(`${slot.date}T${slot.endTime}:00`);
    return (end.getTime() - start.getTime()) / (1000 * 60);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 ">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Total Lessons</h3>
        <button className="px-3 py-1 opacity-0 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 transition-colors">
          Edit Hours
        </button>
      </div>
      {slotRows.length === 0 && (
        <div className="text-center h-[80%] flex items-center justify-center">
          <h1>No Bookings Found</h1>
        </div>
      )}
      <div className="space-y-3 h-[85%] overflow-y-auto">
        {slotRows.map(({ booking, slot, isCompleted }) => {
          const minutes = slotMinutes(slot);
          return (
            <div
              key={`${booking._id}-${slot._id || slot.date}-${slot.startTime}`}
              className={`flex items-center justify-between p-3 rounded-lg ${
                isCompleted ? "bg-blue-50" : "bg-gray-50"
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gray-300 rounded flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-gray-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  Lesson {booking._id.charAt(booking._id.length - 1)} (
                  {formatDuration(minutes)})
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">
                  {isCompleted ? "Completed" : "Remaining Time"}
                </div>
                <div className="text-xs text-gray-900">
                  {isCompleted ? "Done" : formatDuration(minutes)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
