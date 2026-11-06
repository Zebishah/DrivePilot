import React from "react";
import { Booking, Slot } from "../../../types/Student";

interface TotalLessonsCardProps {
  completedBookings: Booking[];
  uncompletedBookings: Booking[];
  formatDuration: (minutes: number) => string;
}

function isSlotStatusCompleted(slot: Slot): boolean {
  return String(slot.status || "").toLowerCase() === "completed";
}

export const TotalLessonsCard: React.FC<TotalLessonsCardProps> = ({
  completedBookings,
  uncompletedBookings,
  formatDuration,
}) => {
  // Only slots explicitly marked completed (backend "completedBookings" includes all past slots, not only completed status)
  const slotRows: { booking: Booking; slot: Slot }[] = [];
  for (const b of [...completedBookings, ...uncompletedBookings]) {
    for (const slot of b.slots || []) {
      if (isSlotStatusCompleted(slot)) {
        slotRows.push({ booking: b, slot });
      }
    }
  }
  slotRows.sort((a, b) => {
    const d = `${a.slot.date}T${a.slot.startTime}`.localeCompare(
      `${b.slot.date}T${b.slot.startTime}`,
    );
    return d !== 0 ? d : 0;
  });

  const slotMinutes = (slot: Slot) => {
    const start = new Date(`${slot.date}T${slot.startTime}:00`);
    const end = new Date(`${slot.date}T${slot.endTime}:00`);
    return (end.getTime() - start.getTime()) / (1000 * 60);
  };

  const formatLessonDate = (date: string) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatLessonPrice = (booking: Booking) => {
    const slotCount = booking.slots?.length || 1;
    const total = Number(booking.finalAmount ?? booking.totalAmount ?? 0);
    if (!Number.isFinite(total) || total <= 0) return "—";
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: "CHF",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(total / slotCount);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Completed Lessons
        </h3>
        <button className="dsp-dashboard-button--primary px-3 py-1 opacity-0 text-white text-sm rounded-lg transition-colors">
          Edit Hours
        </button>
      </div>
      {slotRows.length === 0 && (
        <div className="text-center h-[80%] flex items-center justify-center">
          <p className="text-gray-600 text-sm">No completed lessons yet</p>
        </div>
      )}
      <div className="space-y-3 h-[350px] overflow-y-auto">
        {slotRows.map(({ booking, slot }, index) => {
          const minutes = slotMinutes(slot);
          return (
            <div
              key={`${booking._id}-${slot._id || slot.date}-${slot.startTime}`}
              className="flex items-center justify-between p-3 rounded-lg bg-blue-50"
            >
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-gray-300 rounded flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-gray-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Lesson {index + 1} ({formatDuration(minutes)})
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {formatLessonDate(slot.date)} | {slot.startTime} -{" "}
                    {slot.endTime} | {formatLessonPrice(booking)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Completed</div>
                <div className="text-xs text-gray-900">Done</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
