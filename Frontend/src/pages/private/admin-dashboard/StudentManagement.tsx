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

import { StudentFilterPopover } from "../../../components/AdminComponents/StudentFilterPopover";
import { StudentCard } from "../../../components/AdminComponents/StudentCard";

import { StudentDeleteConfirmationModal } from "../../../components/AdminComponents/StudentDeleteConfirmationModal";
import { StudentDetail, StudentFilterOptions } from "../../../types/Student";
import {
  DELETE_STUDENTS,
  GET_ALL_STUDENTS_ADMIN,
} from "../../../graphql/Queries/StudentQueries";
import { StudentDetailModal } from "../../../components/AdminComponents/StudentDetailModel";

export const StudentManagement: React.FC = () => {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showDeleteMode, setShowDeleteMode] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(
    null
  );
  const [filters, setFilters] = useState<StudentFilterOptions>({});

  const { data, loading, error, refetch, networkStatus } = useQuery(
    GET_ALL_STUDENTS_ADMIN,
    {
      notifyOnNetworkStatusChange: true,
      fetchPolicy: "network-only", // <— always request from server on mount
    }
  );
  const [deleteStudents, { loading: deleting }] = useMutation(DELETE_STUDENTS);

  const students: StudentDetail[] = data?.allStudentsWithLessonStats || [];

  const isRefetching = networkStatus === NetworkStatus.refetch;
  // Get unique locations for filter
  const availableLocations = useMemo(() => {
    const locations = students
      .map((student) => student.location || student.address)
      .filter(Boolean)
      .filter((location, index, self) => self.indexOf(location) === index);
    return locations;
  }, [students]);

  // Apply filters to students
  const filteredStudents = useMemo(() => {
    console.log("Student Filters:", filters);
    return students.filter((student) => {
      // Verification filter
      if (filters.isVerified !== "" && filters.isVerified !== undefined) {
        if (student.isUserVerified !== filters.isVerified) {
          return false;
        }
      }

      // Lesson count filter
      if (filters.lessonCount && filters.lessonCount !== "") {
        const minLessons = parseInt(filters.lessonCount.replace("+", ""));
        if (student.totalLessons < minLessons) {
          return false;
        }
      }

      // Location filter
      if (filters.location && filters.location !== "") {
        const studentLocation = student.location || student.address || "";
        if (
          !studentLocation
            .toLowerCase()
            .includes(filters.location.toLowerCase())
        ) {
          return false;
        }
      }

      // Date range filter (local-safe)
      if (filters.dateRange?.startDate && filters.dateRange?.endDate) {
        try {
          const studentDate = new Date(Number(student.createdAt)); // If it's a timestamp
          if (isNaN(studentDate.getTime())) {
            console.warn("Invalid student.createdAt:", student.createdAt);
            return false;
          }

          const startDate = new Date(filters.dateRange.startDate);
          startDate.setHours(0, 0, 0, 0);

          const endDate = new Date(filters.dateRange.endDate);
          endDate.setHours(23, 59, 59, 999);

          if (studentDate < startDate || studentDate > endDate) {
            return false;
          }
        } catch (error) {
          console.error("Date parsing error:", error);
          return false;
        }
      }

      return true;
    });
  }, [students, filters]);

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents((prev) => {
      // Ensure both the studentId parameter and stored IDs are strings
      const idStr = String(studentId);

      // Debug log
      console.log("Toggling selection for student:", idStr);
      console.log("Current selected students:", prev);

      const newSelection = prev.includes(idStr)
        ? prev.filter((id) => id !== idStr)
        : [...prev, idStr];

      console.log("New selected students:", newSelection);

      return newSelection;
    });
  };

  const handleDeleteClick = () => {
    if (selectedStudents.length === 0) {
      setShowDeleteMode((prev) => !prev);
      // ⛔️ Don't reset selection if you're just toggling delete mode on
    } else {
      setShowDeleteModal(true);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteStudents({
        variables: { studentIds: selectedStudents },
      });

      setSelectedStudents([]);
      setShowDeleteMode(false);
      setShowDeleteModal(false);
      refetch();
    } catch (error) {
      console.error("Error deleting students:", error);
    }
  };

  const handleCardClick = (student: StudentDetail) => {
    setSelectedStudent(student);
    setShowDetailModal(true);
  };

  const handleViewDetails = (student: StudentDetail) => {
    setSelectedStudent(student);
    setShowDetailModal(true);
  };

  const handleApplyFilters = (newFilters: StudentFilterOptions) => {
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
            Error Loading Students
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
  console.log("selectedStudents:", selectedStudent);
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Student Management
          </h1>

          <div className="flex items-center space-x-3">
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
                showDeleteMode || selectedStudents.length > 0
                  ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {showDeleteMode && selectedStudents.length > 0
                ? `Delete (${selectedStudents.length})`
                : "Delete"}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowFilterPopover(!showFilterPopover)}
                className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium transition-colors ${
                  Object.values(filters).some(
                    (value) => value !== "" && value !== undefined
                  )
                    ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "border-gray-300 bg-[#5DC3D2] text-gray-700 hover:bg-[#2da4b6]"
                }`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </button>

              <StudentFilterPopover
                isOpen={showFilterPopover}
                onClose={() => setShowFilterPopover(false)}
                onApplyFilters={handleApplyFilters}
                currentFilters={filters}
                availableLocations={availableLocations}
              />
            </div>
          </div>
        </div>
        {showDeleteMode && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Delete Mode Active
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  Select multiple students to delete them. Click on the cards to
                  select.
                </p>
              </div>
            </div>
          </div>
        )}
        {/* Total Count */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 text-end w-full">
            Total Students:{" "}
            <span className="font-semibold">{filteredStudents.length}</span>
          </p>
        </div>

        {/* Student Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => {
            const isSelected = selectedStudents.includes(String(student.id));

            return (
              <StudentCard
                key={student.id}
                student={student}
                isSelected={isSelected}
                showCheckbox={showDeleteMode}
                onSelect={handleSelectStudent}
                onViewDetails={handleViewDetails}
                onClick={handleCardClick}
              />
            );
          })}
        </div>

        {/* Empty State */}
        {filteredStudents.length === 0 && (
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
              No students found
            </h3>
            <p className="text-gray-500">
              {Object.values(filters).some(
                (value) => value !== "" && value !== undefined
              )
                ? "Try adjusting your filters to see more results."
                : "Get started by adding a new student."}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <StudentDetailModal
        student={selectedStudent}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />

      <StudentDeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        studentCount={selectedStudents.length}
        isLoading={deleting}
      />
    </div>
  );
};
