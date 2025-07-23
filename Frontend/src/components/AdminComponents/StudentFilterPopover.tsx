import React, { useState, useEffect } from "react";
import { X, Calendar } from "lucide-react";
import { StudentFilterOptions } from "../../types/Student";

interface StudentFilterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: StudentFilterOptions) => void;
  currentFilters: StudentFilterOptions;
  availableLocations: string[];
}

export const StudentFilterPopover: React.FC<StudentFilterPopoverProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
  currentFilters,
  availableLocations,
}) => {
  const [filters, setFilters] = useState<StudentFilterOptions>(currentFilters);

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: StudentFilterOptions = {
      isVerified: "",
      lessonCount: "",
      location: "",
      dateRange: undefined,
    };
    setFilters(resetFilters);
    onApplyFilters(resetFilters);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-20 pr-4">
      <div
        className="absolute inset-0 bg-black bg-opacity-25"
        onClick={onClose}
      />

      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-80 relative">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Verification Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verification Status
            </label>
            <select
              value={
                filters.isVerified === true
                  ? "verified"
                  : filters.isVerified === false
                    ? "unverified"
                    : ""
              }
              onChange={(e) =>
                setFilters({
                  ...filters,
                  isVerified:
                    e.target.value === "verified"
                      ? true
                      : e.target.value === "unverified"
                        ? false
                        : "",
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>

          {/* Lesson Count Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lesson Count
            </label>
            <select
              value={filters.lessonCount || ""}
              onChange={(e) =>
                setFilters({ ...filters, lessonCount: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Lessons</option>
              <option value="2+">2+ lessons</option>
              <option value="3+">3+ lessons</option>
              <option value="4+">4+ lessons</option>
              <option value="5+">5+ lessons</option>
              <option value="10+">10+ lessons</option>
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <select
              value={filters.location || ""}
              onChange={(e) =>
                setFilters({ ...filters, location: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Locations</option>
              {availableLocations.map((location, index) => (
                <option key={index} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Registration Date Range
            </label>
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="date"
                  placeholder="Start Date"
                  value={filters.dateRange?.startDate || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      dateRange: {
                        ...filters.dateRange,
                        startDate: e.target.value,
                        endDate: filters.dateRange?.endDate || "",
                      },
                    })
                  }
                  className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              </div>
              <div className="relative">
                <input
                  type="date"
                  placeholder="End Date"
                  value={filters.dateRange?.endDate || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      dateRange: {
                        ...filters.dateRange,
                        startDate: filters.dateRange?.startDate || "",
                        endDate: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-3 p-4 border-t border-gray-200">
          <button
            onClick={handleReset}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#5DC3D2] border border-transparent rounded-md hover:bg-[#3b95a3] transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};
