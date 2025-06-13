import React from "react";
import { Link } from "react-router-dom";
import { Booking } from "../../../types/Student";

interface DailyProgressTableProps {
  completedBookings: Booking[];
  uncompletedBookings: Booking[];
  selectedTab: "completed" | "uncompleted";
  setSelectedTab: (tab: "completed" | "uncompleted") => void;
}

export const DailyProgressTable: React.FC<DailyProgressTableProps> = ({
  completedBookings,
  uncompletedBookings,
  selectedTab,
  setSelectedTab,
}) => {
  return (
    <div className=" bg-white rounded-lg shadow-sm p-6 ">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Daily Progress
      </h3>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-4 ">
        <button
          onClick={() => setSelectedTab("completed")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedTab === "completed"
              ? "bg-teal-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Completed ({completedBookings.length})
        </button>
        <button
          onClick={() => setSelectedTab("uncompleted")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedTab === "uncompleted"
              ? "bg-teal-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          In Progress ({uncompletedBookings.length})
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto h-[40vh] overflow-y-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-900">
                Lesson Number
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">
                Date & Time
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">
                Progress
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {(selectedTab === "completed"
              ? completedBookings
              : uncompletedBookings
            ).map((booking) => {
              const firstSlot = booking.slots[0];
              const formattedDate = new Date(firstSlot.date).toLocaleDateString(
                "en-GB",
                {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }
              );

              return (
                <tr key={booking._id} className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-900">
                    Lesson {booking._id.charAt(booking._id.length - 1)}
                  </td>
                  <td className="py-4 px-4 text-gray-600">
                    {formattedDate} {firstSlot.startTime}
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedTab === "completed"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {selectedTab === "completed"
                        ? "Completed"
                        : "In Progress"}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <Link
                      to={`/teacher-dashboard/feedbackForm/${booking._id}`}
                      className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors text-sm font-medium"
                    >
                      {booking.feedBackStatus === "pending"
                        ? "Give Feedback"
                        : "View Feedback"}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {((selectedTab === "completed" && completedBookings.length === 0) ||
        (selectedTab === "uncompleted" &&
          uncompletedBookings.length === 0)) && (
        <div className="text-center text-gray-500 -mt-40">
          No {selectedTab} lessons found
        </div>
      )}
    </div>
  );
};
