import React, { useEffect, useState, useMemo } from "react";
import { Users, Calendar, DollarSign, BookOpen, Info } from "lucide-react";
import { StatsCard } from "./StatsCard";
import { LastTrainedStudent } from "./LastTrainedStudent";

import { InstructorMap } from "./InstructorMap";
import { ProgressMetric } from "./ProgressMetric";
import { InstructorAnalytics } from "../../../types/InstructorAnalytics";
import { gql, useQuery } from "@apollo/client";
import { useAuth } from "../../../context/AuthContext";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { useNavigate } from "react-router-dom";

const GET_INSTRUCTOR_ANALYTICS = gql`
  query GetInstructorAnalytics($instructorId: ID!) {
    getInstructorAnalytics(instructorId: $instructorId) {
      totalStudents
      activeBookings
      totalEarnings
      totalLessonsGiven
      lastLessonDate
      averageLessonsPerStudent
      cancellationRate
      attendanceRate
      lastBooking {
        _id
        status
        createdAt
        studentId {
          _id
          firstName
          lastName
          email
          profileImage
        }
        instructorId {
          firstName
          lastName
          email
        }
        slots {
          date
          startTime
          endTime
          status
        }
        studentTotalLessons
        studentLocation
      }
      recentBookings {
        _id
        status
        createdAt
        studentId {
          _id
          firstName
          lastName
          email
          profileImage
        }
        instructorId {
          firstName
          lastName
          email
        }
        slots {
          date
          startTime
          endTime
          status
        }
        studentTotalLessons
        studentLocation
      }
      instructor {
        firstName
        lastName
        email
        address
      }
    }
  }
`;

export const InstructorAnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, loading, error, refetch } = useQuery(GET_INSTRUCTOR_ANALYTICS, {
    variables: { instructorId: user?.id },
    fetchPolicy: "no-cache",
  });

  const recentBookings = (data?.getInstructorAnalytics as InstructorAnalytics)
    ?.recentBookings ?? [];

  const [currentRecentIndex, setCurrentRecentIndex] = useState(0);
  const clampedIndex =
    recentBookings.length > 0
      ? Math.min(Math.max(0, currentRecentIndex), recentBookings.length - 1)
      : 0;
  const currentBooking = useMemo(
    () => recentBookings[clampedIndex] ?? null,
    [recentBookings, clampedIndex]
  );

  useEffect(() => {
    if (user?.id) refetch();
  }, [user, refetch]);

  useEffect(() => {
    setCurrentRecentIndex(0);
  }, [recentBookings.length]);

  const handleNextRecent = () => {
    if (recentBookings.length <= 1) return;
    setCurrentRecentIndex((i) => (i + 1) % recentBookings.length);
  };
  const handleSelectRecentIndex = (index: number) => {
    setCurrentRecentIndex(index);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <p>Error: {error.message}</p>;

  const analytics = data?.getInstructorAnalytics as InstructorAnalytics;

  return (
    <div className=" bg-gray-50 p-6 w-full ">
      <div className=" w-full space-y-6 ">
        {/* Top Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-6 w-full ">
          {" "}
          <div className="grid grid-rows-2 md:grid-rows-2 lg:grid-rows-2 gap-6 w-full ">
            <div className="flex gap-4 w-full ">
              <StatsCard
                title="Cumulative Students Count"
                value={analytics?.totalStudents}
                icon={Users}
                bgColor="bg-red-200"
                iconColor="bg-red-400"
                tooltip="Total number of different students you’ve trained on DSP since joining the platform."
                onClick={() => navigate("/teacher-dashboard/my-students")}
              />
              <StatsCard
                title="Upcoming Bookings"
                value={analytics?.activeBookings}
                icon={Calendar}
                bgColor="bg-purple-200"
                iconColor="bg-purple-400"
                tooltip="Number of future lessons you have scheduled with students."
                onClick={() =>
                  navigate("/teacher-dashboard/my-students", {
                    state: { focus: "upcoming" },
                  })
                }
              />
            </div>
            <div className="flex gap-4 w-full">
              <StatsCard
                title="Money Earned"
                value={`${String(analytics?.totalEarnings).slice(0, 6)}$`}
                icon={DollarSign}
                bgColor="bg-yellow-200"
                iconColor="bg-yellow-400"
                tooltip="Total amount earned from all completed lessons. Cancelled or pending lessons are not included."
              />
              <StatsCard
                title="Total Lessons Given"
                value={analytics?.totalLessonsGiven ?? 0}
                icon={BookOpen}
                bgColor="bg-teal-200"
                iconColor="bg-teal-400"
                tooltip="This is the total number of completed lessons you have conducted with students."
                onClick={() =>
                  navigate("/teacher-dashboard/bookingManagement")
                }
              />
            </div>
          </div>
          <LastTrainedStudent
            student={currentBooking?.studentId ?? null}
            totalLessons={currentBooking?.studentTotalLessons ?? 0}
            joiningDate={
              currentBooking?.createdAt
                ? new Date(
                    Number(currentBooking.createdAt)
                  ).toLocaleDateString()
                : ""
            }
            satisfaction={100}
            completionDate={analytics.lastLessonDate ?? undefined}
            studentLocation={currentBooking?.studentLocation ?? null}
            recentCount={recentBookings.length}
            currentIndex={clampedIndex}
            onNext={handleNextRecent}
            onSelectIndex={handleSelectRecentIndex}
          />
        </div>

        {/* Map Row (keep map, calendar removed) */}
        <div className="mt-6">
          <InstructorMap
            address={analytics?.instructor?.address}
            className="h-80"
          />
        </div>

        {/* Bottom Row: Progress Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ProgressMetric
            title="Attendance Rate"
            subtitle="Percentage of lessons attended by students"
            percentage={analytics.attendanceRate}
            value={`${Math.round(analytics.attendanceRate)}%`}
            color="green"
          />
          <ProgressMetric
            title="Cancellation Rate"
            subtitle="Percentage of lessons cancelled"
            percentage={analytics.cancellationRate}
            value={`${Math.round(analytics.cancellationRate)}%`}
            color="red"
          />
          <ProgressMetric
            title="Average Lessons Per Student"
            subtitle="Average number of lessons booked by a student"
            percentage={analytics.averageLessonsPerStudent}
            value={`${Math.round(analytics.averageLessonsPerStudent)}`}
            color="#99F6E4"
            showProgressBar={false}
          />
        </div>
      </div>
    </div>
  );
};
