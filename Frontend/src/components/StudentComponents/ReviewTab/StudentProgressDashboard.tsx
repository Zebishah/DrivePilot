import React from "react";
import { ApexOptions } from "apexcharts";
import Chart from "../../performance/LazyApexChart";

// Types
interface StudentInfo {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImage: string;
  lessonHoursLeft: string;
  lastCompletedLessonDate?: string; // ISO date string
}

interface BookingsBreakdown {
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  totalBookedSlots: number;
  completedSlots: number;
  pendingSlots: number;
}

interface StudentHoursProgress {
  totalRequiredHours: number;
  completedHours: number;
  remainingHours: number;
  studentInfo: StudentInfo;
  bookingsBreakdown: BookingsBreakdown;
}

// Helper function to calculate days since last lesson
const calculateDaysSinceLastLesson = (lastLessonDate?: string): number => {
  if (!lastLessonDate) return 0;

  const lastLesson = new Date(lastLessonDate);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - lastLesson.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

// Circular Progress Component
const CircularProgress = ({
  value,
  maxValue,
  color,
  size = 100,
  strokeWidth = 8,
}: {
  value: number;
  maxValue: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = maxValue > 0 ? (value / maxValue) * 100 : 0;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-gray-800">{value}</span>
      </div>
    </div>
  );
};

// Overall Stats Chart Component
const OverallStatsChart = ({
  hoursProgress,
}: {
  hoursProgress: StudentHoursProgress;
}) => {
  const {
    completedHours,
    remainingHours,
    totalRequiredHours,
    bookingsBreakdown,
  } = hoursProgress;

  const chartOptions: ApexOptions = {
    chart: {
      type: "bar",
      height: 350,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
        borderRadius: 8,
      },
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: "12px",
        fontWeight: "bold",
        colors: ["#fff"],
      },
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      categories: ["Hours Progress", "Bookings", "Slots"],
      labels: {
        style: {
          colors: "#9ca3af",
          fontSize: "12px",
        },
      },
    },
    yaxis: {
      title: {
        text: "Count",
        style: {
          color: "var(--ws-subtle, #9ca3af)",
          fontSize: "12px",
        },
      },
      labels: {
        style: {
          colors: "#9ca3af",
          fontSize: "12px",
        },
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      theme: "light",
      y: {
        formatter: (value) => `${value}`,
      },
    },
    legend: {
      position: "top",
      horizontalAlign: "center",
      fontSize: "12px",
    },
    colors: ["#10b981", "#3b82f6", "#f59e0b"],
  };

  const series = [
    {
      name: "Completed",
      data: [
        completedHours,
        bookingsBreakdown.completedBookings,
        bookingsBreakdown.completedSlots,
      ],
    },
    {
      name: "Pending",
      data: [
        remainingHours,
        bookingsBreakdown.pendingBookings,
        bookingsBreakdown.pendingSlots,
      ],
    },
    {
      name: "Total",
      data: [
        totalRequiredHours,
        bookingsBreakdown.totalBookings,
        bookingsBreakdown.totalBookedSlots,
      ],
    },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        Overall Progress Statistics
      </h3>
      <Chart options={chartOptions} series={series} type="bar" height={350} />

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Total Hours</p>
          <p className="text-2xl font-bold text-green-600">
            {totalRequiredHours}h
          </p>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Total Bookings</p>
          <p className="text-2xl font-bold text-blue-600">
            {bookingsBreakdown.totalBookings}
          </p>
        </div>
        <div className="text-center p-4 bg-amber-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Total Slots</p>
          <p className="text-2xl font-bold text-amber-600">
            {bookingsBreakdown.totalBookedSlots}
          </p>
        </div>
      </div>
    </div>
  );
};

interface StudentProgressDashboardProps {
  hoursProgress: StudentHoursProgress;
}

const StudentProgressDashboard: React.FC<StudentProgressDashboardProps> = ({
  hoursProgress,
}) => {
  const { studentInfo, completedHours, remainingHours, totalRequiredHours } =
    hoursProgress;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Section - Overall Stats Chart */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
            <div className="flex items-center mb-6">
              {studentInfo.profileImage ? (
                <img
                  src={studentInfo.profileImage}
                  alt={`${studentInfo.firstName} ${studentInfo.lastName}`}
                  className="w-16 h-16 rounded-full object-cover mr-4"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-4">
                  <span className="text-white text-2xl font-bold">
                    {studentInfo.firstName[0]}
                    {studentInfo.lastName[0]}
                  </span>
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {studentInfo.firstName} {studentInfo.lastName}
                </h2>
                <p className="text-gray-600">{studentInfo.email}</p>
                <p className="text-sm text-gray-500">
                  Hours Left: {studentInfo.lessonHoursLeft}h
                </p>
              </div>
            </div>
          </div>

          <OverallStatsChart hoursProgress={hoursProgress} />
        </div>

        {/* Right Section - Lesson Progress */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-sm w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">
                Lesson Progress
              </h3>
            </div>

            <div className="space-y-8">
              {/* Total Required Hours */}
              <div className="text-center">
                <CircularProgress
                  value={totalRequiredHours}
                  maxValue={totalRequiredHours}
                  color="var(--ws-warning, #f59e0b)"
                  size={120}
                  strokeWidth={10}
                />
                <div className="mt-3">
                  <p className="text-sm text-gray-600">Total Required</p>
                  <p className="text-sm text-gray-600">Hours</p>
                </div>
              </div>

              {/* Completed Hours */}
              <div className="text-center">
                <CircularProgress
                  value={completedHours}
                  maxValue={totalRequiredHours}
                  color="var(--ws-success, #10b981)"
                  size={120}
                  strokeWidth={10}
                />
                <div className="mt-3">
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-sm text-gray-600">Hours</p>
                </div>
              </div>

              {/* Remaining Hours */}
              <div className="text-center">
                <CircularProgress
                  value={remainingHours}
                  maxValue={totalRequiredHours}
                  color="var(--ws-info, #3b82f6)"
                  size={120}
                  strokeWidth={10}
                />
                <div className="mt-3">
                  <p className="text-sm text-gray-600">Remaining</p>
                  <p className="text-sm text-gray-600">Hours</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default StudentProgressDashboard;
