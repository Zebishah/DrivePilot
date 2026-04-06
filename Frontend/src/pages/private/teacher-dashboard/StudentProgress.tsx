import React from "react";
import { useParams } from "react-router-dom";
import { BackButton } from "../../../components/InstructorComponent/common/BackButton";

import { ProgressChart } from "../../../components/InstructorComponent/StudentsTracking/ProgressChart";

import StudentBookingWInst from "../../../components/InstructorComponent/StudentBookingWInst";
import { LoadingState } from "../../../components/InstructorComponent/StudentsTracking/LoadingState";
import { ErrorState } from "../../../components/InstructorComponent/StudentsTracking/ErrorState";
import { NotFoundState } from "../../../components/InstructorComponent/StudentsTracking/NotFoundState";
import { StudentInfoCard } from "../../../components/InstructorComponent/StudentsTracking/StudentInfoCard";
import { useStudentDashboard } from "../../../hooks/UseStudentDashboard";
import { TotalLessonsCard } from "../../../components/InstructorComponent/StudentsTracking/TotalLessonCard";
import { formatDuration } from "../../../components/InstructorComponent/common/FormatDuration";
const StudentDashboard: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const {
    dateFilter,
    setDateFilter,
    loading,
    error,
    data,
    filteredGraphData,
  } = useStudentDashboard();

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error.message} />;
  }

  if (!data?.getStudentDashboardDetails) {
    return <NotFoundState />;
  }

  const {
    studentInfo,
    lessonStats,
    completedBookings,
    uncompletedBookings,
  } = data.getStudentDashboardDetails;
  return (
    <div className="min-h-screen bg-gray-50 py-2 px-8">
      <BackButton variant="outline" label="Back" />
      <div className="mx-auto mt-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Student Progress</h1>
        </div>

        {/* Student Info Card */}
        <StudentInfoCard
          studentInfo={studentInfo}
          lessonStats={lessonStats}
          formatDuration={formatDuration}
        />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overall Progress Chart */}
          <ProgressChart
            filteredGraphData={filteredGraphData}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
          />

          {/* Total Lessons */}
          <TotalLessonsCard
            completedBookings={completedBookings}
            uncompletedBookings={uncompletedBookings}
            formatDuration={formatDuration}
          />
        </div>

        {/* Booking Management — same component & logic as main instructor Booking Management, filtered to this student */}
        <div className="mt-6">
          <StudentBookingWInst filterStudentId={studentId} />
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
