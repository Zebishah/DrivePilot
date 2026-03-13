import React, { useEffect, useState, useMemo } from "react";
import { Users, Calendar, DollarSign, Award } from "lucide-react";
import { StatsCard } from "./StatsCard";
import { LastTrainedStudent } from "./LastTrainedStudent";

import { InstructorMap } from "./InstructorMap";
import { ProgressMetric } from "./ProgressMetric";
import { AvailabilityTab } from "../../../pages/private/teacher-dashboard/tabs/AvailabilityTab";
import { InstructorAnalytics } from "../../../types/InstructorAnalytics";
import { gql, useQuery } from "@apollo/client";
import { useAuth } from "../../../context/AuthContext";
import { AvailabilityTabOverview } from "./AvailabilityCalendar";
import { LoadingSpinner } from "../common/LoadingSpinner";

const GET_INSTRUCTOR_ANALYTICS = gql`
  query GetInstructorAnalytics($instructorId: ID!) {
    getInstructorAnalytics(instructorId: $instructorId) {
      totalStudents
      activeBookings
      totalEarnings
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
              {" "}
              <StatsCard
                title="Cumulative Students Count"
                value={analytics?.totalStudents}
                icon={Users}
                bgColor="bg-red-200"
                iconColor="bg-red-400"
              />
              <StatsCard
                title="Active Bookings"
                value={analytics?.activeBookings}
                icon={Calendar}
                bgColor="bg-purple-200"
                iconColor="bg-purple-400"
              />
            </div>
            <div className="flex gap-4 w-full">
              {" "}
              <StatsCard
                title="Money Earned"
                value={`${String(analytics?.totalEarnings).slice(0, 6)}$`}
                icon={DollarSign}
                bgColor="bg-yellow-200"
                iconColor="bg-yellow-400"
              />
              <StatsCard
                title="Licensed Students"
                value={Math.floor(analytics?.studentsCount * 0.8) || 0} // Assuming 80% are licensed
                icon={Award}
                bgColor="bg-teal-200"
                iconColor="bg-teal-400"
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
            completionDate={currentBooking?.slots?.[0]?.date}
            studentLocation={currentBooking?.studentLocation ?? null}
            recentCount={recentBookings.length}
            currentIndex={clampedIndex}
            onNext={handleNextRecent}
            onSelectIndex={handleSelectRecentIndex}
          />
        </div>

        {/* Second Row: Last Trained Student and Available Days */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[40%] ">
          <AvailabilityTabOverview />{" "}
          <div className="h-full">
            <InstructorMap address={analytics?.instructor?.address} />
          </div>
        </div>

        {/* Third Row: Map */}

        {/* Bottom Row: Progress Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ProgressMetric
            title="Attendance Rate"
            subtitle="Percentage of lessons attended by students"
            percentage={analytics.attendanceRate}
            value={`${Math.round(analytics.attendanceRate)}%`}
            color="green"
            badge="Active"
          />
          <ProgressMetric
            title="Cancellation Rate"
            subtitle="Percentage of lessons cancelled"
            percentage={analytics.cancellationRate}
            value={`${Math.round(analytics.cancellationRate)}%`}
            color="red"
            badge="Last Month"
          />
          <ProgressMetric
            title="Average Lessons Per Student"
            subtitle="Average number of lessons booked by a student"
            percentage={analytics.averageLessonsPerStudent}
            value={`${Math.round(analytics.averageLessonsPerStudent)}`}
            color="#99F6E4"
          />
        </div>
      </div>
    </div>
  );
};
