import React, { useEffect, useState } from "react";
import { X, Calendar } from "lucide-react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import { FilterOptions } from "../../types/Instructor";

interface FilterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

export const FilterPopover: React.FC<FilterPopoverProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
  currentFilters,
}) => {
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);

  useEffect(() => {
    if (isOpen) setFilters(currentFilters);
  }, [currentFilters, isOpen]);

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: FilterOptions = {
      gender: "",
      isVerified: "",
      experience: "",
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
      aria-labelledby="instructor-filter-title"
    >
      <DialogTitle id="instructor-filter-title" sx={{ pr: 7 }}>
        Filter instructors
      </DialogTitle>
      <IconButton
        aria-label="Close filters"
        onClick={onClose}
        sx={{ position: "absolute", top: 12, right: 12 }}
      >
        <X size={20} />
      </IconButton>
      <DialogContent className="space-y-4">
        {/* Gender Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gender
          </label>
          <select
            aria-label="Filter instructors by gender"
            value={filters.gender || ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                gender: e.target.value as FilterOptions["gender"],
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Verification Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Verification Status
          </label>
          <select
            aria-label="Filter instructors by verification status"
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

        {/* Experience Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Experience
          </label>
          <select
            aria-label="Filter instructors by experience"
            value={filters.experience || ""}
            onChange={(e) =>
              setFilters({ ...filters, experience: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Experience</option>
            <option value="1-3">1-3 years</option>
            <option value="3-5">3-5 years</option>
            <option value="5-10">5-10 years</option>
            <option value="10+">10+ years</option>
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
