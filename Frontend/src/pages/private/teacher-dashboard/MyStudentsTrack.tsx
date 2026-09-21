import { useMemo, useState } from "react";
import type React from "react";
import { User } from "lucide-react";
import { useQuery } from "@apollo/client";
import { SortOrder, Student, StudentFilter } from "../../../types/Student";
import { GET_ALL_STUDENTS } from "../../../graphql/Queries/StudentQueries";
import { StudentCard } from "../../../components/InstructorComponent/StudentsTracking/StudentCard";
import LoadingCard from "../../../components/InstructorComponent/StudentsTracking/LoadingCard";
import { FilterComponent } from "../../../components/InstructorComponent/StudentsTracking/FiltersComponent";
import { DashboardCard, DashboardPageHeader, DashboardLoadingSkeleton } from "../../../components/dashboard/OverviewWidgets";

const StudentsProgressDashboard: React.FC = () => {
  const [filter, setFilter] = useState<StudentFilter>({
    sortBy: SortOrder.RECENT_TO_OLDEST,
  });

  const { data, loading, error, refetch } = useQuery(GET_ALL_STUDENTS, {
    variables: { filter },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
    notifyOnNetworkStatusChange: true,
  });

  const students = data?.getAllStudents || [];
  const filteredStudents = useMemo(() => students, [students]);

  if (loading && !data) return <DashboardLoadingSkeleton rows={6} />;

  return (
    <div className="dsp-instructor-page dsp-students-page">
      <div className="dsp-instructor-page__content">
        <DashboardPageHeader
          title="My students"
          description="Keep track of your learners, lesson records, and progress in one place."
          action={<FilterComponent onFilterChange={setFilter} currentFilter={filter} />}
        />

        {error ? (
          <DashboardCard className="dsp-page-error">
            <div className="dsp-page-error__icon"><User size={22} /></div>
            <h2>We couldn’t load your students</h2>
            <p>Try again to refresh the latest student records.</p>
            <button type="button" className="dsp-dashboard-button dsp-dashboard-button--primary" onClick={() => refetch()}>Try again</button>
          </DashboardCard>
        ) : (
          <DashboardCard className="dsp-students-page__card">
            <div className="dsp-list-heading">
              <div>
                <span className="dsp-list-heading__eyebrow">Student CRM</span>
                <h2>{filteredStudents.length} active student{filteredStudents.length === 1 ? "" : "s"}</h2>
              </div>
              <span className="dsp-list-heading__meta">Sorted by recent activity</span>
            </div>

            {loading ? (
              <div className="dsp-students-page__grid" aria-label="Loading students">
                {Array.from({ length: 6 }, (_, index) => <LoadingCard key={index} />)}
              </div>
            ) : filteredStudents.length ? (
              <div className="dsp-students-page__grid">
                {filteredStudents.map((student: Student) => student?.lessonStats ? (
                  <StudentCard
                    key={student._id}
                    student={student}
                    totalBookings={student.lessonStats.totalLessons ?? 0}
                    lessonStats={student.lessonStats}
                  />
                ) : null)}
              </div>
            ) : (
              <div className="dsp-page-empty">
                <User size={28} aria-hidden="true" />
                <h3>No students found</h3>
                <p>Students will appear here after they book a lesson with you.</p>
              </div>
            )}
          </DashboardCard>
        )}
      </div>
    </div>
  );
};

export default StudentsProgressDashboard;
