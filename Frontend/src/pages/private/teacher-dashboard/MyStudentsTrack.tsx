import { useMemo, useState } from "react";
import { SortOrder, Student, StudentFilter } from "../../../types/Student";
import { useQuery } from "@apollo/client";
import { GET_ALL_STUDENTS } from "../../../graphql/Queries/StudentQueries";
import { StudentCard } from "../../../components/InstructorComponent/StudentsTracking/StudentCard";
import { User } from "lucide-react";
import LoadingCard from "../../../components/InstructorComponent/StudentsTracking/LoadingCard";
import { FilterComponent } from "../../../components/InstructorComponent/StudentsTracking/FiltersComponent";

const StudentsProgressDashboard: React.FC = () => {
  const [filter, setFilter] = useState<StudentFilter>({
    sortBy: SortOrder.RECENT_TO_OLDEST,
  });

  const { data, loading, error, refetch } = useQuery(GET_ALL_STUDENTS, {
    variables: { filter },
    fetchPolicy: "cache-and-network", // gets cached data fast, then refetches in background
    errorPolicy: "all",
    notifyOnNetworkStatusChange: true,
  });

  const students = data?.getAllStudents || [];

  const handleFilterChange = (newFilter: StudentFilter) => {
    setFilter(newFilter);
  };

  const filteredStudents = useMemo(() => {
    return students; // Since filtering is done on the backend
  }, [students]);

  if (error) {
    const errorMessage =
      typeof error === "object" && error !== null && "message" in error
        ? (error as { message: string }).message
        : "An unknown error occurred";
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">
            Error loading students
          </div>
          <p className="text-gray-600 mb-4">{errorMessage}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className=" bg-gray-50">
      <div className=" mx-auto py-6 px-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            All Students Progress
          </h1>
          <FilterComponent
            onFilterChange={handleFilterChange}
            currentFilter={filter}
          />
        </div>

        {/* Students Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, index) => (
              <LoadingCard key={index} />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStudents.map((student: Student) =>
                student?.lessonStats ? (
                  <StudentCard
                    key={student._id}
                    student={student}
                    totalBookings={student?.lessonStats?.totalLessons ?? 0}
                    lessonStats={
                      student?.lessonStats ?? {
                        totalLessons: 0,
                        totalLessonDurationInMinutes: 0,
                        remainingLessonDurationInMinutes: 0,
                      }
                    }
                  />
                ) : null
              )}
            </div>

            {filteredStudents.length === 0 && (
              <div className="text-center py-12">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No students found
                </h3>
                <p className="text-gray-500">
                  Try adjusting your filters to see more results.
                </p>
              </div>
            )}
          </>
        )}

        {/* Results Count */}
        {!loading && filteredStudents.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Showing {filteredStudents.length} student
              {filteredStudents.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentsProgressDashboard;
