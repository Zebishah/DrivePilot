import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, Filter, X } from "lucide-react";
import { format } from "date-fns";
import {
  AnalyticsFilters,
  Instructor,
  QuickFilter,
} from "../../types/Analytics";

interface FilterPopoverProps {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
  instructors: Instructor[];
  instructorsLoading: boolean;
}

export function FilterPopovers({
  filters,
  onFiltersChange,
  instructors,
  instructorsLoading,
}: FilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<AnalyticsFilters>(filters);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeFiltersCount =
    (localFilters.quickFilter ? 1 : 0) +
    (localFilters.dateFilter?.startDate && localFilters.dateFilter?.endDate
      ? 1
      : 0) +
    (localFilters.instructorIds?.length || 0);

  const applyFilters = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const clearAllFilters = () => {
    const clearedFilters: AnalyticsFilters = {};
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const toggleInstructor = (instructorId: string) => {
    const currentIds = localFilters.instructorIds || [];
    const newIds = currentIds.includes(instructorId)
      ? currentIds.filter((id) => id !== instructorId)
      : [...currentIds, instructorId];

    setLocalFilters({
      ...localFilters,
      instructorIds: newIds.length > 0 ? newIds : undefined,
    });
  };

  const removeFilter = (
    type: "quick" | "date" | "instructor",
    value?: string
  ) => {
    const newFilters = { ...localFilters };

    if (type === "quick") {
      delete newFilters.quickFilter;
    } else if (type === "date") {
      delete newFilters.dateFilter;
    } else if (type === "instructor" && value) {
      const currentIds = newFilters.instructorIds || [];
      const newIds = currentIds.filter((id) => id !== value);
      if (newIds.length === 0) {
        delete newFilters.instructorIds;
      } else {
        newFilters.instructorIds = newIds;
      }
    }

    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        <Filter className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Filters</span>
        {activeFiltersCount > 0 && (
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 z-50 w-96 bg-white border border-gray-200 rounded-lg shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            <button
              onClick={clearAllFilters}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear All
            </button>
          </div>

          {/* Quick Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Filter
            </label>
            <select
              value={localFilters.quickFilter || ""}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  quickFilter: (e.target.value as QuickFilter) || undefined,
                  dateFilter: undefined, // Clear custom date when quick filter is selected
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select period...</option>
              {Object.values(QuickFilter).map((filter) => (
                <option key={filter} value={filter}>
                  {filter
                    .replace(/_/g, " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Range */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Date Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <input
                  type="date"
                  value={localFilters.dateFilter?.startDate || ""}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      dateFilter: {
                        ...localFilters.dateFilter,
                        startDate: e.target.value || undefined,
                      },
                      quickFilter: undefined, // Clear quick filter when custom date is used
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="From date"
                />
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={localFilters.dateFilter?.endDate || ""}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      dateFilter: {
                        ...localFilters.dateFilter,
                        endDate: e.target.value || undefined,
                      },
                      quickFilter: undefined, // Clear quick filter when custom date is used
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="To date"
                />
              </div>
            </div>
          </div>

          {/* Instructor Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructors ({localFilters.instructorIds?.length || 0} selected)
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
              {instructorsLoading ? (
                <div className="text-center py-4 text-gray-500">
                  Loading instructors...
                </div>
              ) : (
                <div className="space-y-2">
                  {instructors.map((instructor) => (
                    <label
                      key={instructor._id}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={
                          localFilters.instructorIds?.includes(
                            instructor._id
                          ) || false
                        }
                        onChange={() => toggleInstructor(instructor._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {instructor.firstName} {instructor.lastName}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={applyFilters}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Apply Filters
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {localFilters.quickFilter && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
              {localFilters.quickFilter
                .replace(/_/g, " ")
                .toLowerCase()
                .replace(/\b\w/g, (l) => l.toUpperCase())}
              <X
                className="h-3 w-3 cursor-pointer hover:bg-blue-200 rounded-full"
                onClick={() => removeFilter("quick")}
              />
            </span>
          )}

          {localFilters.dateFilter?.startDate &&
            localFilters.dateFilter?.endDate && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Custom:{" "}
                {format(new Date(localFilters.dateFilter.startDate), "MMM dd")}{" "}
                - {format(new Date(localFilters.dateFilter.endDate), "MMM dd")}
                <X
                  className="h-3 w-3 cursor-pointer hover:bg-green-200 rounded-full"
                  onClick={() => removeFilter("date")}
                />
              </span>
            )}

          {localFilters.instructorIds?.map((id) => {
            const instructor = instructors.find((i) => i._id === id);
            return instructor ? (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full"
              >
                {instructor.firstName} {instructor.lastName}
                <X
                  className="h-3 w-3 cursor-pointer hover:bg-purple-200 rounded-full"
                  onClick={() => removeFilter("instructor", id)}
                />
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
