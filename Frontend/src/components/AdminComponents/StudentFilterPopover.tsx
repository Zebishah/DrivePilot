import React, { useState, useEffect } from "react";
import { X, Calendar } from "lucide-react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
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
    if (isOpen) setFilters(currentFilters);
  }, [currentFilters, isOpen]);

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
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      aria-labelledby="student-filter-title"
    >
      <DialogTitle id="student-filter-title" sx={{ pr: 7 }}>
        Filter students
      </DialogTitle>
      <IconButton
        aria-label="Close filters"
        onClick={onClose}
        sx={{ position: "absolute", top: 12, right: 12 }}
      >
        <X size={20} />
      </IconButton>
      <DialogContent className="space-y-4">
        {/* Verification Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Verification Status
          </label>
          <select
            aria-label="Filter students by verification status"
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
            aria-label="Filter students by lesson count"
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
            aria-label="Filter students by location"
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
                aria-label="Registration start date"
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
                aria-label="Registration end date"
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
      </DialogContent>
      <DialogActions>
        <Button onClick={handleReset}>Reset</Button>
        <Button variant="contained" onClick={handleApply}>
          Apply filters
        </Button>
      </DialogActions>
    </Dialog>
  );
};
