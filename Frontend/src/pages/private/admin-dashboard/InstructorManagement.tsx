import React, { useState, useMemo } from "react";
import { useQuery, useMutation, NetworkStatus } from "@apollo/client";
import {
  Plus,
  Download,
  Trash2,
  Filter,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  DELETE_INSTRUCTORS,
  GET_ALL_INSTRUCTORS_DETAILS,
} from "../../../graphql/Queries/InstructorProfiles";
import { FilterPopover } from "../../../components/AdminComponents/FilterPopOver";
import { InstructorCard } from "../../../components/AdminComponents/InstructorCard";
import { InstructorDetailModal } from "../../../components/AdminComponents/InstructorDetailModal";
import { DeleteConfirmationModal } from "../../../components/AdminComponents/DeleteConfirmation";
import { FilterOptions, Instructor } from "../../../types/Instructor";

export const InstructorManagement: React.FC = () => {
  const [selectedInstructors, setSelectedInstructors] = useState<string[]>([]);
  const [showDeleteMode, setShowDeleteMode] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedInstructor, setSelectedInstructor] =
    useState<Instructor | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({});

  const { data, loading, error, refetch, networkStatus } = useQuery(
    GET_ALL_INSTRUCTORS_DETAILS,
    {
      notifyOnNetworkStatusChange: true,
    }
  );
  const [deleteInstructors, { loading: deleting }] =
    useMutation(DELETE_INSTRUCTORS);

  const instructors: Instructor[] = data?.allInstructorsWithDetails || [];

  const isRefetching = networkStatus === NetworkStatus.refetch;
  // Apply filters to instructors
  const filteredInstructors = useMemo(() => {
    return instructors.filter((instructor) => {
      // Gender filter
      if (
        filters.gender &&
        filters.gender !== "" &&
        instructor.gender !== filters.gender
      ) {
        return false;
      }

      // Verification filter
      if (filters.isVerified !== "" && filters.isVerified !== undefined) {
        if (instructor.isUserVerified !== filters.isVerified) {
          return false;
        }
      }
      // Experience filter
      if (
        filters.experience &&
        filters.experience !== "" &&
        instructor.experience !== filters.experience
      ) {
        return false;
      }

      // Date range filter
      if (filters.dateRange?.startDate && filters.dateRange?.endDate) {
        try {
          const instructorDate = new Date(Number(instructor.createdAt));

          if (isNaN(instructorDate.getTime())) {
            console.warn("Invalid createdAt date:", instructor.createdAt);
            return true; // skip filter if date is invalid
          }

          const startDate = new Date(
            filters.dateRange.startDate + "T00:00:00.000Z"
          );
          const endDate = new Date(
            filters.dateRange.endDate + "T23:59:59.999Z"
          );

          if (instructorDate < startDate || instructorDate > endDate) {
            return false;
          }
        } catch (error) {
          console.error("Date parsing error:", error);
          return true;
        }
      }
      return true;
    });
  }, [instructors, filters]);

  const handleSelectInstructor = (instructorId: string) => {
    setSelectedInstructors((prev) => {
      // Ensure both the instructorId parameter and stored IDs are strings
      const idStr = String(instructorId);

      // Debug log
      console.log("Toggling selection for instructor:", idStr);
      console.log("Current selected instructors:", prev);

      const newSelection = prev.includes(idStr)
        ? prev.filter((id) => id !== idStr)
        : [...prev, idStr];

      console.log("New selected instructors:", newSelection);

      return newSelection;
    });
  };

  const handleDeleteClick = () => {
    if (selectedInstructors.length === 0) {
      setShowDeleteMode(!showDeleteMode);
      setSelectedInstructors([]);
    } else {
      setShowDeleteModal(true);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteInstructors({
        variables: { instructorIds: selectedInstructors },
      });

      setSelectedInstructors([]);
      setShowDeleteMode(false);
      setShowDeleteModal(false);
      refetch();
    } catch (error) {
      console.error("Error deleting instructors:", error);
    }
  };

  const handleCardClick = (instructor: Instructor) => {
    setSelectedInstructor(instructor);
    setShowDetailModal(true);
  };

  const handleViewDetails = (instructor: Instructor) => {
    setSelectedInstructor(instructor);
    setShowDetailModal(true);
  };

  const handleApplyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Error Loading Instructors
          </h2>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className=" mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col items-start gap-4 mb-8 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            Instructor Management
          </h1>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <button
              onClick={() => refetch()}
              title="Refresh Students"
              disabled={isRefetching}
              className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md shadow-sm text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefetching ? (
                <svg
                  className="animate-spin w-4 h-4 mr-2 text-gray-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l4-4-4-4v4a8 8 0 00-8 8z"
                  ></path>
                </svg>
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {isRefetching ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={handleDeleteClick}
              className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium transition-colors ${
                showDeleteMode || selectedInstructors.length > 0
                  ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {showDeleteMode && selectedInstructors.length > 0
                ? `Delete (${selectedInstructors.length})`
                : "Delete"}
            </button>

            <div className="relative">
              <button
                aria-haspopup="dialog"
                aria-expanded={showFilterPopover}
                onClick={() => setShowFilterPopover(!showFilterPopover)}
                className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium transition-colors ${
                  Object.values(filters).some(
                    (value) => value !== "" && value !== undefined
                  )
                    ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </button>

              <FilterPopover
                isOpen={showFilterPopover}
                onClose={() => setShowFilterPopover(false)}
                onApplyFilters={handleApplyFilters}
                currentFilters={filters}
              />
            </div>
          </div>
        </div>
        {/* Delete Mode Alert */}
        {showDeleteMode && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Delete Mode Active
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  Select multiple instructors to delete them. Click on the cards
                  to select.
                </p>
              </div>
            </div>
          </div>
        )}
        {/* Total Count */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 text-end w-full">
            Total Instructors:{" "}
            <span className="font-semibold">{filteredInstructors.length}</span>
          </p>
        </div>

        {/* Instructor Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInstructors.map((instructor) => (
            <InstructorCard
              key={instructor.id}
              instructor={instructor}
              isSelected={selectedInstructors.includes(instructor.id)}
              showCheckbox={showDeleteMode}
              onSelect={handleSelectInstructor}
              onViewDetails={handleViewDetails}
              onClick={handleCardClick}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredInstructors.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No instructors found
            </h3>
            <p className="text-gray-500">
              {Object.values(filters).some(
                (value) => value !== "" && value !== undefined
              )
                ? "Try adjusting your filters to see more results."
                : "Get started by adding a new instructor."}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <InstructorDetailModal
        instructor={selectedInstructor}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        refetchInstructors={refetch} // Add this line to pass the refetch function
      />

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        instructorCount={selectedInstructors.length}
        isLoading={deleting}
      />
    </div>
  );
};
