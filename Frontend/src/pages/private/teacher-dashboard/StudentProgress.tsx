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
import { formatDuration } from "../../../components/InstructorComponent/common/FormatDuration";
import { DashboardPageHeader } from "../../../components/dashboard/OverviewWidgets";
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
  } = data.getStudentDashboardDetails;
  return (
    <div className="dsp-instructor-page dsp-student-progress-page">
      <div className="dsp-instructor-page__content">
      <div className="mx-auto mt-4">
        <DashboardPageHeader
          title="Student Progress"
          description="Review lesson activity, progress history, and booking context for this learner."
          action={<BackButton variant="outline" label="Back" />}
        />

        {/* Student Info Card */}
        <StudentInfoCard
          studentInfo={studentInfo}
          lessonStats={lessonStats}
          formatDuration={formatDuration}
        />

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6">
          {/* Overall Progress Chart */}
          <ProgressChart
            filteredGraphData={filteredGraphData}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
          />
        </div>

        {/* Booking Management — same component & logic as main instructor Booking Management, filtered to this student */}
        <div className="mt-6">
          <StudentBookingWInst filterStudentId={studentId} />
        </div>
      </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
