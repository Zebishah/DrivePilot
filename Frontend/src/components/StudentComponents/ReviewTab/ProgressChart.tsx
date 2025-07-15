import React from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

interface ProgressChartProps {
  completedHours: number;
  remainingHours: number;
  totalRequiredHours: number;
  studentInfo: {
    firstName: string;
    lastName: string;
    profileImage?: string; // Make it optional
  };
}

const ProgressChart: React.FC<ProgressChartProps> = ({
  completedHours,
  remainingHours,
  totalRequiredHours,
  studentInfo,
}) => {
  // Generate sample weekly data based on completed hours
  const generateWeeklyData = () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const baseHours = completedHours / 7;

    return days.map((day, index) => ({
      day,
      hours: Math.max(0, baseHours + (Math.random() - 0.5) * baseHours * 0.5),
    }));
  };

  const weeklyData = generateWeeklyData();

  const chartOptions: ApexOptions = {
    chart: {
      type: "area",
      height: 300,
      toolbar: {
        show: false,
      },
      sparkline: {
        enabled: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 2,
      colors: ["#3b82f6"],
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
        stops: [0, 90, 100],
        colorStops: [
          {
            offset: 0,
            color: "#3b82f6",
            opacity: 0.4,
          },
          {
            offset: 100,
            color: "#3b82f6",
            opacity: 0.1,
          },
        ],
      },
    },
    xaxis: {
      categories: weeklyData.map((d) => d.day),
      labels: {
        style: {
          colors: "#6b7280",
          fontSize: "12px",
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      min: 0,
      max: Math.ceil(Math.max(...weeklyData.map((d) => d.hours)) * 1.2),
      labels: {
        formatter: (val) => val.toFixed(1), // Round to 1 decimal place
        style: {
          colors: "#6b7280",
          fontSize: "12px",
        },
      },
    },

    grid: {
      show: true,
      borderColor: "#f3f4f6",
      strokeDashArray: 3,
      yaxis: {
        lines: {
          show: true,
        },
      },
      xaxis: {
        lines: {
          show: false,
        },
      },
    },
    tooltip: {
      theme: "light",
      y: {
        formatter: (val: number) => `${val.toFixed(1)} hours`,
      },
    },
    colors: ["#3b82f6"],
  };

  const series = [
    {
      name: "Hours",
      data: weeklyData.map((d) => d.hours),
    },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Weekly Progress</h3>
      </div>

      <div className="flex items-center mb-6">
        <img
          src={
            studentInfo.profileImage ||
            "https://via.placeholder.com/48x48?text=SG"
          }
          alt={`${studentInfo.firstName} ${studentInfo.lastName}`}
          className="w-12 h-12 rounded-full object-cover mr-4"
        />

        <div>
          <h4 className="text-base font-medium text-gray-800">
            {studentInfo.firstName} {studentInfo.lastName}
          </h4>
          <p className="text-sm text-gray-500">Lesson 1</p>
        </div>
      </div>

      <Chart options={chartOptions} series={series} type="area" height={300} />
    </div>
  );
};

export default ProgressChart;
